import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedbackProvider, useFeedback } from "../src/react";

vi.mock("../src/react/capture/viewport", () => ({
  captureViewportPayload: async () => null,
}));

vi.mock("../src/react/capture/collage", () => ({
  buildReplayCollage: async () => null,
}));

vi.mock("../src/react/capture/region-overlay", async () => {
  const actual = await vi.importActual<typeof import("../src/react/capture/region-overlay")>(
    "../src/react/capture/region-overlay",
  );
  return {
    ...actual,
    selectPageRegion: vi.fn(),
  };
});

vi.mock("../src/react/capture/region", () => ({
  captureRegionBlob: vi.fn(),
}));

const originalFetch = globalThis.fetch;

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function text(testId: string): string {
  return screen.getByTestId(testId).textContent ?? "";
}

function Probe() {
  const { message, setMessage, submit, status, error, result, captureEnabled, setCaptureEnabled } =
    useFeedback();
  return (
    <div>
      <label>
        message
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} />
      </label>
      <button type="button" onClick={() => void submit()}>
        send
      </button>
      <button type="button" onClick={() => setCaptureEnabled(!captureEnabled)}>
        toggle-capture
      </button>
      <span data-testid="status">{status}</span>
      <span data-testid="error">{error ?? ""}</span>
      <span data-testid="dryRun">{result?.dryRun ? "yes" : "no"}</span>
      <span data-testid="dispatched">{result?.dispatched ? "yes" : "no"}</span>
      <span data-testid="capture">{captureEnabled ? "on" : "off"}</span>
      <span data-testid="agentUrl">{result?.agentUrl ?? ""}</span>
    </div>
  );
}

describe("FeedbackProvider", () => {
  it("submits a dry-run report and exposes the result", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          dispatched: false,
          dryRun: true,
          feedbackId: "evt_client",
        }),
        { status: 202 },
      ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(
      <FeedbackProvider endpoint="/api/feedback" appVersion="test">
        <Probe />
      </FeedbackProvider>,
    );

    await userEvent.type(screen.getByLabelText("message"), "The save button crashes.");
    await userEvent.click(screen.getByRole("button", { name: "send" }));

    await waitFor(() => expect(text("status")).toBe("success"));
    expect(text("dryRun")).toBe("yes");
    expect(text("dispatched")).toBe("no");
    expect(fetchMock).toHaveBeenCalledOnce();
    const sent = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(sent.message).toContain("save button");
    expect(sent.sessionId).toBeTruthy();
  });

  it("rejects an empty message without calling fetch", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    render(
      <FeedbackProvider endpoint="/api/feedback">
        <Probe />
      </FeedbackProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "send" }));
    expect(text("status")).toBe("error");
    expect(text("error")).toContain("short description");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps agentUrl on the hook result", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          dispatched: true,
          feedbackId: "evt_live",
          agentId: "bc-1",
          agentUrl: "https://cursor.com/agents/bc-1",
        }),
        { status: 202 },
      ),
    ) as unknown as typeof fetch;

    render(
      <FeedbackProvider endpoint="/api/feedback">
        <Probe />
      </FeedbackProvider>,
    );
    await userEvent.type(screen.getByLabelText("message"), "Broken checkout");
    await userEvent.click(screen.getByRole("button", { name: "send" }));
    await waitFor(() => expect(text("status")).toBe("success"));
    expect(text("agentUrl")).toBe("https://cursor.com/agents/bc-1");
  });

  it("can disable capture after mount", async () => {
    render(
      <FeedbackProvider endpoint="/api/feedback" capture={{ enabled: true }}>
        <Probe />
      </FeedbackProvider>,
    );
    expect(text("capture")).toBe("on");
    await userEvent.click(screen.getByRole("button", { name: "toggle-capture" }));
    expect(text("capture")).toBe("off");
  });

  it("attaches a region capture and ignores cancel", async () => {
    const { selectPageRegion } = await import("../src/react/capture/region-overlay");
    const { captureRegionBlob } = await import("../src/react/capture/region");
    const select = vi.mocked(selectPageRegion);
    const crop = vi.mocked(captureRegionBlob);
    select.mockResolvedValueOnce(null);
    select.mockResolvedValueOnce({
      rect: { x: 10, y: 20, width: 80, height: 40 },
      viewport: { width: 800, height: 600 },
      scroll: { x: 0, y: 240 },
    });
    crop.mockResolvedValueOnce(new Blob(["png"], { type: "image/png" }));

    function RegionProbe() {
      const { captureRegionScreenshot, screenshots, isSelectingRegion } = useFeedback();
      return (
        <div>
          <button type="button" onClick={() => void captureRegionScreenshot()}>
            capture-region
          </button>
          <span data-testid="count">{String(screenshots.length)}</span>
          <span data-testid="selecting">{isSelectingRegion ? "yes" : "no"}</span>
        </div>
      );
    }

    render(
      <FeedbackProvider endpoint="/api/feedback">
        <RegionProbe />
      </FeedbackProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "capture-region" }));
    await waitFor(() => expect(text("count")).toBe("0"));
    expect(crop).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "capture-region" }));
    await waitFor(() => expect(text("count")).toBe("1"));
    expect(crop).toHaveBeenCalledWith(
      { x: 10, y: 20, width: 80, height: 40 },
      { width: 800, height: 600 },
      { x: 0, y: 240 },
    );
    expect(text("selecting")).toBe("no");
  });

  it("cancels an in-flight region overlay when the provider unmounts", async () => {
    const { selectPageRegion, REGION_HOST_ID } = await import("../src/react/capture/region-overlay");
    const select = vi.mocked(selectPageRegion);
    let release!: (value: null) => void;
    select.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
          const host = document.createElement("div");
          host.id = REGION_HOST_ID;
          host.setAttribute("data-feedback-agent", "");
          document.documentElement.appendChild(host);
        }),
    );

    function RegionProbe() {
      const { captureRegionScreenshot } = useFeedback();
      return (
        <button type="button" onClick={() => void captureRegionScreenshot()}>
          capture-region
        </button>
      );
    }

    const view = render(
      <FeedbackProvider endpoint="/api/feedback">
        <RegionProbe />
      </FeedbackProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "capture-region" }));
    await waitFor(() => expect(document.getElementById(REGION_HOST_ID)).toBeTruthy());
    view.unmount();
    await waitFor(() => expect(document.getElementById(REGION_HOST_ID)).toBeNull());
    release(null);
  });
});

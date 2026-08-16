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

vi.mock("../src/react/capture/network-browser", () => ({
  startBrowserNetworkLog: () => () => undefined,
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

async function postedBody(mock: ReturnType<typeof vi.fn>): Promise<Record<string, unknown>> {
  const [input, init] = mock.mock.calls[0] ?? [];
  if (init && typeof init === "object" && "body" in init && init.body != null) {
    return JSON.parse(String((init as RequestInit).body)) as Record<string, unknown>;
  }
  if (input instanceof Request) {
    return (await input.json()) as Record<string, unknown>;
  }
  throw new Error("fetch was not called with a JSON body");
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
    const sent = await postedBody(fetchMock);
    expect(sent.message).toContain("save button");
    expect(sent.sessionId).toBeTruthy();
    expect((sent.session as { network?: unknown }).network).toBeUndefined();
  });

  it("attaches network logs only when includeNetwork is on", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ ok: true, dispatched: false, dryRun: true, feedbackId: "evt_net" }),
        { status: 202 },
      ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    function NetworkProbe() {
      const { message, setMessage, submit, includeNetwork, setIncludeNetwork } = useFeedback();
      return (
        <div>
          <label>
            message
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} />
          </label>
          <label>
            <input
              type="checkbox"
              checked={includeNetwork}
              onChange={(event) => setIncludeNetwork(event.target.checked)}
            />
            Include network requests
          </label>
          <button type="button" onClick={() => void submit()}>
            send
          </button>
        </div>
      );
    }

    render(
      <FeedbackProvider endpoint="/api/feedback">
        <NetworkProbe />
      </FeedbackProvider>,
    );

    await userEvent.type(screen.getByLabelText("message"), "Checkout 500s");
    await userEvent.click(screen.getByLabelText("Include network requests"));
    await userEvent.click(screen.getByRole("button", { name: "send" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const sent = await postedBody(fetchMock);
    expect((sent.session as { network?: unknown }).network).toEqual([]);
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
});

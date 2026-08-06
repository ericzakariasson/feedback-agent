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
});

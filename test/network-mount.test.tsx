import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode, useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedbackProvider, useFeedback } from "../src/react";
import type { SessionBundle } from "../src/shared/types";

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
});

describe("FeedbackProvider network mount capture", () => {
  it("records a child mount-time fetch before the provider effect would run", async () => {
    let getSession: () => SessionBundle | null = () => null;

    function ChildFetch() {
      useEffect(() => {
        void fetch("/api/invoices").catch(() => undefined);
      }, []);
      return null;
    }

    function Probe() {
      getSession = useFeedback().getSession;
      return null;
    }

    render(
      <FeedbackProvider endpoint="/api/feedback" capture={{ recordReplay: false }}>
        <ChildFetch />
        <Probe />
      </FeedbackProvider>,
    );

    await waitFor(() => {
      const urls = (getSession()?.network ?? []).map((entry) => entry.url).join(" ");
      expect(urls).toContain("/api/invoices");
    });
  });

  it("keeps getSession after Strict Mode effect replay", async () => {
    let getSession: () => SessionBundle | null = () => null;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
      if (url.includes("/api/feedback")) {
        return new Response(
          JSON.stringify({ ok: true, dispatched: false, dryRun: true, feedbackId: "evt_strict" }),
          { status: 202 },
        );
      }
      return originalFetch(input, init);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    function ChildFetch() {
      useEffect(() => {
        void fetch("/api/orders").catch(() => undefined);
      }, []);
      return null;
    }

    function Probe() {
      const feedback = useFeedback();
      getSession = feedback.getSession;
      return (
        <div>
          <label>
            message
            <textarea
              value={feedback.message}
              onChange={(event) => feedback.setMessage(event.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={feedback.includeNetwork}
              onChange={(event) => feedback.setIncludeNetwork(event.target.checked)}
            />
            Include network requests
          </label>
          <button type="button" onClick={() => void feedback.submit()}>
            send
          </button>
          <span data-testid="status">{feedback.status}</span>
          <span data-testid="error">{feedback.error ?? ""}</span>
        </div>
      );
    }

    render(
      <StrictMode>
        <FeedbackProvider endpoint="/api/feedback" capture={{ recordReplay: false }}>
          <ChildFetch />
          <Probe />
        </FeedbackProvider>
      </StrictMode>,
    );

    await waitFor(() => {
      const session = getSession();
      expect(session).not.toBeNull();
      expect((session?.network ?? []).map((entry) => entry.url).join(" ")).toContain("/api/orders");
    });

    await userEvent.type(screen.getByLabelText("message"), "Checkout 500s");
    await userEvent.click(screen.getByLabelText("Include network requests"));
    await userEvent.click(screen.getByRole("button", { name: "send" }));
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("success"));
    expect(screen.getByTestId("error").textContent).not.toContain("Session capture is not running");

    const feedbackCall = fetchMock.mock.calls.find(([input]) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
      return url.includes("/api/feedback");
    });
    expect(feedbackCall).toBeTruthy();
    const [input, init] = feedbackCall ?? [];
    const sent = (
      init && typeof init === "object" && "body" in init && init.body != null
        ? JSON.parse(String(init.body))
        : input instanceof Request
          ? await input.json()
          : null
    ) as { session?: { network?: Array<{ url: string }> } } | null;
    expect(sent?.session?.network?.some((entry) => entry.url.includes("/api/orders"))).toBe(true);
  });
});

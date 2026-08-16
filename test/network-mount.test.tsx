import { cleanup, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { FeedbackProvider, useFeedback } from "../src/react";
import type { SessionBundle } from "../src/shared/types";

afterEach(() => {
  cleanup();
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
});

import { describe, expect, it } from "vitest";
import {
  attachNetworkListeners,
  isFeedbackEndpoint,
  NetworkLog,
  sanitizeNetworkUrl,
  shouldIgnoreNetworkUrl,
} from "../src/react/capture/network";

describe("shouldIgnoreNetworkUrl", () => {
  it("skips data and blob URLs", () => {
    expect(shouldIgnoreNetworkUrl("data:image/png;base64,aaa")).toBe(true);
    expect(shouldIgnoreNetworkUrl("blob:https://app.example.com/1")).toBe(true);
  });

  it("skips the feedback endpoint", () => {
    expect(shouldIgnoreNetworkUrl("/api/feedback", "/api/feedback")).toBe(true);
    expect(shouldIgnoreNetworkUrl("/api/invoices", "/api/feedback")).toBe(false);
  });
});

describe("sanitizeNetworkUrl", () => {
  it("redacts secret-looking query params", () => {
    expect(sanitizeNetworkUrl("https://api.example.com/me?access_token=abc&page=2")).toContain(
      "access_token=%5Bredacted%5D",
    );
    expect(sanitizeNetworkUrl("https://api.example.com/me?access_token=abc&page=2")).toContain(
      "page=2",
    );
  });
});

describe("attachNetworkListeners", () => {
  it("records a completed request and ignores the feedback endpoint", () => {
    const log = new NetworkLog(60_000);
    const listeners: Record<string, (event: { request: { method: string; url: string }; requestId: string; response: { status: number } }) => void> = {};
    attachNetworkListeners(
      {
        on(event, listener) {
          listeners[event] = listener;
        },
      },
      log,
      "/api/feedback",
    );

    listeners.request?.({
      request: { method: "get", url: "/api/invoices" },
      requestId: "1",
      response: { status: 0 },
    });
    listeners.response?.({
      request: { method: "get", url: "/api/invoices" },
      requestId: "1",
      response: { status: 500 },
    });
    listeners.request?.({
      request: { method: "post", url: "/api/feedback" },
      requestId: "2",
      response: { status: 0 },
    });
    listeners.response?.({
      request: { method: "post", url: "/api/feedback" },
      requestId: "2",
      response: { status: 202 },
    });

    const [entry] = log.snapshot();
    expect(entry).toEqual(
      expect.objectContaining({
        method: "GET",
        url: expect.stringContaining("/api/invoices"),
        status: 500,
      }),
    );
    expect(entry).not.toHaveProperty("body");
    expect(Object.keys(entry ?? {}).sort()).toEqual(
      ["durationMs", "method", "status", "timestamp", "url"].sort(),
    );
  });
});

describe("isFeedbackEndpoint", () => {
  it("matches origin and path only", () => {
    expect(isFeedbackEndpoint("/api/feedback?x=1", "/api/feedback")).toBe(true);
  });
});

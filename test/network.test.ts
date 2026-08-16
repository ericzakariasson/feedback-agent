import { describe, expect, it } from "vitest";
import {
  attachNetworkListeners,
  isFeedbackEndpoint,
  NetworkLog,
  sanitizeNetworkUrl,
  shouldIgnoreNetworkUrl,
} from "../src/react/capture/network";
import { CLIENT_LIMITS } from "../src/shared/limits";

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

describe("NetworkLog", () => {
  it("keeps at most the newest maxNetworkEntries in-window rows", () => {
    const log = new NetworkLog(60_000);
    for (let i = 0; i < CLIENT_LIMITS.maxNetworkEntries * 2 + 1; i += 1) {
      log.upsert(String(i), {
        timestamp: new Date().toISOString(),
        method: "GET",
        url: `https://app.example.com/api/${i}`,
      });
    }
    const snap = log.snapshot();
    expect(snap).toHaveLength(CLIENT_LIMITS.maxNetworkEntries);
    expect(snap[0]?.url).toContain("/api/41");
    expect(snap.at(-1)?.url).toContain("/api/80");
  });
});

describe("attachNetworkListeners", () => {
  it("records a request with no response and updates it when the response arrives", () => {
    const log = new NetworkLog(60_000);
    const listeners: Record<
      string,
      (event: {
        request: { method: string; url: string }
        requestId: string
        response?: { status: number }
      }) => void
    > = {};
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
      request: { method: "get", url: "/api/orders" },
      requestId: "pending",
    });
    expect(log.snapshot()).toEqual([
      expect.objectContaining({
        method: "GET",
        url: expect.stringContaining("/api/orders"),
      }),
    ]);
    expect(log.snapshot()[0]).not.toHaveProperty("status");

    listeners.request?.({
      request: { method: "get", url: "/api/invoices" },
      requestId: "1",
    });
    listeners.response?.({
      request: { method: "get", url: "/api/invoices" },
      requestId: "1",
      response: { status: 500 },
    });
    listeners.request?.({
      request: { method: "post", url: "/api/feedback" },
      requestId: "2",
    });
    listeners.response?.({
      request: { method: "post", url: "/api/feedback" },
      requestId: "2",
      response: { status: 202 },
    });

    const snap = log.snapshot();
    expect(snap).toHaveLength(2);
    expect(snap).toEqual([
      expect.objectContaining({
        method: "GET",
        url: expect.stringContaining("/api/orders"),
      }),
      expect.objectContaining({
        method: "GET",
        url: expect.stringContaining("/api/invoices"),
        status: 500,
      }),
    ]);
    expect(snap[1]).not.toHaveProperty("body");
    expect(Object.keys(snap[1] ?? {}).sort()).toEqual(
      ["durationMs", "method", "status", "timestamp", "url"].sort(),
    );
  });
});

describe("isFeedbackEndpoint", () => {
  it("matches origin and path only", () => {
    expect(isFeedbackEndpoint("/api/feedback?x=1", "/api/feedback")).toBe(true);
  });
});

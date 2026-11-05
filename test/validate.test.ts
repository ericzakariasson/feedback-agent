import { describe, expect, it } from "vitest";
import { DEFAULT_LIMITS } from "../src/shared/limits";
import { clientKey, validatePayload } from "../src/server/validate";
import { samplePayload, sampleSession } from "./helpers";

describe("validatePayload", () => {
  it("accepts a well-formed payload", () => {
    const result = validatePayload(samplePayload(), { ...DEFAULT_LIMITS });
    expect(result.ok).toBe(true);
  });

  it("rejects a long message", () => {
    const result = validatePayload(
      samplePayload({ message: "x".repeat(DEFAULT_LIMITS.maxMessageChars + 1) }),
      { ...DEFAULT_LIMITS },
    );
    expect(result.ok).toBe(false);
  });

  it("rejects data-URL screenshots", () => {
    const result = validatePayload(
      samplePayload({
        screenshots: [
          {
            mimeType: "image/png",
            data: "data:image/png;base64,aaaa",
          },
        ],
      }),
      { ...DEFAULT_LIMITS },
    );
    expect(result.ok).toBe(false);
  });

  it("rejects session/sessionId mismatch", () => {
    const result = validatePayload(
      samplePayload({
        sessionId: "other",
        session: sampleSession({ id: "session-1" }),
      }),
      { ...DEFAULT_LIMITS },
    );
    expect(result.ok).toBe(false);
  });

  it("drops unknown session fields and invalid history entries", () => {
    const session = {
      ...sampleSession(),
      extra: "nope",
      urlHistory: [
        { href: "https://app.example.com/ok", timestamp: "2026-07-31T08:00:00.000Z" },
        { href: "", timestamp: "2026-07-31T08:00:00.000Z" },
      ],
    };
    const result = validatePayload(samplePayload({ session: session as never }), {
      ...DEFAULT_LIMITS,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.session.urlHistory).toHaveLength(1);
    expect(result.payload.session).not.toHaveProperty("extra");
  });
});

describe("clientKey", () => {
  it("ignores forwarded headers by default", () => {
    const request = new Request("http://localhost/api/feedback", {
      headers: { "x-forwarded-for": "8.8.8.8", "cf-connecting-ip": "1.1.1.1" },
    });
    expect(clientKey(request)).toBe("unknown");
  });

  it("reads cf-connecting-ip when trustProxy is cf", () => {
    const request = new Request("http://localhost/api/feedback", {
      headers: { "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "8.8.8.8" },
    });
    expect(clientKey(request, "cf")).toBe("1.1.1.1");
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULT_LIMITS } from "../src/shared/limits";
import { validatePayload } from "../src/server/validate";
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
});

import { describe, expect, it } from "vitest";
import { redactText, redactUnknown } from "../src/shared/redact";

describe("redactText", () => {
  it("masks emails, JWTs, and bearer tokens", () => {
    const input =
      "user ada@example.com used bearer abcdefghijklmnop and jwt eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb";
    const out = redactText(input);
    expect(out).toContain("[email]");
    expect(out).toContain("bearer [redacted]");
    expect(out).toContain("[jwt]");
    expect(out).not.toContain("ada@example.com");
  });
});

describe("redactUnknown", () => {
  it("redacts secret-looking keys", () => {
    const out = redactUnknown({
      email: "ada@example.com",
      plan: "pro",
      password: "hunter2",
      nested: { apiKey: "abcdefghij", ok: true },
    }) as Record<string, unknown>;
    expect(out.email).toBe("[redacted]");
    expect(out.password).toBe("[redacted]");
    expect(out.plan).toBe("pro");
    expect((out.nested as Record<string, unknown>).apiKey).toBe("[redacted]");
    expect((out.nested as Record<string, unknown>).ok).toBe(true);
  });
});

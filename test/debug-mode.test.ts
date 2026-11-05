import { afterEach, describe, expect, it } from "vitest";
import { CLIENT_LIMITS, DEFAULT_LIMITS } from "../src/shared/limits";
import { isProductionEnv, shouldOfferDebug } from "../src/react/debug-mode";

const original = process.env.NODE_ENV;

describe("shouldOfferDebug", () => {
  afterEach(() => {
    process.env.NODE_ENV = original;
  });

  it("is on by default in development", () => {
    process.env.NODE_ENV = "development";
    expect(isProductionEnv()).toBe(false);
    expect(shouldOfferDebug()).toBe(true);
    expect(shouldOfferDebug(true)).toBe(true);
  });

  it("can be turned off in development", () => {
    process.env.NODE_ENV = "development";
    expect(shouldOfferDebug(false)).toBe(false);
  });

  it("keeps the client message cap aligned with the server", () => {
    expect(CLIENT_LIMITS.maxMessageChars).toBe(DEFAULT_LIMITS.maxMessageChars);
  });

  it("stays off in production even when debug is on", () => {
    process.env.NODE_ENV = "production";
    expect(isProductionEnv()).toBe(true);
    expect(shouldOfferDebug()).toBe(false);
    expect(shouldOfferDebug(true)).toBe(false);
  });
});

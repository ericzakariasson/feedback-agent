import { describe, expect, it } from "vitest";
import { resolveHostColorScheme, type HostSchemeHints } from "../src/react/host-scheme";

function hints(overrides: Partial<HostSchemeHints> = {}): HostSchemeHints {
  return {
    htmlClass: "",
    bodyClass: "",
    htmlAttrs: {},
    bodyAttrs: {},
    htmlColorScheme: "",
    bodyColorScheme: "",
    htmlBackground: "rgba(0, 0, 0, 0)",
    bodyBackground: "rgba(0, 0, 0, 0)",
    prefersDark: false,
    ...overrides,
  };
}

describe("resolveHostColorScheme", () => {
  it("follows html.dark even when the OS preference is light", () => {
    expect(resolveHostColorScheme(hints({ htmlClass: "app dark", prefersDark: false }))).toBe("dark");
  });

  it("follows data-theme on the host document", () => {
    expect(
      resolveHostColorScheme(
        hints({
          htmlAttrs: { "data-theme": "light" },
          prefersDark: true,
        }),
      ),
    ).toBe("light");
  });

  it("follows an exclusive computed color-scheme", () => {
    expect(resolveHostColorScheme(hints({ htmlColorScheme: "only dark", prefersDark: false }))).toBe("dark");
  });

  it("uses background luminance when the host does not declare a theme", () => {
    expect(
      resolveHostColorScheme(
        hints({
          htmlColorScheme: "light dark",
          bodyBackground: "rgb(12, 12, 12)",
          prefersDark: false,
        }),
      ),
    ).toBe("dark");
  });

  it("falls back to the OS preference", () => {
    expect(resolveHostColorScheme(hints({ prefersDark: true }))).toBe("dark");
    expect(resolveHostColorScheme(hints({ prefersDark: false }))).toBe("light");
  });
});

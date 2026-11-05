import { useSyncExternalStore } from "react";

export type ColorScheme = "light" | "dark";

export interface HostSchemeHints {
  htmlClass: string;
  bodyClass: string;
  htmlAttrs: Record<string, string | null>;
  bodyAttrs: Record<string, string | null>;
  htmlColorScheme: string;
  bodyColorScheme: string;
  htmlBackground: string;
  bodyBackground: string;
  prefersDark: boolean;
}

const THEME_ATTRS = [
  "data-theme",
  "data-color-mode",
  "data-bs-theme",
  "data-mode",
  "data-color-scheme",
] as const;

const SCHEME_TOKENS: Record<string, ColorScheme> = {
  dark: "dark",
  "dark-mode": "dark",
  "theme-dark": "dark",
  night: "dark",
  light: "light",
  "light-mode": "light",
  "theme-light": "light",
  day: "light",
};

const OBSERVED_ATTRS = ["class", "style", ...THEME_ATTRS];

export function resolveHostColorScheme(hints: HostSchemeHints): ColorScheme {
  return (
    schemeFromClass(hints.htmlClass) ??
    schemeFromAttrs(hints.htmlAttrs) ??
    schemeFromClass(hints.bodyClass) ??
    schemeFromAttrs(hints.bodyAttrs) ??
    schemeFromColorSchemeProperty(hints.htmlColorScheme) ??
    schemeFromColorSchemeProperty(hints.bodyColorScheme) ??
    schemeFromBackground(hints.bodyBackground) ??
    schemeFromBackground(hints.htmlBackground) ??
    (hints.prefersDark ? "dark" : "light")
  );
}

export function detectHostColorScheme(doc: Document = document): ColorScheme {
  const root = doc.documentElement;
  const body = doc.body;
  const view = doc.defaultView;

  return resolveHostColorScheme({
    htmlClass: root.className,
    bodyClass: body?.className ?? "",
    htmlAttrs: readThemeAttrs(root),
    bodyAttrs: body ? readThemeAttrs(body) : {},
    htmlColorScheme: readColorScheme(root),
    bodyColorScheme: body ? readColorScheme(body) : "",
    htmlBackground: readBackground(root),
    bodyBackground: body ? readBackground(body) : "",
    prefersDark: Boolean(view?.matchMedia("(prefers-color-scheme: dark)").matches),
  });
}

export function subscribeHostColorScheme(onStoreChange: () => void): () => void {
  if (typeof document === "undefined") return () => undefined;

  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: OBSERVED_ATTRS,
  });
  if (document.body) {
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: OBSERVED_ATTRS,
    });
  }

  const media = document.defaultView?.matchMedia("(prefers-color-scheme: dark)");
  media?.addEventListener("change", onStoreChange);

  return () => {
    observer.disconnect();
    media?.removeEventListener("change", onStoreChange);
  };
}

export function useHostColorScheme(): ColorScheme {
  return useSyncExternalStore(subscribeHostColorScheme, getHostColorScheme, getServerColorScheme);
}

function getHostColorScheme(): ColorScheme {
  return detectHostColorScheme(document);
}

function getServerColorScheme(): ColorScheme {
  return "light";
}

function readThemeAttrs(el: Element): Record<string, string | null> {
  return Object.fromEntries(THEME_ATTRS.map((name) => [name, el.getAttribute(name)]));
}

function schemeFromClass(className: string): ColorScheme | null {
  let found: ColorScheme | null = null;
  for (const token of className.split(/\s+/)) {
    const scheme = SCHEME_TOKENS[token.toLowerCase()];
    if (scheme) found = scheme;
  }
  return found;
}

function schemeFromAttrs(attrs: Record<string, string | null>): ColorScheme | null {
  for (const name of THEME_ATTRS) {
    const scheme = schemeFromAttrValue(attrs[name] ?? null);
    if (scheme) return scheme;
  }
  return null;
}

function schemeFromAttrValue(value: string | null): ColorScheme | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return SCHEME_TOKENS[normalized] ?? (normalized.includes("dark") ? "dark" : normalized.includes("light") ? "light" : null);
}

function schemeFromColorSchemeProperty(value: string): ColorScheme | null {
  const parts = value
    .trim()
    .toLowerCase()
    .replace(/^only\s+/, "")
    .split(/\s+/)
    .filter((part) => part === "light" || part === "dark");
  return parts.length === 1 ? parts[0]! : null;
}

function schemeFromBackground(color: string): ColorScheme | null {
  const parsed = parseCssColor(color);
  if (!parsed || parsed.a < 0.5) return null;
  return relativeLuminance(parsed.r, parsed.g, parsed.b) < 0.45 ? "dark" : "light";
}

function parseCssColor(input: string): { r: number; g: number; b: number; a: number } | null {
  const value = input.trim().toLowerCase();
  if (!value || value === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  const rgb = value.match(
    /^rgba?\(\s*([\d.]+)(?:\s*,\s*|\s+)([\d.]+)(?:\s*,\s*|\s+)([\d.]+)(?:\s*(?:,|\/)\s*([\d.]+%?))?\s*\)$/,
  );
  if (!rgb) return null;
  return {
    r: Number(rgb[1]),
    g: Number(rgb[2]),
    b: Number(rgb[3]),
    a: rgb[4] === undefined ? 1 : rgb[4].endsWith("%") ? Number.parseFloat(rgb[4]) / 100 : Number(rgb[4]),
  };
}

function relativeLuminance(r: number, g: number, b: number): number {
  const toLinear = (channel: number) => {
    const scaled = channel / 255;
    return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function readColorScheme(el: Element): string {
  return el.ownerDocument.defaultView?.getComputedStyle(el).colorScheme ?? "";
}

function readBackground(el: Element): string {
  return el.ownerDocument.defaultView?.getComputedStyle(el).backgroundColor ?? "";
}

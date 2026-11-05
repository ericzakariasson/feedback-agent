const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const BEARER_RE = /bearer\s+[a-zA-Z0-9._\-+=/]+/gi;
const SECRET_ASSIGN_RE =
  /\b(api[_-]?key|secret|token|password|passwd|authorization|credential)["'\s:=]+[^\s"'&,;]{6,}/gi;
const LONG_KEY_RE = /\b[a-zA-Z0-9_-]{40,}\b/g;
const JWT_RE = /\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g;

export function redactText(value: string, maxLen = 500): string {
  const redacted = value
    .replace(EMAIL_RE, "[email]")
    .replace(JWT_RE, "[jwt]")
    .replace(BEARER_RE, "bearer [redacted]")
    .replace(SECRET_ASSIGN_RE, "$1=[redacted]")
    .replace(LONG_KEY_RE, "[redacted]");
  if (redacted.length <= maxLen) return redacted;
  return `${redacted.slice(0, maxLen)}…`;
}

export function redactUnknown(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (typeof value === "string") return redactText(value, 200);
  if (typeof value === "number" || typeof value === "boolean" || value == null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactUnknown(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 30)) {
      if (looksLikeSecretKey(key)) {
        out[key] = "[redacted]";
        continue;
      }
      out[key] = redactUnknown(item, depth + 1);
    }
    return out;
  }
  return String(value);
}

export function looksLikeSecretKey(name: string): boolean {
  const normalized = name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/-/g, "_")
    .toLowerCase();
  return /(pass(word|wd)?|secret|token|api_?key|authorization|cookie|email|ssn|card)/.test(
    normalized,
  );
}

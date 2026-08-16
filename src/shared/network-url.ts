import { redactText } from "./redact";

const SECRET_QUERY = /(token|key|secret|auth|password|passwd|session|code|jwt|sig)/i;

export function sanitizeNetworkUrl(url: string): string {
  try {
    const parsed = new URL(url, "http://localhost");
    for (const key of [...parsed.searchParams.keys()]) {
      if (SECRET_QUERY.test(key)) parsed.searchParams.set(key, "[redacted]");
    }
    return redactText(parsed.toString(), 300);
  } catch {
    return redactText(url, 300);
  }
}

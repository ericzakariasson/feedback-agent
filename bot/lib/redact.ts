const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const BEARER_RE = /bearer\s+[a-zA-Z0-9._\-+=/]+/gi;
const SECRET_ASSIGN_RE =
  /\b(api[_-]?key|secret|token|password|passwd|authorization|credential)["'\s:=]+[^\s"'&,;]{6,}/gi;
const LONG_KEY_RE = /\b[a-zA-Z0-9_-]{40,}\b/g;
const JWT_RE = /\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g;
const SLACK_TOKEN_RE = /\bxox[abposr]-[a-zA-Z0-9-]+/g;

/** Best-effort scrub of emails and credential-shaped strings before text leaves Slack. */
export function redactText(value: string, maxLen = 4_000): string {
  const redacted = value
    .replace(EMAIL_RE, "[email]")
    .replace(JWT_RE, "[jwt]")
    .replace(SLACK_TOKEN_RE, "[slack-token]")
    .replace(BEARER_RE, "bearer [redacted]")
    .replace(SECRET_ASSIGN_RE, "$1=[redacted]")
    .replace(LONG_KEY_RE, "[redacted]");
  if (redacted.length <= maxLen) return redacted;
  return `${redacted.slice(0, maxLen)}…`;
}

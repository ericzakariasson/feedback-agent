import { CLIENT_LIMITS } from "../../shared/limits";
import { redactText } from "../../shared/redact";
import type { NetworkEntry } from "../../shared/types";

const SECRET_QUERY = /(token|key|secret|auth|password|passwd|session|code|jwt|sig)/i;

export function shouldIgnoreNetworkUrl(url: string, endpoint?: string): boolean {
  if (!url) return true;
  if (url.startsWith("data:") || url.startsWith("blob:")) return true;
  if (endpoint && isFeedbackEndpoint(url, endpoint)) return true;
  return false;
}

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

export function isFeedbackEndpoint(url: string, endpoint: string): boolean {
  try {
    const base = typeof location === "undefined" ? "http://localhost/" : location.href;
    const resolved = new URL(endpoint, base);
    const request = new URL(url, resolved.href);
    return request.origin === resolved.origin && request.pathname === resolved.pathname;
  } catch {
    return url.includes(endpoint);
  }
}

export class NetworkLog {
  private entries: NetworkEntry[] = [];

  constructor(private readonly windowMs: number) {}

  record(entry: NetworkEntry): void {
    this.entries.push(entry);
    if (this.entries.length > CLIENT_LIMITS.maxNetworkEntries * 2) {
      this.trim(Date.now());
    }
  }

  snapshot(): NetworkEntry[] {
    this.trim(Date.now());
    return this.entries.slice(-CLIENT_LIMITS.maxNetworkEntries);
  }

  clear(): void {
    this.entries = [];
  }

  private trim(now: number): void {
    const cutoff = now - this.windowMs;
    this.entries = this.entries.filter((item) => Date.parse(item.timestamp) >= cutoff);
  }
}

export function attachNetworkListeners(
  interceptor: {
    on: (event: "request" | "response", listener: (event: NetworkHookEvent) => unknown) => unknown
  },
  log: NetworkLog,
  endpoint?: string,
): void {
  const pending = new Map<string, { at: number; method: string; url: string }>();

  interceptor.on("request", ({ request, requestId }) => {
    if (shouldIgnoreNetworkUrl(request.url, endpoint)) return;
    pending.set(requestId, {
      at: Date.now(),
      method: request.method,
      url: request.url,
    });
  });

  interceptor.on("response", ({ request, requestId, response }) => {
    const started = pending.get(requestId);
    pending.delete(requestId);
    const url = started?.url ?? request.url;
    if (shouldIgnoreNetworkUrl(url, endpoint)) return;
    log.record({
      timestamp: new Date().toISOString(),
      method: (started?.method ?? request.method).toUpperCase(),
      url: sanitizeNetworkUrl(url),
      status: response?.status,
      durationMs: started ? Math.max(0, Date.now() - started.at) : undefined,
    });
  });
}

export type NetworkHookEvent = {
  request: { method: string; url: string }
  requestId: string
  response?: { status: number }
}

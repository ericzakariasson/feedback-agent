import { CLIENT_LIMITS } from "../../shared/limits";
import { sanitizeNetworkUrl } from "../../shared/network-url";
import type { NetworkEntry } from "../../shared/types";

type StoredNetworkEntry = NetworkEntry & { requestId: string };

export function shouldIgnoreNetworkUrl(url: string, endpoint?: string): boolean {
  if (!url) return true;
  if (url.startsWith("data:") || url.startsWith("blob:")) return true;
  if (endpoint && isFeedbackEndpoint(url, endpoint)) return true;
  return false;
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
  private entries: StoredNetworkEntry[] = [];

  constructor(private readonly windowMs: number) {}

  upsert(requestId: string, entry: NetworkEntry): void {
    const index = this.entries.findIndex((item) => item.requestId === requestId);
    if (index >= 0) {
      this.entries[index] = { ...this.entries[index], ...entry, requestId };
    } else {
      this.entries.push({ ...entry, requestId });
    }
    this.trim(Date.now());
  }

  get(requestId: string): NetworkEntry | undefined {
    const found = this.entries.find((item) => item.requestId === requestId);
    if (!found) return undefined;
    const { requestId: _id, ...entry } = found;
    return entry;
  }

  snapshot(): NetworkEntry[] {
    this.trim(Date.now());
    return this.entries.map(({ requestId: _id, ...entry }) => entry);
  }

  clear(): void {
    this.entries = [];
  }

  private trim(now: number): void {
    const cutoff = now - this.windowMs;
    this.entries = this.entries.filter((item) => Date.parse(item.timestamp) >= cutoff);
    if (this.entries.length > CLIENT_LIMITS.maxNetworkEntries) {
      this.entries = this.entries.slice(-CLIENT_LIMITS.maxNetworkEntries);
    }
  }
}

export function attachNetworkListeners(
  interceptor: {
    on: (event: "request" | "response", listener: (event: NetworkHookEvent) => unknown) => unknown
  },
  log: NetworkLog,
  endpoint?: string,
): void {
  interceptor.on("request", ({ request, requestId }) => {
    if (shouldIgnoreNetworkUrl(request.url, endpoint)) return;
    log.upsert(requestId, {
      timestamp: new Date().toISOString(),
      method: request.method.toUpperCase(),
      url: sanitizeNetworkUrl(request.url),
    });
  });

  interceptor.on("response", ({ request, requestId, response }) => {
    const started = log.get(requestId);
    if (shouldIgnoreNetworkUrl(request.url, endpoint) && !started) return;
    log.upsert(requestId, {
      timestamp: started?.timestamp ?? new Date().toISOString(),
      method: (started?.method ?? request.method).toUpperCase(),
      url: sanitizeNetworkUrl(request.url),
      status: response?.status,
      durationMs: started ? Math.max(0, Date.now() - Date.parse(started.timestamp)) : undefined,
    });
  });
}

export type NetworkHookEvent = {
  request: { method: string; url: string }
  requestId: string
  response?: { status: number }
}

export { sanitizeNetworkUrl };

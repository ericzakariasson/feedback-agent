import type { FeedbackHandlerSuccess } from "../shared/types";
import type { FeedbackStore } from "./types";

interface TimedValue<T> {
  value: T
  expiresAt: number
}

export class TtlMap<T> {
  private store = new Map<string, TimedValue<T>>();

  constructor(private readonly defaultTtlMs: number) {}

  get(key: string): T | undefined {
    this.prune();
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  private prune(): void {
    const now = Date.now();
    if (this.store.size < 200) return;
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) this.store.delete(key);
    }
  }
}

export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  check(key: string): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const next = (this.hits.get(key) ?? []).filter((ts) => ts > cutoff);
    if (next.length >= this.max) {
      this.hits.set(key, next);
      return false;
    }
    next.push(now);
    this.hits.set(key, next);
    return true;
  }
}

/** In-process rate limit + dedupe. Fine for one instance; use `store` on serverless. */
export class MemoryFeedbackStore implements FeedbackStore {
  private limiters = new Map<string, SlidingWindowLimiter>();
  private seen = new TtlMap<FeedbackHandlerSuccess>(10 * 60 * 1000);

  checkRateLimit(key: string, limit: { max: number; windowMs: number }): boolean {
    const limiterKey = `${limit.max}:${limit.windowMs}`;
    let limiter = this.limiters.get(limiterKey);
    if (!limiter) {
      limiter = new SlidingWindowLimiter(limit.max, limit.windowMs);
      this.limiters.set(limiterKey, limiter);
    }
    return limiter.check(key);
  }

  getDedupe(eventId: string): FeedbackHandlerSuccess | null {
    return this.seen.get(eventId) ?? null;
  }

  setDedupe(eventId: string, result: FeedbackHandlerSuccess, ttlMs: number): void {
    this.seen.set(eventId, result, ttlMs);
  }
}

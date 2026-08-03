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

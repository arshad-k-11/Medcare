import { hashIp } from './crypto';

/**
 * Fixed-window rate limiter.
 *
 * The in-memory store is correct for a single instance only; a multi-instance deployment
 * must swap in Redis (see `RateLimitStore`). This is called out in the README's known
 * limitations rather than pretending the in-memory version scales.
 */
export type RateLimitStore = {
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
};

class MemoryStore implements RateLimitStore {
  private buckets = new Map<string, { count: number; resetAt: number }>();

  async increment(key: string, windowMs: number) {
    const now = Date.now();
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, fresh);
      this.sweep(now);
      return fresh;
    }
    existing.count += 1;
    return existing;
  }

  private sweep(now: number) {
    if (this.buckets.size < 5000) return;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

const globalForStore = globalThis as unknown as { rateLimitStore?: RateLimitStore };
const store: RateLimitStore = globalForStore.rateLimitStore ?? new MemoryStore();
globalForStore.rateLimitStore = store;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export const LIMITS = {
  auth: { limit: 10, windowMs: 60_000 },
  otp: { limit: 5, windowMs: 60_000 },
  intake: { limit: 5, windowMs: 60_000 },
  contact: { limit: 5, windowMs: 60_000 },
  write: { limit: 60, windowMs: 60_000 },
  read: { limit: 240, windowMs: 60_000 },
} as const;

export async function rateLimit(
  bucket: keyof typeof LIMITS,
  identity: string | null | undefined,
  requestHeaders: Headers,
): Promise<RateLimitResult> {
  const { limit, windowMs } = LIMITS[bucket];
  const ip =
    requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    requestHeaders.get('x-real-ip') ??
    'unknown';
  const key = `${bucket}:${hashIp(ip) ?? 'unknown'}:${identity ?? 'anon'}`;
  const { count, resetAt } = await store.increment(key, windowMs);
  return {
    ok: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
  };
}

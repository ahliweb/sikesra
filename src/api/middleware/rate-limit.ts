import type { MiddlewareHandler } from "hono";

// Simple in-memory rate limiter per IP.
// For production, replace the store with a shared Redis-compatible backend.

interface BucketEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, BucketEntry>();

export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyFn?: (c: Parameters<MiddlewareHandler>[0]) => string;
}): MiddlewareHandler {
  const { windowMs, max, keyFn } = options;

  return async (c, next) => {
    const key = keyFn
      ? keyFn(c)
      : (c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown");

    const now = Date.now();
    let entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    c.header("X-RateLimit-Limit", String(max));
    c.header("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      const requestId = (c.get("requestId") as string | undefined) ?? "unknown";
      return c.json(
        {
          success: false,
          error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later." },
          meta: { requestId },
        },
        429,
      );
    }

    await next();
  };
}

// SIKESRA Rate Limiting Service
// KV-based rate limiting for import, export, document, and sensitive operations
// Source: docs/sikesra/06_security_rbac_abac.md, Issue #183

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  ttlSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  import_upload: { maxRequests: 5, windowSeconds: 3600, ttlSeconds: 3900 },
  export_generate: { maxRequests: 10, windowSeconds: 3600, ttlSeconds: 3900 },
  document_download: { maxRequests: 50, windowSeconds: 3600, ttlSeconds: 3900 },
  sensitive_reveal: { maxRequests: 20, windowSeconds: 3600, ttlSeconds: 3900 },
  id_correction: { maxRequests: 10, windowSeconds: 3600, ttlSeconds: 3900 },
};

function getRateLimitKey(userId: string, action: string, windowStart: number): string {
  return `rate_limit:${userId}:${action}:${windowStart}`;
}

function getCurrentWindowStart(windowSeconds: number): number {
  const now = Date.now();
  return Math.floor(now / (windowSeconds * 1000)) * (windowSeconds * 1000);
}

export async function checkRateLimit(
  kv: KVNamespace,
  userId: string,
  action: string,
  config?: RateLimitConfig,
): Promise<RateLimitResult> {
  const effectiveConfig = config ?? RATE_LIMIT_CONFIGS[action];
  if (!effectiveConfig) {
    throw new Error(`RATE_LIMIT_CONFIG_MISSING: ${action}`);
  }

  const windowStart = getCurrentWindowStart(effectiveConfig.windowSeconds);
  const key = getRateLimitKey(userId, action, windowStart);
  const resetAt = windowStart + (effectiveConfig.windowSeconds * 1000);

  const currentCount = await kv.get(key);
  const count = currentCount ? parseInt(currentCount, 10) : 0;

  if (count >= effectiveConfig.maxRequests) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter: retryAfter > 0 ? retryAfter : 1,
    };
  }

  return {
    allowed: true,
    remaining: effectiveConfig.maxRequests - count - 1,
    resetAt,
  };
}

export async function incrementRateLimit(
  kv: KVNamespace,
  userId: string,
  action: string,
  config?: RateLimitConfig,
): Promise<void> {
  const effectiveConfig = config ?? RATE_LIMIT_CONFIGS[action];
  if (!effectiveConfig) {
    throw new Error(`RATE_LIMIT_CONFIG_MISSING: ${action}`);
  }

  const windowStart = getCurrentWindowStart(effectiveConfig.windowSeconds);
  const key = getRateLimitKey(userId, action, windowStart);

  const currentCount = await kv.get(key);
  const count = currentCount ? parseInt(currentCount, 10) : 0;

  await kv.put(key, String(count + 1), { expirationTtl: effectiveConfig.ttlSeconds });
}

export async function enforceRateLimit(
  kv: KVNamespace,
  userId: string,
  action: string,
  config?: RateLimitConfig,
): Promise<RateLimitResult> {
  const result = await checkRateLimit(kv, userId, action, config);

  if (result.allowed) {
    await incrementRateLimit(kv, userId, action, config);
  }

  return result;
}

export function createRateLimitResponse(result: RateLimitResult): Response {
  const body = JSON.stringify({
    error: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests. Please try again later.",
    retryAfter: result.retryAfter,
    resetAt: result.resetAt,
  });

  return new Response(body, {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(result.retryAfter ?? 60),
      "X-RateLimit-Reset": String(result.resetAt),
    },
  });
}

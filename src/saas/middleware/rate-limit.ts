import type { Context, Next } from "hono";
import type { TenantContext } from "./tenant-context.js";

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

const PLAN_LIMITS: Record<string, RateLimitConfig> = {
  free: { windowMs: 60_000, maxRequests: 10 },
  starter: { windowMs: 60_000, maxRequests: 30 },
  pro: { windowMs: 60_000, maxRequests: 60 },
  enterprise: { windowMs: 60_000, maxRequests: 120 },
};

// In-memory rate limit store (replace with Redis for multi-instance)
const store = new Map<string, { count: number; resetAt: number }>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 300_000);

/**
 * Rate limiting middleware using in-memory store.
 * For production multi-instance deployments, replace with Redis-based implementation.
 */
export function rateLimitMiddleware(overrideConfig?: RateLimitConfig) {
  return async (c: Context, next: Next) => {
    const tenant = c.get("tenant") as TenantContext | undefined;
    const key = tenant?.tenantId ?? c.req.header("x-forwarded-for") ?? "anonymous";
    const config = overrideConfig ?? PLAN_LIMITS[tenant?.plan ?? "free"] ?? PLAN_LIMITS.free;

    const now = Date.now();
    let entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + config.windowMs };
      store.set(key, entry);
    }

    entry.count++;

    c.header("X-RateLimit-Limit", String(config.maxRequests));
    c.header("X-RateLimit-Remaining", String(Math.max(0, config.maxRequests - entry.count)));
    c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > config.maxRequests) {
      return c.json(
        { error: "Rate limit exceeded", retryAfter: Math.ceil((entry.resetAt - now) / 1000) },
        429,
      );
    }

    await next();
  };
}

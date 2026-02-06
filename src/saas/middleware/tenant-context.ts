import type { Context, Next } from "hono";
import type { JwtPayload } from "./auth.js";
import { getTenantById } from "../services/tenant-registry.js";

export type TenantContext = {
  tenantId: string;
  agentId: string;
  plan: string;
  userId: string;
};

/**
 * Extracts tenant information from the JWT payload and attaches enriched
 * tenant context to the request. Must be used after authMiddleware.
 */
export function tenantContextMiddleware() {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as JwtPayload | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const tenantCtx: TenantContext = {
      tenantId: user.tenantId,
      agentId: user.agentId,
      plan: user.plan,
      userId: user.sub,
    };

    c.set("tenant", tenantCtx);
    await next();
  };
}

/**
 * Validates that the tenant exists and is active in the database.
 * More expensive than tenantContextMiddleware - use for critical operations.
 */
export function validateTenantMiddleware() {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as JwtPayload | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const tenant = await getTenantById(user.tenantId);
    if (!tenant) {
      return c.json({ error: "Tenant not found" }, 404);
    }

    const tenantCtx: TenantContext = {
      tenantId: tenant.id,
      agentId: tenant.agent_id,
      plan: tenant.plan,
      userId: user.sub,
    };

    c.set("tenant", tenantCtx);
    await next();
  };
}

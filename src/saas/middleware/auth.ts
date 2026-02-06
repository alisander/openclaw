import type { Context, Next } from "hono";
import * as jose from "jose";

const JWT_SECRET_KEY = new TextEncoder().encode(
  process.env.OPENCLAW_SAAS_JWT_SECRET ?? "openclaw-saas-dev-secret-change-in-prod",
);
const JWT_ISSUER = "openclaw-saas";
const JWT_AUDIENCE = "openclaw-saas";

export type JwtPayload = {
  sub: string; // user ID
  email: string;
  tenantId: string;
  agentId: string;
  plan: string;
  role?: "user" | "admin";
};

export async function signToken(payload: JwtPayload, expiresIn = "24h"): Promise<string> {
  return new jose.SignJWT({
    email: payload.email,
    tenantId: payload.tenantId,
    agentId: payload.agentId,
    plan: payload.plan,
    role: payload.role ?? "user",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET_KEY);
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new jose.SignJWT({ type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET_KEY);
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jose.jwtVerify(token, JWT_SECRET_KEY, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
  return {
    sub: payload.sub!,
    email: payload.email as string,
    tenantId: payload.tenantId as string,
    agentId: payload.agentId as string,
    plan: payload.plan as string,
    role: (payload.role as "user" | "admin") ?? "user",
  };
}

export async function verifyRefreshToken(token: string): Promise<string> {
  const { payload } = await jose.jwtVerify(token, JWT_SECRET_KEY, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
  if (payload.type !== "refresh") {
    throw new Error("Invalid refresh token type");
  }
  return payload.sub!;
}

/**
 * Hono middleware that verifies JWT and attaches user context to the request.
 */
export function authMiddleware() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "Missing or invalid authorization header" }, 401);
    }
    const token = authHeader.slice(7);
    try {
      const payload = await verifyToken(token);
      c.set("user", payload);
      await next();
    } catch {
      return c.json({ error: "Invalid or expired token" }, 401);
    }
  };
}

/**
 * Middleware that requires admin role.
 */
export function adminMiddleware() {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as JwtPayload | undefined;
    if (!user || user.role !== "admin") {
      return c.json({ error: "Admin access required" }, 403);
    }
    await next();
  };
}

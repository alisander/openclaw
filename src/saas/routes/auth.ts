import { Hono } from "hono";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { queryOne, query } from "../db/connection.js";
import { signToken, signRefreshToken, verifyRefreshToken, type JwtPayload } from "../middleware/auth.js";
import { createTenant, getTenantByUserId } from "../services/tenant-registry.js";
import { initBalance } from "../services/credit-manager.js";
import { provisionAgent } from "../services/agent-provisioner.js";
import { getPlanDetails } from "../services/billing.js";

const SALT_ROUNDS = 12;

const auth = new Hono();

auth.post("/signup", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string; name?: string }>();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const name = body.name?.trim();

  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }
  if (password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  // Check if user exists
  const existing = await queryOne<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]);
  if (existing) {
    return c.json({ error: "An account with this email already exists" }, 409);
  }

  // Create user
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await queryOne<{ id: string; email: string; name: string | null }>(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING id, email, name`,
    [email, passwordHash, name ?? null],
  );
  if (!user) {
    return c.json({ error: "Failed to create user" }, 500);
  }

  // Create tenant with agent
  const agentId = `saas-${crypto.randomUUID().slice(0, 8)}`;
  const tenant = await createTenant({
    userId: user.id,
    agentId,
    displayName: name,
    plan: "free",
  });

  // Initialize credit balance with free plan credits
  const planDetails = getPlanDetails("free");
  await initBalance(tenant.id, planDetails.includedCreditsUsd);

  // Provision agent directories
  await provisionAgent({ agentId });

  // Generate tokens
  const jwtPayload: JwtPayload = {
    sub: user.id,
    email: user.email,
    tenantId: tenant.id,
    agentId: tenant.agent_id,
    plan: tenant.plan,
  };
  const accessToken = await signToken(jwtPayload);
  const refreshToken = await signRefreshToken(user.id);

  return c.json({
    user: { id: user.id, email: user.email, name: user.name },
    tenant: { id: tenant.id, agentId: tenant.agent_id, plan: tenant.plan },
    accessToken,
    refreshToken,
  }, 201);
});

auth.post("/login", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  const user = await queryOne<{
    id: string;
    email: string;
    password_hash: string;
    name: string | null;
    status: string;
  }>("SELECT id, email, password_hash, name, status FROM users WHERE email = $1", [email]);

  if (!user) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  if (user.status !== "active") {
    return c.json({ error: "Account is suspended" }, 403);
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const tenant = await getTenantByUserId(user.id);
  if (!tenant) {
    return c.json({ error: "No tenant found for user" }, 500);
  }

  const jwtPayload: JwtPayload = {
    sub: user.id,
    email: user.email,
    tenantId: tenant.id,
    agentId: tenant.agent_id,
    plan: tenant.plan,
  };
  const accessToken = await signToken(jwtPayload);
  const refreshToken = await signRefreshToken(user.id);

  return c.json({
    user: { id: user.id, email: user.email, name: user.name },
    tenant: { id: tenant.id, agentId: tenant.agent_id, plan: tenant.plan },
    accessToken,
    refreshToken,
  });
});

auth.post("/refresh", async (c) => {
  const body = await c.req.json<{ refreshToken?: string }>();
  if (!body.refreshToken) {
    return c.json({ error: "Refresh token required" }, 400);
  }

  try {
    const userId = await verifyRefreshToken(body.refreshToken);

    const user = await queryOne<{ id: string; email: string; name: string | null; status: string }>(
      "SELECT id, email, name, status FROM users WHERE id = $1",
      [userId],
    );
    if (!user || user.status !== "active") {
      return c.json({ error: "User not found or suspended" }, 401);
    }

    const tenant = await getTenantByUserId(user.id);
    if (!tenant) {
      return c.json({ error: "No tenant found" }, 500);
    }

    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: tenant.id,
      agentId: tenant.agent_id,
      plan: tenant.plan,
    };
    const accessToken = await signToken(jwtPayload);
    const newRefreshToken = await signRefreshToken(user.id);

    return c.json({ accessToken, refreshToken: newRefreshToken });
  } catch {
    return c.json({ error: "Invalid refresh token" }, 401);
  }
});

export { auth };

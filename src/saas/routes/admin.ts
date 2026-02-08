import { Hono } from "hono";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import { query, queryOne, queryRows } from "../db/connection.js";

const admin = new Hono();

admin.use("/*", authMiddleware(), adminMiddleware());

// ── User Management ──

admin.get("/users", async (c) => {
  const limit = Number(c.req.query("limit")) || 50;
  const offset = Number(c.req.query("offset")) || 0;
  const search = c.req.query("search") ?? "";

  let whereClause = "";
  const params: unknown[] = [limit, offset];

  if (search) {
    whereClause = "WHERE email ILIKE $3 OR name ILIKE $3";
    params.push(`%${search}%`);
  }

  const users = await queryRows<{
    id: string;
    email: string;
    name: string | null;
    status: string;
    role: string;
    created_at: Date;
  }>(
    `SELECT id, email, name, status, COALESCE(role, 'user') as role, created_at
     FROM users ${whereClause}
     ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    params,
  );
  const total = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM users ${search ? "WHERE email ILIKE $1 OR name ILIKE $1" : ""}`,
    search ? [`%${search}%`] : [],
  );
  return c.json({ users, total: Number(total?.count ?? 0) });
});

admin.get("/users/:userId", async (c) => {
  const userId = c.req.param("userId");
  const user = await queryOne<{
    id: string;
    email: string;
    name: string | null;
    status: string;
    role: string;
    email_verified: boolean;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT id, email, name, status, COALESCE(role, 'user') as role, email_verified, created_at, updated_at
     FROM users WHERE id = $1`,
    [userId],
  );
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  // Get tenant info
  const tenant = await queryOne<{
    id: string;
    agent_id: string;
    display_name: string | null;
    plan: string;
    status: string;
    default_model: string | null;
    created_at: Date;
  }>(
    "SELECT id, agent_id, display_name, plan, status, default_model, created_at FROM tenants WHERE user_id = $1",
    [userId],
  );

  // Get credit balance
  const balance = await queryOne<{ balance: string }>(
    "SELECT balance FROM credit_balances WHERE tenant_id = $1",
    [tenant?.id],
  );

  // Get usage stats
  const usage = await queryOne<{ total_events: string; total_cost: string }>(
    `SELECT COUNT(*) as total_events, COALESCE(SUM(total_cost_usd), 0) as total_cost
     FROM usage_events WHERE tenant_id = $1`,
    [tenant?.id],
  );

  return c.json({
    user,
    tenant,
    creditBalance: Number(balance?.balance ?? 0),
    usage: {
      totalEvents: Number(usage?.total_events ?? 0),
      totalCost: Number(usage?.total_cost ?? 0),
    },
  });
});

admin.post("/users/:userId/suspend", async (c) => {
  const userId = c.req.param("userId");
  await query("UPDATE users SET status = 'suspended', updated_at = NOW() WHERE id = $1", [userId]);
  return c.json({ success: true });
});

admin.post("/users/:userId/activate", async (c) => {
  const userId = c.req.param("userId");
  await query("UPDATE users SET status = 'active', updated_at = NOW() WHERE id = $1", [userId]);
  return c.json({ success: true });
});

admin.post("/users/:userId/role", async (c) => {
  const userId = c.req.param("userId");
  const body = await c.req.json<{ role: "user" | "admin" }>();
  if (!["user", "admin"].includes(body.role)) {
    return c.json({ error: "Invalid role" }, 400);
  }
  await query("UPDATE users SET role = $2, updated_at = NOW() WHERE id = $1", [userId, body.role]);
  return c.json({ success: true });
});

admin.delete("/users/:userId", async (c) => {
  const userId = c.req.param("userId");
  await query("UPDATE users SET status = 'deleted', updated_at = NOW() WHERE id = $1", [userId]);
  return c.json({ success: true });
});

// ── Tenant Management ──

admin.get("/tenants", async (c) => {
  const limit = Number(c.req.query("limit")) || 50;
  const offset = Number(c.req.query("offset")) || 0;

  const tenants = await queryRows<{
    id: string;
    user_id: string;
    agent_id: string;
    display_name: string | null;
    plan: string;
    status: string;
    default_model: string | null;
    created_at: Date;
    email: string;
  }>(
    `SELECT t.id, t.user_id, t.agent_id, t.display_name, t.plan, t.status,
            t.default_model, t.created_at, u.email
     FROM tenants t JOIN users u ON t.user_id = u.id
     ORDER BY t.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  const total = await queryOne<{ count: string }>("SELECT COUNT(*) as count FROM tenants");
  return c.json({ tenants, total: Number(total?.count ?? 0) });
});

admin.post("/tenants/:tenantId/plan", async (c) => {
  const tenantId = c.req.param("tenantId");
  const body = await c.req.json<{ plan: string }>();
  if (!["free", "starter", "pro", "enterprise"].includes(body.plan)) {
    return c.json({ error: "Invalid plan" }, 400);
  }
  await query("UPDATE tenants SET plan = $2 WHERE id = $1", [tenantId, body.plan]);
  return c.json({ success: true });
});

admin.post("/tenants/:tenantId/status", async (c) => {
  const tenantId = c.req.param("tenantId");
  const body = await c.req.json<{ status: string }>();
  if (!["active", "suspended", "deleted"].includes(body.status)) {
    return c.json({ error: "Invalid status" }, 400);
  }
  await query("UPDATE tenants SET status = $2 WHERE id = $1", [tenantId, body.status]);
  return c.json({ success: true });
});

// ── Credit Management ──

admin.post("/tenants/:tenantId/credits", async (c) => {
  const tenantId = c.req.param("tenantId");
  const body = await c.req.json<{ amount: number; description?: string }>();

  if (!body.amount || body.amount <= 0) {
    return c.json({ error: "Amount must be positive" }, 400);
  }

  // amount is in dollars, convert to micro-dollars
  const microDollars = Math.round(body.amount * 1_000_000);

  // Update balance
  const updated = await queryOne<{ balance: string }>(
    `INSERT INTO credit_balances (tenant_id, balance, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (tenant_id) DO UPDATE SET
       balance = credit_balances.balance + $2,
       updated_at = NOW()
     RETURNING balance`,
    [tenantId, microDollars],
  );

  // Record in ledger
  await query(
    `INSERT INTO credit_ledger (tenant_id, amount, balance_after, description, reference_type)
     VALUES ($1, $2, $3, $4, 'admin_grant')`,
    [tenantId, microDollars, updated?.balance ?? microDollars, body.description ?? "Admin credit grant"],
  );

  return c.json({ success: true, newBalance: Number(updated?.balance ?? 0) });
});

admin.get("/tenants/:tenantId/credits", async (c) => {
  const tenantId = c.req.param("tenantId");

  const balance = await queryOne<{ balance: string }>(
    "SELECT balance FROM credit_balances WHERE tenant_id = $1",
    [tenantId],
  );

  const ledger = await queryRows<{
    id: string;
    amount: string;
    balance_after: string;
    description: string;
    reference_type: string;
    created_at: Date;
  }>(
    "SELECT id, amount, balance_after, description, reference_type, created_at FROM credit_ledger WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50",
    [tenantId],
  );

  return c.json({
    balance: Number(balance?.balance ?? 0),
    ledger,
  });
});

// ── Channel Overview (across all tenants) ──

admin.get("/channels", async (c) => {
  const channels = await queryRows<{
    channel: string;
    total: number;
    enabled: number;
  }>(
    `SELECT channel, COUNT(*)::int as total, COUNT(*) FILTER (WHERE enabled = true)::int as enabled
     FROM tenant_channels GROUP BY channel ORDER BY total DESC`,
  );
  return c.json({ channels });
});

admin.get("/channels/:channelId", async (c) => {
  const channelId = c.req.param("channelId");
  const tenants = await queryRows<{
    tenant_id: string;
    display_name: string | null;
    email: string;
    enabled: boolean;
    status: string;
    created_at: Date;
  }>(
    `SELECT tc.tenant_id, t.display_name, u.email, tc.enabled, tc.status, tc.created_at
     FROM tenant_channels tc
     JOIN tenants t ON tc.tenant_id = t.id
     JOIN users u ON t.user_id = u.id
     WHERE tc.channel = $1
     ORDER BY tc.created_at DESC`,
    [channelId],
  );
  return c.json({ tenants });
});

// ── Revenue Dashboard ──

admin.get("/revenue", async (c) => {
  const days = Number(c.req.query("days")) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [totals, daily, byModel, byTenant] = await Promise.all([
    queryOne<{
      total_revenue: string;
      total_base_cost: string;
      total_margin: string;
      total_events: string;
    }>(
      `SELECT
         COALESCE(SUM(total_cost_usd), 0) as total_revenue,
         COALESCE(SUM(base_cost_usd), 0) as total_base_cost,
         COALESCE(SUM(margin_cost_usd), 0) as total_margin,
         COUNT(*) as total_events
       FROM usage_events WHERE created_at >= $1`,
      [since],
    ),
    queryRows<{ date: string; revenue: number; cost: number; margin: number }>(
      `SELECT
         DATE(created_at) as date,
         COALESCE(SUM(total_cost_usd), 0)::float as revenue,
         COALESCE(SUM(base_cost_usd), 0)::float as cost,
         COALESCE(SUM(margin_cost_usd), 0)::float as margin
       FROM usage_events WHERE created_at >= $1
       GROUP BY DATE(created_at) ORDER BY date`,
      [since],
    ),
    queryRows<{ provider: string; model: string; events: number; revenue: number }>(
      `SELECT
         provider, model,
         COUNT(*)::int as events,
         COALESCE(SUM(total_cost_usd), 0)::float as revenue
       FROM usage_events WHERE created_at >= $1
       GROUP BY provider, model ORDER BY revenue DESC`,
      [since],
    ),
    queryRows<{ tenant_id: string; display_name: string; email: string; events: number; revenue: number }>(
      `SELECT
         ue.tenant_id, COALESCE(t.display_name, u.name, u.email) as display_name, u.email,
         COUNT(*)::int as events,
         COALESCE(SUM(ue.total_cost_usd), 0)::float as revenue
       FROM usage_events ue
       JOIN tenants t ON ue.tenant_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE ue.created_at >= $1
       GROUP BY ue.tenant_id, t.display_name, u.name, u.email
       ORDER BY revenue DESC LIMIT 20`,
      [since],
    ),
  ]);

  return c.json({
    totals: {
      revenue: Number(totals?.total_revenue ?? 0),
      baseCost: Number(totals?.total_base_cost ?? 0),
      margin: Number(totals?.total_margin ?? 0),
      events: Number(totals?.total_events ?? 0),
    },
    daily,
    byModel,
    byTenant,
  });
});

// ── Model Pricing Management ──

admin.get("/pricing", async (c) => {
  const pricing = await queryRows<{
    id: number;
    provider: string;
    model: string;
    input_cost_per_mtok: number;
    output_cost_per_mtok: number;
    margin_percent: number;
    plan_overrides: Record<string, number>;
  }>("SELECT * FROM model_pricing ORDER BY provider, model");
  return c.json({ pricing });
});

admin.post("/pricing", async (c) => {
  const body = await c.req.json<{
    provider: string;
    model: string;
    inputCostPerMtok: number;
    outputCostPerMtok: number;
    marginPercent?: number;
    planOverrides?: Record<string, number>;
  }>();

  if (!body.provider || !body.model || body.inputCostPerMtok == null || body.outputCostPerMtok == null) {
    return c.json({ error: "provider, model, inputCostPerMtok, and outputCostPerMtok are required" }, 400);
  }

  const marginPercent = Math.max(50, body.marginPercent ?? 75);

  await query(
    `INSERT INTO model_pricing (provider, model, input_cost_per_mtok, output_cost_per_mtok, margin_percent, plan_overrides)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (provider, model) DO UPDATE SET
       input_cost_per_mtok = EXCLUDED.input_cost_per_mtok,
       output_cost_per_mtok = EXCLUDED.output_cost_per_mtok,
       margin_percent = EXCLUDED.margin_percent,
       plan_overrides = EXCLUDED.plan_overrides`,
    [
      body.provider,
      body.model,
      body.inputCostPerMtok,
      body.outputCostPerMtok,
      marginPercent,
      JSON.stringify(body.planOverrides ?? {}),
    ],
  );

  return c.json({ success: true });
});

admin.delete("/pricing/:id", async (c) => {
  const id = c.req.param("id");
  await query("DELETE FROM model_pricing WHERE id = $1", [id]);
  return c.json({ success: true });
});

// ── System Stats ──

admin.get("/stats", async (c) => {
  const [userCount, tenantCount, activeToday, planBreakdown, channelBreakdown] = await Promise.all([
    queryOne<{ count: string }>("SELECT COUNT(*) as count FROM users WHERE status = 'active'"),
    queryOne<{ count: string }>("SELECT COUNT(*) as count FROM tenants"),
    queryOne<{ count: string }>(
      "SELECT COUNT(DISTINCT tenant_id) as count FROM usage_events WHERE created_at >= CURRENT_DATE",
    ),
    queryRows<{ plan: string; count: number }>(
      "SELECT plan, COUNT(*)::int as count FROM tenants GROUP BY plan ORDER BY count DESC",
    ),
    queryRows<{ channel: string; count: number }>(
      "SELECT channel, COUNT(*)::int as count FROM tenant_channels WHERE enabled = true GROUP BY channel ORDER BY count DESC",
    ),
  ]);

  return c.json({
    activeUsers: Number(userCount?.count ?? 0),
    totalTenants: Number(tenantCount?.count ?? 0),
    activeToday: Number(activeToday?.count ?? 0),
    planBreakdown,
    channelBreakdown,
  });
});

// ── System Configuration ──

admin.get("/system-config", async (c) => {
  return c.json({
    saasMode: process.env.OPENCLAW_SAAS_MODE === "1",
    jwtSecret: process.env.OPENCLAW_SAAS_JWT_SECRET ? "***configured***" : "using default (dev)",
    stripeKey: process.env.STRIPE_SECRET_KEY ? "***configured***" : "not configured",
    corsOrigin: process.env.OPENCLAW_SAAS_CORS_ORIGIN ?? "http://localhost:3001",
    databaseUrl: process.env.DATABASE_URL ? "***configured***" : "using default",
    redisUrl: process.env.REDIS_URL ? "***configured***" : "not configured",
  });
});

export { admin };

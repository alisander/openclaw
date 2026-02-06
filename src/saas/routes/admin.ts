import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { adminMiddleware } from "../middleware/auth.js";
import { query, queryOne, queryRows } from "../db/connection.js";

const admin = new Hono();

admin.use("/*", authMiddleware(), adminMiddleware());

// User management
admin.get("/users", async (c) => {
  const limit = Number(c.req.query("limit")) || 50;
  const offset = Number(c.req.query("offset")) || 0;
  const users = await queryRows<{
    id: string;
    email: string;
    name: string | null;
    status: string;
    created_at: Date;
  }>(
    "SELECT id, email, name, status, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    [limit, offset],
  );
  const total = await queryOne<{ count: string }>("SELECT COUNT(*) as count FROM users");
  return c.json({ users, total: Number(total?.count ?? 0) });
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

admin.delete("/users/:userId", async (c) => {
  const userId = c.req.param("userId");
  // Soft delete: mark as deleted
  await query("UPDATE users SET status = 'deleted', updated_at = NOW() WHERE id = $1", [userId]);
  return c.json({ success: true });
});

// Revenue dashboard
admin.get("/revenue", async (c) => {
  const days = Number(c.req.query("days")) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [totals, daily, byModel] = await Promise.all([
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
  });
});

// Model pricing management
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

// System stats
admin.get("/stats", async (c) => {
  const [userCount, tenantCount, activeToday] = await Promise.all([
    queryOne<{ count: string }>("SELECT COUNT(*) as count FROM users WHERE status = 'active'"),
    queryOne<{ count: string }>("SELECT COUNT(*) as count FROM tenants"),
    queryOne<{ count: string }>(
      "SELECT COUNT(DISTINCT tenant_id) as count FROM usage_events WHERE created_at >= CURRENT_DATE",
    ),
  ]);

  return c.json({
    activeUsers: Number(userCount?.count ?? 0),
    totalTenants: Number(tenantCount?.count ?? 0),
    activeToday: Number(activeToday?.count ?? 0),
  });
});

export { admin };

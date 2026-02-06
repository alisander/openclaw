import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { tenantContextMiddleware, type TenantContext } from "../middleware/tenant-context.js";
import { getBalanceUsd } from "../services/credit-manager.js";
import { getUsageSummary, getDailyUsage, getUsageByModel } from "../services/usage-metering.js";

const dashboard = new Hono();

dashboard.use("/*", authMiddleware(), tenantContextMiddleware());

dashboard.get("/stats", async (c) => {
  const tenant = c.get("tenant") as TenantContext;
  const [balance, usage] = await Promise.all([
    getBalanceUsd(tenant.tenantId),
    getUsageSummary(tenant.tenantId),
  ]);

  return c.json({
    balance,
    plan: tenant.plan,
    usage: {
      totalInputTokens: usage.totalInputTokens,
      totalOutputTokens: usage.totalOutputTokens,
      totalCostUsd: usage.totalCostUsd,
      eventCount: usage.eventCount,
    },
  });
});

dashboard.get("/usage", async (c) => {
  const tenant = c.get("tenant") as TenantContext;
  const days = Number(c.req.query("days")) || 30;
  const clampedDays = Math.min(Math.max(days, 1), 90);

  const [summary, daily, byModel] = await Promise.all([
    getUsageSummary(
      tenant.tenantId,
      new Date(Date.now() - clampedDays * 24 * 60 * 60 * 1000),
    ),
    getDailyUsage(tenant.tenantId, clampedDays),
    getUsageByModel(
      tenant.tenantId,
      new Date(Date.now() - clampedDays * 24 * 60 * 60 * 1000),
    ),
  ]);

  return c.json({
    summary: {
      totalInputTokens: summary.totalInputTokens,
      totalOutputTokens: summary.totalOutputTokens,
      totalCostUsd: summary.totalCostUsd,
      totalBaseCostUsd: summary.totalBaseCostUsd,
      totalMarginUsd: summary.totalMarginUsd,
      eventCount: summary.eventCount,
    },
    daily,
    byModel,
  });
});

export { dashboard };

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

dashboard.get("/setup-status", async (c) => {
  const tenant = c.get("tenant") as TenantContext;
  const { queryOne, queryRows } = await import("../db/connection.js");

  const [channels, skills, tenantRow, identity] = await Promise.all([
    queryRows<{ channel: string; enabled: boolean }>(
      "SELECT channel, enabled FROM tenant_channels WHERE tenant_id = $1",
      [tenant.tenantId],
    ),
    queryRows<{ skill_id: string; enabled: boolean }>(
      "SELECT skill_id, enabled FROM tenant_skills WHERE tenant_id = $1",
      [tenant.tenantId],
    ),
    queryOne<{ default_model: string | null; system_prompt: string | null; display_name: string | null; identity: Record<string, unknown> }>(
      "SELECT default_model, system_prompt, display_name, identity FROM tenants WHERE id = $1",
      [tenant.tenantId],
    ),
    Promise.resolve(), // placeholder
  ]);

  const enabledChannels = channels.filter((c) => c.enabled);
  const customizedSkills = skills.length > 0;
  const hasModel = !!tenantRow?.default_model;
  const hasIdentity = !!(tenantRow?.display_name || tenantRow?.system_prompt || (tenantRow?.identity && Object.keys(tenantRow.identity).some((k) => {
    const v = (tenantRow.identity as Record<string, unknown>)[k];
    return v && v !== "" && v !== "en" && v !== "professional";
  })));

  const steps = [
    {
      id: "identity",
      title: "Set up your assistant identity",
      description: "Give your assistant a name, personality, and tone of voice.",
      href: "/identity",
      completed: hasIdentity,
    },
    {
      id: "model",
      title: "Choose an AI model",
      description: "Select the default AI model that powers your assistant.",
      href: "/model",
      completed: hasModel,
    },
    {
      id: "channel",
      title: "Connect a messaging channel",
      description: "Connect Telegram, WhatsApp, Discord, Slack, or other platforms.",
      href: "/channels",
      completed: enabledChannels.length > 0,
    },
    {
      id: "skills",
      title: "Configure skills",
      description: "Enable or disable capabilities like web search, code execution, and more.",
      href: "/skills",
      completed: customizedSkills,
    },
    {
      id: "chat",
      title: "Send your first message",
      description: "Try out your assistant in the web chat.",
      href: "/chat",
      completed: false, // always available as action
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;

  return c.json({
    steps,
    completedCount,
    totalSteps: steps.length,
    isNewUser: completedCount === 0,
  });
});

export { dashboard };

import { query, queryOne, queryRows } from "../db/connection.js";
import { debit, usdToMicro } from "./credit-manager.js";

export type UsageEvent = {
  tenantId: string;
  sessionKey?: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
};

type ModelPricing = {
  provider: string;
  model: string;
  input_cost_per_mtok: number;
  output_cost_per_mtok: number;
  margin_percent: number;
  plan_overrides: Record<string, number>;
};

export async function getModelPricing(provider: string, model: string): Promise<ModelPricing | null> {
  return queryOne<ModelPricing>(
    "SELECT * FROM model_pricing WHERE provider = $1 AND model = $2",
    [provider, model],
  );
}

export function computeCost(params: {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  inputCostPerMtok: number;
  outputCostPerMtok: number;
  marginPercent: number;
}): { baseCostUsd: number; marginCostUsd: number; totalCostUsd: number } {
  const inputCost = (params.inputTokens / 1_000_000) * params.inputCostPerMtok;
  const outputCost = (params.outputTokens / 1_000_000) * params.outputCostPerMtok;
  // Cache reads are typically cheaper - use input cost * 0.1 as approximation
  const cacheReadCost = ((params.cacheReadTokens ?? 0) / 1_000_000) * params.inputCostPerMtok * 0.1;
  const cacheWriteCost =
    ((params.cacheWriteTokens ?? 0) / 1_000_000) * params.inputCostPerMtok * 1.25;

  const baseCostUsd = inputCost + outputCost + cacheReadCost + cacheWriteCost;
  const marginCostUsd = baseCostUsd * (params.marginPercent / 100);
  const totalCostUsd = baseCostUsd + marginCostUsd;

  return { baseCostUsd, marginCostUsd, totalCostUsd };
}

export async function meterUsage(event: UsageEvent, plan?: string): Promise<void> {
  const pricing = await getModelPricing(event.provider, event.model);
  if (!pricing) {
    // No pricing configured for this model - log but don't charge
    console.warn(
      `[saas-metering] No pricing for ${event.provider}/${event.model}, skipping charge`,
    );
    return;
  }

  // Resolve margin: plan-specific override or default
  const marginPercent =
    plan && pricing.plan_overrides[plan] !== undefined
      ? pricing.plan_overrides[plan]
      : pricing.margin_percent;

  const { baseCostUsd, marginCostUsd, totalCostUsd } = computeCost({
    inputTokens: event.inputTokens,
    outputTokens: event.outputTokens,
    cacheReadTokens: event.cacheReadTokens,
    cacheWriteTokens: event.cacheWriteTokens,
    inputCostPerMtok: pricing.input_cost_per_mtok,
    outputCostPerMtok: pricing.output_cost_per_mtok,
    marginPercent,
  });

  // Record usage event
  await query(
    `INSERT INTO usage_events
     (tenant_id, session_key, provider, model, input_tokens, output_tokens,
      cache_read_tokens, cache_write_tokens, base_cost_usd, margin_cost_usd, total_cost_usd)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      event.tenantId,
      event.sessionKey ?? null,
      event.provider,
      event.model,
      event.inputTokens,
      event.outputTokens,
      event.cacheReadTokens ?? 0,
      event.cacheWriteTokens ?? 0,
      baseCostUsd,
      marginCostUsd,
      totalCostUsd,
    ],
  );

  // Debit credits
  const amountMicro = usdToMicro(totalCostUsd);
  if (amountMicro > 0n) {
    await debit({
      tenantId: event.tenantId,
      amountMicro,
      description: `${event.provider}/${event.model}: ${event.inputTokens}in/${event.outputTokens}out`,
      referenceType: "usage",
    });
  }
}

export type UsageSummary = {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  totalBaseCostUsd: number;
  totalMarginUsd: number;
  eventCount: number;
};

export async function getUsageSummary(
  tenantId: string,
  since?: Date,
): Promise<UsageSummary> {
  const sinceDate = since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const row = await queryOne<{
    total_input: string;
    total_output: string;
    total_cost: string;
    total_base: string;
    total_margin: string;
    count: string;
  }>(
    `SELECT
       COALESCE(SUM(input_tokens), 0) as total_input,
       COALESCE(SUM(output_tokens), 0) as total_output,
       COALESCE(SUM(total_cost_usd), 0) as total_cost,
       COALESCE(SUM(base_cost_usd), 0) as total_base,
       COALESCE(SUM(margin_cost_usd), 0) as total_margin,
       COUNT(*) as count
     FROM usage_events
     WHERE tenant_id = $1 AND created_at >= $2`,
    [tenantId, sinceDate],
  );
  return {
    totalInputTokens: Number(row?.total_input ?? 0),
    totalOutputTokens: Number(row?.total_output ?? 0),
    totalCostUsd: Number(row?.total_cost ?? 0),
    totalBaseCostUsd: Number(row?.total_base ?? 0),
    totalMarginUsd: Number(row?.total_margin ?? 0),
    eventCount: Number(row?.count ?? 0),
  };
}

export async function getDailyUsage(
  tenantId: string,
  days = 30,
): Promise<{ date: string; tokens: number; cost: number }[]> {
  return queryRows<{ date: string; tokens: number; cost: number }>(
    `SELECT
       DATE(created_at) as date,
       COALESCE(SUM(input_tokens + output_tokens), 0)::int as tokens,
       COALESCE(SUM(total_cost_usd), 0)::float as cost
     FROM usage_events
     WHERE tenant_id = $1 AND created_at >= NOW() - make_interval(days => $2)
     GROUP BY DATE(created_at)
     ORDER BY date`,
    [tenantId, days],
  );
}

export async function getUsageByModel(
  tenantId: string,
  since?: Date,
): Promise<{ provider: string; model: string; tokens: number; cost: number }[]> {
  const sinceDate = since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return queryRows<{ provider: string; model: string; tokens: number; cost: number }>(
    `SELECT
       provider, model,
       COALESCE(SUM(input_tokens + output_tokens), 0)::int as tokens,
       COALESCE(SUM(total_cost_usd), 0)::float as cost
     FROM usage_events
     WHERE tenant_id = $1 AND created_at >= $2
     GROUP BY provider, model
     ORDER BY cost DESC`,
    [tenantId, sinceDate],
  );
}

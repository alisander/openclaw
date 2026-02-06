import { queryOne, queryRows } from "../db/connection.js";

export type Tenant = {
  id: string;
  user_id: string;
  agent_id: string;
  display_name: string | null;
  plan: string;
  config: Record<string, unknown>;
  created_at: Date;
};

export async function createTenant(params: {
  userId: string;
  agentId: string;
  displayName?: string;
  plan?: string;
}): Promise<Tenant> {
  const row = await queryOne<Tenant>(
    `INSERT INTO tenants (user_id, agent_id, display_name, plan)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [params.userId, params.agentId, params.displayName ?? null, params.plan ?? "free"],
  );
  if (!row) {
    throw new Error("Failed to create tenant");
  }
  return row;
}

export async function getTenantByUserId(userId: string): Promise<Tenant | null> {
  return queryOne<Tenant>("SELECT * FROM tenants WHERE user_id = $1", [userId]);
}

export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  return queryOne<Tenant>("SELECT * FROM tenants WHERE id = $1", [tenantId]);
}

export async function getTenantByAgentId(agentId: string): Promise<Tenant | null> {
  return queryOne<Tenant>("SELECT * FROM tenants WHERE agent_id = $1", [agentId]);
}

export async function listActiveAgentIds(): Promise<string[]> {
  const rows = await queryRows<{ agent_id: string }>(
    "SELECT agent_id FROM tenants t JOIN users u ON t.user_id = u.id WHERE u.status = 'active'",
  );
  return rows.map((r) => r.agent_id);
}

export async function updateTenantPlan(tenantId: string, plan: string): Promise<void> {
  await queryOne("UPDATE tenants SET plan = $1 WHERE id = $2", [plan, tenantId]);
}

export async function listTenants(params?: {
  limit?: number;
  offset?: number;
}): Promise<Tenant[]> {
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;
  return queryRows<Tenant>(
    `SELECT t.* FROM tenants t
     JOIN users u ON t.user_id = u.id
     ORDER BY t.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
}

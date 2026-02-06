import { query, queryOne } from "../db/connection.js";

// Micro-dollar units: $1 = 1,000,000 units
const MICRODOLLAR_UNIT = 1_000_000;

export function usdToMicro(usd: number): bigint {
  return BigInt(Math.round(usd * MICRODOLLAR_UNIT));
}

export function microToUsd(micro: bigint): number {
  return Number(micro) / MICRODOLLAR_UNIT;
}

export type CreditBalance = {
  tenant_id: string;
  balance: bigint;
  updated_at: Date;
};

export async function initBalance(tenantId: string, initialUsd?: number): Promise<void> {
  const initialMicro = initialUsd ? usdToMicro(initialUsd) : 0n;
  await query(
    `INSERT INTO credit_balances (tenant_id, balance) VALUES ($1, $2)
     ON CONFLICT (tenant_id) DO NOTHING`,
    [tenantId, initialMicro.toString()],
  );
  if (initialMicro > 0n) {
    await recordLedgerEntry({
      tenantId,
      amount: initialMicro,
      balanceAfter: initialMicro,
      description: "Initial free credits",
      referenceType: "signup_bonus",
    });
  }
}

export async function getBalance(tenantId: string): Promise<bigint> {
  const row = await queryOne<{ balance: string }>(
    "SELECT balance FROM credit_balances WHERE tenant_id = $1",
    [tenantId],
  );
  return row ? BigInt(row.balance) : 0n;
}

export async function getBalanceUsd(tenantId: string): Promise<number> {
  return microToUsd(await getBalance(tenantId));
}

export async function checkBalance(tenantId: string, minimumMicro?: bigint): Promise<boolean> {
  const balance = await getBalance(tenantId);
  return balance > (minimumMicro ?? 0n);
}

export async function debit(params: {
  tenantId: string;
  amountMicro: bigint;
  description: string;
  referenceType?: string;
  referenceId?: string;
}): Promise<{ success: boolean; balanceAfter: bigint }> {
  const result = await queryOne<{ balance: string }>(
    `UPDATE credit_balances
     SET balance = balance - $1, updated_at = NOW()
     WHERE tenant_id = $2 AND balance >= $1
     RETURNING balance`,
    [params.amountMicro.toString(), params.tenantId],
  );
  if (!result) {
    return { success: false, balanceAfter: await getBalance(params.tenantId) };
  }
  const balanceAfter = BigInt(result.balance);
  await recordLedgerEntry({
    tenantId: params.tenantId,
    amount: -params.amountMicro,
    balanceAfter,
    description: params.description,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
  });
  return { success: true, balanceAfter };
}

export async function credit(params: {
  tenantId: string;
  amountMicro: bigint;
  description: string;
  referenceType?: string;
  referenceId?: string;
}): Promise<bigint> {
  const result = await queryOne<{ balance: string }>(
    `UPDATE credit_balances
     SET balance = balance + $1, updated_at = NOW()
     WHERE tenant_id = $2
     RETURNING balance`,
    [params.amountMicro.toString(), params.tenantId],
  );
  const balanceAfter = result ? BigInt(result.balance) : 0n;
  await recordLedgerEntry({
    tenantId: params.tenantId,
    amount: params.amountMicro,
    balanceAfter,
    description: params.description,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
  });
  return balanceAfter;
}

async function recordLedgerEntry(params: {
  tenantId: string;
  amount: bigint;
  balanceAfter: bigint;
  description: string;
  referenceType?: string;
  referenceId?: string;
}): Promise<void> {
  await query(
    `INSERT INTO credit_ledger (tenant_id, amount, balance_after, description, reference_type, reference_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      params.tenantId,
      params.amount.toString(),
      params.balanceAfter.toString(),
      params.description,
      params.referenceType ?? null,
      params.referenceId ?? null,
    ],
  );
}

export async function getLedger(
  tenantId: string,
  limit = 50,
  offset = 0,
): Promise<
  {
    id: string;
    amount: bigint;
    balance_after: bigint;
    description: string;
    reference_type: string | null;
    created_at: Date;
  }[]
> {
  const rows = await query<{
    id: string;
    amount: string;
    balance_after: string;
    description: string;
    reference_type: string | null;
    created_at: Date;
  }>(
    `SELECT id, amount, balance_after, description, reference_type, created_at
     FROM credit_ledger WHERE tenant_id = $1
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return rows.rows.map((r) => ({
    ...r,
    amount: BigInt(r.amount),
    balance_after: BigInt(r.balance_after),
  }));
}

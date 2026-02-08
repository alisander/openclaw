/**
 * Seeds a test user into the SaaS database.
 *
 * Usage: node --import tsx src/saas/scripts/seed-test-user.ts
 */
import bcrypt from "bcryptjs";
import { initDb, runMigrations, query, queryOne, closeDb } from "../db/connection.js";

async function main() {
  const email = "test@openclaw.dev";
  const password = "testpassword";
  const name = "Test User";
  const agentId = "saas-testuser";

  console.log("[seed] Connecting to database...");
  initDb();

  console.log("[seed] Running migrations...");
  await runMigrations();

  // Check if user already exists
  const existing = await queryOne<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]);
  if (existing) {
    console.log(`[seed] User ${email} already exists (id: ${existing.id})`);
    await closeDb();
    return;
  }

  // Create user
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await queryOne<{ id: string }>(
    `INSERT INTO users (email, password_hash, name, email_verified, status)
     VALUES ($1, $2, $3, true, 'active')
     RETURNING id`,
    [email, passwordHash, name],
  );
  console.log(`[seed] Created user: ${user!.id}`);

  // Create tenant
  const tenant = await queryOne<{ id: string }>(
    `INSERT INTO tenants (user_id, agent_id, display_name, plan)
     VALUES ($1, $2, $3, 'free')
     RETURNING id`,
    [user!.id, agentId, name],
  );
  console.log(`[seed] Created tenant: ${tenant!.id} (agent: ${agentId})`);

  // Initialize credit balance with $0.50
  await query(
    `INSERT INTO credit_balances (tenant_id, balance) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [tenant!.id, "500000"], // $0.50 in micro-dollars
  );

  // Add ledger entry
  await query(
    `INSERT INTO credit_ledger (tenant_id, amount, balance_after, description, reference_type)
     VALUES ($1, $2, $3, $4, $5)`,
    [tenant!.id, "500000", "500000", "Initial free credits", "signup_bonus"],
  );

  console.log("[seed] Done!");
  console.log();
  console.log("  Email:    test@openclaw.dev");
  console.log("  Password: testpassword");
  console.log();

  await closeDb();
}

main().catch((err) => {
  console.error("[seed] Error:", err);
  process.exit(1);
});

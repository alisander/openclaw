/**
 * Seeds an admin user into the SaaS database.
 *
 * Usage: node --import tsx src/saas/scripts/seed-admin-user.ts
 */
import bcrypt from "bcryptjs";
import { initDb, runMigrations, query, queryOne, closeDb } from "../db/connection.js";

async function main() {
  const email = "admin@openclaw.dev";
  const password = "adminpassword";
  const name = "Admin";
  const agentId = "saas-admin";

  console.log("[seed] Connecting to database...");
  initDb();

  console.log("[seed] Running migrations...");
  await runMigrations();

  // Check if user already exists
  const existing = await queryOne<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]);
  if (existing) {
    // Update to admin role
    await query("UPDATE users SET role = 'admin' WHERE id = $1", [existing.id]);
    console.log(`[seed] User ${email} already exists, updated to admin role (id: ${existing.id})`);
    await closeDb();
    return;
  }

  // Create admin user
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await queryOne<{ id: string }>(
    `INSERT INTO users (email, password_hash, name, email_verified, status, role)
     VALUES ($1, $2, $3, true, 'active', 'admin')
     RETURNING id`,
    [email, passwordHash, name],
  );
  console.log(`[seed] Created admin user: ${user!.id}`);

  // Create tenant
  const tenant = await queryOne<{ id: string }>(
    `INSERT INTO tenants (user_id, agent_id, display_name, plan, status)
     VALUES ($1, $2, $3, 'pro', 'active')
     RETURNING id`,
    [user!.id, agentId, name],
  );
  console.log(`[seed] Created tenant: ${tenant!.id} (agent: ${agentId})`);

  // Initialize credit balance with $100
  await query(
    `INSERT INTO credit_balances (tenant_id, balance) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [tenant!.id, "100000000"], // $100 in micro-dollars
  );

  await query(
    `INSERT INTO credit_ledger (tenant_id, amount, balance_after, description, reference_type)
     VALUES ($1, $2, $3, $4, $5)`,
    [tenant!.id, "100000000", "100000000", "Admin initial credits", "admin_grant"],
  );

  console.log("[seed] Done!");
  console.log();
  console.log("  Email:    admin@openclaw.dev");
  console.log("  Password: adminpassword");
  console.log("  Role:     admin");
  console.log();

  await closeDb();
}

main().catch((err) => {
  console.error("[seed] Error:", err);
  process.exit(1);
});

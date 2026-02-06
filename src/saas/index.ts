import { serve } from "@hono/node-server";
import { createSaasApp } from "./server.js";
import { initDb, runMigrations, closeDb } from "./db/connection.js";

const DEFAULT_PORT = 3000;

export async function startSaasServer(port?: number): Promise<{ close: () => Promise<void> }> {
  const resolvedPort = port ?? Number(process.env.OPENCLAW_SAAS_PORT) || DEFAULT_PORT;

  // Initialize database
  console.log("[saas] Connecting to PostgreSQL...");
  initDb();

  // Run pending migrations
  console.log("[saas] Running database migrations...");
  await runMigrations();

  // Create and start Hono app
  const app = createSaasApp();

  const server = serve({
    fetch: app.fetch,
    port: resolvedPort,
  });

  console.log(`[saas] OpenClaw SaaS API running on http://localhost:${resolvedPort}`);

  return {
    close: async () => {
      server.close();
      await closeDb();
      console.log("[saas] Server stopped.");
    },
  };
}

// Allow direct execution
if (process.argv[1]?.endsWith("saas/index.ts") || process.argv[1]?.endsWith("saas/index.js")) {
  startSaasServer().catch((err) => {
    console.error("[saas] Failed to start:", err);
    process.exit(1);
  });
}

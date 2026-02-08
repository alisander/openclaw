import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./routes/auth.js";
import { billing } from "./routes/billing.js";
import { dashboard } from "./routes/dashboard.js";
import { integrations } from "./routes/integrations.js";
import { assistant } from "./routes/assistant.js";
import { admin } from "./routes/admin.js";
import { config } from "./routes/config.js";
import { rateLimitMiddleware } from "./middleware/rate-limit.js";

export function createSaasApp(): Hono {
  const app = new Hono();

  // Global middleware
  app.use("*", logger());
  app.use(
    "*",
    cors({
      origin: process.env.OPENCLAW_SAAS_CORS_ORIGIN ?? "http://localhost:3001",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  );

  // Health check
  app.get("/api/health", (c) => c.json({ status: "ok", service: "openclaw-saas" }));

  // Auth routes (no rate limit for login/signup besides global)
  app.route("/api/auth", auth);

  // Billing webhook is rate-limit exempt (Stripe manages this)
  app.route("/api/billing", billing);

  // Rate-limited authenticated routes
  app.use("/api/dashboard/*", rateLimitMiddleware());
  app.route("/api/dashboard", dashboard);

  app.use("/api/integrations/*", rateLimitMiddleware());
  app.route("/api/integrations", integrations);

  app.use("/api/assistant/*", rateLimitMiddleware());
  app.route("/api/assistant", assistant);

  app.use("/api/config/*", rateLimitMiddleware());
  app.route("/api/config", config);

  app.use("/api/admin/*", rateLimitMiddleware());
  app.route("/api/admin", admin);

  // 404 handler
  app.notFound((c) => c.json({ error: "Not found" }, 404));

  // Error handler
  app.onError((err, c) => {
    console.error("[saas] Unhandled error:", err);
    return c.json({ error: "Internal server error" }, 500);
  });

  return app;
}

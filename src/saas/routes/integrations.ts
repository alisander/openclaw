import { Hono } from "hono";
import { authMiddleware, type JwtPayload } from "../middleware/auth.js";
import { tenantContextMiddleware, type TenantContext } from "../middleware/tenant-context.js";
import {
  buildGoogleAuthUrl,
  buildMicrosoftAuthUrl,
  exchangeGoogleCode,
  exchangeMicrosoftCode,
  saveIntegration,
  listIntegrations,
  disconnectIntegration,
  type IntegrationProvider,
} from "../services/integration-oauth.js";

const integrations = new Hono();

integrations.use("/*", authMiddleware(), tenantContextMiddleware());

integrations.get("/", async (c) => {
  const tenant = c.get("tenant") as TenantContext;
  const items = await listIntegrations(tenant.tenantId);
  return c.json({
    integrations: items.map((i) => ({
      provider: i.provider,
      email: i.email,
      status: i.status,
      connectedAt: i.created_at,
    })),
  });
});

integrations.get("/connect/google", async (c) => {
  const tenant = c.get("tenant") as TenantContext;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return c.json({ error: "Google OAuth not configured" }, 503);
  }
  const baseUrl = process.env.OPENCLAW_SAAS_BASE_URL ?? "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/integrations/callback/google`;
  const state = Buffer.from(JSON.stringify({ tenantId: tenant.tenantId })).toString("base64url");

  const url = buildGoogleAuthUrl({ clientId, redirectUri, state });
  return c.json({ authUrl: url });
});

integrations.get("/connect/microsoft", async (c) => {
  const tenant = c.get("tenant") as TenantContext;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) {
    return c.json({ error: "Microsoft OAuth not configured" }, 503);
  }
  const baseUrl = process.env.OPENCLAW_SAAS_BASE_URL ?? "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/integrations/callback/microsoft`;
  const state = Buffer.from(JSON.stringify({ tenantId: tenant.tenantId })).toString("base64url");

  const url = buildMicrosoftAuthUrl({ clientId, redirectUri, state });
  return c.json({ authUrl: url });
});

integrations.get("/callback/google", async (c) => {
  const code = c.req.query("code");
  const stateParam = c.req.query("state");
  if (!code || !stateParam) {
    return c.json({ error: "Missing code or state" }, 400);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const baseUrl = process.env.OPENCLAW_SAAS_BASE_URL ?? "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/integrations/callback/google`;

  try {
    const state = JSON.parse(Buffer.from(stateParam, "base64url").toString()) as {
      tenantId: string;
    };
    const tokens = await exchangeGoogleCode({ code, clientId, clientSecret, redirectUri });

    await saveIntegration({
      tenantId: state.tenantId,
      provider: "google",
      email: tokens.email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scopes: "gmail.readonly gmail.send drive.readonly drive.file",
    });

    // Redirect back to dashboard
    return c.redirect(`${baseUrl}/dashboard/integrations?connected=google`);
  } catch (err) {
    console.error("[saas-integrations] Google callback error:", err);
    return c.redirect(`${baseUrl}/dashboard/integrations?error=google`);
  }
});

integrations.get("/callback/microsoft", async (c) => {
  const code = c.req.query("code");
  const stateParam = c.req.query("state");
  if (!code || !stateParam) {
    return c.json({ error: "Missing code or state" }, 400);
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
  const baseUrl = process.env.OPENCLAW_SAAS_BASE_URL ?? "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/integrations/callback/microsoft`;

  try {
    const state = JSON.parse(Buffer.from(stateParam, "base64url").toString()) as {
      tenantId: string;
    };
    const tokens = await exchangeMicrosoftCode({ code, clientId, clientSecret, redirectUri });

    await saveIntegration({
      tenantId: state.tenantId,
      provider: "microsoft",
      email: tokens.email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scopes: "Mail.Read Mail.Send Files.ReadWrite",
    });

    return c.redirect(`${baseUrl}/dashboard/integrations?connected=microsoft`);
  } catch (err) {
    console.error("[saas-integrations] Microsoft callback error:", err);
    return c.redirect(`${baseUrl}/dashboard/integrations?error=microsoft`);
  }
});

integrations.post("/disconnect/:provider", async (c) => {
  const tenant = c.get("tenant") as TenantContext;
  const provider = c.req.param("provider") as IntegrationProvider;
  if (!["google", "microsoft"].includes(provider)) {
    return c.json({ error: "Invalid provider" }, 400);
  }

  await disconnectIntegration(tenant.tenantId, provider);
  return c.json({ success: true });
});

export { integrations };

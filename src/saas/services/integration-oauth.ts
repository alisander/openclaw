import { query, queryOne, queryRows } from "../db/connection.js";
import { encrypt, decrypt } from "./encryption.js";

export type IntegrationProvider = "google" | "microsoft";

export type UserIntegration = {
  id: string;
  tenant_id: string;
  provider: string;
  email: string | null;
  access_token: string;
  refresh_token: string | null;
  expires_at: Date | null;
  scopes: string | null;
  status: string;
  created_at: Date;
};

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

const MICROSOFT_SCOPES = [
  "Mail.Read",
  "Mail.Send",
  "Files.ReadWrite",
  "offline_access",
].join(" ");

export function getOAuthScopes(provider: IntegrationProvider): string {
  switch (provider) {
    case "google":
      return GOOGLE_SCOPES;
    case "microsoft":
      return MICROSOFT_SCOPES;
  }
}

export function buildGoogleAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", params.state);
  return url.toString();
}

export function buildMicrosoftAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  tenantId?: string;
}): string {
  const tenant = params.tenantId ?? "common";
  const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", MICROSOFT_SCOPES);
  url.searchParams.set("state", params.state);
  return url.toString();
}

export async function exchangeGoogleCode(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date; email?: string }> {
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = (await resp.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    id_token?: string;
  };
  if (!resp.ok) {
    throw new Error(`Google token exchange failed: ${JSON.stringify(data)}`);
  }
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  // Try to get email from userinfo
  let email: string | undefined;
  try {
    const userResp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const userInfo = (await userResp.json()) as { email?: string };
    email = userInfo.email;
  } catch {
    // Best effort
  }

  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt, email };
}

export async function exchangeMicrosoftCode(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tenantId?: string;
}): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date; email?: string }> {
  const tenant = params.tenantId ?? "common";
  const resp = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: "authorization_code",
      scope: MICROSOFT_SCOPES,
    }),
  });
  const data = (await resp.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  if (!resp.ok) {
    throw new Error(`Microsoft token exchange failed: ${JSON.stringify(data)}`);
  }
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  // Get email from Microsoft Graph
  let email: string | undefined;
  try {
    const meResp = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const me = (await meResp.json()) as { mail?: string; userPrincipalName?: string };
    email = me.mail ?? me.userPrincipalName;
  } catch {
    // Best effort
  }

  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt, email };
}

export async function saveIntegration(params: {
  tenantId: string;
  provider: IntegrationProvider;
  email?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string;
}): Promise<void> {
  // Encrypt tokens before storing
  const encAccessToken = encrypt(params.accessToken);
  const encRefreshToken = params.refreshToken ? encrypt(params.refreshToken) : null;

  await query(
    `INSERT INTO user_integrations (tenant_id, provider, email, access_token, refresh_token, expires_at, scopes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (tenant_id, provider) DO UPDATE SET
       email = EXCLUDED.email,
       access_token = EXCLUDED.access_token,
       refresh_token = COALESCE(EXCLUDED.refresh_token, user_integrations.refresh_token),
       expires_at = EXCLUDED.expires_at,
       scopes = EXCLUDED.scopes,
       status = 'active'`,
    [
      params.tenantId,
      params.provider,
      params.email ?? null,
      encAccessToken,
      encRefreshToken,
      params.expiresAt ?? null,
      params.scopes ?? null,
    ],
  );
}

export async function getIntegration(
  tenantId: string,
  provider: IntegrationProvider,
): Promise<UserIntegration | null> {
  const row = await queryOne<UserIntegration>(
    "SELECT * FROM user_integrations WHERE tenant_id = $1 AND provider = $2",
    [tenantId, provider],
  );
  return row ? decryptIntegration(row) : null;
}

export async function listIntegrations(tenantId: string): Promise<UserIntegration[]> {
  const rows = await queryRows<UserIntegration>(
    "SELECT * FROM user_integrations WHERE tenant_id = $1 ORDER BY provider",
    [tenantId],
  );
  return rows.map(decryptIntegration);
}

function decryptIntegration(row: UserIntegration): UserIntegration {
  return {
    ...row,
    access_token: row.access_token ? decrypt(row.access_token) : row.access_token,
    refresh_token: row.refresh_token ? decrypt(row.refresh_token) : row.refresh_token,
  };
}

// ── Token Refresh ──

export async function refreshGoogleToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<{ accessToken: string; expiresAt: Date }> {
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: params.refreshToken,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      grant_type: "refresh_token",
    }),
  });
  const data = (await resp.json()) as {
    access_token: string;
    expires_in: number;
    error?: string;
    error_description?: string;
  };
  if (!resp.ok || data.error) {
    throw new Error(`Google token refresh failed: ${data.error_description ?? data.error ?? resp.statusText}`);
  }
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function refreshMicrosoftToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  tenantId?: string;
}): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const tenant = params.tenantId ?? "common";
  const resp = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: params.refreshToken,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      grant_type: "refresh_token",
      scope: MICROSOFT_SCOPES,
    }),
  });
  const data = (await resp.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    error?: string;
    error_description?: string;
  };
  if (!resp.ok || data.error) {
    throw new Error(`Microsoft token refresh failed: ${data.error_description ?? data.error ?? resp.statusText}`);
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/**
 * Get a valid access token for a tenant's integration.
 * If the token is expired or expiring within 5 minutes, refreshes it automatically.
 * Returns the (possibly refreshed) access token.
 */
export async function getValidAccessToken(
  tenantId: string,
  provider: IntegrationProvider,
): Promise<string> {
  const integration = await getIntegration(tenantId, provider);
  if (!integration || integration.status !== "active") {
    throw new Error(`No active ${provider} integration found`);
  }

  // Check if token is still valid (with 5 minute buffer)
  const bufferMs = 5 * 60 * 1000;
  const expiresAt = integration.expires_at ? new Date(integration.expires_at).getTime() : 0;
  const isExpired = !expiresAt || Date.now() > expiresAt - bufferMs;

  if (!isExpired) {
    return integration.access_token;
  }

  // Token expired or expiring soon — refresh it
  if (!integration.refresh_token) {
    throw new Error(`${provider} access token expired and no refresh token available. Please reconnect.`);
  }

  console.log(`[saas-oauth] Refreshing ${provider} token for tenant ${tenantId}`);

  let newAccessToken: string;
  let newExpiresAt: Date;
  let newRefreshToken: string | undefined;

  if (provider === "google") {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("Google OAuth not configured");

    const result = await refreshGoogleToken({
      refreshToken: integration.refresh_token,
      clientId,
      clientSecret,
    });
    newAccessToken = result.accessToken;
    newExpiresAt = result.expiresAt;
  } else {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("Microsoft OAuth not configured");

    const result = await refreshMicrosoftToken({
      refreshToken: integration.refresh_token,
      clientId,
      clientSecret,
    });
    newAccessToken = result.accessToken;
    newExpiresAt = result.expiresAt;
    newRefreshToken = result.refreshToken; // Microsoft may rotate the refresh token
  }

  // Save the refreshed tokens (encrypted)
  await saveIntegration({
    tenantId,
    provider,
    email: integration.email ?? undefined,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresAt: newExpiresAt,
    scopes: integration.scopes ?? undefined,
  });

  return newAccessToken;
}

export async function disconnectIntegration(
  tenantId: string,
  provider: IntegrationProvider,
): Promise<void> {
  await query(
    "UPDATE user_integrations SET status = 'disconnected', access_token = '', refresh_token = NULL WHERE tenant_id = $1 AND provider = $2",
    [tenantId, provider],
  );
}

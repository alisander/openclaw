import { Hono } from "hono";
import { authMiddleware, type JwtPayload } from "../middleware/auth.js";
import { tenantContextMiddleware, type TenantContext } from "../middleware/tenant-context.js";
import { checkBalance } from "../services/credit-manager.js";
import { GatewayBridge } from "../services/gateway-bridge.js";

const assistant = new Hono();

assistant.use("/*", authMiddleware(), tenantContextMiddleware());

// Bridge pool: one bridge per tenant for persistent gateway connections
const bridgePool = new Map<string, GatewayBridge>();

function getGatewayUrl(): string {
  return process.env.OPENCLAW_GATEWAY_URL ?? "ws://localhost:18789";
}

function getGatewayToken(): string {
  return process.env.OPENCLAW_GATEWAY_TOKEN ?? "";
}

async function getBridge(tenantId: string): Promise<GatewayBridge> {
  let bridge = bridgePool.get(tenantId);
  if (bridge?.isConnected()) {
    return bridge;
  }

  bridge = new GatewayBridge({
    gatewayUrl: getGatewayUrl(),
    authToken: getGatewayToken(),
  });

  try {
    await bridge.connect();
    bridgePool.set(tenantId, bridge);
    return bridge;
  } catch (err) {
    throw new Error(`Failed to connect to gateway: ${String(err)}`);
  }
}

/**
 * REST endpoint for sending a message and getting a response.
 * For real-time streaming, use the WebSocket endpoint.
 */
assistant.post("/message", async (c) => {
  const tenant = c.get("tenant") as TenantContext;

  // Pre-flight credit check
  const hasCredits = await checkBalance(tenant.tenantId);
  if (!hasCredits) {
    return c.json({ error: "Insufficient credits. Please purchase more credits." }, 402);
  }

  const body = await c.req.json<{ message?: string; sessionKey?: string }>();
  if (!body.message?.trim()) {
    return c.json({ error: "Message is required" }, 400);
  }

  try {
    const bridge = await getBridge(tenant.tenantId);
    const result = await bridge.request("chat.send", {
      agentId: tenant.agentId,
      sessionKey: body.sessionKey,
      message: body.message,
    });

    return c.json({ result });
  } catch (err) {
    return c.json({ error: `Assistant error: ${String(err)}` }, 500);
  }
});

/**
 * List active sessions for the tenant's agent.
 */
assistant.get("/sessions", async (c) => {
  const tenant = c.get("tenant") as TenantContext;

  try {
    const bridge = await getBridge(tenant.tenantId);
    const result = await bridge.request("sessions.list", {
      agentId: tenant.agentId,
    });
    return c.json({ sessions: result });
  } catch (err) {
    return c.json({ error: `Failed to list sessions: ${String(err)}` }, 500);
  }
});

/**
 * Get session history/transcript.
 */
assistant.get("/sessions/:sessionKey/history", async (c) => {
  const tenant = c.get("tenant") as TenantContext;
  const sessionKey = c.req.param("sessionKey");

  try {
    const bridge = await getBridge(tenant.tenantId);
    const result = await bridge.request("sessions.history", {
      agentId: tenant.agentId,
      sessionKey,
    });
    return c.json({ history: result });
  } catch (err) {
    return c.json({ error: `Failed to get history: ${String(err)}` }, 500);
  }
});

/**
 * Create a new session.
 */
assistant.post("/sessions", async (c) => {
  const tenant = c.get("tenant") as TenantContext;
  const body = await c.req.json<{ name?: string }>();

  try {
    const bridge = await getBridge(tenant.tenantId);
    const result = await bridge.request("sessions.create", {
      agentId: tenant.agentId,
      name: body.name,
    });
    return c.json({ session: result });
  } catch (err) {
    return c.json({ error: `Failed to create session: ${String(err)}` }, 500);
  }
});

// Cleanup bridges periodically
setInterval(() => {
  for (const [tenantId, bridge] of bridgePool) {
    if (!bridge.isConnected()) {
      bridge.close();
      bridgePool.delete(tenantId);
    }
  }
}, 60_000);

export { assistant };

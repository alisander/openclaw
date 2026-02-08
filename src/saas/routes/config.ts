import { Hono } from "hono";
import { authMiddleware, type JwtPayload } from "../middleware/auth.js";
import { query, queryOne, queryRows } from "../db/connection.js";

const config = new Hono();

config.use("/*", authMiddleware());

// ── Channels ──

const SUPPORTED_CHANNELS = [
  { id: "telegram", name: "Telegram", description: "Telegram Bot integration", configSchema: { botToken: "string" } },
  { id: "whatsapp", name: "WhatsApp", description: "WhatsApp Business API", configSchema: { phoneNumberId: "string", accessToken: "string", verifyToken: "string" } },
  { id: "discord", name: "Discord", description: "Discord Bot integration", configSchema: { botToken: "string", guildId: "string" } },
  { id: "slack", name: "Slack", description: "Slack workspace integration", configSchema: { botToken: "string", signingSecret: "string", appToken: "string" } },
  { id: "web", name: "Web Chat", description: "Embedded web chat widget", configSchema: { allowedOrigins: "string" } },
  { id: "email", name: "Email", description: "Email integration (IMAP/SMTP)", configSchema: { imapHost: "string", smtpHost: "string", email: "string", password: "string" } },
  { id: "matrix", name: "Matrix", description: "Matrix protocol integration", configSchema: { homeserver: "string", accessToken: "string" } },
  { id: "signal", name: "Signal", description: "Signal messenger integration", configSchema: { phoneNumber: "string" } },
  { id: "teams", name: "Microsoft Teams", description: "Microsoft Teams integration", configSchema: { appId: "string", appSecret: "string" } },
  { id: "line", name: "LINE", description: "LINE messaging integration", configSchema: { channelAccessToken: "string", channelSecret: "string" } },
];

// List available channels with their status for this tenant
config.get("/channels", async (c) => {
  const user = c.get("user") as JwtPayload;

  const configured = await queryRows<{
    channel: string;
    enabled: boolean;
    config: Record<string, unknown>;
    status: string;
  }>(
    "SELECT channel, enabled, config, status FROM tenant_channels WHERE tenant_id = $1",
    [user.tenantId],
  );

  const configuredMap = new Map(configured.map((ch) => [ch.channel, ch]));

  const channels = SUPPORTED_CHANNELS.map((ch) => {
    const existing = configuredMap.get(ch.id);
    return {
      ...ch,
      enabled: existing?.enabled ?? false,
      configured: !!existing,
      status: existing?.status ?? "not_configured",
      config: existing?.config ?? {},
    };
  });

  return c.json({ channels });
});

// Get channel config
config.get("/channels/:channelId", async (c) => {
  const user = c.get("user") as JwtPayload;
  const channelId = c.req.param("channelId");

  const channel = SUPPORTED_CHANNELS.find((ch) => ch.id === channelId);
  if (!channel) {
    return c.json({ error: "Unknown channel" }, 404);
  }

  const existing = await queryOne<{
    enabled: boolean;
    config: Record<string, unknown>;
    status: string;
  }>(
    "SELECT enabled, config, status FROM tenant_channels WHERE tenant_id = $1 AND channel = $2",
    [user.tenantId, channelId],
  );

  return c.json({
    channel: {
      ...channel,
      enabled: existing?.enabled ?? false,
      configured: !!existing,
      status: existing?.status ?? "not_configured",
      config: existing?.config ?? {},
    },
  });
});

// Save/update channel config
config.post("/channels/:channelId", async (c) => {
  const user = c.get("user") as JwtPayload;
  const channelId = c.req.param("channelId");
  const body = await c.req.json<{ enabled?: boolean; config?: Record<string, unknown> }>();

  const channel = SUPPORTED_CHANNELS.find((ch) => ch.id === channelId);
  if (!channel) {
    return c.json({ error: "Unknown channel" }, 404);
  }

  const enabled = body.enabled ?? false;
  const channelConfig = body.config ?? {};

  await query(
    `INSERT INTO tenant_channels (tenant_id, channel, enabled, config, status, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (tenant_id, channel) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       config = EXCLUDED.config,
       status = EXCLUDED.status,
       updated_at = NOW()`,
    [user.tenantId, channelId, enabled, JSON.stringify(channelConfig), enabled ? "active" : "disabled"],
  );

  return c.json({ success: true });
});

// Delete channel config
config.delete("/channels/:channelId", async (c) => {
  const user = c.get("user") as JwtPayload;
  const channelId = c.req.param("channelId");

  await query(
    "DELETE FROM tenant_channels WHERE tenant_id = $1 AND channel = $2",
    [user.tenantId, channelId],
  );

  return c.json({ success: true });
});

// ── Skills ──

const DEFAULT_SKILLS = [
  { id: "web-search", name: "Web Search", description: "Search the web for information", category: "research" },
  { id: "web-browse", name: "Web Browse", description: "Browse and extract content from web pages", category: "research" },
  { id: "image-gen", name: "Image Generation", description: "Generate images from text prompts", category: "creative" },
  { id: "code-exec", name: "Code Execution", description: "Execute code in a sandboxed environment", category: "developer" },
  { id: "file-manager", name: "File Manager", description: "Manage files in agent workspace", category: "productivity" },
  { id: "calendar", name: "Calendar", description: "Manage calendar events", category: "productivity" },
  { id: "email-send", name: "Email Send", description: "Send emails on behalf of user", category: "communication" },
  { id: "email-read", name: "Email Read", description: "Read and search emails", category: "communication" },
  { id: "google-drive", name: "Google Drive", description: "Access Google Drive files", category: "integrations" },
  { id: "onedrive", name: "OneDrive", description: "Access OneDrive files", category: "integrations" },
  { id: "notion", name: "Notion", description: "Access Notion workspaces", category: "integrations" },
  { id: "github", name: "GitHub", description: "Interact with GitHub repositories", category: "developer" },
  { id: "memory", name: "Memory", description: "Long-term memory across conversations", category: "core" },
  { id: "summarize", name: "Summarize", description: "Summarize long documents or conversations", category: "core" },
  { id: "translate", name: "Translate", description: "Translate text between languages", category: "core" },
  { id: "tts", name: "Text to Speech", description: "Convert text to speech audio", category: "creative" },
  { id: "stt", name: "Speech to Text", description: "Transcribe audio to text", category: "creative" },
  { id: "pdf-reader", name: "PDF Reader", description: "Read and extract content from PDFs", category: "productivity" },
  { id: "spreadsheet", name: "Spreadsheet", description: "Create and manipulate spreadsheets", category: "productivity" },
  { id: "task-manager", name: "Task Manager", description: "Manage to-do lists and tasks", category: "productivity" },
];

// List all skills with enabled status
config.get("/skills", async (c) => {
  const user = c.get("user") as JwtPayload;

  const configured = await queryRows<{
    skill_id: string;
    enabled: boolean;
    config: Record<string, unknown>;
  }>(
    "SELECT skill_id, enabled, config FROM tenant_skills WHERE tenant_id = $1",
    [user.tenantId],
  );

  const configuredMap = new Map(configured.map((s) => [s.skill_id, s]));

  const skills = DEFAULT_SKILLS.map((skill) => {
    const existing = configuredMap.get(skill.id);
    return {
      ...skill,
      enabled: existing?.enabled ?? true,
      config: existing?.config ?? {},
    };
  });

  return c.json({ skills });
});

// Toggle skill
config.post("/skills/:skillId", async (c) => {
  const user = c.get("user") as JwtPayload;
  const skillId = c.req.param("skillId");
  const body = await c.req.json<{ enabled?: boolean; config?: Record<string, unknown> }>();

  const skill = DEFAULT_SKILLS.find((s) => s.id === skillId);
  if (!skill) {
    return c.json({ error: "Unknown skill" }, 404);
  }

  await query(
    `INSERT INTO tenant_skills (tenant_id, skill_id, enabled, config)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (tenant_id, skill_id) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       config = EXCLUDED.config`,
    [user.tenantId, skillId, body.enabled ?? true, JSON.stringify(body.config ?? {})],
  );

  return c.json({ success: true });
});

// ── Agent Identity / Persona ──

config.get("/identity", async (c) => {
  const user = c.get("user") as JwtPayload;

  const tenant = await queryOne<{
    display_name: string | null;
    identity: Record<string, unknown>;
    default_model: string | null;
    system_prompt: string | null;
  }>(
    "SELECT display_name, identity, default_model, system_prompt FROM tenants WHERE id = $1",
    [user.tenantId],
  );

  return c.json({
    identity: {
      displayName: tenant?.display_name ?? "",
      avatarUrl: (tenant?.identity as Record<string, unknown>)?.avatarUrl ?? "",
      personality: (tenant?.identity as Record<string, unknown>)?.personality ?? "",
      language: (tenant?.identity as Record<string, unknown>)?.language ?? "en",
      tone: (tenant?.identity as Record<string, unknown>)?.tone ?? "professional",
      defaultModel: tenant?.default_model ?? "",
      systemPrompt: tenant?.system_prompt ?? "",
    },
  });
});

config.post("/identity", async (c) => {
  const user = c.get("user") as JwtPayload;
  const body = await c.req.json<{
    displayName?: string;
    avatarUrl?: string;
    personality?: string;
    language?: string;
    tone?: string;
    defaultModel?: string;
    systemPrompt?: string;
  }>();

  const identity = {
    avatarUrl: body.avatarUrl ?? "",
    personality: body.personality ?? "",
    language: body.language ?? "en",
    tone: body.tone ?? "professional",
  };

  await query(
    `UPDATE tenants SET
       display_name = COALESCE($2, display_name),
       identity = $3,
       default_model = $4,
       system_prompt = $5
     WHERE id = $1`,
    [
      user.tenantId,
      body.displayName ?? null,
      JSON.stringify(identity),
      body.defaultModel ?? null,
      body.systemPrompt ?? null,
    ],
  );

  return c.json({ success: true });
});

// ── Model Selection ──

const AVAILABLE_MODELS = [
  { id: "claude-sonnet-4-5-20250929", provider: "anthropic", name: "Claude Sonnet 4.5", tier: "free" },
  { id: "claude-opus-4-6", provider: "anthropic", name: "Claude Opus 4.6", tier: "pro" },
  { id: "claude-haiku-4-5-20251001", provider: "anthropic", name: "Claude Haiku 4.5", tier: "free" },
  { id: "gpt-4o", provider: "openai", name: "GPT-4o", tier: "starter" },
  { id: "gpt-4o-mini", provider: "openai", name: "GPT-4o Mini", tier: "free" },
  { id: "gpt-4.1", provider: "openai", name: "GPT-4.1", tier: "pro" },
  { id: "gemini-2.5-pro", provider: "google", name: "Gemini 2.5 Pro", tier: "starter" },
  { id: "gemini-2.5-flash", provider: "google", name: "Gemini 2.5 Flash", tier: "free" },
  { id: "deepseek-r1", provider: "deepseek", name: "DeepSeek R1", tier: "starter" },
  { id: "llama-4-maverick", provider: "meta", name: "Llama 4 Maverick", tier: "free" },
];

config.get("/models", async (c) => {
  const user = c.get("user") as JwtPayload;

  const tenant = await queryOne<{ default_model: string | null }>(
    "SELECT default_model FROM tenants WHERE id = $1",
    [user.tenantId],
  );

  const planTier = user.plan;
  const tierOrder: Record<string, number> = { free: 0, starter: 1, pro: 2, enterprise: 3 };
  const userTier = tierOrder[planTier] ?? 0;

  const models = AVAILABLE_MODELS.map((m) => ({
    ...m,
    available: userTier >= (tierOrder[m.tier] ?? 0),
    selected: tenant?.default_model === m.id,
  }));

  return c.json({ models, currentModel: tenant?.default_model ?? "" });
});

config.post("/models", async (c) => {
  const user = c.get("user") as JwtPayload;
  const body = await c.req.json<{ modelId: string }>();

  const model = AVAILABLE_MODELS.find((m) => m.id === body.modelId);
  if (!model) {
    return c.json({ error: "Unknown model" }, 404);
  }

  await query(
    "UPDATE tenants SET default_model = $2 WHERE id = $1",
    [user.tenantId, body.modelId],
  );

  return c.json({ success: true });
});

export { config };

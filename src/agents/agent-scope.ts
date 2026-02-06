import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { OpenClawConfig } from "../config/config.js";
import { resolveStateDir } from "../config/paths.js";
import {
  DEFAULT_AGENT_ID,
  normalizeAgentId,
  parseAgentSessionKey,
} from "../routing/session-key.js";
import { resolveUserPath } from "../utils.js";
import { DEFAULT_AGENT_WORKSPACE_DIR } from "./workspace.js";

export { resolveAgentIdFromSessionKey } from "../routing/session-key.js";

// SaaS dynamic agent support: lazy-imported to avoid circular deps when SaaS mode is off.
let _listDynamicAgentIds: (() => Promise<string[]>) | undefined;

async function getDynamicAgentIds(): Promise<string[]> {
  if (process.env.OPENCLAW_SAAS_MODE !== "1") return [];
  if (!_listDynamicAgentIds) {
    const mod = await import("../saas/dynamic-agent-resolver.js");
    _listDynamicAgentIds = mod.listDynamicAgentIds;
  }
  return _listDynamicAgentIds();
}

type AgentEntry = NonNullable<NonNullable<OpenClawConfig["agents"]>["list"]>[number];

type ResolvedAgentConfig = {
  name?: string;
  workspace?: string;
  agentDir?: string;
  model?: AgentEntry["model"];
  skills?: AgentEntry["skills"];
  memorySearch?: AgentEntry["memorySearch"];
  humanDelay?: AgentEntry["humanDelay"];
  heartbeat?: AgentEntry["heartbeat"];
  identity?: AgentEntry["identity"];
  groupChat?: AgentEntry["groupChat"];
  subagents?: AgentEntry["subagents"];
  sandbox?: AgentEntry["sandbox"];
  tools?: AgentEntry["tools"];
};

let defaultAgentWarned = false;

function listAgents(cfg: OpenClawConfig): AgentEntry[] {
  const list = cfg.agents?.list;
  if (!Array.isArray(list)) {
    return [];
  }
  return list.filter((entry): entry is AgentEntry => Boolean(entry && typeof entry === "object"));
}

export function listAgentIds(cfg: OpenClawConfig): string[] {
  const agents = listAgents(cfg);
  if (agents.length === 0) {
    return [DEFAULT_AGENT_ID];
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const entry of agents) {
    const id = normalizeAgentId(entry?.id);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  return ids.length > 0 ? ids : [DEFAULT_AGENT_ID];
}

export function resolveDefaultAgentId(cfg: OpenClawConfig): string {
  const agents = listAgents(cfg);
  if (agents.length === 0) {
    return DEFAULT_AGENT_ID;
  }
  const defaults = agents.filter((agent) => agent?.default);
  if (defaults.length > 1 && !defaultAgentWarned) {
    defaultAgentWarned = true;
    console.warn("Multiple agents marked default=true; using the first entry as default.");
  }
  const chosen = (defaults[0] ?? agents[0])?.id?.trim();
  return normalizeAgentId(chosen || DEFAULT_AGENT_ID);
}

export function resolveSessionAgentIds(params: { sessionKey?: string; config?: OpenClawConfig }): {
  defaultAgentId: string;
  sessionAgentId: string;
} {
  const defaultAgentId = resolveDefaultAgentId(params.config ?? {});
  const sessionKey = params.sessionKey?.trim();
  const normalizedSessionKey = sessionKey ? sessionKey.toLowerCase() : undefined;
  const parsed = normalizedSessionKey ? parseAgentSessionKey(normalizedSessionKey) : null;
  const sessionAgentId = parsed?.agentId ? normalizeAgentId(parsed.agentId) : defaultAgentId;
  return { defaultAgentId, sessionAgentId };
}

export function resolveSessionAgentId(params: {
  sessionKey?: string;
  config?: OpenClawConfig;
}): string {
  return resolveSessionAgentIds(params).sessionAgentId;
}

function resolveAgentEntry(cfg: OpenClawConfig, agentId: string): AgentEntry | undefined {
  const id = normalizeAgentId(agentId);
  return listAgents(cfg).find((entry) => normalizeAgentId(entry.id) === id);
}

export function resolveAgentConfig(
  cfg: OpenClawConfig,
  agentId: string,
): ResolvedAgentConfig | undefined {
  const id = normalizeAgentId(agentId);
  const entry = resolveAgentEntry(cfg, id);
  if (!entry) {
    return undefined;
  }
  return {
    name: typeof entry.name === "string" ? entry.name : undefined,
    workspace: typeof entry.workspace === "string" ? entry.workspace : undefined,
    agentDir: typeof entry.agentDir === "string" ? entry.agentDir : undefined,
    model:
      typeof entry.model === "string" || (entry.model && typeof entry.model === "object")
        ? entry.model
        : undefined,
    skills: Array.isArray(entry.skills) ? entry.skills : undefined,
    memorySearch: entry.memorySearch,
    humanDelay: entry.humanDelay,
    heartbeat: entry.heartbeat,
    identity: entry.identity,
    groupChat: entry.groupChat,
    subagents: typeof entry.subagents === "object" && entry.subagents ? entry.subagents : undefined,
    sandbox: entry.sandbox,
    tools: entry.tools,
  };
}

export function resolveAgentSkillsFilter(
  cfg: OpenClawConfig,
  agentId: string,
): string[] | undefined {
  const raw = resolveAgentConfig(cfg, agentId)?.skills;
  if (!raw) {
    return undefined;
  }
  const normalized = raw.map((entry) => String(entry).trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : [];
}

export function resolveAgentModelPrimary(cfg: OpenClawConfig, agentId: string): string | undefined {
  const raw = resolveAgentConfig(cfg, agentId)?.model;
  if (!raw) {
    return undefined;
  }
  if (typeof raw === "string") {
    return raw.trim() || undefined;
  }
  const primary = raw.primary?.trim();
  return primary || undefined;
}

export function resolveAgentModelFallbacksOverride(
  cfg: OpenClawConfig,
  agentId: string,
): string[] | undefined {
  const raw = resolveAgentConfig(cfg, agentId)?.model;
  if (!raw || typeof raw === "string") {
    return undefined;
  }
  // Important: treat an explicitly provided empty array as an override to disable global fallbacks.
  if (!Object.hasOwn(raw, "fallbacks")) {
    return undefined;
  }
  return Array.isArray(raw.fallbacks) ? raw.fallbacks : undefined;
}

/**
 * Returns static agent IDs merged with dynamic SaaS agent IDs (when OPENCLAW_SAAS_MODE=1).
 */
export async function listAgentIdsWithDynamic(cfg: OpenClawConfig): Promise<string[]> {
  const staticIds = listAgentIds(cfg);
  const dynamicIds = await getDynamicAgentIds();
  if (dynamicIds.length === 0) return staticIds;
  const seen = new Set(staticIds);
  for (const id of dynamicIds) {
    if (!seen.has(id)) {
      seen.add(id);
      staticIds.push(id);
    }
  }
  return staticIds;
}

/**
 * Checks if an agent ID belongs to a dynamic SaaS tenant and ensures its directory exists.
 */
function ensureDynamicAgentDir(stateDir: string, agentId: string): string {
  const agentDir = path.join(stateDir, "agents", agentId, "agent");
  if (!fs.existsSync(agentDir)) {
    fs.mkdirSync(agentDir, { recursive: true });
  }
  return agentDir;
}

export function resolveAgentWorkspaceDir(cfg: OpenClawConfig, agentId: string) {
  const id = normalizeAgentId(agentId);
  const configured = resolveAgentConfig(cfg, id)?.workspace?.trim();
  if (configured) {
    return resolveUserPath(configured);
  }
  const defaultAgentId = resolveDefaultAgentId(cfg);
  if (id === defaultAgentId) {
    const fallback = cfg.agents?.defaults?.workspace?.trim();
    if (fallback) {
      return resolveUserPath(fallback);
    }
    return DEFAULT_AGENT_WORKSPACE_DIR;
  }
  // SaaS dynamic agents: use state dir workspace
  if (process.env.OPENCLAW_SAAS_MODE === "1" && id.startsWith("saas-")) {
    const root = resolveStateDir(process.env, os.homedir);
    const wsDir = path.join(root, "agents", id, "workspace");
    if (!fs.existsSync(wsDir)) {
      fs.mkdirSync(wsDir, { recursive: true });
    }
    return wsDir;
  }
  return path.join(os.homedir(), ".openclaw", `workspace-${id}`);
}

export function resolveAgentDir(cfg: OpenClawConfig, agentId: string) {
  const id = normalizeAgentId(agentId);
  const configured = resolveAgentConfig(cfg, id)?.agentDir?.trim();
  if (configured) {
    return resolveUserPath(configured);
  }
  const root = resolveStateDir(process.env, os.homedir);
  // SaaS dynamic agents: ensure directory exists on-demand
  if (process.env.OPENCLAW_SAAS_MODE === "1" && id.startsWith("saas-")) {
    return ensureDynamicAgentDir(root, id);
  }
  return path.join(root, "agents", id, "agent");
}

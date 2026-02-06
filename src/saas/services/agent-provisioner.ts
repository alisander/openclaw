import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveStateDir } from "../../config/paths.js";
import { saveAuthProfileStore } from "../../agents/auth-profiles/store.js";
import type { AuthProfileStore } from "../../agents/auth-profiles/types.js";
import { AUTH_STORE_VERSION } from "../../agents/auth-profiles/constants.js";

/**
 * Creates the filesystem structure for a new SaaS tenant's agent.
 * Each tenant maps to an OpenClaw agent with its own state directory.
 */
export async function provisionAgent(params: {
  agentId: string;
  operatorAuthStore?: AuthProfileStore;
}): Promise<{ agentDir: string; workspaceDir: string }> {
  const stateDir = resolveStateDir(process.env, os.homedir);
  const agentDir = path.join(stateDir, "agents", params.agentId, "agent");
  const workspaceDir = path.join(stateDir, "agents", params.agentId, "workspace");

  // Create agent directories
  fs.mkdirSync(agentDir, { recursive: true });
  fs.mkdirSync(workspaceDir, { recursive: true });

  // Seed auth-profiles with operator's LLM API keys
  if (params.operatorAuthStore) {
    const tenantStore = buildTenantAuthStore(params.operatorAuthStore);
    saveAuthProfileStore(tenantStore, agentDir);
  }

  return { agentDir, workspaceDir };
}

/**
 * Builds a tenant auth store from the operator's store, copying only LLM provider keys.
 */
function buildTenantAuthStore(operatorStore: AuthProfileStore): AuthProfileStore {
  const profiles: AuthProfileStore["profiles"] = {};

  for (const [key, cred] of Object.entries(operatorStore.profiles)) {
    // Only copy API keys for LLM providers, not user-specific OAuth tokens
    if (cred.type === "api_key") {
      profiles[key] = { ...cred };
    }
  }

  return {
    version: AUTH_STORE_VERSION,
    profiles,
  };
}

/**
 * Removes agent directories when a tenant is deleted.
 */
export async function deprovisionAgent(agentId: string): Promise<void> {
  const stateDir = resolveStateDir(process.env, os.homedir);
  const agentRoot = path.join(stateDir, "agents", agentId);

  if (fs.existsSync(agentRoot)) {
    fs.rmSync(agentRoot, { recursive: true, force: true });
  }
}

/**
 * Checks if an agent directory exists.
 */
export function isAgentProvisioned(agentId: string): boolean {
  const stateDir = resolveStateDir(process.env, os.homedir);
  const agentDir = path.join(stateDir, "agents", agentId, "agent");
  return fs.existsSync(agentDir);
}

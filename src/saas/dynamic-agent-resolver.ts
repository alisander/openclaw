import { listActiveAgentIds } from "./services/tenant-registry.js";
import { isSaasMode } from "./saas-mode.js";

let cachedAgentIds: string[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Returns the list of active SaaS tenant agent IDs.
 * Results are cached for 30 seconds to avoid excessive DB queries.
 */
export async function listDynamicAgentIds(): Promise<string[]> {
  if (!isSaasMode()) {
    return [];
  }

  const now = Date.now();
  if (cachedAgentIds && now < cacheExpiry) {
    return cachedAgentIds;
  }

  try {
    cachedAgentIds = await listActiveAgentIds();
    cacheExpiry = now + CACHE_TTL_MS;
    return cachedAgentIds;
  } catch (err) {
    console.error("[saas] Failed to list dynamic agent IDs:", err);
    return cachedAgentIds ?? [];
  }
}

/**
 * Invalidates the cached agent ID list (e.g. after signup).
 */
export function invalidateAgentIdCache(): void {
  cachedAgentIds = null;
  cacheExpiry = 0;
}

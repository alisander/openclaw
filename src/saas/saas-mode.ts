/**
 * SaaS mode utilities. SaaS mode is enabled via OPENCLAW_SAAS_MODE=1 environment variable.
 */

let _saasMode: boolean | undefined;

export function isSaasMode(): boolean {
  if (_saasMode === undefined) {
    _saasMode = process.env.OPENCLAW_SAAS_MODE === "1";
  }
  return _saasMode;
}

/**
 * Extracts tenant ID from an agent ID.
 * SaaS agent IDs follow the format: saas-{uuid-prefix}
 */
export function extractTenantAgentId(agentId: string): string | null {
  if (agentId.startsWith("saas-")) {
    return agentId;
  }
  return null;
}

export class InsufficientCreditsError extends Error {
  constructor() {
    super("Insufficient credits to process request");
    this.name = "InsufficientCreditsError";
  }
}

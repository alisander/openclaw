"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Integration = {
  provider: string;
  email: string | null;
  status: string;
  connectedAt: string;
};

const PROVIDERS = [
  {
    id: "google",
    name: "Google Workspace",
    description: "Gmail, Google Drive",
    connectPath: "/api/integrations/connect/google",
  },
  {
    id: "microsoft",
    name: "Microsoft 365",
    description: "Outlook, OneDrive",
    connectPath: "/api/integrations/connect/microsoft",
  },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function loadIntegrations() {
    try {
      const data = await api<{ integrations: Integration[] }>("/api/integrations");
      setIntegrations(data.integrations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integrations");
    }
  }

  async function handleConnect(provider: string) {
    try {
      const data = await api<{ authUrl: string }>(
        `/api/integrations/connect/${provider}`,
      );
      window.location.href = data.authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to connect ${provider}`);
    }
  }

  async function handleDisconnect(provider: string) {
    try {
      await api(`/api/integrations/disconnect/${provider}`, { method: "POST" });
      await loadIntegrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to disconnect ${provider}`);
    }
  }

  function getIntegration(providerId: string): Integration | undefined {
    return integrations.find((i) => i.provider === providerId && i.status === "active");
  }

  const cardStyle = {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "0.75rem",
    padding: "1.5rem",
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "800px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem" }}>Integrations</h1>

      {error && <p style={{ color: "#ff6b6b", marginBottom: "1rem" }}>{error}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {PROVIDERS.map((provider) => {
          const connected = getIntegration(provider.id);
          return (
            <div key={provider.id} style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                    {provider.name}
                  </h3>
                  <p style={{ color: "#888", fontSize: "0.9rem" }}>{provider.description}</p>
                  {connected && connected.email && (
                    <p style={{ color: "#4ade80", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                      Connected as {connected.email}
                    </p>
                  )}
                </div>
                {connected ? (
                  <button
                    onClick={() => handleDisconnect(provider.id)}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "0.375rem",
                      border: "1px solid #333",
                      background: "transparent",
                      color: "#f87171",
                      cursor: "pointer",
                    }}
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(provider.id)}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "0.375rem",
                      border: "none",
                      background: "#fff",
                      color: "#000",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

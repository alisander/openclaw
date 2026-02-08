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
    description: "Gmail, Google Drive, Google Calendar",
    connectPath: "/api/integrations/connect/google",
    color: "#4ade80",
    instructions: {
      title: "Connect your Google account",
      description: "Connecting Google gives your assistant access to your Gmail, Google Drive, and Calendar. Here is what happens:",
      steps: [
        "Click 'Connect' to open the Google sign-in page",
        "Sign in with the Google account you want to connect",
        "Review the permissions: Gmail (read and send), Google Drive (read and manage files), Calendar (read events)",
        "Click 'Allow' to grant access",
        "You will be redirected back here and your account will appear as connected",
      ],
      capabilities: [
        "Read and search your Gmail inbox",
        "Send emails on your behalf",
        "Search and read Google Drive files",
        "Upload files to Google Drive",
        "View your calendar events",
      ],
      note: "OpenClaw only accesses your data when you ask your assistant to do so. You can disconnect at any time to revoke access.",
    },
  },
  {
    id: "microsoft",
    name: "Microsoft 365",
    description: "Outlook, OneDrive, Microsoft Calendar",
    connectPath: "/api/integrations/connect/microsoft",
    color: "#74b9ff",
    instructions: {
      title: "Connect your Microsoft account",
      description: "Connecting Microsoft 365 gives your assistant access to Outlook, OneDrive, and Calendar. Here is what happens:",
      steps: [
        "Click 'Connect' to open the Microsoft sign-in page",
        "Sign in with your Microsoft account (personal or work/school)",
        "Review the permissions: Mail (read and send), Files (read and write), Calendar (read events)",
        "Click 'Accept' to grant access",
        "You will be redirected back here and your account will appear as connected",
      ],
      capabilities: [
        "Read and search your Outlook inbox",
        "Send emails via Outlook",
        "Search and read OneDrive files",
        "Upload files to OneDrive",
        "View your calendar events",
      ],
      note: "For work or school accounts, your organization's admin may need to approve the app first. Contact your IT admin if you see an approval required message.",
    },
  },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

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
    <div style={{ maxWidth: "800px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Integrations</h1>
      <p style={{ color: "#888", marginBottom: "2rem" }}>
        Connect cloud services to give your assistant access to your email, files, and calendar.
        Click on a service to see details and setup instructions.
      </p>

      {error && <p style={{ color: "#ff6b6b", marginBottom: "1rem" }}>{error}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {PROVIDERS.map((provider) => {
          const connected = getIntegration(provider.id);
          const isExpanded = expanded === provider.id;
          const info = provider.instructions;

          return (
            <div key={provider.id} style={cardStyle}>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onClick={() => setExpanded(isExpanded ? null : provider.id)}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                      {provider.name}
                    </h3>
                    {connected && (
                      <span style={{
                        fontSize: "0.6875rem",
                        padding: "0.125rem 0.5rem",
                        borderRadius: "1rem",
                        background: "rgba(74, 222, 128, 0.1)",
                        color: "#4ade80",
                        fontWeight: 600,
                      }}>
                        Connected
                      </span>
                    )}
                  </div>
                  <p style={{ color: "#888", fontSize: "0.875rem" }}>{provider.description}</p>
                  {connected && connected.email && (
                    <p style={{ color: "#4ade80", fontSize: "0.8125rem", marginTop: "0.25rem" }}>
                      Signed in as {connected.email}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {connected ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDisconnect(provider.id); }}
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "0.375rem",
                        border: "1px solid #333",
                        background: "transparent",
                        color: "#f87171",
                        cursor: "pointer",
                        fontSize: "0.8125rem",
                      }}
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleConnect(provider.id); }}
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "0.375rem",
                        border: "none",
                        background: "#fff",
                        color: "#000",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: "0.8125rem",
                      }}
                    >
                      Connect
                    </button>
                  )}
                  <span style={{ color: "#555", fontSize: "0.75rem", transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "none" }}>
                    &gt;
                  </span>
                </div>
              </div>

              {/* Expandable instructions */}
              {isExpanded && (
                <div style={{ marginTop: "1.25rem", borderTop: "1px solid #222", paddingTop: "1.25rem" }}>
                  {/* Instructions */}
                  <div
                    style={{
                      background: "#0d1117",
                      border: "1px solid #1c2333",
                      borderRadius: "0.5rem",
                      padding: "1.25rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <h4 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "0.375rem", color: provider.color }}>
                      {info.title}
                    </h4>
                    <p style={{ color: "#888", fontSize: "0.8125rem", marginBottom: "0.75rem" }}>
                      {info.description}
                    </p>
                    <ol style={{ margin: 0, paddingLeft: "1.25rem", color: "#c9d1d9", fontSize: "0.8125rem", lineHeight: 1.7 }}>
                      {info.steps.map((step, i) => (
                        <li key={i} style={{ marginBottom: "0.125rem" }}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Capabilities */}
                  <div
                    style={{
                      background: "#0d1117",
                      border: "1px solid #1c2333",
                      borderRadius: "0.5rem",
                      padding: "1.25rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <h4 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "#c9d1d9" }}>
                      What your assistant can do
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#888", fontSize: "0.8125rem", lineHeight: 1.7 }}>
                      {info.capabilities.map((cap, i) => (
                        <li key={i}>{cap}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Note */}
                  <div style={{ padding: "0.625rem 0.75rem", background: "#1a1500", border: "1px solid #3a2f00", borderRadius: "0.375rem", color: "#fbbf24", fontSize: "0.75rem", lineHeight: 1.5 }}>
                    {info.note}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

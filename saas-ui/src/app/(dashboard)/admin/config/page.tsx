"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type SystemConfig = {
  saasMode: boolean;
  jwtConfigured: boolean;
  stripeConfigured: boolean;
  corsOrigins: string[];
  database: {
    connected: boolean;
    type: string;
    host?: string;
  };
  redis: {
    connected: boolean;
    host?: string;
  };
  features: Record<string, boolean>;
  version?: string;
  uptime?: number;
};

export default function AdminConfigPage() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<SystemConfig>("/api/admin/system-config")
      .then(setConfig)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div style={{ color: "#ff6b6b", padding: "2rem" }}>Error: {error}</div>;
  if (!config) return <div style={{ color: "#888", padding: "2rem" }}>Loading...</div>;

  const cardStyle = {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "0.75rem",
    padding: "1.5rem",
    marginBottom: "1.5rem",
  };

  const labelStyle = {
    color: "#888",
    fontSize: "0.8rem",
    minWidth: "140px",
  };

  const rowStyle = {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "0.6rem 0",
    borderBottom: "1px solid #1a1a1a",
  };

  function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
    return (
      <span style={{
        color: ok ? "#4ade80" : "#ff6b6b",
        background: ok ? "#0a2a0a" : "#2a0a0a",
        padding: "0.2rem 0.6rem",
        borderRadius: "0.25rem",
        fontSize: "0.75rem",
        fontWeight: 500,
      }}>
        {label || (ok ? "Configured" : "Not Configured")}
      </span>
    );
  }

  function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(`${mins}m`);
    return parts.join(" ");
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>System Configuration</h1>
      <p style={{ color: "#888", fontSize: "0.875rem", marginBottom: "2rem" }}>
        Read-only view of the current system configuration and service status.
      </p>

      {/* System Info */}
      {(config.version || config.uptime !== undefined) && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>System Info</h3>
          {config.version && (
            <div style={rowStyle}>
              <span style={labelStyle}>Version</span>
              <span style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>{config.version}</span>
            </div>
          )}
          {config.uptime !== undefined && (
            <div style={rowStyle}>
              <span style={labelStyle}>Uptime</span>
              <span style={{ fontSize: "0.875rem" }}>{formatUptime(config.uptime)}</span>
            </div>
          )}
        </div>
      )}

      {/* Core Settings */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Core Settings</h3>

        <div style={rowStyle}>
          <span style={labelStyle}>SaaS Mode</span>
          <StatusBadge ok={config.saasMode} label={config.saasMode ? "Enabled" : "Disabled"} />
        </div>

        <div style={rowStyle}>
          <span style={labelStyle}>JWT Authentication</span>
          <StatusBadge ok={config.jwtConfigured} />
        </div>

        <div style={rowStyle}>
          <span style={labelStyle}>Stripe Integration</span>
          <StatusBadge ok={config.stripeConfigured} />
        </div>

        <div style={{ ...rowStyle, borderBottom: "none" }}>
          <span style={labelStyle}>CORS Origins</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
            {config.corsOrigins.length === 0 ? (
              <span style={{ color: "#666", fontSize: "0.8rem" }}>None configured</span>
            ) : (
              config.corsOrigins.map((origin) => (
                <span key={origin} style={{
                  background: "#1a1a1a",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "0.25rem",
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                  color: "#ccc",
                }}>
                  {origin}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Database */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Database</h3>

        <div style={rowStyle}>
          <span style={labelStyle}>Status</span>
          <StatusBadge ok={config.database.connected} label={config.database.connected ? "Connected" : "Disconnected"} />
        </div>

        <div style={rowStyle}>
          <span style={labelStyle}>Type</span>
          <span style={{ fontSize: "0.875rem", textTransform: "capitalize" }}>{config.database.type}</span>
        </div>

        {config.database.host && (
          <div style={{ ...rowStyle, borderBottom: "none" }}>
            <span style={labelStyle}>Host</span>
            <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#ccc" }}>{config.database.host}</span>
          </div>
        )}
      </div>

      {/* Redis */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Redis</h3>

        <div style={rowStyle}>
          <span style={labelStyle}>Status</span>
          <StatusBadge ok={config.redis.connected} label={config.redis.connected ? "Connected" : "Disconnected"} />
        </div>

        {config.redis.host && (
          <div style={{ ...rowStyle, borderBottom: "none" }}>
            <span style={labelStyle}>Host</span>
            <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#ccc" }}>{config.redis.host}</span>
          </div>
        )}
      </div>

      {/* Feature Flags */}
      {config.features && Object.keys(config.features).length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Feature Flags</h3>
          {Object.entries(config.features).map(([key, enabled], i, arr) => (
            <div key={key} style={{ ...rowStyle, borderBottom: i === arr.length - 1 ? "none" : "1px solid #1a1a1a" }}>
              <span style={labelStyle}>{key}</span>
              <StatusBadge ok={enabled} label={enabled ? "Enabled" : "Disabled"} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

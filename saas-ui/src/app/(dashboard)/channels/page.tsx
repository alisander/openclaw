"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Channel = {
  id: string;
  name: string;
  description: string;
  configSchema: Record<string, string>;
  enabled: boolean;
  configured: boolean;
  status: string;
  config: Record<string, unknown>;
};

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selected, setSelected] = useState<Channel | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadChannels();
  }, []);

  async function loadChannels() {
    try {
      const data = await api<{ channels: Channel[] }>("/api/config/channels");
      setChannels(data.channels);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load channels");
    }
  }

  function selectChannel(ch: Channel) {
    setSelected(ch);
    setEnabled(ch.enabled);
    const vals: Record<string, string> = {};
    for (const key of Object.keys(ch.configSchema)) {
      vals[key] = (ch.config[key] as string) ?? "";
    }
    setConfigValues(vals);
    setError("");
    setSuccess("");
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api(`/api/config/channels/${selected.id}`, {
        method: "POST",
        body: { enabled, config: configValues },
      });
      setSuccess(`${selected.name} configuration saved`);
      await loadChannels();
      // Update selected with fresh data
      const updated = channels.find((c) => c.id === selected.id);
      if (updated) {
        setSelected({ ...updated, enabled, config: configValues });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!selected) return;
    if (!confirm(`Remove ${selected.name} configuration?`)) return;
    try {
      await api(`/api/config/channels/${selected.id}`, { method: "DELETE" });
      setSelected(null);
      await loadChannels();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove");
    }
  }

  const cardStyle = {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "0.75rem",
    padding: "1.25rem",
    cursor: "pointer" as const,
    transition: "border-color 0.15s",
  };

  const inputStyle = {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "0.5rem",
    border: "1px solid #333",
    background: "#111",
    color: "#fff",
    fontSize: "0.875rem",
    boxSizing: "border-box" as const,
  };

  const statusColors: Record<string, string> = {
    active: "#4ade80",
    disabled: "#888",
    pending: "#fbbf24",
    not_configured: "#666",
  };

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Channels</h1>
      <p style={{ color: "#888", marginBottom: "2rem" }}>
        Connect your assistant to messaging platforms. Configure each channel with the required credentials.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {/* Channel List */}
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {channels.map((ch) => (
              <div
                key={ch.id}
                onClick={() => selectChannel(ch)}
                style={{
                  ...cardStyle,
                  borderColor: selected?.id === ch.id ? "#555" : "#222",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 600 }}>{ch.name}</span>
                  <span style={{ fontSize: "0.75rem", color: statusColors[ch.status] ?? "#666" }}>
                    {ch.status === "not_configured" ? "Not configured" : ch.status}
                  </span>
                </div>
                <div style={{ color: "#888", fontSize: "0.8125rem" }}>{ch.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Config Panel */}
        <div>
          {!selected ? (
            <div style={{ ...cardStyle, cursor: "default", textAlign: "center", color: "#666", padding: "3rem" }}>
              Select a channel to configure
            </div>
          ) : (
            <div style={{ ...cardStyle, cursor: "default" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1.5rem" }}>
                {selected.name} Configuration
              </h3>

              {error && (
                <div style={{ background: "#331111", color: "#ff6b6b", padding: "0.75rem", borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{ background: "#113311", color: "#4ade80", padding: "0.75rem", borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
                  {success}
                </div>
              )}

              {/* Enabled toggle */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    style={{ width: "1.25rem", height: "1.25rem" }}
                  />
                  <span>Enabled</span>
                </label>
              </div>

              {/* Config fields */}
              {Object.entries(selected.configSchema).map(([key, type]) => (
                <div key={key} style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.375rem", color: "#888", fontSize: "0.8125rem" }}>
                    {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                  </label>
                  <input
                    type={key.toLowerCase().includes("token") || key.toLowerCase().includes("secret") || key.toLowerCase().includes("password") ? "password" : "text"}
                    value={configValues[key] ?? ""}
                    onChange={(e) => setConfigValues({ ...configValues, [key]: e.target.value })}
                    placeholder={`Enter ${key}`}
                    style={inputStyle}
                  />
                </div>
              ))}

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    background: "#fff",
                    color: "#000",
                    fontWeight: 600,
                    cursor: saving ? "wait" : "pointer",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? "Saving..." : "Save Configuration"}
                </button>
                {selected.configured && (
                  <button
                    onClick={handleDisconnect}
                    style={{
                      padding: "0.75rem 1.5rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #ff6b6b",
                      background: "transparent",
                      color: "#ff6b6b",
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

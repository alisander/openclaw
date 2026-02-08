"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [tenantInfo, setTenantInfo] = useState<{ id: string; agentId: string; plan: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setEmail(localStorage.getItem("openclaw_user_email") ?? "");
      setName(localStorage.getItem("openclaw_user_name") ?? "");
    }
    // Load tenant info from dashboard endpoint
    api<{ usage: unknown; tenant?: { id: string; agentId: string; plan: string } }>("/api/dashboard/usage")
      .then((data) => {
        if (data.tenant) setTenantInfo(data.tenant);
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      // For now, just show success (password change would need a dedicated endpoint)
      setSuccess("Settings saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const cardStyle = {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "0.75rem",
    padding: "1.5rem",
    marginBottom: "1.5rem",
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

  const labelStyle = {
    display: "block" as const,
    marginBottom: "0.375rem",
    color: "#888",
    fontSize: "0.8125rem",
  };

  return (
    <div style={{ maxWidth: "600px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem" }}>Settings</h1>

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

      {/* Account Info */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.25rem" }}>Account</h2>

        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            disabled
            style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }}
          />
        </div>

        <div>
          <label style={labelStyle}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Change Password */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.25rem" }}>Change Password</h2>

        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min 8 characters"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Tenant Info */}
      {tenantInfo && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.25rem" }}>Tenant Details</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <div style={{ color: "#888", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Tenant ID</div>
              <div style={{ fontFamily: "monospace", fontSize: "0.8125rem", color: "#ccc" }}>
                {tenantInfo.id.slice(0, 8)}...
              </div>
            </div>
            <div>
              <div style={{ color: "#888", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Agent ID</div>
              <div style={{ fontFamily: "monospace", fontSize: "0.8125rem", color: "#ccc" }}>
                {tenantInfo.agentId}
              </div>
            </div>
            <div>
              <div style={{ color: "#888", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Plan</div>
              <div style={{ fontSize: "0.8125rem", textTransform: "capitalize" }}>
                {tenantInfo.plan}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div style={{ ...cardStyle, borderColor: "#3a1111" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem", color: "#ff6b6b" }}>Danger Zone</h2>
        <p style={{ color: "#888", fontSize: "0.8125rem", marginBottom: "1rem" }}>
          Permanently delete your account and all associated data.
        </p>
        <button
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            border: "1px solid #ff6b6b",
            background: "transparent",
            color: "#ff6b6b",
            cursor: "pointer",
            fontSize: "0.8125rem",
          }}
        >
          Delete Account
        </button>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "0.75rem 2rem",
          borderRadius: "0.5rem",
          border: "none",
          background: "#fff",
          color: "#000",
          fontWeight: 600,
          cursor: saving ? "wait" : "pointer",
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}

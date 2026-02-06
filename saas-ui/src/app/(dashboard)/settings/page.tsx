"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  const cardStyle = {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "0.75rem",
    padding: "1.5rem",
    marginBottom: "1.5rem",
  };

  const inputStyle = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    borderRadius: "0.375rem",
    border: "1px solid #333",
    background: "#0a0a0a",
    color: "#fff",
    fontSize: "0.95rem",
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "600px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem" }}>Settings</h1>

      {saved && (
        <div
          style={{
            background: "#113311",
            color: "#4ade80",
            padding: "0.75rem",
            borderRadius: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          Settings saved successfully.
        </div>
      )}

      {/* Assistant Configuration */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
          Assistant Configuration
        </h2>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", color: "#888" }}>
            Assistant Name
          </label>
          <input type="text" placeholder="My Assistant" style={inputStyle} />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", color: "#888" }}>
            Default Model
          </label>
          <select
            style={{
              ...inputStyle,
              appearance: "auto",
            }}
          >
            <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5</option>
            <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", color: "#888" }}>
            System Prompt (optional)
          </label>
          <textarea
            rows={4}
            placeholder="Custom instructions for your assistant..."
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
      </div>

      {/* Account */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>Account</h2>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", color: "#888" }}>Email</label>
          <input type="email" disabled placeholder="you@example.com" style={{ ...inputStyle, opacity: 0.5 }} />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", color: "#888" }}>
            Change Password
          </label>
          <input type="password" placeholder="New password" style={inputStyle} />
        </div>
      </div>

      <button
        onClick={() => {
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        }}
        style={{
          padding: "0.75rem 1.5rem",
          borderRadius: "0.5rem",
          border: "none",
          background: "#fff",
          color: "#000",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Save Settings
      </button>
    </div>
  );
}

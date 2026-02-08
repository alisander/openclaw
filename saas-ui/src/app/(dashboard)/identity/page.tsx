"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Identity = {
  displayName: string;
  avatarUrl: string;
  personality: string;
  language: string;
  tone: string;
  defaultModel: string;
  systemPrompt: string;
};

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "friendly", label: "Friendly" },
  { id: "casual", label: "Casual" },
  { id: "formal", label: "Formal" },
  { id: "technical", label: "Technical" },
  { id: "creative", label: "Creative" },
];

const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
  { id: "de", label: "German" },
  { id: "it", label: "Italian" },
  { id: "pt", label: "Portuguese" },
  { id: "ja", label: "Japanese" },
  { id: "ko", label: "Korean" },
  { id: "zh", label: "Chinese" },
  { id: "ar", label: "Arabic" },
  { id: "hi", label: "Hindi" },
  { id: "ru", label: "Russian" },
];

export default function IdentityPage() {
  const [identity, setIdentity] = useState<Identity>({
    displayName: "",
    avatarUrl: "",
    personality: "",
    language: "en",
    tone: "professional",
    defaultModel: "",
    systemPrompt: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadIdentity();
  }, []);

  async function loadIdentity() {
    try {
      const data = await api<{ identity: Identity }>("/api/config/identity");
      setIdentity(data.identity);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load identity");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api("/api/config/identity", {
        method: "POST",
        body: identity,
      });
      setSuccess("Identity saved successfully");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save identity");
    } finally {
      setSaving(false);
    }
  }

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

  const selectStyle = {
    ...inputStyle,
    appearance: "none" as const,
    cursor: "pointer",
  };

  const cardStyle = {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "0.75rem",
    padding: "1.5rem",
    marginBottom: "1.5rem",
  };

  if (loading) return <div style={{ color: "#888", padding: "2rem" }}>Loading...</div>;

  return (
    <div style={{ maxWidth: "700px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Agent Identity</h1>
      <p style={{ color: "#888", marginBottom: "2rem" }}>
        Customize your assistant&apos;s personality, tone, and behavior.
      </p>

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

      {/* Basic Info */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.25rem" }}>Basic Information</h3>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.375rem", color: "#888", fontSize: "0.8125rem" }}>
            Display Name
          </label>
          <input
            type="text"
            value={identity.displayName}
            onChange={(e) => setIdentity({ ...identity, displayName: e.target.value })}
            placeholder="My AI Assistant"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.375rem", color: "#888", fontSize: "0.8125rem" }}>
            Avatar URL
          </label>
          <input
            type="url"
            value={identity.avatarUrl}
            onChange={(e) => setIdentity({ ...identity, avatarUrl: e.target.value })}
            placeholder="https://example.com/avatar.png"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Personality */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.25rem" }}>Personality</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.375rem", color: "#888", fontSize: "0.8125rem" }}>
              Tone
            </label>
            <select
              value={identity.tone}
              onChange={(e) => setIdentity({ ...identity, tone: e.target.value })}
              style={selectStyle}
            >
              {TONES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.375rem", color: "#888", fontSize: "0.8125rem" }}>
              Language
            </label>
            <select
              value={identity.language}
              onChange={(e) => setIdentity({ ...identity, language: e.target.value })}
              style={selectStyle}
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "0.375rem", color: "#888", fontSize: "0.8125rem" }}>
            Personality Description
          </label>
          <textarea
            value={identity.personality}
            onChange={(e) => setIdentity({ ...identity, personality: e.target.value })}
            placeholder="Describe your assistant's personality... e.g., 'Helpful and concise, with a slight sense of humor. Expert in technology and business.'"
            rows={3}
            style={{ ...inputStyle, resize: "vertical" as const }}
          />
        </div>
      </div>

      {/* System Prompt */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>System Prompt</h3>
        <p style={{ color: "#666", fontSize: "0.8125rem", marginBottom: "1rem" }}>
          Advanced: Provide a custom system prompt that defines your assistant&apos;s behavior. This overrides the default personality settings.
        </p>

        <textarea
          value={identity.systemPrompt}
          onChange={(e) => setIdentity({ ...identity, systemPrompt: e.target.value })}
          placeholder="You are a helpful assistant specialized in..."
          rows={8}
          style={{ ...inputStyle, resize: "vertical" as const, fontFamily: "monospace", fontSize: "0.8125rem" }}
        />
      </div>

      {/* Save */}
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
          fontSize: "0.9375rem",
        }}
      >
        {saving ? "Saving..." : "Save Identity"}
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Model = {
  id: string;
  provider: string;
  name: string;
  tier: string;
  available: boolean;
  selected: boolean;
};

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "#d4a574",
  openai: "#74b9ff",
  google: "#81ecec",
  deepseek: "#a29bfe",
  meta: "#fab1a0",
};

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

export default function ModelPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [currentModel, setCurrentModel] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  async function loadModels() {
    try {
      const data = await api<{ models: Model[]; currentModel: string }>("/api/config/models");
      setModels(data.models);
      setCurrentModel(data.currentModel);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load models");
    }
  }

  async function selectModel(modelId: string) {
    setSaving(modelId);
    setError("");
    setSuccess("");
    try {
      await api("/api/config/models", {
        method: "POST",
        body: { modelId },
      });
      setCurrentModel(modelId);
      setModels((prev) =>
        prev.map((m) => ({ ...m, selected: m.id === modelId })),
      );
      setSuccess(`Model changed to ${models.find((m) => m.id === modelId)?.name}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update model");
    } finally {
      setSaving(null);
    }
  }

  // Group by provider
  const providers = [...new Set(models.map((m) => m.provider))];

  const cardStyle = {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "0.75rem",
    padding: "1.25rem",
    cursor: "pointer" as const,
    transition: "border-color 0.15s",
  };

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Model Selection</h1>
      <p style={{ color: "#888", marginBottom: "2rem" }}>
        Choose the default AI model for your assistant. Model availability depends on your plan.
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

      {providers.map((provider) => (
        <div key={provider} style={{ marginBottom: "2rem" }}>
          <h3 style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            textTransform: "capitalize",
            color: PROVIDER_COLORS[provider] ?? "#888",
            marginBottom: "0.75rem",
            padding: "0 0.25rem",
          }}>
            {provider}
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem" }}>
            {models
              .filter((m) => m.provider === provider)
              .map((model) => {
                const isSelected = model.id === currentModel;
                const isLoading = saving === model.id;

                return (
                  <div
                    key={model.id}
                    onClick={() => model.available && !isLoading ? selectModel(model.id) : undefined}
                    style={{
                      ...cardStyle,
                      borderColor: isSelected ? PROVIDER_COLORS[provider] ?? "#555" : "#222",
                      opacity: model.available ? 1 : 0.5,
                      cursor: model.available ? "pointer" : "not-allowed",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{model.name}</span>
                      {isSelected && (
                        <span style={{
                          fontSize: "0.6875rem",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "1rem",
                          background: `${PROVIDER_COLORS[provider] ?? "#555"}22`,
                          color: PROVIDER_COLORS[provider] ?? "#555",
                          fontWeight: 600,
                        }}>
                          Active
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", color: "#666", fontFamily: "monospace" }}>
                        {model.id}
                      </span>
                      <span style={{
                        fontSize: "0.6875rem",
                        padding: "0.125rem 0.5rem",
                        borderRadius: "1rem",
                        background: "#1a1a1a",
                        color: model.available ? "#4ade80" : "#888",
                      }}>
                        {model.available ? TIER_LABELS[model.tier] ?? model.tier : `Requires ${TIER_LABELS[model.tier] ?? model.tier}`}
                      </span>
                    </div>
                    {isLoading && (
                      <div style={{ marginTop: "0.5rem", color: "#888", fontSize: "0.75rem" }}>
                        Switching...
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

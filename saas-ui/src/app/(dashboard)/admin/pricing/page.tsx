"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

type PricingEntry = {
  id: string;
  provider: string;
  model: string;
  inputCostPerMtok: number;
  outputCostPerMtok: number;
  marginPercent: number;
  createdAt?: string;
  updatedAt?: string;
};

type PricingResponse = {
  pricing: PricingEntry[];
};

export default function AdminPricingPage() {
  const [entries, setEntries] = useState<PricingEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");

  // Form state
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editId, setEditId] = useState<string | null>(null);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [inputCost, setInputCost] = useState("");
  const [outputCost, setOutputCost] = useState("");
  const [marginPercent, setMarginPercent] = useState("");
  const [showForm, setShowForm] = useState(false);

  const fetchPricing = useCallback(() => {
    setLoading(true);
    api<PricingResponse>("/api/admin/pricing")
      .then((data) => {
        setEntries(data.pricing);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  function showMsg(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 3000);
  }

  function resetForm() {
    setFormMode("add");
    setEditId(null);
    setProvider("");
    setModel("");
    setInputCost("");
    setOutputCost("");
    setMarginPercent("");
    setShowForm(false);
  }

  function startEdit(entry: PricingEntry) {
    setFormMode("edit");
    setEditId(entry.id);
    setProvider(entry.provider);
    setModel(entry.model);
    setInputCost(String(entry.inputCostPerMtok));
    setOutputCost(String(entry.outputCostPerMtok));
    setMarginPercent(String(entry.marginPercent));
    setShowForm(true);
  }

  async function handleSubmit() {
    const inputVal = parseFloat(inputCost);
    const outputVal = parseFloat(outputCost);
    const marginVal = parseFloat(marginPercent);

    if (!provider.trim() || !model.trim()) {
      showMsg("Provider and model are required");
      return;
    }
    if (isNaN(inputVal) || isNaN(outputVal) || inputVal < 0 || outputVal < 0) {
      showMsg("Input and output costs must be valid non-negative numbers");
      return;
    }
    if (isNaN(marginVal) || marginVal < 0) {
      showMsg("Margin percent must be a valid non-negative number");
      return;
    }

    const body = {
      id: editId || undefined,
      provider: provider.trim(),
      model: model.trim(),
      inputCostPerMtok: inputVal,
      outputCostPerMtok: outputVal,
      marginPercent: marginVal,
    };

    try {
      await api("/api/admin/pricing", { method: "POST", body });
      showMsg(formMode === "add" ? "Pricing entry added" : "Pricing entry updated");
      resetForm();
      fetchPricing();
    } catch (e: unknown) {
      showMsg((e as Error).message);
    }
  }

  async function handleDelete(id: string, modelName: string) {
    if (!confirm(`Delete pricing for "${modelName}"?`)) return;
    try {
      await api(`/api/admin/pricing/${id}`, { method: "DELETE" });
      showMsg("Pricing entry deleted");
      fetchPricing();
    } catch (e: unknown) {
      showMsg((e as Error).message);
    }
  }

  const cardStyle = {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "0.75rem",
    padding: "1.5rem",
  };

  const inputStyle = {
    padding: "0.75rem",
    borderRadius: "0.5rem",
    border: "1px solid #333",
    background: "#111",
    color: "#fff",
    fontSize: "0.875rem",
    width: "100%",
    boxSizing: "border-box" as const,
  };

  const btnPrimary = {
    padding: "0.5rem 1rem",
    borderRadius: "0.5rem",
    border: "none",
    background: "#fff",
    color: "#000",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.8rem",
  };

  const btnDanger = {
    padding: "0.35rem 0.75rem",
    borderRadius: "0.5rem",
    border: "none",
    background: "#ff6b6b",
    color: "#000",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.75rem",
  };

  const btnSecondary = {
    padding: "0.5rem 1rem",
    borderRadius: "0.5rem",
    border: "1px solid #333",
    background: "transparent",
    color: "#ccc",
    fontWeight: 500,
    cursor: "pointer",
    fontSize: "0.8rem",
  };

  if (error && !entries.length) {
    return <div style={{ color: "#ff6b6b", padding: "2rem" }}>Error: {error}</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Model Pricing</h1>
        {!showForm && (
          <button style={btnPrimary} onClick={() => { resetForm(); setShowForm(true); }}>
            Add Pricing
          </button>
        )}
      </div>

      {actionMsg && (
        <div style={{ background: "#113311", color: "#4ade80", padding: "0.75rem", borderRadius: "0.5rem", marginBottom: "1rem" }}>
          {actionMsg}
        </div>
      )}

      {error && (
        <div style={{ color: "#ff6b6b", padding: "0.75rem", background: "#1a0000", borderRadius: "0.5rem", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{ ...cardStyle, marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>
              {formMode === "add" ? "Add New Pricing" : "Edit Pricing"}
            </h3>
            <button style={btnSecondary} onClick={resetForm}>Cancel</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", color: "#888", fontSize: "0.8rem", marginBottom: "0.25rem" }}>Provider</label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g. anthropic, openai"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: "block", color: "#888", fontSize: "0.8rem", marginBottom: "0.25rem" }}>Model</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. claude-sonnet-4-5-20250929"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", color: "#888", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                Input Cost ($/Mtok)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={inputCost}
                onChange={(e) => setInputCost(e.target.value)}
                placeholder="3.00"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: "block", color: "#888", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                Output Cost ($/Mtok)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={outputCost}
                onChange={(e) => setOutputCost(e.target.value)}
                placeholder="15.00"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: "block", color: "#888", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                Margin %
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={marginPercent}
                onChange={(e) => setMarginPercent(e.target.value)}
                placeholder="30"
                style={inputStyle}
              />
            </div>
          </div>

          <button style={btnPrimary} onClick={handleSubmit}>
            {formMode === "add" ? "Add Entry" : "Update Entry"}
          </button>
        </div>
      )}

      {/* Pricing Table */}
      {loading ? (
        <div style={{ color: "#888", padding: "2rem" }}>Loading...</div>
      ) : (
        <div style={cardStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #222" }}>
                <th style={{ textAlign: "left", padding: "0.75rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Provider</th>
                <th style={{ textAlign: "left", padding: "0.75rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Model</th>
                <th style={{ textAlign: "right", padding: "0.75rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Input $/Mtok</th>
                <th style={{ textAlign: "right", padding: "0.75rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Output $/Mtok</th>
                <th style={{ textAlign: "right", padding: "0.75rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Margin %</th>
                <th style={{ textAlign: "right", padding: "0.75rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Effective Input</th>
                <th style={{ textAlign: "right", padding: "0.75rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Effective Output</th>
                <th style={{ textAlign: "right", padding: "0.75rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
                    No pricing entries configured. Click "Add Pricing" to create one.
                  </td>
                </tr>
              ) : (
                entries.map((e) => {
                  const effectiveInput = e.inputCostPerMtok * (1 + e.marginPercent / 100);
                  const effectiveOutput = e.outputCostPerMtok * (1 + e.marginPercent / 100);
                  return (
                    <tr key={e.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                      <td style={{ padding: "0.75rem", fontSize: "0.875rem", textTransform: "capitalize" }}>{e.provider}</td>
                      <td style={{ padding: "0.75rem", fontSize: "0.8rem", fontFamily: "monospace" }}>{e.model}</td>
                      <td style={{ padding: "0.75rem", fontSize: "0.875rem", textAlign: "right" }}>
                        ${e.inputCostPerMtok.toFixed(2)}
                      </td>
                      <td style={{ padding: "0.75rem", fontSize: "0.875rem", textAlign: "right" }}>
                        ${e.outputCostPerMtok.toFixed(2)}
                      </td>
                      <td style={{ padding: "0.75rem", fontSize: "0.875rem", textAlign: "right" }}>
                        {e.marginPercent.toFixed(1)}%
                      </td>
                      <td style={{ padding: "0.75rem", fontSize: "0.8rem", textAlign: "right", color: "#4ade80" }}>
                        ${effectiveInput.toFixed(2)}
                      </td>
                      <td style={{ padding: "0.75rem", fontSize: "0.8rem", textAlign: "right", color: "#4ade80" }}>
                        ${effectiveOutput.toFixed(2)}
                      </td>
                      <td style={{ padding: "0.75rem", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.25rem", justifyContent: "flex-end" }}>
                          <button
                            style={{ ...btnSecondary, padding: "0.25rem 0.5rem", fontSize: "0.7rem" }}
                            onClick={() => startEdit(e)}
                          >
                            Edit
                          </button>
                          <button
                            style={{ ...btnDanger, padding: "0.25rem 0.5rem", fontSize: "0.7rem" }}
                            onClick={() => handleDelete(e.id, e.model)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

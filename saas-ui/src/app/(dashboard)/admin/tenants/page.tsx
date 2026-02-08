"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

type Tenant = {
  id: string;
  email: string;
  agentId: string;
  plan: string;
  status: string;
  model: string;
  credits: number;
  createdAt: string;
};

type TenantsResponse = {
  tenants: Tenant[];
  total: number;
};

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");

  // Modals
  const [planModal, setPlanModal] = useState<Tenant | null>(null);
  const [newPlan, setNewPlan] = useState("free");
  const [statusModal, setStatusModal] = useState<Tenant | null>(null);
  const [newStatus, setNewStatus] = useState("active");
  const [creditsModal, setCreditsModal] = useState<Tenant | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");

  const fetchTenants = useCallback(() => {
    setLoading(true);
    api<TenantsResponse>("/api/admin/tenants")
      .then((data) => {
        setTenants(data.tenants);
        setTotal(data.total);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  function showMsg(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 3000);
  }

  async function handlePlanChange() {
    if (!planModal) return;
    try {
      await api(`/api/admin/tenants/${planModal.id}/plan`, { method: "POST", body: { plan: newPlan } });
      showMsg(`Plan updated to "${newPlan}" for ${planModal.email}`);
      setPlanModal(null);
      fetchTenants();
    } catch (e: unknown) {
      showMsg((e as Error).message);
    }
  }

  async function handleStatusChange() {
    if (!statusModal) return;
    try {
      await api(`/api/admin/tenants/${statusModal.id}/status`, { method: "POST", body: { status: newStatus } });
      showMsg(`Status updated to "${newStatus}" for ${statusModal.email}`);
      setStatusModal(null);
      fetchTenants();
    } catch (e: unknown) {
      showMsg((e as Error).message);
    }
  }

  async function handleGrantCredits() {
    if (!creditsModal) return;
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      showMsg("Please enter a valid positive amount");
      return;
    }
    try {
      await api(`/api/admin/tenants/${creditsModal.id}/credits`, {
        method: "POST",
        body: { amount, reason: creditReason || "Admin grant" },
      });
      showMsg(`Granted $${amount.toFixed(2)} credits to ${creditsModal.email}`);
      setCreditsModal(null);
      setCreditAmount("");
      setCreditReason("");
      fetchTenants();
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

  const modalOverlay = {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  };

  const statusColor = (status: string) => {
    if (status === "active") return "#4ade80";
    if (status === "suspended") return "#ff6b6b";
    return "#fbbf24";
  };

  const planColor = (plan: string) => {
    if (plan === "pro") return "#a78bfa";
    if (plan === "enterprise") return "#fbbf24";
    return "#888";
  };

  if (error && !tenants.length) {
    return <div style={{ color: "#ff6b6b", padding: "2rem" }}>Error: {error}</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem" }}>Tenant Management</h1>

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

      {/* Plan change modal */}
      {planModal && (
        <div style={modalOverlay}>
          <div style={{ ...cardStyle, width: "400px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Change Plan</h3>
            <div style={{ color: "#888", fontSize: "0.875rem", marginBottom: "1rem" }}>{planModal.email}</div>
            <select
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value)}
              style={{ ...inputStyle, marginBottom: "1rem" }}
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button style={btnSecondary} onClick={() => setPlanModal(null)}>Cancel</button>
              <button style={btnPrimary} onClick={handlePlanChange}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Status change modal */}
      {statusModal && (
        <div style={modalOverlay}>
          <div style={{ ...cardStyle, width: "400px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Change Status</h3>
            <div style={{ color: "#888", fontSize: "0.875rem", marginBottom: "1rem" }}>{statusModal.email}</div>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              style={{ ...inputStyle, marginBottom: "1rem" }}
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button style={btnSecondary} onClick={() => setStatusModal(null)}>Cancel</button>
              <button style={btnPrimary} onClick={handleStatusChange}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Credits modal */}
      {creditsModal && (
        <div style={modalOverlay}>
          <div style={{ ...cardStyle, width: "400px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Grant Credits</h3>
            <div style={{ color: "#888", fontSize: "0.875rem", marginBottom: "1rem" }}>
              {creditsModal.email} -- Current balance: ${(creditsModal.credits ?? 0).toFixed(2)}
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "block", color: "#888", fontSize: "0.8rem", marginBottom: "0.25rem" }}>Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="10.00"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", color: "#888", fontSize: "0.8rem", marginBottom: "0.25rem" }}>Reason (optional)</label>
              <input
                type="text"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                placeholder="Admin grant"
                style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button style={btnSecondary} onClick={() => { setCreditsModal(null); setCreditAmount(""); setCreditReason(""); }}>Cancel</button>
              <button style={btnPrimary} onClick={handleGrantCredits}>Grant</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ color: "#888", fontSize: "0.875rem", marginBottom: "1rem" }}>
        {total} tenant{total !== 1 ? "s" : ""}
      </div>

      {loading ? (
        <div style={{ color: "#888", padding: "2rem" }}>Loading...</div>
      ) : (
        <div style={cardStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #222" }}>
                <th style={{ textAlign: "left", padding: "0.75rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Email</th>
                <th style={{ textAlign: "left", padding: "0.75rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Agent ID</th>
                <th style={{ textAlign: "left", padding: "0.75rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Plan</th>
                <th style={{ textAlign: "left", padding: "0.75rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Status</th>
                <th style={{ textAlign: "left", padding: "0.75rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Model</th>
                <th style={{ textAlign: "right", padding: "0.75rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Credits</th>
                <th style={{ textAlign: "right", padding: "0.75rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
                    No tenants found
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{t.email}</td>
                    <td style={{ padding: "0.75rem", fontSize: "0.75rem", fontFamily: "monospace", color: "#888" }}>
                      {t.agentId ? t.agentId.substring(0, 12) + "..." : "--"}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                      <span style={{ color: planColor(t.plan), textTransform: "capitalize" }}>{t.plan}</span>
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                      <span style={{
                        color: statusColor(t.status),
                        background: t.status === "active" ? "#0a2a0a" : t.status === "suspended" ? "#2a0a0a" : "#2a2a0a",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "0.25rem",
                        fontSize: "0.75rem",
                        textTransform: "capitalize",
                      }}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.8rem", color: "#888" }}>
                      {t.model || "--"}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem", textAlign: "right" }}>
                      ${(t.credits ?? 0).toFixed(2)}
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.25rem", justifyContent: "flex-end" }}>
                        <button
                          style={{ ...btnSecondary, padding: "0.25rem 0.5rem", fontSize: "0.7rem" }}
                          onClick={() => { setPlanModal(t); setNewPlan(t.plan); }}
                        >
                          Plan
                        </button>
                        <button
                          style={{ ...btnSecondary, padding: "0.25rem 0.5rem", fontSize: "0.7rem" }}
                          onClick={() => { setStatusModal(t); setNewStatus(t.status); }}
                        >
                          Status
                        </button>
                        <button
                          style={{ ...btnSecondary, padding: "0.25rem 0.5rem", fontSize: "0.7rem" }}
                          onClick={() => setCreditsModal(t)}
                        >
                          Credits
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type LedgerEntry = {
  id: string;
  amount: number;
  balance_after: number;
  description: string;
  reference_type: string | null;
  created_at: string;
};

export default function BillingPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [purchaseAmount, setPurchaseAmount] = useState("5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [balData, ledgerData] = await Promise.all([
        api<{ balanceUsd: number }>("/api/billing/balance"),
        api<{ entries: LedgerEntry[] }>("/api/billing/ledger"),
      ]);
      setBalance(balData.balanceUsd);
      setLedger(ledgerData.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing data");
    }
  }

  async function handlePurchase() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ checkoutUrl: string }>("/api/billing/purchase-credits", {
        method: "POST",
        body: { amountUsd: Number(purchaseAmount) },
      });
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setLoading(false);
    }
  }

  const cardStyle = {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "0.75rem",
    padding: "1.5rem",
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "800px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem" }}>Billing</h1>

      {error && <p style={{ color: "#ff6b6b", marginBottom: "1rem" }}>{error}</p>}

      {/* Balance */}
      <div style={{ ...cardStyle, marginBottom: "2rem" }}>
        <p style={{ color: "#888", marginBottom: "0.5rem" }}>Credit Balance</p>
        <p style={{ fontSize: "2rem", fontWeight: 700 }}>
          {balance !== null ? `$${balance.toFixed(4)}` : "Loading..."}
        </p>
      </div>

      {/* Purchase Credits */}
      <div style={{ ...cardStyle, marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
          Purchase Credits
        </h2>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <span style={{ color: "#888" }}>$</span>
          <input
            type="number"
            min="1"
            max="1000"
            value={purchaseAmount}
            onChange={(e) => setPurchaseAmount(e.target.value)}
            style={{
              padding: "0.5rem",
              borderRadius: "0.375rem",
              border: "1px solid #333",
              background: "#0a0a0a",
              color: "#fff",
              width: "100px",
            }}
          />
          <button
            onClick={handlePurchase}
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              border: "none",
              background: "#fff",
              color: "#000",
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Redirecting..." : "Buy Credits"}
          </button>
        </div>
      </div>

      {/* Ledger */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
          Transaction History
        </h2>
        {ledger.length === 0 ? (
          <p style={{ color: "#555" }}>No transactions yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "#888", textAlign: "left" }}>
                <th style={{ padding: "0.5rem 0" }}>Date</th>
                <th style={{ padding: "0.5rem 0" }}>Description</th>
                <th style={{ padding: "0.5rem 0", textAlign: "right" }}>Amount</th>
                <th style={{ padding: "0.5rem 0", textAlign: "right" }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry) => (
                <tr key={entry.id} style={{ borderTop: "1px solid #222" }}>
                  <td style={{ padding: "0.5rem 0", color: "#888" }}>
                    {new Date(entry.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "0.5rem 0" }}>{entry.description}</td>
                  <td
                    style={{
                      padding: "0.5rem 0",
                      textAlign: "right",
                      color: entry.amount >= 0 ? "#4ade80" : "#f87171",
                    }}
                  >
                    {entry.amount >= 0 ? "+" : ""}${entry.amount.toFixed(4)}
                  </td>
                  <td style={{ padding: "0.5rem 0", textAlign: "right" }}>
                    ${entry.balance_after.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

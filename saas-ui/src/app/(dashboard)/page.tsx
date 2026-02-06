"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type DashboardStats = {
  balance: number;
  plan: string;
  usage: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUsd: number;
    eventCount: number;
  };
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<DashboardStats>("/api/dashboard/stats")
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  const cardStyle = {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "0.75rem",
    padding: "1.5rem",
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem" }}>Dashboard</h1>

      {error && <p style={{ color: "#ff6b6b" }}>{error}</p>}

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div style={cardStyle}>
            <p style={{ color: "#888", marginBottom: "0.5rem" }}>Credit Balance</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>${stats.balance.toFixed(2)}</p>
          </div>
          <div style={cardStyle}>
            <p style={{ color: "#888", marginBottom: "0.5rem" }}>Plan</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 700, textTransform: "capitalize" }}>
              {stats.plan}
            </p>
          </div>
          <div style={cardStyle}>
            <p style={{ color: "#888", marginBottom: "0.5rem" }}>Total Tokens (30d)</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>
              {(stats.usage.totalInputTokens + stats.usage.totalOutputTokens).toLocaleString()}
            </p>
          </div>
          <div style={cardStyle}>
            <p style={{ color: "#888", marginBottom: "0.5rem" }}>Usage Cost (30d)</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>${stats.usage.totalCostUsd.toFixed(4)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

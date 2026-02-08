"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Stats = {
  activeUsers: number;
  totalTenants: number;
  activeToday: number;
  planBreakdown: { plan: string; count: number }[];
  channelBreakdown: { channel: string; count: number }[];
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Stats>("/api/admin/stats").then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <div style={{ color: "#ff6b6b", padding: "2rem" }}>Error: {error}</div>;
  if (!stats) return <div style={{ color: "#888", padding: "2rem" }}>Loading...</div>;

  const cardStyle = {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "0.75rem",
    padding: "1.5rem",
  };

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem" }}>Admin Dashboard</h1>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        <div style={cardStyle}>
          <div style={{ color: "#888", fontSize: "0.875rem" }}>Active Users</div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{stats.activeUsers}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: "#888", fontSize: "0.875rem" }}>Total Tenants</div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{stats.totalTenants}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: "#888", fontSize: "0.875rem" }}>Active Today</div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{stats.activeToday}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {/* Plan Breakdown */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Plans</h3>
          {stats.planBreakdown.length === 0 ? (
            <div style={{ color: "#666" }}>No data</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #222" }}>
                  <th style={{ textAlign: "left", padding: "0.5rem", color: "#888", fontWeight: 500 }}>Plan</th>
                  <th style={{ textAlign: "right", padding: "0.5rem", color: "#888", fontWeight: 500 }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {stats.planBreakdown.map((p) => (
                  <tr key={p.plan} style={{ borderBottom: "1px solid #1a1a1a" }}>
                    <td style={{ padding: "0.5rem", textTransform: "capitalize" }}>{p.plan}</td>
                    <td style={{ padding: "0.5rem", textAlign: "right" }}>{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Channel Breakdown */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Active Channels</h3>
          {stats.channelBreakdown.length === 0 ? (
            <div style={{ color: "#666" }}>No channels configured yet</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #222" }}>
                  <th style={{ textAlign: "left", padding: "0.5rem", color: "#888", fontWeight: 500 }}>Channel</th>
                  <th style={{ textAlign: "right", padding: "0.5rem", color: "#888", fontWeight: 500 }}>Enabled</th>
                </tr>
              </thead>
              <tbody>
                {stats.channelBreakdown.map((ch) => (
                  <tr key={ch.channel} style={{ borderBottom: "1px solid #1a1a1a" }}>
                    <td style={{ padding: "0.5rem", textTransform: "capitalize" }}>{ch.channel}</td>
                    <td style={{ padding: "0.5rem", textAlign: "right" }}>{ch.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

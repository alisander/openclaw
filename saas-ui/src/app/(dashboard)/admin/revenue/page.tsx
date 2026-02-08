"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

type DailyEntry = {
  date: string;
  revenue: number;
  cost: number;
  margin: number;
  events: number;
};

type ModelEntry = {
  model: string;
  revenue: number;
  cost: number;
  margin: number;
  events: number;
};

type TenantEntry = {
  tenantId: string;
  email: string;
  revenue: number;
  cost: number;
  events: number;
};

type RevenueData = {
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  totalEvents: number;
  daily: DailyEntry[];
  byModel: ModelEntry[];
  byTenant: TenantEntry[];
};

export default function AdminRevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const fetchRevenue = useCallback(() => {
    setLoading(true);
    api<RevenueData>(`/api/admin/revenue?days=${days}`)
      .then((d) => { setData(d); setError(""); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  const cardStyle = {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "0.75rem",
    padding: "1.5rem",
  };

  const btnPeriod = (d: number) => ({
    padding: "0.5rem 1rem",
    borderRadius: "0.5rem",
    border: days === d ? "1px solid #fff" : "1px solid #333",
    background: days === d ? "#222" : "transparent",
    color: days === d ? "#fff" : "#888",
    fontWeight: days === d ? 600 : 400,
    cursor: "pointer",
    fontSize: "0.8rem",
  });

  function formatCurrency(n: number) {
    return "$" + n.toFixed(2);
  }

  function formatPercent(n: number) {
    return n.toFixed(1) + "%";
  }

  if (error && !data) {
    return <div style={{ color: "#ff6b6b", padding: "2rem" }}>Error: {error}</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Revenue Dashboard</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button style={btnPeriod(7)} onClick={() => setDays(7)}>7 days</button>
          <button style={btnPeriod(30)} onClick={() => setDays(30)}>30 days</button>
          <button style={btnPeriod(90)} onClick={() => setDays(90)}>90 days</button>
        </div>
      </div>

      {error && (
        <div style={{ color: "#ff6b6b", padding: "0.75rem", background: "#1a0000", borderRadius: "0.5rem", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {loading || !data ? (
        <div style={{ color: "#888", padding: "2rem" }}>Loading...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
            <div style={cardStyle}>
              <div style={{ color: "#888", fontSize: "0.8rem", marginBottom: "0.25rem" }}>Total Revenue</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#4ade80" }}>{formatCurrency(data.totalRevenue)}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ color: "#888", fontSize: "0.8rem", marginBottom: "0.25rem" }}>Base Cost</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#ff6b6b" }}>{formatCurrency(data.totalCost)}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ color: "#888", fontSize: "0.8rem", marginBottom: "0.25rem" }}>Margin</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#fbbf24" }}>{formatCurrency(data.totalMargin)}</div>
              {data.totalRevenue > 0 && (
                <div style={{ color: "#888", fontSize: "0.75rem" }}>
                  {formatPercent((data.totalMargin / data.totalRevenue) * 100)}
                </div>
              )}
            </div>
            <div style={cardStyle}>
              <div style={{ color: "#888", fontSize: "0.8rem", marginBottom: "0.25rem" }}>Total Events</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{data.totalEvents.toLocaleString()}</div>
            </div>
          </div>

          {/* Daily breakdown */}
          <div style={{ ...cardStyle, marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Daily Breakdown</h3>
            {data.daily.length === 0 ? (
              <div style={{ color: "#666" }}>No daily data available</div>
            ) : (
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #222", position: "sticky", top: 0, background: "#111" }}>
                      <th style={{ textAlign: "left", padding: "0.5rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Date</th>
                      <th style={{ textAlign: "right", padding: "0.5rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Revenue</th>
                      <th style={{ textAlign: "right", padding: "0.5rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Cost</th>
                      <th style={{ textAlign: "right", padding: "0.5rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Margin</th>
                      <th style={{ textAlign: "right", padding: "0.5rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Events</th>
                      <th style={{ textAlign: "left", padding: "0.5rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Bar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((d) => {
                      const maxRevenue = Math.max(...data.daily.map((x) => x.revenue), 1);
                      const barWidth = (d.revenue / maxRevenue) * 100;
                      return (
                        <tr key={d.date} style={{ borderBottom: "1px solid #1a1a1a" }}>
                          <td style={{ padding: "0.5rem", fontSize: "0.8rem" }}>{d.date}</td>
                          <td style={{ padding: "0.5rem", fontSize: "0.8rem", textAlign: "right", color: "#4ade80" }}>
                            {formatCurrency(d.revenue)}
                          </td>
                          <td style={{ padding: "0.5rem", fontSize: "0.8rem", textAlign: "right", color: "#ff6b6b" }}>
                            {formatCurrency(d.cost)}
                          </td>
                          <td style={{ padding: "0.5rem", fontSize: "0.8rem", textAlign: "right", color: "#fbbf24" }}>
                            {formatCurrency(d.margin)}
                          </td>
                          <td style={{ padding: "0.5rem", fontSize: "0.8rem", textAlign: "right" }}>
                            {d.events.toLocaleString()}
                          </td>
                          <td style={{ padding: "0.5rem", width: "120px" }}>
                            <div style={{
                              height: "8px",
                              borderRadius: "4px",
                              background: "#222",
                              width: "100%",
                            }}>
                              <div style={{
                                height: "8px",
                                borderRadius: "4px",
                                background: "#4ade80",
                                width: `${barWidth}%`,
                                transition: "width 0.3s",
                              }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {/* By Model */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>By Model</h3>
              {data.byModel.length === 0 ? (
                <div style={{ color: "#666" }}>No model data</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #222" }}>
                      <th style={{ textAlign: "left", padding: "0.5rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Model</th>
                      <th style={{ textAlign: "right", padding: "0.5rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Revenue</th>
                      <th style={{ textAlign: "right", padding: "0.5rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Cost</th>
                      <th style={{ textAlign: "right", padding: "0.5rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byModel.map((m) => (
                      <tr key={m.model} style={{ borderBottom: "1px solid #1a1a1a" }}>
                        <td style={{ padding: "0.5rem", fontSize: "0.8rem" }}>{m.model}</td>
                        <td style={{ padding: "0.5rem", fontSize: "0.8rem", textAlign: "right", color: "#4ade80" }}>
                          {formatCurrency(m.revenue)}
                        </td>
                        <td style={{ padding: "0.5rem", fontSize: "0.8rem", textAlign: "right", color: "#ff6b6b" }}>
                          {formatCurrency(m.cost)}
                        </td>
                        <td style={{ padding: "0.5rem", fontSize: "0.8rem", textAlign: "right" }}>
                          {m.events.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* By Tenant (Top 20) */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Top Tenants (by Revenue)</h3>
              {data.byTenant.length === 0 ? (
                <div style={{ color: "#666" }}>No tenant data</div>
              ) : (
                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #222", position: "sticky", top: 0, background: "#111" }}>
                        <th style={{ textAlign: "left", padding: "0.5rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Tenant</th>
                        <th style={{ textAlign: "right", padding: "0.5rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Revenue</th>
                        <th style={{ textAlign: "right", padding: "0.5rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Cost</th>
                        <th style={{ textAlign: "right", padding: "0.5rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Events</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byTenant.slice(0, 20).map((t) => (
                        <tr key={t.tenantId} style={{ borderBottom: "1px solid #1a1a1a" }}>
                          <td style={{ padding: "0.5rem", fontSize: "0.8rem" }} title={t.tenantId}>
                            {t.email || t.tenantId.substring(0, 12) + "..."}
                          </td>
                          <td style={{ padding: "0.5rem", fontSize: "0.8rem", textAlign: "right", color: "#4ade80" }}>
                            {formatCurrency(t.revenue)}
                          </td>
                          <td style={{ padding: "0.5rem", fontSize: "0.8rem", textAlign: "right", color: "#ff6b6b" }}>
                            {formatCurrency(t.cost)}
                          </td>
                          <td style={{ padding: "0.5rem", fontSize: "0.8rem", textAlign: "right" }}>
                            {t.events.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

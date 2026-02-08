"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

type ChannelSummary = {
  channel: string;
  totalConfigs: number;
  enabledCount: number;
};

type ChannelTenant = {
  tenantId: string;
  email: string;
  enabled: boolean;
  createdAt: string;
};

type ChannelsResponse = {
  channels: ChannelSummary[];
};

type ChannelDetailResponse = {
  channel: string;
  tenants: ChannelTenant[];
};

export default function AdminChannelsPage() {
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Detail view
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [channelDetail, setChannelDetail] = useState<ChannelDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const fetchChannels = useCallback(() => {
    setLoading(true);
    api<ChannelsResponse>("/api/admin/channels")
      .then((data) => {
        setChannels(data.channels);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  function handleSelectChannel(channel: string) {
    if (selectedChannel === channel) {
      setSelectedChannel(null);
      setChannelDetail(null);
      return;
    }
    setSelectedChannel(channel);
    setDetailLoading(true);
    setDetailError("");
    api<ChannelDetailResponse>(`/api/admin/channels/${encodeURIComponent(channel)}`)
      .then((data) => {
        setChannelDetail(data);
        setDetailError("");
      })
      .catch((e) => setDetailError(e.message))
      .finally(() => setDetailLoading(false));
  }

  const cardStyle = {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "0.75rem",
    padding: "1.5rem",
  };

  if (error && !channels.length) {
    return <div style={{ color: "#ff6b6b", padding: "2rem" }}>Error: {error}</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem" }}>Channels Overview</h1>

      {error && (
        <div style={{ color: "#ff6b6b", padding: "0.75rem", background: "#1a0000", borderRadius: "0.5rem", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: "#888", padding: "2rem" }}>Loading...</div>
      ) : channels.length === 0 ? (
        <div style={cardStyle}>
          <div style={{ color: "#666", textAlign: "center", padding: "2rem" }}>
            No channels configured across any tenant
          </div>
        </div>
      ) : (
        <>
          {/* Channel cards grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            {channels.map((ch) => {
              const isSelected = selectedChannel === ch.channel;
              const enabledRatio = ch.totalConfigs > 0 ? ch.enabledCount / ch.totalConfigs : 0;
              return (
                <div
                  key={ch.channel}
                  onClick={() => handleSelectChannel(ch.channel)}
                  style={{
                    ...cardStyle,
                    cursor: "pointer",
                    border: isSelected ? "1px solid #fff" : "1px solid #222",
                    transition: "border-color 0.15s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 600, textTransform: "capitalize" }}>{ch.channel}</h3>
                    <span style={{
                      fontSize: "0.7rem",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "0.25rem",
                      background: isSelected ? "#222" : "#1a1a1a",
                      color: "#888",
                    }}>
                      {isSelected ? "Selected" : "Click to expand"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <div style={{ color: "#888", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Total Configs</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{ch.totalConfigs}</div>
                    </div>
                    <div>
                      <div style={{ color: "#888", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Enabled</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#4ade80" }}>{ch.enabledCount}</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginTop: "1rem" }}>
                    <div style={{ height: "6px", borderRadius: "3px", background: "#222", width: "100%" }}>
                      <div style={{
                        height: "6px",
                        borderRadius: "3px",
                        background: "#4ade80",
                        width: `${enabledRatio * 100}%`,
                        transition: "width 0.3s",
                      }} />
                    </div>
                    <div style={{ color: "#666", fontSize: "0.7rem", marginTop: "0.25rem" }}>
                      {(enabledRatio * 100).toFixed(0)}% enabled
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          {selectedChannel && (
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>
                  Tenants using <span style={{ textTransform: "capitalize" }}>{selectedChannel}</span>
                </h3>
                <button
                  onClick={() => { setSelectedChannel(null); setChannelDetail(null); }}
                  style={{
                    padding: "0.25rem 0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #333",
                    background: "transparent",
                    color: "#ccc",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  Close
                </button>
              </div>

              {detailError && (
                <div style={{ color: "#ff6b6b", padding: "0.5rem", marginBottom: "0.5rem" }}>{detailError}</div>
              )}

              {detailLoading ? (
                <div style={{ color: "#888" }}>Loading tenant details...</div>
              ) : channelDetail && channelDetail.tenants.length === 0 ? (
                <div style={{ color: "#666" }}>No tenants are using this channel</div>
              ) : channelDetail ? (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #222" }}>
                      <th style={{ textAlign: "left", padding: "0.5rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Email</th>
                      <th style={{ textAlign: "left", padding: "0.5rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Tenant ID</th>
                      <th style={{ textAlign: "center", padding: "0.5rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Status</th>
                      <th style={{ textAlign: "left", padding: "0.5rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelDetail.tenants.map((t) => (
                      <tr key={t.tenantId} style={{ borderBottom: "1px solid #1a1a1a" }}>
                        <td style={{ padding: "0.5rem", fontSize: "0.875rem" }}>{t.email}</td>
                        <td style={{ padding: "0.5rem", fontSize: "0.75rem", fontFamily: "monospace", color: "#888" }}>
                          {t.tenantId.substring(0, 12)}...
                        </td>
                        <td style={{ padding: "0.5rem", textAlign: "center" }}>
                          <span style={{
                            color: t.enabled ? "#4ade80" : "#ff6b6b",
                            background: t.enabled ? "#0a2a0a" : "#2a0a0a",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "0.25rem",
                            fontSize: "0.75rem",
                          }}>
                            {t.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </td>
                        <td style={{ padding: "0.5rem", fontSize: "0.8rem", color: "#888" }}>
                          {new Date(t.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}

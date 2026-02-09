"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

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

  if (error && !channels.length) {
    return <div className="text-destructive p-8">Error: {error}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Channels Overview</h1>

      {error && (
        <div className="text-destructive p-3 bg-red-950 rounded-md mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-muted-foreground p-8">Loading...</div>
      ) : channels.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center">
              No channels configured across any tenant
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Channel cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {channels.map((ch) => {
              const isSelected = selectedChannel === ch.channel;
              const enabledRatio = ch.totalConfigs > 0 ? ch.enabledCount / ch.totalConfigs : 0;
              return (
                <Card
                  key={ch.channel}
                  onClick={() => handleSelectChannel(ch.channel)}
                  className={cn(
                    "cursor-pointer transition-colors",
                    isSelected && "border-foreground"
                  )}
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg capitalize">{ch.channel}</CardTitle>
                    <Badge variant={isSelected ? "secondary" : "outline"} className="text-xs">
                      {isSelected ? "Selected" : "Click to expand"}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Total Configs</p>
                        <p className="text-2xl font-bold">{ch.totalConfigs}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Enabled</p>
                        <p className="text-2xl font-bold text-emerald-400">{ch.enabledCount}</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <Progress value={enabledRatio * 100} className="h-1.5 mb-1" />
                    <p className="text-muted-foreground text-xs">
                      {(enabledRatio * 100).toFixed(0)}% enabled
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Detail panel */}
          {selectedChannel && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">
                  Tenants using <span className="capitalize">{selectedChannel}</span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSelectedChannel(null); setChannelDetail(null); }}
                >
                  Close
                </Button>
              </CardHeader>
              <CardContent>
                {detailError && (
                  <div className="text-destructive mb-2">{detailError}</div>
                )}

                {detailLoading ? (
                  <div className="text-muted-foreground">Loading tenant details...</div>
                ) : channelDetail && channelDetail.tenants.length === 0 ? (
                  <div className="text-muted-foreground">No tenants are using this channel</div>
                ) : channelDetail ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Tenant ID</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {channelDetail.tenants.map((t) => (
                        <TableRow key={t.tenantId}>
                          <TableCell className="text-sm">{t.email}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {t.tenantId.substring(0, 12)}...
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={t.enabled ? "default" : "destructive"}>
                              {t.enabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : null}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

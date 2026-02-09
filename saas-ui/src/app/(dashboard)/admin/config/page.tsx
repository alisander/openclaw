"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type SystemConfig = {
  saasMode: boolean;
  jwtConfigured: boolean;
  stripeConfigured: boolean;
  corsOrigins: string[];
  database: {
    connected: boolean;
    type: string;
    host?: string;
  };
  redis: {
    connected: boolean;
    host?: string;
  };
  features: Record<string, boolean>;
  version?: string;
  uptime?: number;
};

export default function AdminConfigPage() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<SystemConfig>("/api/admin/system-config")
      .then(setConfig)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="text-destructive p-8">Error: {error}</div>;
  if (!config) return <div className="text-muted-foreground p-8">Loading...</div>;

  function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
    return (
      <Badge
        variant={ok ? "default" : "destructive"}
        className={cn(
          "text-xs font-medium",
          ok && "bg-emerald-900/60 text-emerald-400 hover:bg-emerald-900/60",
          !ok && "bg-red-900/60 text-red-400 hover:bg-red-900/60"
        )}
      >
        {label || (ok ? "Configured" : "Not Configured")}
      </Badge>
    );
  }

  function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(`${mins}m`);
    return parts.join(" ");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System Configuration</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Read-only view of the current system configuration and service status.
        </p>
      </div>

      {/* System Info */}
      {(config.version || config.uptime !== undefined) && (
        <Card>
          <CardHeader>
            <CardTitle>System Info</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {config.version && (
                  <TableRow>
                    <TableCell className="text-muted-foreground w-[160px]">Version</TableCell>
                    <TableCell className="font-mono">{config.version}</TableCell>
                  </TableRow>
                )}
                {config.uptime !== undefined && (
                  <TableRow>
                    <TableCell className="text-muted-foreground w-[160px]">Uptime</TableCell>
                    <TableCell>{formatUptime(config.uptime)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Core Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Core Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="text-muted-foreground w-[160px]">SaaS Mode</TableCell>
                <TableCell>
                  <StatusBadge ok={config.saasMode} label={config.saasMode ? "Enabled" : "Disabled"} />
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="text-muted-foreground w-[160px]">JWT Authentication</TableCell>
                <TableCell>
                  <StatusBadge ok={config.jwtConfigured} />
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="text-muted-foreground w-[160px]">Stripe Integration</TableCell>
                <TableCell>
                  <StatusBadge ok={config.stripeConfigured} />
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="text-muted-foreground w-[160px]">CORS Origins</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {config.corsOrigins.length === 0 ? (
                      <span className="text-muted-foreground text-xs">None configured</span>
                    ) : (
                      config.corsOrigins.map((origin) => (
                        <Badge key={origin} variant="secondary" className="font-mono text-xs">
                          {origin}
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Database */}
      <Card>
        <CardHeader>
          <CardTitle>Database</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="text-muted-foreground w-[160px]">Status</TableCell>
                <TableCell>
                  <StatusBadge ok={config.database.connected} label={config.database.connected ? "Connected" : "Disconnected"} />
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="text-muted-foreground w-[160px]">Type</TableCell>
                <TableCell className="capitalize">{config.database.type}</TableCell>
              </TableRow>

              {config.database.host && (
                <TableRow>
                  <TableCell className="text-muted-foreground w-[160px]">Host</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{config.database.host}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Redis */}
      <Card>
        <CardHeader>
          <CardTitle>Redis</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="text-muted-foreground w-[160px]">Status</TableCell>
                <TableCell>
                  <StatusBadge ok={config.redis.connected} label={config.redis.connected ? "Connected" : "Disconnected"} />
                </TableCell>
              </TableRow>

              {config.redis.host && (
                <TableRow>
                  <TableCell className="text-muted-foreground w-[160px]">Host</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{config.redis.host}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      {config.features && Object.keys(config.features).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {Object.entries(config.features).map(([key, enabled]) => (
                  <TableRow key={key}>
                    <TableCell className="text-muted-foreground w-[160px]">{key}</TableCell>
                    <TableCell>
                      <StatusBadge ok={enabled} label={enabled ? "Enabled" : "Disabled"} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

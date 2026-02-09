"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, BarChart3, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

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

  function formatCurrency(n: number) {
    return "$" + n.toFixed(2);
  }

  function formatPercent(n: number) {
    return n.toFixed(1) + "%";
  }

  if (error && !data) {
    return <div className="p-8 text-destructive">Error: {error}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Revenue Dashboard</h1>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              variant={days === d ? "outline" : "ghost"}
              size="sm"
              className={cn(
                days === d && "border-foreground bg-foreground/10 font-semibold"
              )}
              onClick={() => setDays(d)}
            >
              {d} days
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading || !data ? (
        <div className="p-8 text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
                <DollarSign className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-400">
                  {formatCurrency(data.totalRevenue)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Base Cost
                </CardTitle>
                <TrendingUp className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500">
                  {formatCurrency(data.totalCost)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Margin
                </CardTitle>
                <BarChart3 className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-300">
                  {formatCurrency(data.totalMargin)}
                </div>
                {data.totalRevenue > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatPercent((data.totalMargin / data.totalRevenue) * 100)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Events
                </CardTitle>
                <Activity className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {data.totalEvents.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily breakdown */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Daily Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {data.daily.length === 0 ? (
                <p className="text-muted-foreground">No daily data available</p>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                        <TableHead className="text-right">Events</TableHead>
                        <TableHead>Bar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.daily.map((d) => {
                        const maxRevenue = Math.max(...data.daily.map((x) => x.revenue), 1);
                        const barWidth = (d.revenue / maxRevenue) * 100;
                        return (
                          <TableRow key={d.date}>
                            <TableCell className="text-sm">{d.date}</TableCell>
                            <TableCell className="text-right text-sm text-emerald-400">
                              {formatCurrency(d.revenue)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-red-500">
                              {formatCurrency(d.cost)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-amber-300">
                              {formatCurrency(d.margin)}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {d.events.toLocaleString()}
                            </TableCell>
                            <TableCell className="w-[120px]">
                              <div className="h-2 w-full rounded-full bg-muted">
                                <div
                                  className="h-2 rounded-full bg-emerald-400 transition-all duration-300"
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            {/* By Model */}
            <Card>
              <CardHeader>
                <CardTitle>By Model</CardTitle>
              </CardHeader>
              <CardContent>
                {data.byModel.length === 0 ? (
                  <p className="text-muted-foreground">No model data</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Events</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.byModel.map((m) => (
                        <TableRow key={m.model}>
                          <TableCell className="text-sm">
                            <Badge variant="secondary">{m.model}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm text-emerald-400">
                            {formatCurrency(m.revenue)}
                          </TableCell>
                          <TableCell className="text-right text-sm text-red-500">
                            {formatCurrency(m.cost)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {m.events.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* By Tenant (Top 20) */}
            <Card>
              <CardHeader>
                <CardTitle>Top Tenants (by Revenue)</CardTitle>
              </CardHeader>
              <CardContent>
                {data.byTenant.length === 0 ? (
                  <p className="text-muted-foreground">No tenant data</p>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tenant</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead className="text-right">Events</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.byTenant.slice(0, 20).map((t) => (
                          <TableRow key={t.tenantId}>
                            <TableCell className="text-sm" title={t.tenantId}>
                              {t.email || t.tenantId.substring(0, 12) + "..."}
                            </TableCell>
                            <TableCell className="text-right text-sm text-emerald-400">
                              {formatCurrency(t.revenue)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-red-500">
                              {formatCurrency(t.cost)}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {t.events.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  const statusBadgeVariant = (status: string) => {
    if (status === "active") return "default" as const;
    if (status === "suspended") return "destructive" as const;
    return "secondary" as const;
  };

  const planBadgeVariant = (plan: string) => {
    if (plan === "pro" || plan === "enterprise") return "default" as const;
    return "outline" as const;
  };

  if (error && !tenants.length) {
    return <div className="text-destructive p-8">Error: {error}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Tenant Management</h1>

      {actionMsg && (
        <div className="bg-emerald-950 text-emerald-400 p-3 rounded-md mb-4">
          {actionMsg}
        </div>
      )}

      {error && (
        <div className="text-destructive p-3 bg-red-950 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Plan change dialog */}
      <Dialog open={!!planModal} onOpenChange={(open) => { if (!open) setPlanModal(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
            <DialogDescription>{planModal?.email}</DialogDescription>
          </DialogHeader>
          <Select value={newPlan} onValueChange={setNewPlan}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanModal(null)}>Cancel</Button>
            <Button onClick={handlePlanChange}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status change dialog */}
      <Dialog open={!!statusModal} onOpenChange={(open) => { if (!open) setStatusModal(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>{statusModal?.email}</DialogDescription>
          </DialogHeader>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusModal(null)}>Cancel</Button>
            <Button onClick={handleStatusChange}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credits dialog */}
      <Dialog
        open={!!creditsModal}
        onOpenChange={(open) => {
          if (!open) {
            setCreditsModal(null);
            setCreditAmount("");
            setCreditReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Credits</DialogTitle>
            <DialogDescription>
              {creditsModal?.email} -- Current balance: ${(creditsModal?.credits ?? 0).toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="credit-amount">Amount ($)</Label>
              <Input
                id="credit-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="10.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit-reason">Reason (optional)</Label>
              <Input
                id="credit-reason"
                type="text"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                placeholder="Admin grant"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreditsModal(null); setCreditAmount(""); setCreditReason(""); }}>
              Cancel
            </Button>
            <Button onClick={handleGrantCredits}>Grant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="text-muted-foreground text-sm mb-4">
        {total} tenant{total !== 1 ? "s" : ""}
      </p>

      {loading ? (
        <div className="text-muted-foreground p-8">Loading...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Agent ID</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No tenants found
                    </TableCell>
                  </TableRow>
                ) : (
                  tenants.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{t.email}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {t.agentId ? t.agentId.substring(0, 12) + "..." : "--"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={planBadgeVariant(t.plan)} className="capitalize">
                          {t.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(t.status)} className="capitalize">
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.model || "--"}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        ${(t.credits ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setPlanModal(t); setNewPlan(t.plan); }}
                          >
                            Plan
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setStatusModal(t); setNewStatus(t.status); }}
                          >
                            Status
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCreditsModal(t)}
                          >
                            Credits
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

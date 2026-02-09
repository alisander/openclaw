"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CreditCard, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";

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

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Billing</h1>

      {error && <p className="text-destructive">{error}</p>}

      {/* Balance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardDescription>Credit Balance</CardDescription>
            <CreditCard className="size-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            {balance !== null ? `$${balance.toFixed(4)}` : "Loading..."}
          </p>
        </CardContent>
      </Card>

      {/* Purchase Credits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Purchase Credits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Label htmlFor="amount" className="text-muted-foreground">
              <DollarSign className="size-4" />
            </Label>
            <Input
              id="amount"
              type="number"
              min={1}
              max={1000}
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value)}
              className="w-[100px]"
            />
            <Button onClick={handlePurchase} disabled={loading}>
              {loading ? "Redirecting..." : "Buy Credits"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ledger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {ledger.length === 0 ? (
            <p className="text-muted-foreground">No transactions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={entry.amount >= 0 ? "secondary" : "destructive"}
                        className={cn(
                          "font-mono",
                          entry.amount >= 0 && "bg-emerald-400/15 text-emerald-400 border-emerald-400/20"
                        )}
                      >
                        {entry.amount >= 0 ? (
                          <ArrowUpRight className="size-3" />
                        ) : (
                          <ArrowDownRight className="size-3" />
                        )}
                        {entry.amount >= 0 ? "+" : ""}${entry.amount.toFixed(4)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${entry.balance_after.toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

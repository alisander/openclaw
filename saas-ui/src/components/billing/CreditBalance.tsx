"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function CreditBalance() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    api<{ balanceUsd: number }>("/api/billing/balance")
      .then((data) => setBalance(data.balanceUsd))
      .catch(() => setBalance(null));
  }, []);

  if (balance === null) return <span className="text-muted-foreground text-sm">--</span>;

  return (
    <span
      className={cn(
        "text-sm font-semibold",
        balance > 0.5 ? "text-emerald-500" : balance > 0 ? "text-amber-500" : "text-red-500"
      )}
    >
      ${balance.toFixed(4)}
    </span>
  );
}

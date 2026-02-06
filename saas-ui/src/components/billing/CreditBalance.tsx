"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function CreditBalance() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    api<{ balanceUsd: number }>("/api/billing/balance")
      .then((data) => setBalance(data.balanceUsd))
      .catch(() => setBalance(null));
  }, []);

  if (balance === null) return <span style={{ color: "#888" }}>--</span>;

  return (
    <span
      style={{
        fontWeight: 600,
        color: balance > 0.5 ? "#4ade80" : balance > 0 ? "#fbbf24" : "#f87171",
      }}
    >
      ${balance.toFixed(4)}
    </span>
  );
}

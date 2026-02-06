"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAuthenticated, clearTokens } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/chat", label: "Chat" },
  { href: "/billing", label: "Billing" },
  { href: "/integrations", label: "Integrations" },
  { href: "/settings", label: "Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, [router]);

  if (!mounted) return null;

  function handleLogout() {
    clearTokens();
    router.push("/login");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a", color: "#fafafa" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: "220px",
          borderRight: "1px solid #222",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "2rem", padding: "0.5rem" }}>
          OpenClaw
        </h2>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "block",
                padding: "0.5rem 0.75rem",
                borderRadius: "0.375rem",
                textDecoration: "none",
                color: pathname === item.href ? "#fff" : "#888",
                background: pathname === item.href ? "#222" : "transparent",
                fontWeight: pathname === item.href ? 600 : 400,
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          style={{
            padding: "0.5rem 0.75rem",
            border: "1px solid #333",
            borderRadius: "0.375rem",
            background: "transparent",
            color: "#888",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          Log out
        </button>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAuthenticated, clearTokens, getUserRole } from "@/lib/api";

const USER_NAV = [
  { href: "/dashboard", label: "Overview", icon: "~" },
  { href: "/chat", label: "Chat", icon: ">" },
  { href: "/channels", label: "Channels", icon: "#" },
  { href: "/skills", label: "Skills", icon: "*" },
  { href: "/model", label: "Model", icon: "M" },
  { href: "/identity", label: "Identity", icon: "@" },
  { href: "/integrations", label: "Integrations", icon: "+" },
  { href: "/billing", label: "Billing", icon: "$" },
  { href: "/settings", label: "Settings", icon: "=" },
];

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: "A" },
  { href: "/admin/users", label: "Users", icon: "U" },
  { href: "/admin/tenants", label: "Tenants", icon: "T" },
  { href: "/admin/revenue", label: "Revenue", icon: "R" },
  { href: "/admin/pricing", label: "Pricing", icon: "P" },
  { href: "/admin/channels", label: "Channels", icon: "C" },
  { href: "/admin/config", label: "System Config", icon: "S" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState("user");

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push("/login");
    }
    setRole(getUserRole());
  }, [router]);

  if (!mounted) return null;

  function handleLogout() {
    clearTokens();
    router.push("/login");
  }

  const isAdmin = role === "admin";
  const isAdminPage = pathname.startsWith("/admin");

  const linkStyle = (href: string) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.5rem 0.75rem",
      borderRadius: "0.375rem",
      textDecoration: "none" as const,
      color: active ? "#fff" : "#888",
      background: active ? "#222" : "transparent",
      fontWeight: active ? 600 : 400,
      fontSize: "0.875rem",
      transition: "background 0.15s",
    };
  };

  const iconStyle = {
    width: "1.25rem",
    textAlign: "center" as const,
    fontFamily: "monospace",
    fontSize: "0.75rem",
    color: "#666",
  };

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
          flexShrink: 0,
        }}
      >
        <Link href="/dashboard" style={{ textDecoration: "none", color: "inherit" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem", padding: "0.5rem" }}>
            OpenClaw
          </h2>
        </Link>

        {/* User navigation */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.125rem" }}>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#555", padding: "0.5rem 0.75rem", letterSpacing: "0.05em" }}>
            My Assistant
          </div>
          {USER_NAV.map((item) => (
            <Link key={item.href} href={item.href} style={linkStyle(item.href)}>
              <span style={iconStyle}>{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {/* Admin section */}
          {isAdmin && (
            <>
              <div style={{ height: "1px", background: "#222", margin: "0.75rem 0" }} />
              <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#555", padding: "0.5rem 0.75rem", letterSpacing: "0.05em" }}>
                Admin
              </div>
              {ADMIN_NAV.map((item) => (
                <Link key={item.href} href={item.href} style={linkStyle(item.href)}>
                  <span style={iconStyle}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </>
          )}
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
            fontSize: "0.875rem",
          }}
        >
          Log out
        </button>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto", padding: "2rem" }}>{children}</main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type SetupStep = {
  id: string;
  title: string;
  description: string;
  href: string;
  completed: boolean;
};

type SetupStatus = {
  steps: SetupStep[];
  completedCount: number;
  totalSteps: number;
  isNewUser: boolean;
};

type DashboardStats = {
  balance: number;
  plan: string;
  usage: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUsd: number;
    eventCount: number;
  };
};

const QUICK_ACTIONS = [
  {
    title: "Chat",
    description: "Talk to your AI assistant",
    href: "/chat",
    icon: ">",
    color: "#4ade80",
  },
  {
    title: "Channels",
    description: "Connect Telegram, WhatsApp, Discord...",
    href: "/channels",
    icon: "#",
    color: "#74b9ff",
  },
  {
    title: "Skills",
    description: "Manage assistant capabilities",
    href: "/skills",
    icon: "*",
    color: "#fbbf24",
  },
  {
    title: "Model",
    description: "Choose your AI model",
    href: "/model",
    icon: "M",
    color: "#a29bfe",
  },
  {
    title: "Identity",
    description: "Customize personality and tone",
    href: "/identity",
    icon: "@",
    color: "#fd79a8",
  },
  {
    title: "Integrations",
    description: "Connect Google, Microsoft...",
    href: "/integrations",
    icon: "+",
    color: "#81ecec",
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [setup, setSetup] = useState<SetupStatus | null>(null);
  const [justSignedUp, setJustSignedUp] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if just signed up
    if (typeof window !== "undefined") {
      const flag = localStorage.getItem("openclaw_just_signed_up");
      if (flag) {
        setJustSignedUp(true);
        localStorage.removeItem("openclaw_just_signed_up");
      }
    }

    // Load data
    api<DashboardStats>("/api/dashboard/stats")
      .then(setStats)
      .catch((err) => setError(err.message));

    api<SetupStatus>("/api/dashboard/setup-status")
      .then(setSetup)
      .catch(() => {}); // Non-critical
  }, []);

  const userName = typeof window !== "undefined"
    ? localStorage.getItem("openclaw_user_name") || "there"
    : "there";

  const cardStyle = {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "0.75rem",
    padding: "1.5rem",
  };

  const showWelcome = (justSignedUp || (setup?.isNewUser && !welcomeDismissed));
  const incompleteSteps = setup?.steps.filter((s) => !s.completed && s.id !== "chat") ?? [];

  return (
    <div>
      {/* Welcome Banner for new users */}
      {showWelcome && (
        <div
          style={{
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
            border: "1px solid #2a3a5e",
            borderRadius: "0.75rem",
            padding: "2rem",
            marginBottom: "2rem",
            position: "relative",
          }}
        >
          <button
            onClick={() => { setWelcomeDismissed(true); setJustSignedUp(false); }}
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              background: "transparent",
              border: "none",
              color: "#666",
              cursor: "pointer",
              fontSize: "1.25rem",
              lineHeight: 1,
            }}
          >
            x
          </button>

          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Welcome to OpenClaw{userName !== "there" ? `, ${userName}` : ""}!
          </h1>
          <p style={{ color: "#a0aec0", marginBottom: "1.5rem", maxWidth: "600px", lineHeight: 1.6 }}>
            Your AI assistant is ready. Let&apos;s get it set up in a few quick steps.
            Configure your assistant&apos;s identity, choose an AI model, and connect
            your favorite messaging channels.
          </p>

          {/* Setup Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {setup?.steps.map((step, i) => (
              <Link
                key={step.id}
                href={step.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  background: step.completed ? "rgba(74, 222, 128, 0.08)" : "rgba(255, 255, 255, 0.04)",
                  border: `1px solid ${step.completed ? "rgba(74, 222, 128, 0.2)" : "rgba(255, 255, 255, 0.08)"}`,
                  textDecoration: "none",
                  color: "inherit",
                  transition: "background 0.15s",
                }}
              >
                {/* Step number / check */}
                <div
                  style={{
                    width: "1.75rem",
                    height: "1.75rem",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    flexShrink: 0,
                    background: step.completed ? "#4ade80" : "#333",
                    color: step.completed ? "#000" : "#888",
                  }}
                >
                  {step.completed ? "ok" : i + 1}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    color: step.completed ? "#4ade80" : "#fff",
                    textDecoration: step.completed ? "line-through" : "none",
                    opacity: step.completed ? 0.7 : 1,
                  }}>
                    {step.title}
                  </div>
                  <div style={{ color: "#888", fontSize: "0.75rem" }}>
                    {step.description}
                  </div>
                </div>

                <div style={{ color: "#555", fontSize: "0.875rem" }}>
                  {step.completed ? "" : "->"}
                </div>
              </Link>
            ))}
          </div>

          {/* Progress bar */}
          {setup && (
            <div style={{ marginTop: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ color: "#888", fontSize: "0.75rem" }}>Setup progress</span>
                <span style={{ color: "#888", fontSize: "0.75rem" }}>
                  {setup.completedCount} / {setup.totalSteps}
                </span>
              </div>
              <div style={{ background: "#222", borderRadius: "1rem", height: "6px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${(setup.completedCount / setup.totalSteps) * 100}%`,
                    height: "100%",
                    background: "#4ade80",
                    borderRadius: "1rem",
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Regular dashboard header when welcome is dismissed */}
      {!showWelcome && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Dashboard</h1>
          <button
            onClick={() => { setWelcomeDismissed(false); setJustSignedUp(true); }}
            style={{
              padding: "0.5rem 0.875rem",
              borderRadius: "0.375rem",
              border: "1px solid #333",
              background: "transparent",
              color: "#888",
              cursor: "pointer",
              fontSize: "0.8125rem",
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
            }}
          >
            Setup Guide
          </button>
        </div>
      )}

      {error && <p style={{ color: "#ff6b6b", marginBottom: "1rem" }}>{error}</p>}

      {/* Pending setup steps reminder (when welcome is dismissed but steps remain) */}
      {!showWelcome && incompleteSteps.length > 0 && (
        <div
          style={{
            ...cardStyle,
            marginBottom: "1.5rem",
            borderColor: "#2a3a5e",
            background: "#111827",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>
              Finish setting up your assistant
            </h3>
            <span style={{ color: "#888", fontSize: "0.75rem" }}>
              {setup?.completedCount} / {setup?.totalSteps} complete
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {incompleteSteps.map((step) => (
              <Link
                key={step.id}
                href={step.href}
                style={{
                  padding: "0.375rem 0.75rem",
                  borderRadius: "1rem",
                  border: "1px solid #333",
                  background: "transparent",
                  color: "#fff",
                  textDecoration: "none",
                  fontSize: "0.8125rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                {step.title} <span style={{ color: "#555" }}>-&gt;</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          <div style={cardStyle}>
            <div style={{ color: "#888", fontSize: "0.8125rem", marginBottom: "0.375rem" }}>Credit Balance</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>${stats.balance.toFixed(2)}</div>
            <Link href="/billing" style={{ color: "#888", fontSize: "0.75rem", textDecoration: "none" }}>
              Manage billing -&gt;
            </Link>
          </div>
          <div style={cardStyle}>
            <div style={{ color: "#888", fontSize: "0.8125rem", marginBottom: "0.375rem" }}>Plan</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, textTransform: "capitalize" }}>{stats.plan}</div>
            <Link href="/billing" style={{ color: "#888", fontSize: "0.75rem", textDecoration: "none" }}>
              Upgrade -&gt;
            </Link>
          </div>
          <div style={cardStyle}>
            <div style={{ color: "#888", fontSize: "0.8125rem", marginBottom: "0.375rem" }}>Tokens (30d)</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
              {(stats.usage.totalInputTokens + stats.usage.totalOutputTokens).toLocaleString()}
            </div>
            <span style={{ color: "#666", fontSize: "0.75rem" }}>
              {stats.usage.eventCount} requests
            </span>
          </div>
          <div style={cardStyle}>
            <div style={{ color: "#888", fontSize: "0.8125rem", marginBottom: "0.375rem" }}>Cost (30d)</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>${stats.usage.totalCostUsd.toFixed(4)}</div>
            <span style={{ color: "#666", fontSize: "0.75rem" }}>
              avg ${stats.usage.eventCount > 0 ? (stats.usage.totalCostUsd / stats.usage.eventCount).toFixed(4) : "0.00"}/req
            </span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>Quick Actions</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            style={{
              ...cardStyle,
              textDecoration: "none",
              color: "inherit",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
              transition: "border-color 0.15s",
            }}
          >
            <div
              style={{
                width: "2.25rem",
                height: "2.25rem",
                borderRadius: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `${action.color}15`,
                color: action.color,
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: "1rem",
                flexShrink: 0,
              }}
            >
              {action.icon}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.9375rem", marginBottom: "0.125rem" }}>
                {action.title}
              </div>
              <div style={{ color: "#888", fontSize: "0.75rem" }}>
                {action.description}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

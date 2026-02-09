"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  Crown,
  Activity,
  DollarSign,
  MessageSquare,
  Hash,
  Sparkles,
  Cpu,
  UserCircle,
  Plug,
  X,
  ChevronRight,
  BookOpen,
  Check,
} from "lucide-react";

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
    icon: MessageSquare,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    title: "Channels",
    description: "Connect Telegram, WhatsApp, Discord...",
    href: "/channels",
    icon: Hash,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  {
    title: "Skills",
    description: "Manage assistant capabilities",
    href: "/skills",
    icon: Sparkles,
    color: "text-amber-300",
    bg: "bg-amber-300/10",
  },
  {
    title: "Model",
    description: "Choose your AI model",
    href: "/model",
    icon: Cpu,
    color: "text-amber-300",
    bg: "bg-amber-300/10",
  },
  {
    title: "Identity",
    description: "Customize personality and tone",
    href: "/identity",
    icon: UserCircle,
    color: "text-pink-400",
    bg: "bg-pink-400/10",
  },
  {
    title: "Integrations",
    description: "Connect Google, Microsoft...",
    href: "/integrations",
    icon: Plug,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
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

  const showWelcome = (justSignedUp || (setup?.isNewUser && !welcomeDismissed));
  const incompleteSteps = setup?.steps.filter((s) => !s.completed && s.id !== "chat") ?? [];

  return (
    <div>
      {/* Welcome Banner for new users */}
      {showWelcome && (
        <Card className="mb-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 relative">
          <CardHeader>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              onClick={() => { setWelcomeDismissed(true); setJustSignedUp(false); }}
            >
              <X className="size-4" />
            </Button>

            <CardTitle className="text-2xl font-bold">
              Welcome to OpenClaw{userName !== "there" ? `, ${userName}` : ""}!
            </CardTitle>
            <CardDescription className="max-w-[600px] leading-relaxed">
              Your AI assistant is ready. Let&apos;s get it set up in a few quick steps.
              Configure your assistant&apos;s identity, choose an AI model, and connect
              your favorite messaging channels.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-2">
            {/* Setup Steps */}
            {setup?.steps.map((step, i) => (
              <Link
                key={step.id}
                href={step.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg no-underline text-inherit transition-colors",
                  step.completed
                    ? "bg-emerald-400/[0.08] border border-emerald-400/20"
                    : "bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08]"
                )}
              >
                {/* Step number / check */}
                <div
                  className={cn(
                    "size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    step.completed
                      ? "bg-emerald-400 text-black"
                      : "bg-white/15 text-muted-foreground"
                  )}
                >
                  {step.completed ? <Check className="size-3.5" /> : i + 1}
                </div>

                <div className="flex-1">
                  <div
                    className={cn(
                      "font-semibold text-sm",
                      step.completed
                        ? "text-emerald-400 line-through opacity-70"
                        : "text-foreground"
                    )}
                  >
                    {step.title}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {step.description}
                  </div>
                </div>

                {!step.completed && (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
              </Link>
            ))}
          </CardContent>

          {/* Progress bar */}
          {setup && (
            <CardFooter className="flex-col items-stretch gap-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Setup progress</span>
                <span className="text-muted-foreground text-xs">
                  {setup.completedCount} / {setup.totalSteps}
                </span>
              </div>
              <Progress value={(setup.completedCount / setup.totalSteps) * 100} />
            </CardFooter>
          )}
        </Card>
      )}

      {/* Regular dashboard header when welcome is dismissed */}
      {!showWelcome && (
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setWelcomeDismissed(false); setJustSignedUp(true); }}
          >
            <BookOpen className="size-4" />
            Setup Guide
          </Button>
        </div>
      )}

      {error && <p className="text-destructive mb-4">{error}</p>}

      {/* Pending setup steps reminder (when welcome is dismissed but steps remain) */}
      {!showWelcome && incompleteSteps.length > 0 && (
        <Card className="mb-6 bg-muted/50">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-[0.9375rem]">
                Finish setting up your assistant
              </CardTitle>
              <span className="text-muted-foreground text-xs">
                {setup?.completedCount} / {setup?.totalSteps} complete
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {incompleteSteps.map((step) => (
                <Badge key={step.id} variant="outline" asChild>
                  <Link href={step.href} className="no-underline gap-1.5">
                    {step.title}
                    <ChevronRight className="size-3 text-muted-foreground" />
                  </Link>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Credit Balance</CardDescription>
                <CreditCard className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.balance.toFixed(2)}</div>
              <Link href="/billing" className="text-xs text-muted-foreground hover:text-foreground transition-colors no-underline">
                Manage billing &rarr;
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Plan</CardDescription>
                <Crown className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{stats.plan}</div>
              <Link href="/billing" className="text-xs text-muted-foreground hover:text-foreground transition-colors no-underline">
                Upgrade &rarr;
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Tokens (30d)</CardDescription>
                <Activity className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.usage.totalInputTokens + stats.usage.totalOutputTokens).toLocaleString()}
              </div>
              <span className="text-xs text-muted-foreground">
                {stats.usage.eventCount} requests
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Cost (30d)</CardDescription>
                <DollarSign className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.usage.totalCostUsd.toFixed(4)}</div>
              <span className="text-xs text-muted-foreground">
                avg ${stats.usage.eventCount > 0 ? (stats.usage.totalCostUsd / stats.usage.eventCount).toFixed(4) : "0.00"}/req
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href} className="no-underline text-inherit">
              <Card className="transition-colors hover:border-foreground/25 cursor-pointer">
                <CardContent className="flex items-start gap-3">
                  <div className={cn("size-9 rounded-lg flex items-center justify-center shrink-0", action.bg)}>
                    <Icon className={cn("size-5", action.color)} />
                  </div>
                  <div>
                    <div className="font-semibold text-[0.9375rem] mb-0.5">
                      {action.title}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {action.description}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

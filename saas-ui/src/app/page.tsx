"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

export default function LandingPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/dashboard");
      return;
    }
    setChecked(true);
  }, [router]);

  if (!checked) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex justify-between items-center p-4 px-8 border-b">
        <h1 className="text-2xl font-bold">OpenClaw</h1>
        <nav className="flex gap-4 items-center">
          <Button variant="ghost" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
        </nav>
      </header>

      {/* Hero */}
      <main className="max-w-3xl mx-auto py-24 px-8 text-center">
        <h2 className="text-5xl font-extrabold leading-tight mb-6">
          Your Personal AI Assistant
        </h2>
        <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
          Connect your AI assistant to Gmail, Google Drive, Outlook, OneDrive, and 30+ messaging
          channels. Powered by the best AI models with 54+ skills.
        </p>
        <Button size="lg" asChild>
          <Link href="/signup">Start Free</Link>
        </Button>

        {/* Pricing */}
        <section className="mt-24">
          <h3 className="text-3xl font-bold mb-8">Pricing</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: "Free", price: "$0", features: ["$0.50 in credits", "Web chat", "10 skills", "5 sessions"] },
              { name: "Starter", price: "$15/mo", features: ["$7 in credits", "+WhatsApp, Telegram", "30 skills", "20 sessions"] },
              { name: "Pro", price: "$40/mo", features: ["$20 in credits", "All channels", "All skills", "Unlimited sessions"] },
            ].map((plan) => (
              <Card key={plan.name} className="text-left">
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-2xl font-bold">{plan.price}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-muted-foreground">
                    {plan.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { ChevronRight, Plug, ExternalLink, Info, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Integration = {
  provider: string;
  email: string | null;
  status: string;
  connectedAt: string;
};

const PROVIDERS = [
  {
    id: "google",
    name: "Google Workspace",
    description: "Gmail, Google Drive, Google Calendar",
    connectPath: "/api/integrations/connect/google",
    color: "#4ad8b7",
    instructions: {
      title: "Connect your Google account",
      description: "Connecting Google gives your assistant access to your Gmail, Google Drive, and Calendar. Here is what happens:",
      steps: [
        "Click 'Connect' to open the Google sign-in page",
        "Sign in with the Google account you want to connect",
        "Review the permissions: Gmail (read and send), Google Drive (read and manage files), Calendar (read events)",
        "Click 'Allow' to grant access",
        "You will be redirected back here and your account will appear as connected",
      ],
      capabilities: [
        "Read and search your Gmail inbox",
        "Send emails on your behalf",
        "Search and read Google Drive files",
        "Upload files to Google Drive",
        "View your calendar events",
      ],
      note: "OpenClaw only accesses your data when you ask your assistant to do so. You can disconnect at any time to revoke access.",
    },
  },
  {
    id: "microsoft",
    name: "Microsoft 365",
    description: "Outlook, OneDrive, Microsoft Calendar",
    connectPath: "/api/integrations/connect/microsoft",
    color: "#e86a47",
    instructions: {
      title: "Connect your Microsoft account",
      description: "Connecting Microsoft 365 gives your assistant access to Outlook, OneDrive, and Calendar. Here is what happens:",
      steps: [
        "Click 'Connect' to open the Microsoft sign-in page",
        "Sign in with your Microsoft account (personal or work/school)",
        "Review the permissions: Mail (read and send), Files (read and write), Calendar (read events)",
        "Click 'Accept' to grant access",
        "You will be redirected back here and your account will appear as connected",
      ],
      capabilities: [
        "Read and search your Outlook inbox",
        "Send emails via Outlook",
        "Search and read OneDrive files",
        "Upload files to OneDrive",
        "View your calendar events",
      ],
      note: "For work or school accounts, your organization's admin may need to approve the app first. Contact your IT admin if you see an approval required message.",
    },
  },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function loadIntegrations() {
    try {
      const data = await api<{ integrations: Integration[] }>("/api/integrations");
      setIntegrations(data.integrations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integrations");
    }
  }

  async function handleConnect(provider: string) {
    try {
      const data = await api<{ authUrl: string }>(
        `/api/integrations/connect/${provider}`,
      );
      window.location.href = data.authUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to connect ${provider}`);
    }
  }

  async function handleDisconnect(provider: string) {
    try {
      await api(`/api/integrations/disconnect/${provider}`, { method: "POST" });
      await loadIntegrations();
      toast.success("Integration disconnected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to disconnect ${provider}`);
    }
  }

  function getIntegration(providerId: string): Integration | undefined {
    return integrations.find((i) => i.provider === providerId && i.status === "active");
  }

  return (
    <div className="max-w-[800px]">
      <h1 className="text-2xl font-bold mb-1">Integrations</h1>
      <p className="text-muted-foreground mb-8">
        Connect cloud services to give your assistant access to your email, files, and calendar.
        Click on a service to see details and setup instructions.
      </p>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        {PROVIDERS.map((provider) => {
          const connected = getIntegration(provider.id);
          const isExpanded = expanded === provider.id;
          const info = provider.instructions;

          return (
            <Card key={provider.id}>
              {/* Header */}
              <CardHeader
                className="cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : provider.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">
                        {provider.name}
                      </CardTitle>
                      {connected ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
                          <Check className="size-3" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Not connected
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{provider.description}</CardDescription>
                    {connected && connected.email && (
                      <p className="text-sm text-green-400 mt-1">
                        Signed in as {connected.email}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {connected ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleDisconnect(provider.id); }}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleConnect(provider.id); }}
                      >
                        <Plug className="size-4" />
                        Connect
                      </Button>
                    )}
                    <ChevronRight
                      className={cn(
                        "size-4 text-muted-foreground transition-transform duration-200",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </div>
                </div>
              </CardHeader>

              {/* Expandable instructions */}
              {isExpanded && (
                <CardContent className="space-y-4">
                  <Separator />

                  {/* Instructions */}
                  <div className="rounded-lg border bg-muted/50 p-5">
                    <h4 className="text-[0.9375rem] font-semibold mb-1" style={{ color: provider.color }}>
                      {info.title}
                    </h4>
                    <p className="text-muted-foreground text-sm mb-3">
                      {info.description}
                    </p>
                    <ol className="list-decimal pl-5 text-foreground text-sm leading-7 space-y-0.5">
                      {info.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Capabilities */}
                  <div className="rounded-lg border bg-muted/50 p-5">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">
                      What your assistant can do
                    </h4>
                    <ul className="list-disc pl-5 text-muted-foreground text-sm leading-7">
                      {info.capabilities.map((cap, i) => (
                        <li key={i}>{cap}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Note */}
                  <div className="rounded-md border border-[rgba(243,201,122,0.2)] bg-muted/50 px-3 py-2.5 text-xs text-[#f3c97a] leading-relaxed flex items-start gap-2">
                    <Info className="size-3.5 mt-0.5 shrink-0" />
                    {info.note}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

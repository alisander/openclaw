"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { ExternalLink, Info, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Channel = {
  id: string;
  name: string;
  description: string;
  configSchema: Record<string, string>;
  enabled: boolean;
  configured: boolean;
  status: string;
  config: Record<string, unknown>;
};

const CHANNEL_INSTRUCTIONS: Record<string, { steps: string[]; link?: string; linkLabel?: string; note?: string }> = {
  telegram: {
    steps: [
      "Open Telegram and search for @BotFather",
      "Send /newbot and follow the prompts to create your bot",
      "BotFather will give you a Bot Token - copy it",
      "Paste the token below and enable the channel",
      "Your assistant will now respond to messages sent to your Telegram bot",
    ],
    link: "https://core.telegram.org/bots#how-do-i-create-a-bot",
    linkLabel: "Telegram Bot Documentation",
  },
  whatsapp: {
    steps: [
      "Go to Meta for Developers and create a new app (type: Business)",
      "Add the WhatsApp product to your app",
      "In WhatsApp > Getting Started, note your Phone Number ID and temporary Access Token",
      "Set up a webhook URL pointing to your OpenClaw instance",
      "Create a Verify Token (any secret string) and use it for webhook verification",
      "Paste all three values below and enable the channel",
    ],
    link: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started",
    linkLabel: "WhatsApp Cloud API Guide",
    note: "A Meta Business account is required. The temporary token expires after 24h - generate a permanent one in your app settings.",
  },
  discord: {
    steps: [
      "Go to the Discord Developer Portal and click 'New Application'",
      "Go to the Bot section and click 'Add Bot'",
      "Copy the Bot Token (click 'Reset Token' if needed)",
      "Enable 'Message Content Intent' under Privileged Gateway Intents",
      "Go to OAuth2 > URL Generator, select 'bot' scope with 'Send Messages' and 'Read Message History' permissions",
      "Use the generated URL to invite the bot to your server",
      "Copy your server's Guild ID (enable Developer Mode in Discord settings, then right-click your server)",
      "Paste the Bot Token and Guild ID below",
    ],
    link: "https://discord.com/developers/docs/getting-started",
    linkLabel: "Discord Developer Documentation",
  },
  slack: {
    steps: [
      "Go to api.slack.com/apps and click 'Create New App' > 'From scratch'",
      "Under OAuth & Permissions, add these Bot Token Scopes: chat:write, app_mentions:read, im:history, im:read",
      "Install the app to your workspace and copy the Bot User OAuth Token",
      "Under Basic Information, copy the Signing Secret",
      "Enable Socket Mode and generate an App-Level Token with 'connections:write' scope",
      "Under Event Subscriptions, subscribe to: message.im, app_mention",
      "Paste all three values below",
    ],
    link: "https://api.slack.com/start/quickstart",
    linkLabel: "Slack API Quickstart",
  },
  web: {
    steps: [
      "The web chat widget is built into your OpenClaw dashboard",
      "To embed it on your own website, specify the allowed origins below",
      "Use comma-separated domains (e.g., https://mysite.com, https://app.mysite.com)",
      "Leave empty to only allow chat from the OpenClaw dashboard",
    ],
    note: "Web chat is available by default in your dashboard under the Chat tab.",
  },
  email: {
    steps: [
      "You need IMAP and SMTP access to your email account",
      "For Gmail: Enable IMAP in Gmail settings, then create an App Password (Google Account > Security > 2-Step Verification > App Passwords)",
      "For Outlook: Use your regular email and password, or create an app password if 2FA is enabled",
      "Enter your IMAP host (e.g., imap.gmail.com), SMTP host (e.g., smtp.gmail.com), email address, and app password",
      "Your assistant will monitor incoming emails and can send replies",
    ],
    note: "For Gmail, use imap.gmail.com / smtp.gmail.com. For Outlook, use outlook.office365.com for both.",
  },
  matrix: {
    steps: [
      "Create a bot account on your Matrix homeserver (or use an existing account)",
      "Log in to get an access token, or generate one via the admin API",
      "Enter your homeserver URL (e.g., https://matrix.org) and the access token",
      "Invite the bot to the rooms where you want it to respond",
    ],
    link: "https://spec.matrix.org/latest/client-server-api/",
    linkLabel: "Matrix Client-Server API",
  },
  signal: {
    steps: [
      "Set up Signal CLI or signal-cli-rest-api on your server",
      "Register a phone number with Signal using signal-cli",
      "Enter the registered phone number below",
      "Your assistant will respond to Signal messages sent to this number",
    ],
    link: "https://github.com/AsamK/signal-cli",
    linkLabel: "Signal CLI on GitHub",
    note: "Signal integration requires a dedicated phone number and a self-hosted signal-cli instance.",
  },
  teams: {
    steps: [
      "Go to the Azure Portal and register a new application (App registrations)",
      "Note the Application (client) ID",
      "Under Certificates & Secrets, create a new client secret",
      "Go to the Bot Framework portal and create a new bot registration",
      "Link it to your Azure app registration",
      "Configure the messaging endpoint to point to your OpenClaw instance",
      "Paste the App ID and App Secret below",
    ],
    link: "https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/create-a-bot-for-teams",
    linkLabel: "Microsoft Teams Bot Documentation",
    note: "Requires an Azure subscription and Microsoft 365 admin access.",
  },
  line: {
    steps: [
      "Go to the LINE Developers Console and create a new provider",
      "Create a Messaging API channel",
      "In the channel settings, issue a Channel Access Token",
      "Copy both the Channel Access Token and Channel Secret",
      "Set the webhook URL to point to your OpenClaw instance",
      "Enable 'Use webhook' in the channel settings",
      "Paste both values below",
    ],
    link: "https://developers.line.biz/en/docs/messaging-api/getting-started/",
    linkLabel: "LINE Messaging API Guide",
  },
};

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "pending":
      return "secondary";
    case "disabled":
      return "outline";
    case "not_configured":
    default:
      return "outline";
  }
}

function getStatusLabel(status: string): string {
  return status === "not_configured" ? "Not configured" : status;
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selected, setSelected] = useState<Channel | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadChannels();
  }, []);

  async function loadChannels() {
    try {
      const data = await api<{ channels: Channel[] }>("/api/config/channels");
      setChannels(data.channels);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load channels");
    }
  }

  function selectChannel(ch: Channel) {
    setSelected(ch);
    setEnabled(ch.enabled);
    const vals: Record<string, string> = {};
    for (const key of Object.keys(ch.configSchema)) {
      vals[key] = (ch.config[key] as string) ?? "";
    }
    setConfigValues(vals);
    setError("");
    setSuccess("");
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api(`/api/config/channels/${selected.id}`, {
        method: "POST",
        body: { enabled, config: configValues },
      });
      toast.success(`${selected.name} configuration saved`);
      await loadChannels();
      const updated = channels.find((c) => c.id === selected.id);
      if (updated) {
        setSelected({ ...updated, enabled, config: configValues });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!selected) return;
    if (!confirm(`Remove ${selected.name} configuration?`)) return;
    try {
      await api(`/api/config/channels/${selected.id}`, { method: "DELETE" });
      toast.success(`${selected.name} configuration removed`);
      setSelected(null);
      await loadChannels();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove");
      setError(e instanceof Error ? e.message : "Failed to remove");
    }
  }

  const instructions = selected ? CHANNEL_INSTRUCTIONS[selected.id] : null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Channels</h1>
      <p className="text-muted-foreground mb-8">
        Connect your assistant to messaging platforms. Select a channel below to see setup instructions and configure it.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Channel List */}
        <div className="flex flex-col gap-3">
          {channels.map((ch) => (
            <Card
              key={ch.id}
              className={cn(
                "cursor-pointer transition-colors hover:border-muted-foreground/30 py-4",
                selected?.id === ch.id && "border-muted-foreground/50"
              )}
              onClick={() => selectChannel(ch)}
            >
              <CardContent className="py-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{ch.name}</span>
                  <Badge variant={getStatusVariant(ch.status)}>
                    {getStatusLabel(ch.status)}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">{ch.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Config Panel */}
        <div>
          {!selected ? (
            <Card className="py-12">
              <CardContent className="flex items-center justify-center">
                <p className="text-muted-foreground text-center">
                  Select a channel to see setup instructions
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Instructions */}
              {instructions && (
                <Alert className="border-primary/20 bg-primary/5">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertTitle className="text-primary font-semibold">
                    How to set up {selected.name}
                  </AlertTitle>
                  <AlertDescription>
                    <ol className="list-decimal pl-5 text-foreground/90 text-sm leading-7 mt-2">
                      {instructions.steps.map((step, i) => (
                        <li key={i} className="mb-0.5">{step}</li>
                      ))}
                    </ol>

                    {instructions.note && (
                      <div className="mt-3 flex items-start gap-2 rounded-md border border-yellow-500/20 bg-yellow-500/5 px-3 py-2.5">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                        <span className="text-yellow-500 text-xs leading-relaxed">
                          {instructions.note}
                        </span>
                      </div>
                    )}

                    {instructions.link && (
                      <a
                        href={instructions.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 text-primary text-sm hover:underline"
                      >
                        {instructions.linkLabel ?? "Documentation"}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Config Form */}
              <Card>
                <CardHeader>
                  <CardTitle>{selected.name} Configuration</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  {error && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Enabled toggle */}
                  <div className="flex items-center gap-3">
                    <Switch
                      id="channel-enabled"
                      checked={enabled}
                      onCheckedChange={setEnabled}
                    />
                    <Label htmlFor="channel-enabled" className="cursor-pointer">
                      Enabled
                    </Label>
                  </div>

                  {/* Config fields */}
                  {Object.entries(selected.configSchema).map(([key]) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={`config-${key}`} className="text-muted-foreground text-sm">
                        {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                      </Label>
                      <Input
                        id={`config-${key}`}
                        type={key.toLowerCase().includes("token") || key.toLowerCase().includes("secret") || key.toLowerCase().includes("password") ? "password" : "text"}
                        value={configValues[key] ?? ""}
                        onChange={(e) => setConfigValues({ ...configValues, [key]: e.target.value })}
                        placeholder={`Enter ${key}`}
                      />
                    </div>
                  ))}

                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving ? "Saving..." : "Save Configuration"}
                    </Button>
                    {selected.configured && (
                      <Button
                        variant="destructive"
                        onClick={handleDisconnect}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

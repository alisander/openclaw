"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

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
      setSuccess(`${selected.name} configuration saved`);
      await loadChannels();
      const updated = channels.find((c) => c.id === selected.id);
      if (updated) {
        setSelected({ ...updated, enabled, config: configValues });
      }
    } catch (e) {
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
      setSelected(null);
      await loadChannels();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove");
    }
  }

  const cardStyle = {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "0.75rem",
    padding: "1.25rem",
    cursor: "pointer" as const,
    transition: "border-color 0.15s",
  };

  const inputStyle = {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "0.5rem",
    border: "1px solid #333",
    background: "#111",
    color: "#fff",
    fontSize: "0.875rem",
    boxSizing: "border-box" as const,
  };

  const statusColors: Record<string, string> = {
    active: "#4ade80",
    disabled: "#888",
    pending: "#fbbf24",
    not_configured: "#666",
  };

  const instructions = selected ? CHANNEL_INSTRUCTIONS[selected.id] : null;

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Channels</h1>
      <p style={{ color: "#888", marginBottom: "2rem" }}>
        Connect your assistant to messaging platforms. Select a channel below to see setup instructions and configure it.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {/* Channel List */}
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {channels.map((ch) => (
              <div
                key={ch.id}
                onClick={() => selectChannel(ch)}
                style={{
                  ...cardStyle,
                  borderColor: selected?.id === ch.id ? "#555" : "#222",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 600 }}>{ch.name}</span>
                  <span style={{ fontSize: "0.75rem", color: statusColors[ch.status] ?? "#666" }}>
                    {ch.status === "not_configured" ? "Not configured" : ch.status}
                  </span>
                </div>
                <div style={{ color: "#888", fontSize: "0.8125rem" }}>{ch.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Config Panel */}
        <div>
          {!selected ? (
            <div style={{ ...cardStyle, cursor: "default", textAlign: "center", color: "#666", padding: "3rem" }}>
              Select a channel to see setup instructions
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Instructions */}
              {instructions && (
                <div
                  style={{
                    background: "#0d1117",
                    border: "1px solid #1c2333",
                    borderRadius: "0.75rem",
                    padding: "1.25rem",
                  }}
                >
                  <h4 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "0.75rem", color: "#74b9ff" }}>
                    How to set up {selected.name}
                  </h4>
                  <ol style={{ margin: 0, paddingLeft: "1.25rem", color: "#c9d1d9", fontSize: "0.8125rem", lineHeight: 1.7 }}>
                    {instructions.steps.map((step, i) => (
                      <li key={i} style={{ marginBottom: "0.25rem" }}>{step}</li>
                    ))}
                  </ol>

                  {instructions.note && (
                    <div style={{ marginTop: "0.75rem", padding: "0.625rem 0.75rem", background: "#1a1500", border: "1px solid #3a2f00", borderRadius: "0.375rem", color: "#fbbf24", fontSize: "0.75rem", lineHeight: 1.5 }}>
                      Note: {instructions.note}
                    </div>
                  )}

                  {instructions.link && (
                    <a
                      href={instructions.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-block", marginTop: "0.75rem", color: "#74b9ff", fontSize: "0.8125rem", textDecoration: "none" }}
                    >
                      {instructions.linkLabel ?? "Documentation"} -&gt;
                    </a>
                  )}
                </div>
              )}

              {/* Config Form */}
              <div style={{ ...cardStyle, cursor: "default" }}>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1.25rem" }}>
                  {selected.name} Configuration
                </h3>

                {error && (
                  <div style={{ background: "#331111", color: "#ff6b6b", padding: "0.75rem", borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
                    {error}
                  </div>
                )}
                {success && (
                  <div style={{ background: "#113311", color: "#4ade80", padding: "0.75rem", borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
                    {success}
                  </div>
                )}

                {/* Enabled toggle */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                      style={{ width: "1.25rem", height: "1.25rem" }}
                    />
                    <span>Enabled</span>
                  </label>
                </div>

                {/* Config fields */}
                {Object.entries(selected.configSchema).map(([key]) => (
                  <div key={key} style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", marginBottom: "0.375rem", color: "#888", fontSize: "0.8125rem" }}>
                      {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                    </label>
                    <input
                      type={key.toLowerCase().includes("token") || key.toLowerCase().includes("secret") || key.toLowerCase().includes("password") ? "password" : "text"}
                      value={configValues[key] ?? ""}
                      onChange={(e) => setConfigValues({ ...configValues, [key]: e.target.value })}
                      placeholder={`Enter ${key}`}
                      style={inputStyle}
                    />
                  </div>
                ))}

                <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      border: "none",
                      background: "#fff",
                      color: "#000",
                      fontWeight: 600,
                      cursor: saving ? "wait" : "pointer",
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? "Saving..." : "Save Configuration"}
                  </button>
                  {selected.configured && (
                    <button
                      onClick={handleDisconnect}
                      style={{
                        padding: "0.75rem 1.5rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #ff6b6b",
                        background: "transparent",
                        color: "#ff6b6b",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

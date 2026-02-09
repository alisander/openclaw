"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Lightbulb, Save, UserCircle } from "lucide-react";

type Identity = {
  displayName: string;
  avatarUrl: string;
  personality: string;
  language: string;
  tone: string;
  defaultModel: string;
  systemPrompt: string;
};

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "friendly", label: "Friendly" },
  { id: "casual", label: "Casual" },
  { id: "formal", label: "Formal" },
  { id: "technical", label: "Technical" },
  { id: "creative", label: "Creative" },
];

const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
  { id: "de", label: "German" },
  { id: "it", label: "Italian" },
  { id: "pt", label: "Portuguese" },
  { id: "ja", label: "Japanese" },
  { id: "ko", label: "Korean" },
  { id: "zh", label: "Chinese" },
  { id: "ar", label: "Arabic" },
  { id: "hi", label: "Hindi" },
  { id: "ru", label: "Russian" },
];

export default function IdentityPage() {
  const [identity, setIdentity] = useState<Identity>({
    displayName: "",
    avatarUrl: "",
    personality: "",
    language: "en",
    tone: "professional",
    defaultModel: "",
    systemPrompt: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadIdentity();
  }, []);

  async function loadIdentity() {
    try {
      const data = await api<{ identity: Identity }>("/api/config/identity");
      setIdentity(data.identity);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load identity");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api("/api/config/identity", {
        method: "POST",
        body: identity,
      });
      toast.success("Identity saved successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save identity");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-muted-foreground p-8">Loading...</div>;

  return (
    <div className="max-w-[700px]">
      <h1 className="text-2xl font-bold mb-1">Agent Identity</h1>
      <p className="text-muted-foreground mb-6">
        Customize your assistant&apos;s personality, tone, and behavior.
      </p>

      {/* Instructions */}
      <Alert className="mb-6">
        <Lightbulb className="size-4" />
        <AlertTitle className="text-[#f3c97a]">Personalizing your assistant</AlertTitle>
        <AlertDescription>
          <p className="mb-3">
            These settings shape how your assistant communicates. Here is what each field does:
          </p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1 mb-3">
            <li><strong className="text-foreground">Display Name</strong> -- The name shown in chat and notifications. Pick something memorable like &quot;Alex&quot; or &quot;My Work Assistant&quot;.</li>
            <li><strong className="text-foreground">Avatar URL</strong> -- A link to an image used as your assistant&apos;s profile picture. Use any publicly accessible image URL.</li>
            <li><strong className="text-foreground">Tone</strong> -- Controls the communication style: Professional for work, Casual for everyday use, Technical for developer-focused conversations.</li>
            <li><strong className="text-foreground">Language</strong> -- The primary language your assistant will respond in. It can still understand other languages.</li>
            <li><strong className="text-foreground">Personality Description</strong> -- A free-text description of how you want your assistant to behave. Be specific about expertise areas and communication preferences.</li>
            <li><strong className="text-foreground">System Prompt</strong> -- Advanced: A raw system prompt that gives your assistant precise instructions. This overrides the tone and personality settings when set.</li>
          </ul>
          <div className="rounded-md border border-[rgba(243,201,122,0.2)] bg-muted/50 px-3 py-2.5 text-xs text-[#f3c97a] leading-relaxed">
            Tip: Start with just a Display Name, Tone, and Language. You can refine the Personality and System Prompt later as you use your assistant and discover what works best.
          </div>
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="mb-4 border-green-500/30 text-green-400">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Basic Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="size-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              type="text"
              value={identity.displayName}
              onChange={(e) => setIdentity({ ...identity, displayName: e.target.value })}
              placeholder="My AI Assistant"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input
              id="avatarUrl"
              type="url"
              value={identity.avatarUrl}
              onChange={(e) => setIdentity({ ...identity, avatarUrl: e.target.value })}
              placeholder="https://example.com/avatar.png"
            />
          </div>
        </CardContent>
      </Card>

      {/* Personality */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Personality</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select
                value={identity.tone}
                onValueChange={(value) => setIdentity({ ...identity, tone: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a tone" />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={identity.language}
                onValueChange={(value) => setIdentity({ ...identity, language: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personality">Personality Description</Label>
            <Textarea
              id="personality"
              value={identity.personality}
              onChange={(e) => setIdentity({ ...identity, personality: e.target.value })}
              placeholder="Describe your assistant's personality... e.g., 'Helpful and concise, with a slight sense of humor. Expert in technology and business.'"
              rows={3}
              className="resize-y"
            />
          </div>
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>System Prompt</CardTitle>
          <CardDescription>
            Advanced: Provide a custom system prompt that defines your assistant&apos;s behavior. This overrides the default personality settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={identity.systemPrompt}
            onChange={(e) => setIdentity({ ...identity, systemPrompt: e.target.value })}
            placeholder="You are a helpful assistant specialized in..."
            rows={8}
            className="resize-y font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={saving}
        size="lg"
      >
        <Save className="size-4" />
        {saving ? "Saving..." : "Save Identity"}
      </Button>
    </div>
  );
}

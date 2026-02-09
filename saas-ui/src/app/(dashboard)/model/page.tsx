"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { AlertCircle, Check, Lightbulb, Loader2 } from "lucide-react";

type Model = {
  id: string;
  provider: string;
  name: string;
  tier: string;
  available: boolean;
  selected: boolean;
};

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "text-amber-400",
  openai: "text-orange-500",
  google: "text-emerald-400",
  deepseek: "text-yellow-400",
  meta: "text-pink-300",
};

const PROVIDER_BORDER_COLORS: Record<string, string> = {
  anthropic: "border-amber-400",
  openai: "border-orange-500",
  google: "border-emerald-400",
  deepseek: "border-yellow-400",
  meta: "border-pink-300",
};

const PROVIDER_RING_COLORS: Record<string, string> = {
  anthropic: "ring-amber-400/30",
  openai: "ring-orange-500/30",
  google: "ring-emerald-400/30",
  deepseek: "ring-yellow-400/30",
  meta: "ring-pink-300/30",
};

const PROVIDER_BADGE_COLORS: Record<string, string> = {
  anthropic: "bg-amber-400/10 text-amber-400 border-amber-400/30",
  openai: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  google: "bg-emerald-400/10 text-emerald-400 border-emerald-400/30",
  deepseek: "bg-yellow-400/10 text-yellow-400 border-yellow-400/30",
  meta: "bg-pink-300/10 text-pink-300 border-pink-300/30",
};

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

export default function ModelPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [currentModel, setCurrentModel] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  async function loadModels() {
    try {
      const data = await api<{ models: Model[]; currentModel: string }>("/api/config/models");
      setModels(data.models);
      setCurrentModel(data.currentModel);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load models");
    }
  }

  async function selectModel(modelId: string) {
    setSaving(modelId);
    setError("");
    setSuccess("");
    try {
      await api("/api/config/models", {
        method: "POST",
        body: { modelId },
      });
      setCurrentModel(modelId);
      setModels((prev) =>
        prev.map((m) => ({ ...m, selected: m.id === modelId })),
      );
      setSuccess(`Model changed to ${models.find((m) => m.id === modelId)?.name}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update model");
    } finally {
      setSaving(null);
    }
  }

  // Group by provider
  const providers = [...new Set(models.map((m) => m.provider))];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Model Selection</h1>
      <p className="text-muted-foreground mb-6">
        Choose the default AI model for your assistant. Model availability depends on your plan.
      </p>

      {/* Instructions */}
      <Card className="mb-6 border-primary/20 bg-muted/50">
        <CardContent className="pt-0 pb-0">
          <div className="flex items-start gap-2 mb-2">
            <Lightbulb className="size-4 mt-0.5 text-yellow-500 shrink-0" />
            <h4 className="text-[0.9375rem] font-semibold text-yellow-500">
              Choosing the right model
            </h4>
          </div>
          <p className="text-sm text-foreground leading-relaxed mb-3">
            Different models offer different trade-offs between speed, quality, and cost. Here is a quick guide:
          </p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
            <li><strong className="text-amber-400">Anthropic (Claude)</strong> -- Excellent reasoning and safety. Claude Sonnet is a great all-rounder; Claude Opus is best for complex tasks; Haiku is fast and cheap for simple queries.</li>
            <li><strong className="text-orange-500">OpenAI (GPT)</strong> -- Strong general-purpose models. GPT-4o is versatile and fast; GPT-4 Turbo is powerful for detailed work; GPT-4o Mini is budget-friendly.</li>
            <li><strong className="text-emerald-400">Google (Gemini)</strong> -- Good for multimodal tasks and long context. Gemini Pro is solid for most tasks; Gemini Flash is optimized for speed.</li>
            <li><strong className="text-yellow-400">DeepSeek</strong> -- Competitive performance at lower cost. Great value for coding and reasoning tasks.</li>
            <li><strong className="text-pink-300">Meta (Llama)</strong> -- Open-source models. Good performance at competitive pricing.</li>
          </ul>
          <div className="rounded-md border border-yellow-500/20 bg-yellow-500/5 px-3 py-2.5 text-xs text-yellow-500 leading-relaxed">
            Tip: Higher-tier plans unlock more powerful models and offer lower token margins. You can change your model at any time -- it takes effect on the next message.
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 border-green-500/30 text-green-500">
          <Check className="size-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription className="text-green-500/90">{success}</AlertDescription>
        </Alert>
      )}

      {providers.map((provider) => (
        <div key={provider} className="mb-8">
          <h3 className={cn(
            "text-sm font-semibold capitalize mb-3 px-1",
            PROVIDER_COLORS[provider] ?? "text-muted-foreground"
          )}>
            {provider}
          </h3>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
            {models
              .filter((m) => m.provider === provider)
              .map((model) => {
                const isSelected = model.id === currentModel;
                const isLoading = saving === model.id;

                return (
                  <Card
                    key={model.id}
                    onClick={() => model.available && !isLoading ? selectModel(model.id) : undefined}
                    className={cn(
                      "py-4 transition-all",
                      model.available ? "cursor-pointer hover:bg-accent/50" : "cursor-not-allowed opacity-50",
                      isSelected
                        ? cn(
                            "ring-2",
                            PROVIDER_BORDER_COLORS[provider] ?? "border-muted-foreground",
                            PROVIDER_RING_COLORS[provider] ?? "ring-muted-foreground/30"
                          )
                        : "border-border"
                    )}
                  >
                    <CardContent className="pt-0 pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-[0.9375rem]">{model.name}</span>
                        {isSelected && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-semibold",
                              PROVIDER_BADGE_COLORS[provider] ?? ""
                            )}
                          >
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-mono">
                          {model.id}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            model.available ? "text-green-500" : "text-muted-foreground"
                          )}
                        >
                          {model.available ? TIER_LABELS[model.tier] ?? model.tier : `Requires ${TIER_LABELS[model.tier] ?? model.tier}`}
                        </Badge>
                      </div>
                      {isLoading && (
                        <div className="flex items-center gap-1.5 mt-2 text-muted-foreground text-xs">
                          <Loader2 className="size-3 animate-spin" />
                          Switching...
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

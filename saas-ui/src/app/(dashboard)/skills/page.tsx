"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { AlertCircle, Info, Lightbulb } from "lucide-react";

type Skill = {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  config: Record<string, unknown>;
};

const CATEGORY_LABELS: Record<string, string> = {
  core: "Core",
  research: "Research",
  creative: "Creative",
  developer: "Developer",
  productivity: "Productivity",
  communication: "Communication",
  integrations: "Integrations",
};

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    loadSkills();
  }, []);

  async function loadSkills() {
    try {
      const data = await api<{ skills: Skill[] }>("/api/config/skills");
      setSkills(data.skills);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load skills");
    }
  }

  async function toggleSkill(skillId: string, currentEnabled: boolean) {
    setToggling(skillId);
    try {
      await api(`/api/config/skills/${skillId}`, {
        method: "POST",
        body: { enabled: !currentEnabled },
      });
      setSkills((prev) =>
        prev.map((s) => (s.id === skillId ? { ...s, enabled: !currentEnabled } : s)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update skill");
    } finally {
      setToggling(null);
    }
  }

  const categories = ["all", ...new Set(skills.map((s) => s.category))];
  const filtered = filter === "all" ? skills : skills.filter((s) => s.category === filter);
  const enabledCount = skills.filter((s) => s.enabled).length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Skills</h1>
      <p className="text-muted-foreground mb-6">
        Enable or disable capabilities for your assistant. {enabledCount} of {skills.length} skills enabled.
      </p>

      {/* Instructions */}
      <Card className="mb-6 border-primary/20 bg-muted/50">
        <CardContent className="pt-0 pb-0">
          <div className="flex items-start gap-2 mb-2">
            <Lightbulb className="size-4 mt-0.5 text-yellow-500 shrink-0" />
            <h4 className="text-[0.9375rem] font-semibold text-yellow-500">
              How skills work
            </h4>
          </div>
          <p className="text-sm text-foreground leading-relaxed mb-2">
            Skills are capabilities your assistant can use when responding to your messages.
            Toggle them on or off depending on what you need.
          </p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li><strong className="text-foreground">Core skills</strong> -- Memory, summarization, and translation are always useful to keep enabled.</li>
            <li><strong className="text-foreground">Research skills</strong> -- Web search and browsing let your assistant find up-to-date information.</li>
            <li><strong className="text-foreground">Integration skills</strong> -- Google Drive, OneDrive, etc. require connecting the service first (see Integrations page).</li>
            <li><strong className="text-foreground">Communication skills</strong> -- Email read/send require either an integration or the Email channel configured.</li>
          </ul>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={filter === cat ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setFilter(cat)}
          >
            {cat === "all" ? "All" : CATEGORY_LABELS[cat] ?? cat}
          </Button>
        ))}
      </div>

      {/* Skills list */}
      <div className="flex flex-col gap-2">
        {filtered.map((skill) => (
          <Card key={skill.id} className="py-4">
            <CardContent className="flex items-center justify-between pt-0 pb-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-[0.9375rem]">{skill.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {CATEGORY_LABELS[skill.category] ?? skill.category}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">{skill.description}</p>
              </div>

              <div className="flex items-center gap-3 ml-4 shrink-0">
                <span className={cn(
                  "text-xs font-medium",
                  skill.enabled ? "text-green-500" : "text-muted-foreground"
                )}>
                  {skill.enabled ? "Enabled" : "Disabled"}
                </span>
                <Switch
                  checked={skill.enabled}
                  onCheckedChange={() => toggleSkill(skill.id, skill.enabled)}
                  disabled={toggling === skill.id}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

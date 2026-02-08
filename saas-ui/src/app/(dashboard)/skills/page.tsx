"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

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

  const cardStyle = {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "0.75rem",
    padding: "1rem 1.25rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Skills</h1>
      <p style={{ color: "#888", marginBottom: "1.5rem" }}>
        Enable or disable capabilities for your assistant. {enabledCount} of {skills.length} skills enabled.
      </p>

      {error && (
        <div style={{ background: "#331111", color: "#ff6b6b", padding: "0.75rem", borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      {/* Category filter */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              padding: "0.375rem 0.75rem",
              borderRadius: "1rem",
              border: "1px solid",
              borderColor: filter === cat ? "#fff" : "#333",
              background: filter === cat ? "#fff" : "transparent",
              color: filter === cat ? "#000" : "#888",
              cursor: "pointer",
              fontSize: "0.8125rem",
              fontWeight: filter === cat ? 600 : 400,
            }}
          >
            {cat === "all" ? "All" : CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* Skills list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {filtered.map((skill) => (
          <div key={skill.id} style={cardStyle}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{skill.name}</span>
                <span
                  style={{
                    fontSize: "0.6875rem",
                    padding: "0.125rem 0.5rem",
                    borderRadius: "1rem",
                    background: "#1a1a1a",
                    color: "#888",
                  }}
                >
                  {CATEGORY_LABELS[skill.category] ?? skill.category}
                </span>
              </div>
              <div style={{ color: "#888", fontSize: "0.8125rem" }}>{skill.description}</div>
            </div>

            <button
              onClick={() => toggleSkill(skill.id, skill.enabled)}
              disabled={toggling === skill.id}
              style={{
                padding: "0.375rem 1rem",
                borderRadius: "0.375rem",
                border: "1px solid",
                borderColor: skill.enabled ? "#4ade80" : "#333",
                background: skill.enabled ? "rgba(74, 222, 128, 0.1)" : "transparent",
                color: skill.enabled ? "#4ade80" : "#888",
                cursor: toggling === skill.id ? "wait" : "pointer",
                fontWeight: 500,
                fontSize: "0.8125rem",
                minWidth: "5rem",
                opacity: toggling === skill.id ? 0.5 : 1,
              }}
            >
              {skill.enabled ? "Enabled" : "Disabled"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

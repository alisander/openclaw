"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Pause,
  Play,
  Loader2,
  Clock,
  Calendar,
  Lightbulb,
  AlertCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";

type ScheduledTask = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  schedule_type: "once" | "interval" | "cron";
  schedule_value: string;
  timezone: string | null;
  message: string;
  model: string | null;
  last_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
  next_run_at: string | null;
  run_count: number;
  created_at: string;
};

type TaskRun = {
  id: string;
  status: string;
  error: string | null;
  duration_ms: number | null;
  started_at: string;
  completed_at: string | null;
};

const SCHEDULE_PRESETS = [
  { label: "Every 30 minutes", type: "interval" as const, value: "1800000" },
  { label: "Every hour", type: "interval" as const, value: "3600000" },
  { label: "Every 6 hours", type: "interval" as const, value: "21600000" },
  { label: "Every day at 9 AM", type: "cron" as const, value: "0 9 * * *" },
  { label: "Every weekday at 9 AM", type: "cron" as const, value: "0 9 * * 1-5" },
  { label: "Every Monday at 9 AM", type: "cron" as const, value: "0 9 * * 1" },
  { label: "First of every month", type: "cron" as const, value: "0 9 1 * *" },
];

const MESSAGE_TEMPLATES = [
  { label: "Summarize my inbox", message: "Check my email inbox, summarize any important or unread messages, and give me a brief overview of what needs my attention." },
  { label: "Daily news briefing", message: "Search the web for today's top news headlines in technology and business. Give me a concise briefing with the most important stories." },
  { label: "Check calendar", message: "Check my calendar for upcoming events today and tomorrow. List any meetings or deadlines I should prepare for." },
  { label: "Weekly report", message: "Generate a summary report of my activities this week based on my recent conversations and any files I've worked on." },
  { label: "Drive file monitor", message: "Check my Google Drive for any files that were modified in the last 24 hours and give me a summary of changes." },
];

export default function ScheduledTasksPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [runs, setRuns] = useState<TaskRun[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formScheduleType, setFormScheduleType] = useState<"once" | "interval" | "cron">("cron");
  const [formScheduleValue, setFormScheduleValue] = useState("0 9 * * *");
  const [formTimezone, setFormTimezone] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      const data = await api<{ tasks: ScheduledTask[] }>("/api/scheduled-tasks");
      setTasks(data.tasks);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load tasks");
    }
  }

  async function loadRuns(taskId: string) {
    try {
      const data = await api<{ runs: TaskRun[] }>(`/api/scheduled-tasks/${taskId}/runs`);
      setRuns(data.runs);
    } catch {
      setRuns([]);
    }
  }

  async function handleCreate() {
    setFormSaving(true);
    try {
      await api("/api/scheduled-tasks", {
        method: "POST",
        body: {
          name: formName,
          description: formDescription || undefined,
          scheduleType: formScheduleType,
          scheduleValue: formScheduleValue,
          timezone: formTimezone || undefined,
          message: formMessage,
        },
      });
      toast.success("Task created successfully");
      setShowCreate(false);
      resetForm();
      await loadTasks();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create task");
    } finally {
      setFormSaving(false);
    }
  }

  async function handleToggle(taskId: string) {
    setToggling(taskId);
    try {
      const data = await api<{ enabled: boolean }>(`/api/scheduled-tasks/${taskId}/toggle`, {
        method: "POST",
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, enabled: data.enabled } : t)),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to toggle task");
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete(taskId: string) {
    if (!confirm("Delete this scheduled task?")) return;
    try {
      await api(`/api/scheduled-tasks/${taskId}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (selectedTask === taskId) setSelectedTask(null);
      toast.success("Task deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete task");
    }
  }

  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormScheduleType("cron");
    setFormScheduleValue("0 9 * * *");
    setFormTimezone("");
    setFormMessage("");
  }

  function formatSchedule(type: string, value: string): string {
    switch (type) {
      case "once":
        return `Once: ${new Date(value).toLocaleString()}`;
      case "interval": {
        const ms = Number(value);
        if (ms < 3600000) return `Every ${Math.round(ms / 60000)} minutes`;
        if (ms < 86400000) return `Every ${Math.round(ms / 3600000)} hours`;
        return `Every ${Math.round(ms / 86400000)} days`;
      }
      case "cron":
        return `Cron: ${value}`;
      default:
        return value;
    }
  }

  function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold">Scheduled Tasks</h1>
        <Button
          onClick={() => {
            if (showCreate) {
              setShowCreate(false);
            } else {
              resetForm();
              setShowCreate(true);
            }
          }}
          variant={showCreate ? "secondary" : "default"}
        >
          {showCreate ? (
            <>
              <X className="size-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="size-4" />
              New Task
            </>
          )}
        </Button>
      </div>
      <p className="text-muted-foreground mb-6">
        Schedule your assistant to perform tasks automatically. {tasks.filter((t) => t.enabled).length} of {tasks.length} tasks active.
      </p>

      {/* Instructions */}
      <Card className="mb-6 border-primary/20 bg-muted/50">
        <CardContent className="pt-0 pb-0">
          <div className="flex items-start gap-2 mb-2">
            <Lightbulb className="size-4 mt-0.5 text-yellow-500 shrink-0" />
            <h4 className="text-[0.9375rem] font-semibold text-yellow-500">
              How scheduled tasks work
            </h4>
          </div>
          <p className="text-sm text-foreground leading-relaxed mb-2">
            Scheduled tasks let your assistant run actions automatically on a schedule -- like checking your email every morning or generating weekly reports.
          </p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li><strong className="text-foreground">One-time</strong> -- Runs once at a specific date and time. Great for reminders and one-off tasks.</li>
            <li><strong className="text-foreground">Interval</strong> -- Runs repeatedly at a fixed interval (e.g. every 30 minutes, every 6 hours).</li>
            <li><strong className="text-foreground">Cron</strong> -- Uses cron expressions for precise scheduling (e.g. &quot;Every weekday at 9 AM&quot;). Most flexible option.</li>
          </ul>
          <div className="mt-3 px-3 py-2.5 bg-muted border border-yellow-500/20 rounded-md text-yellow-500 text-xs leading-relaxed">
            Tip: Each task run uses your credit balance (same as a chat message). Make sure you have enough credits for recurring tasks.
          </div>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => {
        setShowCreate(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Scheduled Task</DialogTitle>
            <DialogDescription>
              Set up an automated task for your assistant to run on a schedule.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Task Name */}
            <div className="space-y-2">
              <Label htmlFor="task-name">Task Name</Label>
              <Input
                id="task-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Morning inbox summary"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="task-desc">Description (optional)</Label>
              <Input
                id="task-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description of what this task does"
              />
            </div>

            <Separator />

            {/* Schedule type */}
            <div className="space-y-2">
              <Label>Schedule</Label>
              <div className="flex gap-2">
                {(["cron", "interval", "once"] as const).map((t) => (
                  <Button
                    key={t}
                    variant={formScheduleType === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setFormScheduleType(t);
                      if (t === "cron") setFormScheduleValue("0 9 * * *");
                      else if (t === "interval") setFormScheduleValue("3600000");
                      else setFormScheduleValue(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
                    }}
                  >
                    {t === "cron" && <Clock className="size-3.5" />}
                    {t === "interval" && <Clock className="size-3.5" />}
                    {t === "once" && <Calendar className="size-3.5" />}
                    {t === "cron" ? "Cron" : t === "interval" ? "Interval" : "One-time"}
                  </Button>
                ))}
              </div>

              {formScheduleType === "cron" && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {SCHEDULE_PRESETS.filter((p) => p.type === "cron").map((preset) => (
                      <Button
                        key={preset.value}
                        variant="outline"
                        size="sm"
                        className={cn(
                          "rounded-full text-xs h-7",
                          formScheduleValue === preset.value && "border-primary bg-primary/10 text-primary"
                        )}
                        onClick={() => setFormScheduleValue(preset.value)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  <Input
                    value={formScheduleValue}
                    onChange={(e) => setFormScheduleValue(e.target.value)}
                    placeholder="Cron expression (e.g. 0 9 * * 1-5)"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: minute hour day-of-month month day-of-week
                  </p>
                </div>
              )}

              {formScheduleType === "interval" && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {SCHEDULE_PRESETS.filter((p) => p.type === "interval").map((preset) => (
                      <Button
                        key={preset.value}
                        variant="outline"
                        size="sm"
                        className={cn(
                          "rounded-full text-xs h-7",
                          formScheduleValue === preset.value && "border-primary bg-primary/10 text-primary"
                        )}
                        onClick={() => setFormScheduleValue(preset.value)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  <Input
                    value={formScheduleValue}
                    onChange={(e) => setFormScheduleValue(e.target.value)}
                    placeholder="Interval in milliseconds (e.g. 3600000 = 1 hour)"
                    className="font-mono"
                  />
                </div>
              )}

              {formScheduleType === "once" && (
                <Input
                  type="datetime-local"
                  value={formScheduleValue}
                  onChange={(e) => setFormScheduleValue(e.target.value)}
                />
              )}
            </div>

            {/* Timezone */}
            {formScheduleType !== "once" && (
              <div className="space-y-2">
                <Label htmlFor="task-tz">Timezone (optional)</Label>
                <Input
                  id="task-tz"
                  value={formTimezone}
                  onChange={(e) => setFormTimezone(e.target.value)}
                  placeholder="e.g., America/New_York (default: server timezone)"
                />
              </div>
            )}

            <Separator />

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="task-message">Task Message (what should your assistant do?)</Label>
              <div className="flex flex-wrap gap-1.5">
                {MESSAGE_TEMPLATES.map((tmpl) => (
                  <Button
                    key={tmpl.label}
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs h-7"
                    onClick={() => {
                      setFormMessage(tmpl.message);
                      if (!formName) setFormName(tmpl.label);
                    }}
                  >
                    {tmpl.label}
                  </Button>
                ))}
              </div>
              <Textarea
                id="task-message"
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                placeholder="Describe what your assistant should do when this task runs..."
                rows={4}
                className="resize-y"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreate(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={formSaving || !formName || !formMessage}
            >
              {formSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Task"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task list */}
      {tasks.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center text-muted-foreground pt-0 pb-0">
            No scheduled tasks yet. Click &quot;New Task&quot; to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <div key={task.id}>
              <Card
                className={cn(
                  "cursor-pointer transition-colors py-4",
                  selectedTask === task.id && "border-muted-foreground"
                )}
                onClick={() => {
                  if (selectedTask === task.id) {
                    setSelectedTask(null);
                  } else {
                    setSelectedTask(task.id);
                    loadRuns(task.id);
                  }
                }}
              >
                <CardContent className="pt-0 pb-0">
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-[0.9375rem]">{task.name}</span>
                        <Badge
                          variant={task.enabled ? "default" : "secondary"}
                          className={cn(
                            "text-[0.6875rem]",
                            task.enabled
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : ""
                          )}
                        >
                          {task.enabled ? "Active" : "Paused"}
                        </Badge>
                        {task.last_status && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[0.6875rem]",
                              task.last_status === "ok" && "text-green-500",
                              task.last_status === "error" && "text-destructive",
                              task.last_status === "running" && "text-yellow-500"
                            )}
                          >
                            Last: {task.last_status}
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {formatSchedule(task.schedule_type, task.schedule_value)}
                        {task.run_count > 0 && <span> &middot; {task.run_count} runs</span>}
                        {task.last_run_at && <span> &middot; Last ran {formatTimeAgo(task.last_run_at)}</span>}
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 items-center ml-4 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleToggle(task.id); }}
                        disabled={toggling === task.id}
                        className={cn(
                          "text-xs",
                          toggling === task.id && "opacity-50"
                        )}
                      >
                        {toggling === task.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : task.enabled ? (
                          <Pause className="size-3.5" />
                        ) : (
                          <Play className="size-3.5" />
                        )}
                        {task.enabled ? "Pause" : "Resume"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                        className="text-xs text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Expanded detail */}
              {selectedTask === task.id && (
                <Card className="mt-1">
                  <CardContent className="pt-0 pb-0 space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Task message:</p>
                      <div className="text-sm text-foreground p-3 bg-muted rounded-md whitespace-pre-wrap">
                        {task.message}
                      </div>
                    </div>

                    {task.last_error && (
                      <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-xs">
                        <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                        <span>Last error: {task.last_error}</span>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Recent runs:
                      </p>
                      {runs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No runs yet</p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {runs.slice(0, 10).map((run) => (
                            <div
                              key={run.id}
                              className="flex justify-between items-center px-3 py-2 bg-muted rounded-md text-xs"
                            >
                              <div className="flex gap-2 items-center">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[0.6875rem] px-1.5 py-0",
                                    run.status === "ok" && "text-green-500",
                                    run.status === "error" && "text-destructive",
                                    run.status === "running" && "text-yellow-500"
                                  )}
                                >
                                  {run.status}
                                </Badge>
                                <span className="text-muted-foreground">
                                  {new Date(run.started_at).toLocaleString()}
                                </span>
                              </div>
                              <span className="text-muted-foreground">
                                {run.duration_ms != null && `${(run.duration_ms / 1000).toFixed(1)}s`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

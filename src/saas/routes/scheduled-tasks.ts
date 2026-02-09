import { Hono } from "hono";
import { authMiddleware, type JwtPayload } from "../middleware/auth.js";
import { query, queryOne, queryRows } from "../db/connection.js";
import crypto from "node:crypto";

/**
 * Scheduled tasks API for SaaS users.
 *
 * This provides a simplified cron interface for users who want their assistant
 * to perform actions on a schedule (e.g. "summarize my inbox every morning").
 *
 * Under the hood, tasks are stored in a tenant-scoped DB table and dispatched
 * to the OpenClaw CronService when the gateway is running.
 */

const scheduledTasks = new Hono();

scheduledTasks.use("/*", authMiddleware());

type ScheduleType = "once" | "interval" | "cron";

type ScheduledTask = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  schedule_type: ScheduleType;
  schedule_value: string; // ISO date for "once", ms for "interval", cron expression for "cron"
  timezone: string | null;
  message: string; // What the assistant should do
  model: string | null;
  last_run_at: Date | null;
  last_status: string | null;
  last_error: string | null;
  next_run_at: Date | null;
  run_count: number;
  created_at: Date;
  updated_at: Date;
};

// List all scheduled tasks for this tenant
scheduledTasks.get("/", async (c) => {
  const user = c.get("user") as JwtPayload;
  const tasks = await queryRows<ScheduledTask>(
    `SELECT * FROM tenant_scheduled_tasks WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [user.tenantId],
  );
  return c.json({ tasks });
});

// Get a single task
scheduledTasks.get("/:taskId", async (c) => {
  const user = c.get("user") as JwtPayload;
  const taskId = c.req.param("taskId");
  const task = await queryOne<ScheduledTask>(
    "SELECT * FROM tenant_scheduled_tasks WHERE id = $1 AND tenant_id = $2",
    [taskId, user.tenantId],
  );
  if (!task) return c.json({ error: "Task not found" }, 404);
  return c.json({ task });
});

// Create a new scheduled task
scheduledTasks.post("/", async (c) => {
  const user = c.get("user") as JwtPayload;
  const body = await c.req.json<{
    name: string;
    description?: string;
    scheduleType: ScheduleType;
    scheduleValue: string;
    timezone?: string;
    message: string;
    model?: string;
    enabled?: boolean;
  }>();

  if (!body.name?.trim()) return c.json({ error: "Name is required" }, 400);
  if (!body.message?.trim()) return c.json({ error: "Message is required" }, 400);
  if (!["once", "interval", "cron"].includes(body.scheduleType)) {
    return c.json({ error: "Invalid schedule type" }, 400);
  }
  if (!body.scheduleValue?.trim()) return c.json({ error: "Schedule value is required" }, 400);

  // Validate schedule value
  if (body.scheduleType === "once") {
    const date = new Date(body.scheduleValue);
    if (isNaN(date.getTime())) return c.json({ error: "Invalid date for one-time schedule" }, 400);
    if (date.getTime() < Date.now()) return c.json({ error: "Scheduled time must be in the future" }, 400);
  } else if (body.scheduleType === "interval") {
    const ms = Number(body.scheduleValue);
    if (isNaN(ms) || ms < 60000) return c.json({ error: "Interval must be at least 60 seconds (60000 ms)" }, 400);
  }

  // Plan-based task limits
  const planLimits: Record<string, number> = { free: 2, starter: 10, pro: 50, enterprise: 200 };
  const limit = planLimits[user.plan] ?? 2;
  const countResult = await queryOne<{ count: string }>(
    "SELECT COUNT(*)::text as count FROM tenant_scheduled_tasks WHERE tenant_id = $1",
    [user.tenantId],
  );
  if (Number(countResult?.count ?? 0) >= limit) {
    return c.json({ error: `Task limit reached for your plan (${limit} tasks). Upgrade to create more.` }, 403);
  }

  const id = crypto.randomUUID();
  const nextRunAt = computeNextRun(body.scheduleType, body.scheduleValue, body.timezone);

  await query(
    `INSERT INTO tenant_scheduled_tasks
       (id, tenant_id, name, description, enabled, schedule_type, schedule_value, timezone, message, model, next_run_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      user.tenantId,
      body.name.trim(),
      body.description?.trim() ?? null,
      body.enabled !== false,
      body.scheduleType,
      body.scheduleValue,
      body.timezone ?? null,
      body.message.trim(),
      body.model ?? null,
      nextRunAt,
    ],
  );

  return c.json({ success: true, taskId: id }, 201);
});

// Update an existing task
scheduledTasks.put("/:taskId", async (c) => {
  const user = c.get("user") as JwtPayload;
  const taskId = c.req.param("taskId");
  const body = await c.req.json<{
    name?: string;
    description?: string;
    scheduleType?: ScheduleType;
    scheduleValue?: string;
    timezone?: string;
    message?: string;
    model?: string;
    enabled?: boolean;
  }>();

  const existing = await queryOne<ScheduledTask>(
    "SELECT * FROM tenant_scheduled_tasks WHERE id = $1 AND tenant_id = $2",
    [taskId, user.tenantId],
  );
  if (!existing) return c.json({ error: "Task not found" }, 404);

  const scheduleType = body.scheduleType ?? existing.schedule_type;
  const scheduleValue = body.scheduleValue ?? existing.schedule_value;
  const timezone = body.timezone ?? existing.timezone;
  const nextRunAt = computeNextRun(scheduleType, scheduleValue, timezone);

  await query(
    `UPDATE tenant_scheduled_tasks SET
       name = COALESCE($3, name),
       description = COALESCE($4, description),
       enabled = COALESCE($5, enabled),
       schedule_type = $6,
       schedule_value = $7,
       timezone = $8,
       message = COALESCE($9, message),
       model = $10,
       next_run_at = $11,
       updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2`,
    [
      taskId,
      user.tenantId,
      body.name?.trim() ?? null,
      body.description?.trim() ?? null,
      body.enabled ?? null,
      scheduleType,
      scheduleValue,
      timezone,
      body.message?.trim() ?? null,
      body.model ?? existing.model,
      nextRunAt,
    ],
  );

  return c.json({ success: true });
});

// Toggle enable/disable
scheduledTasks.post("/:taskId/toggle", async (c) => {
  const user = c.get("user") as JwtPayload;
  const taskId = c.req.param("taskId");

  const existing = await queryOne<ScheduledTask>(
    "SELECT enabled FROM tenant_scheduled_tasks WHERE id = $1 AND tenant_id = $2",
    [taskId, user.tenantId],
  );
  if (!existing) return c.json({ error: "Task not found" }, 404);

  await query(
    "UPDATE tenant_scheduled_tasks SET enabled = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2",
    [taskId, user.tenantId, !existing.enabled],
  );

  return c.json({ success: true, enabled: !existing.enabled });
});

// Delete a task
scheduledTasks.delete("/:taskId", async (c) => {
  const user = c.get("user") as JwtPayload;
  const taskId = c.req.param("taskId");

  const result = await query(
    "DELETE FROM tenant_scheduled_tasks WHERE id = $1 AND tenant_id = $2",
    [taskId, user.tenantId],
  );

  if (result.rowCount === 0) return c.json({ error: "Task not found" }, 404);
  return c.json({ success: true });
});

// Get run history for a task
scheduledTasks.get("/:taskId/runs", async (c) => {
  const user = c.get("user") as JwtPayload;
  const taskId = c.req.param("taskId");
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);

  // Verify task belongs to tenant
  const task = await queryOne<{ id: string }>(
    "SELECT id FROM tenant_scheduled_tasks WHERE id = $1 AND tenant_id = $2",
    [taskId, user.tenantId],
  );
  if (!task) return c.json({ error: "Task not found" }, 404);

  const runs = await queryRows<{
    id: string;
    status: string;
    error: string | null;
    duration_ms: number | null;
    started_at: Date;
    completed_at: Date | null;
  }>(
    `SELECT id, status, error, duration_ms, started_at, completed_at
     FROM tenant_task_runs WHERE task_id = $1 ORDER BY started_at DESC LIMIT $2`,
    [taskId, limit],
  );

  return c.json({ runs });
});

function computeNextRun(
  scheduleType: string,
  scheduleValue: string,
  timezone: string | null,
): Date | null {
  const now = Date.now();
  switch (scheduleType) {
    case "once": {
      const date = new Date(scheduleValue);
      return date.getTime() > now ? date : null;
    }
    case "interval": {
      const ms = Number(scheduleValue);
      return new Date(now + ms);
    }
    case "cron": {
      // For cron expressions, we compute the next run at dispatch time.
      // Here we set a placeholder of 1 minute from now for the scheduler to pick up.
      return new Date(now + 60_000);
    }
    default:
      return null;
  }
}

export { scheduledTasks };

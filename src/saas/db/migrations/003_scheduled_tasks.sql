-- Scheduled tasks per tenant
CREATE TABLE IF NOT EXISTS tenant_scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  schedule_type VARCHAR(20) NOT NULL, -- 'once', 'interval', 'cron'
  schedule_value VARCHAR(255) NOT NULL, -- ISO date, ms interval, or cron expression
  timezone VARCHAR(100),
  message TEXT NOT NULL, -- What the assistant should do
  model VARCHAR(200),
  last_run_at TIMESTAMPTZ,
  last_status VARCHAR(20), -- 'ok', 'error', 'running'
  last_error TEXT,
  next_run_at TIMESTAMPTZ,
  run_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_tenant ON tenant_scheduled_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON tenant_scheduled_tasks(next_run_at) WHERE enabled = TRUE;

-- Run history for scheduled tasks
CREATE TABLE IF NOT EXISTS tenant_task_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tenant_scheduled_tasks(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'ok', 'error', 'running'
  error TEXT,
  duration_ms INT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_task_runs_task ON tenant_task_runs(task_id, started_at DESC);

INSERT INTO schema_migrations (version) VALUES (3) ON CONFLICT DO NOTHING;

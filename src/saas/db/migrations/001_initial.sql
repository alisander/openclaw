-- OpenClaw SaaS Platform - Initial Schema
-- Migration: 001_initial

-- Users & Auth
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  email_verified BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenants (1:1 with users, maps to OpenClaw agents)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  agent_id VARCHAR(64) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'free',
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit system (micro-dollars: $1 = 1,000,000 units)
CREATE TABLE IF NOT EXISTS credit_balances (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  balance BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  description VARCHAR(255),
  reference_type VARCHAR(50),
  reference_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe billing
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  stripe_subscription_id VARCHAR(255),
  plan VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE IF NOT EXISTS usage_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  session_key VARCHAR(255),
  provider VARCHAR(100),
  model VARCHAR(200),
  input_tokens INT,
  output_tokens INT,
  cache_read_tokens INT DEFAULT 0,
  cache_write_tokens INT DEFAULT 0,
  base_cost_usd NUMERIC(12,8),
  margin_cost_usd NUMERIC(12,8),
  total_cost_usd NUMERIC(12,8),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_usage_tenant_date ON usage_events(tenant_id, created_at);

-- OAuth integrations per user
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scopes TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, provider)
);

-- Admin: model pricing
CREATE TABLE IF NOT EXISTS model_pricing (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(100) NOT NULL,
  model VARCHAR(200) NOT NULL,
  input_cost_per_mtok NUMERIC(10,4) NOT NULL,
  output_cost_per_mtok NUMERIC(10,4) NOT NULL,
  margin_percent NUMERIC(5,2) DEFAULT 75.00,
  plan_overrides JSONB DEFAULT '{}',
  UNIQUE(provider, model)
);

-- Schema migrations tracker
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES (1) ON CONFLICT DO NOTHING;

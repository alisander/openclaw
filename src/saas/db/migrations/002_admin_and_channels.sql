-- Add admin role to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Channel configurations per tenant
CREATE TABLE IF NOT EXISTS tenant_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  channel VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  config JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, channel)
);

-- Skills configuration per tenant
CREATE TABLE IF NOT EXISTS tenant_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  skill_id VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, skill_id)
);

-- Agent identity/persona per tenant
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS identity JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_model VARCHAR(200);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS system_prompt TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

INSERT INTO schema_migrations (version) VALUES (2) ON CONFLICT DO NOTHING;

-- ============================================================
-- RASMALAK CRM V2 — AUTOMATION
-- Migration 017: Workflows, workflow logs, workflow templates
-- ============================================================

CREATE TABLE crm_workflows (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  name_ar               TEXT,
  description           TEXT,
  description_ar        TEXT,
  trigger_type          TEXT NOT NULL,
  trigger_config        JSONB NOT NULL DEFAULT '{}',
  conditions            JSONB DEFAULT '[]',
  actions               JSONB NOT NULL DEFAULT '[]',
  is_active             BOOLEAN DEFAULT TRUE,
  run_count             INTEGER DEFAULT 0,
  last_run_at           TIMESTAMPTZ,
  installed_from        TEXT,
  created_by            UUID REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE crm_workflow_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id           UUID NOT NULL REFERENCES crm_workflows(id) ON DELETE CASCADE,
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trigger_event         JSONB,
  conditions_met        BOOLEAN,
  actions_executed      JSONB,
  error                 TEXT,
  execution_ms          INTEGER,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE crm_workflow_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT UNIQUE NOT NULL,
  name                  TEXT NOT NULL,
  name_ar               TEXT NOT NULL,
  description           TEXT,
  description_ar        TEXT,
  category              TEXT NOT NULL,
  region                TEXT,
  trigger_type          TEXT NOT NULL,
  trigger_config        JSONB NOT NULL DEFAULT '{}',
  conditions            JSONB DEFAULT '[]',
  actions               JSONB NOT NULL DEFAULT '[]',
  is_featured           BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_workflows_org ON crm_workflows(org_id);
CREATE INDEX idx_workflows_active ON crm_workflows(org_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_workflow_log_org ON crm_workflow_log(org_id, created_at DESC);
CREATE INDEX idx_workflow_log_workflow ON crm_workflow_log(workflow_id);

ALTER TABLE crm_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_workflow_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage workflows"
  ON crm_workflows FOR ALL USING (is_org_member(org_id));
CREATE POLICY "Org members view workflow logs"
  ON crm_workflow_log FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "System inserts workflow logs"
  ON crm_workflow_log FOR INSERT WITH CHECK (is_org_member(org_id));

-- Templates are public read
ALTER TABLE crm_workflow_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read templates"
  ON crm_workflow_templates FOR SELECT USING (true);

-- ============================================================
-- RASMALAK CRM V2 — VERTICALS
-- Migration 023: Vertical industry templates
-- ============================================================

CREATE TABLE crm_vertical_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT UNIQUE NOT NULL,
  name                  TEXT NOT NULL,
  name_ar               TEXT NOT NULL,
  description           TEXT,
  description_ar        TEXT,
  industry              TEXT NOT NULL,
  region                TEXT,
  pipeline_config       JSONB NOT NULL,
  custom_fields         JSONB NOT NULL DEFAULT '{}',
  workflow_templates    JSONB DEFAULT '[]',
  ai_prompts            JSONB DEFAULT '{}',
  icon                  TEXT,
  is_published          BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE crm_vertical_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read vertical templates"
  ON crm_vertical_templates FOR SELECT USING (true);

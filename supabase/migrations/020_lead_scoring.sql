-- ============================================================
-- RASMALAK CRM V2 — LEAD SCORING
-- Migration 020: Scoring rules, routing rules, contact score columns
-- ============================================================

CREATE TABLE crm_lead_scoring_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                  TEXT,
  name_ar               TEXT,
  field                 TEXT NOT NULL,
  operator              TEXT NOT NULL,
  value                 TEXT NOT NULL,
  points                INTEGER NOT NULL,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE crm_routing_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  name_ar               TEXT,
  type                  TEXT NOT NULL CHECK (type IN ('round_robin','territory','skill','manual')),
  conditions            JSONB DEFAULT '[]',
  config                JSONB NOT NULL DEFAULT '{}',
  priority              INTEGER DEFAULT 0,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS lead_score_breakdown JSONB;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS routed_at TIMESTAMPTZ;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS routed_by_rule UUID;

CREATE INDEX idx_scoring_rules_org ON crm_lead_scoring_rules(org_id);
CREATE INDEX idx_routing_rules_org ON crm_routing_rules(org_id);

ALTER TABLE crm_lead_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage scoring rules"
  ON crm_lead_scoring_rules FOR ALL USING (is_org_member(org_id));
CREATE POLICY "Org members manage routing rules"
  ON crm_routing_rules FOR ALL USING (is_org_member(org_id));

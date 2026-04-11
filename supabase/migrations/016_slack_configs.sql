-- ============================================================
-- RASMALAK CRM V2 — SLACK CONFIGS
-- Migration 016: Slack channel notification configuration
-- ============================================================

CREATE TABLE slack_channel_configs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  connection_id         UUID NOT NULL REFERENCES service_connections(id) ON DELETE CASCADE,
  channel_id            TEXT NOT NULL,
  channel_name          TEXT,
  event_types           TEXT[] DEFAULT '{}',
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_slack_configs_org ON slack_channel_configs(org_id);

ALTER TABLE slack_channel_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage slack configs"
  ON slack_channel_configs FOR ALL USING (is_org_member(org_id));

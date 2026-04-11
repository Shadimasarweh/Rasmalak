-- ============================================================
-- RASMALAK CRM V2 — PUBLIC API
-- Migration 021: API keys, webhook subscriptions, request log
-- ============================================================

CREATE TABLE api_keys (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  key_hash              TEXT NOT NULL,
  key_prefix            TEXT NOT NULL,
  permissions           JSONB NOT NULL DEFAULT '{}',
  rate_limit            INTEGER DEFAULT 100,
  last_used_at          TIMESTAMPTZ,
  expires_at            TIMESTAMPTZ,
  is_active             BOOLEAN DEFAULT TRUE,
  created_by            UUID REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE api_webhook_subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  api_key_id            UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  url                   TEXT NOT NULL,
  event_types           TEXT[] NOT NULL,
  secret                TEXT NOT NULL,
  status                TEXT DEFAULT 'active' CHECK (status IN ('active','paused','failed')),
  failure_count         INTEGER DEFAULT 0,
  last_success          TIMESTAMPTZ,
  last_failure          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE api_request_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID,
  api_key_id            UUID,
  method                TEXT,
  path                  TEXT,
  status_code           INTEGER,
  response_ms           INTEGER,
  ip_address            TEXT,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_api_keys_org ON api_keys(org_id);
CREATE INDEX idx_api_webhooks_org ON api_webhook_subscriptions(org_id);
CREATE INDEX idx_api_log_key ON api_request_log(api_key_id, created_at DESC);
CREATE INDEX idx_api_log_time ON api_request_log(created_at DESC);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owner/admin manage API keys"
  ON api_keys FOR ALL USING (get_org_role(org_id) IN ('owner','admin'));
CREATE POLICY "Org owner/admin manage webhooks"
  ON api_webhook_subscriptions FOR ALL USING (get_org_role(org_id) IN ('owner','admin'));
CREATE POLICY "Org members view API logs"
  ON api_request_log FOR SELECT USING (is_org_member(org_id));

-- ============================================================
-- RASMALAK CRM V2 — INTEGRATIONS
-- Migration 015: Service connections, sync map, health events
-- ============================================================

CREATE TABLE service_connections (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider              TEXT NOT NULL,
  service_type          TEXT NOT NULL,
  access_token          TEXT NOT NULL,
  refresh_token         TEXT,
  token_expires_at      TIMESTAMPTZ,
  connected_email       TEXT,
  external_account_id   TEXT,
  webhook_id            TEXT,
  webhook_expires       TIMESTAMPTZ,
  scopes                TEXT[],
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disconnected','error','token_expired')),
  error_message         TEXT,
  last_sync_at          TIMESTAMPTZ,
  sync_stats            JSONB DEFAULT '{}',
  privacy_confirmed     BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider, service_type)
);

CREATE TABLE event_sync_map (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id         UUID NOT NULL REFERENCES service_connections(id) ON DELETE CASCADE,
  external_event_id     TEXT NOT NULL,
  entity_type           TEXT NOT NULL,
  entity_id             UUID NOT NULL,
  sync_direction        TEXT DEFAULT 'bidirectional',
  last_synced_at        TIMESTAMPTZ DEFAULT now(),
  sync_hash             TEXT,
  UNIQUE(connection_id, external_event_id)
);

CREATE TABLE health_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  connection_id         UUID REFERENCES service_connections(id) ON DELETE SET NULL,
  event_type            TEXT NOT NULL,
  severity              TEXT NOT NULL CHECK (severity IN ('info','warning','error','critical')),
  message               TEXT NOT NULL,
  details               JSONB,
  resolved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_connections_user ON service_connections(user_id);
CREATE INDEX idx_connections_org ON service_connections(org_id);
CREATE INDEX idx_sync_map_connection ON event_sync_map(connection_id);
CREATE INDEX idx_health_org ON health_events(org_id, created_at DESC);

ALTER TABLE service_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_sync_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_events ENABLE ROW LEVEL SECURITY;

-- User-level: each person manages their own connections
CREATE POLICY "Users manage own connections"
  ON service_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own sync maps"
  ON event_sync_map FOR ALL
  USING (connection_id IN (SELECT id FROM service_connections WHERE user_id = auth.uid()));

CREATE POLICY "Org members view health events"
  ON health_events FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "System can insert health events"
  ON health_events FOR INSERT WITH CHECK (is_org_member(org_id));

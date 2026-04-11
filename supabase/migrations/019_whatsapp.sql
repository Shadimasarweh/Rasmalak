-- ============================================================
-- RASMALAK CRM V2 — WHATSAPP BUSINESS
-- Migration 019: WhatsApp accounts, templates, conversations
-- ============================================================

CREATE TABLE whatsapp_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number          TEXT NOT NULL,
  waba_id               TEXT NOT NULL,
  access_token          TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','active','suspended')),
  number_model          TEXT DEFAULT 'shared' CHECK (number_model IN ('shared','individual')),
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE whatsapp_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_id            UUID NOT NULL REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  language              TEXT NOT NULL,
  category              TEXT NOT NULL CHECK (category IN ('marketing','utility','authentication')),
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  header                JSONB,
  body                  TEXT NOT NULL,
  footer                TEXT,
  buttons               JSONB,
  meta_template_id      TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE whatsapp_conversations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_id            UUID REFERENCES whatsapp_accounts(id),
  contact_id            UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  contact_phone         TEXT NOT NULL,
  assigned_to           UUID REFERENCES auth.users(id),
  status                TEXT DEFAULT 'active' CHECK (status IN ('active','expired')),
  window_expires        TIMESTAMPTZ,
  last_message_at       TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wa_accounts_org ON whatsapp_accounts(org_id);
CREATE INDEX idx_wa_templates_org ON whatsapp_templates(org_id);
CREATE INDEX idx_wa_convos_org ON whatsapp_conversations(org_id);
CREATE INDEX idx_wa_convos_contact ON whatsapp_conversations(contact_id);
CREATE INDEX idx_wa_convos_phone ON whatsapp_conversations(contact_phone);

ALTER TABLE whatsapp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage WA accounts"
  ON whatsapp_accounts FOR ALL USING (is_org_member(org_id));
CREATE POLICY "Org members manage WA templates"
  ON whatsapp_templates FOR ALL USING (is_org_member(org_id));
CREATE POLICY "Org members manage WA conversations"
  ON whatsapp_conversations FOR ALL USING (is_org_member(org_id));

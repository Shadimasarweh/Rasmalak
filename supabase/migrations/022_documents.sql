-- ============================================================
-- RASMALAK CRM V2 — DOCUMENTS
-- Migration 022: Document templates, documents, versions
-- ============================================================

CREATE TABLE crm_document_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  name_ar               TEXT,
  content               TEXT NOT NULL,
  content_ar            TEXT,
  merge_fields          JSONB DEFAULT '[]',
  category              TEXT DEFAULT 'proposal',
  language              TEXT DEFAULT 'ar',
  is_active             BOOLEAN DEFAULT TRUE,
  created_by            UUID REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE crm_documents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id           UUID REFERENCES crm_document_templates(id) ON DELETE SET NULL,
  deal_id               UUID REFERENCES crm_deals(id) ON DELETE SET NULL,
  contact_id            UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  name                  TEXT NOT NULL,
  name_ar               TEXT,
  file_url              TEXT NOT NULL,
  file_size             INTEGER,
  language              TEXT DEFAULT 'ar',
  version               INTEGER DEFAULT 1,
  status                TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','signed','expired')),
  signed_at             TIMESTAMPTZ,
  generated_by          UUID REFERENCES auth.users(id),
  generated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE crm_document_versions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id           UUID NOT NULL REFERENCES crm_documents(id) ON DELETE CASCADE,
  version               INTEGER NOT NULL,
  file_url              TEXT NOT NULL,
  changes_summary       TEXT,
  created_by            UUID REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_doc_templates_org ON crm_document_templates(org_id);
CREATE INDEX idx_documents_org ON crm_documents(org_id);
CREATE INDEX idx_documents_deal ON crm_documents(deal_id);
CREATE INDEX idx_doc_versions_doc ON crm_document_versions(document_id);

ALTER TABLE crm_document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage doc templates"
  ON crm_document_templates FOR ALL USING (is_org_member(org_id));
CREATE POLICY "Org members manage documents"
  ON crm_documents FOR ALL USING (is_org_member(org_id));
CREATE POLICY "Org members view doc versions"
  ON crm_document_versions FOR SELECT
  USING (document_id IN (SELECT id FROM crm_documents WHERE is_org_member(org_id)));
CREATE POLICY "Org members create doc versions"
  ON crm_document_versions FOR INSERT
  WITH CHECK (document_id IN (SELECT id FROM crm_documents WHERE is_org_member(org_id)));

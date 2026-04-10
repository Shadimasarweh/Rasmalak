-- ============================================================
-- RASMALAK CRM FOUNDATION
-- Migration 012: Organizations, CRM entities, RLS, triggers
-- ============================================================

-- ============================================================
-- ENABLE pg_trgm EXTENSION (required for trigram search indexes)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

CREATE TABLE organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  name_ar         TEXT,
  industry        TEXT,
  industry_ar     TEXT,
  country         TEXT,
  currency        TEXT DEFAULT 'SAR',
  logo_url        TEXT,
  settings        JSONB DEFAULT '{}',
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE org_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'viewer',
  permissions     JSONB DEFAULT '{}',
  display_name    TEXT,
  display_name_ar TEXT,
  invited_by      UUID REFERENCES auth.users(id),
  invited_at      TIMESTAMPTZ,
  joined_at       TIMESTAMPTZ DEFAULT now(),
  is_active       BOOLEAN DEFAULT TRUE,
  UNIQUE(org_id, user_id)
);

CREATE TABLE org_roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  permissions     JSONB NOT NULL,
  is_system       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, name)
);

-- ============================================================
-- CRM CONTACTS & COMPANIES
-- ============================================================

CREATE TABLE crm_companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  industry        TEXT,
  industry_ar     TEXT,
  website         TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  address_ar      TEXT,
  city            TEXT,
  city_ar         TEXT,
  country         TEXT,
  parent_id       UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  tags            TEXT[] DEFAULT '{}',
  custom_fields   JSONB DEFAULT '{}',
  notes           TEXT,
  search_name_normalized    TEXT,
  search_name_root          TEXT,
  search_name_translit      TEXT,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE crm_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_id      UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  first_name      TEXT NOT NULL,
  last_name       TEXT,
  first_name_ar   TEXT,
  last_name_ar    TEXT,
  email           TEXT,
  phone           TEXT,
  phone_secondary TEXT,
  whatsapp_number TEXT,
  job_title       TEXT,
  job_title_ar    TEXT,
  department      TEXT,
  tags            TEXT[] DEFAULT '{}',
  source          TEXT DEFAULT 'manual',
  custom_fields   JSONB DEFAULT '{}',
  notes           TEXT,
  last_contacted  TIMESTAMPTZ,
  search_name_normalized    TEXT,
  search_name_root          TEXT,
  search_name_translit      TEXT,
  search_full_text          TEXT,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- DEAL PIPELINE
-- ============================================================

CREATE TABLE crm_pipelines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  is_default      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, name)
);

CREATE TABLE crm_deal_stages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id     UUID NOT NULL REFERENCES crm_pipelines(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  position        INTEGER NOT NULL,
  color           TEXT DEFAULT '#2D6A4F',
  probability     INTEGER DEFAULT 0,
  is_won          BOOLEAN DEFAULT FALSE,
  is_lost         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE crm_deals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pipeline_id     UUID NOT NULL REFERENCES crm_pipelines(id),
  stage_id        UUID NOT NULL REFERENCES crm_deal_stages(id),
  contact_id      UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  company_id      UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  value           NUMERIC,
  currency        TEXT DEFAULT 'SAR',
  probability     INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close  DATE,
  actual_close    DATE,
  won_lost_reason TEXT,
  won_lost_reason_ar TEXT,
  assigned_to     UUID REFERENCES auth.users(id),
  source          TEXT,
  custom_fields   JSONB DEFAULT '{}',
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  closed_at       TIMESTAMPTZ
);

CREATE TABLE crm_deal_stage_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id         UUID NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
  from_stage_id   UUID REFERENCES crm_deal_stages(id),
  to_stage_id     UUID NOT NULL REFERENCES crm_deal_stages(id),
  moved_by        UUID NOT NULL REFERENCES auth.users(id),
  duration_in_stage_hours INTEGER,
  moved_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TASKS
-- ============================================================

CREATE TABLE crm_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  deal_id         UUID REFERENCES crm_deals(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  company_id      UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority        TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  type            TEXT DEFAULT 'task' CHECK (type IN ('task', 'call', 'email', 'meeting', 'follow_up')),
  due_date        TIMESTAMPTZ,
  reminder_at     TIMESTAMPTZ,
  assigned_to     UUID REFERENCES auth.users(id),
  is_recurring    BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,
  completed_at    TIMESTAMPTZ,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- COMMUNICATIONS
-- ============================================================

CREATE TABLE crm_communications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  deal_id         UUID REFERENCES crm_deals(id) ON DELETE SET NULL,
  company_id      UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  type            TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'note', 'whatsapp', 'sms', 'site_visit', 'other')),
  direction       TEXT CHECK (direction IN ('inbound', 'outbound')),
  subject         TEXT,
  subject_ar      TEXT,
  body            TEXT,
  occurred_at     TIMESTAMPTZ DEFAULT now(),
  duration_mins   INTEGER,
  outcome         TEXT,
  outcome_ar      TEXT,
  whatsapp_message_count  INTEGER,
  whatsapp_date_range     TSTZRANGE,
  whatsapp_raw            TEXT,
  whatsapp_parsed         JSONB,
  attachments     JSONB DEFAULT '[]',
  logged_by       UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CUSTOM FIELDS DEFINITION
-- ============================================================

CREATE TABLE crm_custom_field_defs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('contact', 'company', 'deal')),
  field_key       TEXT NOT NULL,
  label           TEXT NOT NULL,
  label_ar        TEXT,
  field_type      TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'dropdown', 'multi_select', 'checkbox', 'currency', 'phone', 'email', 'url')),
  options         JSONB,
  is_required     BOOLEAN DEFAULT FALSE,
  position        INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, entity_type, field_key)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE crm_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  body            TEXT,
  body_ar         TEXT,
  entity_type     TEXT,
  entity_id       UUID,
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- AUDIT TRAIL
-- ============================================================

CREATE TABLE crm_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  changes         JSONB,
  metadata        JSONB DEFAULT '{}',
  ip_address      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MIGRATION TRACKING
-- ============================================================

CREATE TABLE crm_imports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  total_rows      INTEGER,
  imported_rows   INTEGER DEFAULT 0,
  skipped_rows    INTEGER DEFAULT 0,
  error_rows      INTEGER DEFAULT 0,
  field_mapping   JSONB,
  errors          JSONB DEFAULT '[]',
  file_name       TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Core lookups
CREATE INDEX idx_org_members_user ON org_members(user_id);
CREATE INDEX idx_org_members_org ON org_members(org_id);
CREATE INDEX idx_crm_contacts_org ON crm_contacts(org_id);
CREATE INDEX idx_crm_contacts_company ON crm_contacts(company_id);
CREATE INDEX idx_crm_companies_org ON crm_companies(org_id);
CREATE INDEX idx_crm_companies_parent ON crm_companies(parent_id);
CREATE INDEX idx_crm_deals_org ON crm_deals(org_id);
CREATE INDEX idx_crm_deals_pipeline ON crm_deals(pipeline_id);
CREATE INDEX idx_crm_deals_stage ON crm_deals(stage_id);
CREATE INDEX idx_crm_deals_contact ON crm_deals(contact_id);
CREATE INDEX idx_crm_deals_company ON crm_deals(company_id);
CREATE INDEX idx_crm_deals_assigned ON crm_deals(assigned_to);
CREATE INDEX idx_crm_tasks_org ON crm_tasks(org_id);
CREATE INDEX idx_crm_tasks_assigned ON crm_tasks(assigned_to);
CREATE INDEX idx_crm_tasks_due ON crm_tasks(due_date) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX idx_crm_tasks_deal ON crm_tasks(deal_id);
CREATE INDEX idx_crm_comms_contact ON crm_communications(contact_id);
CREATE INDEX idx_crm_comms_deal ON crm_communications(deal_id);
CREATE INDEX idx_crm_comms_org ON crm_communications(org_id);
CREATE INDEX idx_crm_notifications_user ON crm_notifications(user_id, is_read);
CREATE INDEX idx_crm_audit_org ON crm_audit_log(org_id, created_at DESC);
CREATE INDEX idx_crm_audit_entity ON crm_audit_log(entity_type, entity_id);

-- Arabic search indexes (GIN trigram)
CREATE INDEX idx_crm_contacts_search_norm ON crm_contacts USING gin(search_name_normalized gin_trgm_ops);
CREATE INDEX idx_crm_contacts_search_root ON crm_contacts USING gin(search_name_root gin_trgm_ops);
CREATE INDEX idx_crm_contacts_search_trans ON crm_contacts USING gin(search_name_translit gin_trgm_ops);
CREATE INDEX idx_crm_contacts_search_full ON crm_contacts USING gin(search_full_text gin_trgm_ops);
CREATE INDEX idx_crm_companies_search_norm ON crm_companies USING gin(search_name_normalized gin_trgm_ops);
CREATE INDEX idx_crm_companies_search_trans ON crm_companies USING gin(search_name_translit gin_trgm_ops);

-- Pipeline performance
CREATE INDEX idx_crm_deals_value ON crm_deals(org_id, value) WHERE closed_at IS NULL;
CREATE INDEX idx_crm_stage_history_deal ON crm_deal_stage_history(deal_id, moved_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper functions
CREATE OR REPLACE FUNCTION is_org_member(check_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = check_org_id AND user_id = auth.uid() AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_org_role(check_org_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM org_members
  WHERE org_id = check_org_id AND user_id = auth.uid() AND is_active = TRUE
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID AS $$
  SELECT org_id FROM org_members
  WHERE user_id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deal_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deal_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_custom_field_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_imports ENABLE ROW LEVEL SECURITY;

-- Organizations
CREATE POLICY "org_select" ON organizations FOR SELECT USING (is_org_member(id));
CREATE POLICY "org_insert" ON organizations FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "org_update" ON organizations FOR UPDATE USING (get_org_role(id) IN ('owner', 'admin'));
CREATE POLICY "org_delete" ON organizations FOR DELETE USING (get_org_role(id) = 'owner');

-- Org members
CREATE POLICY "members_select" ON org_members FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "members_insert" ON org_members FOR INSERT WITH CHECK (
  get_org_role(org_id) IN ('owner', 'admin', 'manager') OR auth.uid() = user_id
);
CREATE POLICY "members_update" ON org_members FOR UPDATE USING (get_org_role(org_id) IN ('owner', 'admin'));
CREATE POLICY "members_delete" ON org_members FOR DELETE USING (get_org_role(org_id) IN ('owner', 'admin'));

-- Org roles
CREATE POLICY "roles_select" ON org_roles FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "roles_manage" ON org_roles FOR ALL USING (get_org_role(org_id) IN ('owner', 'admin'));

-- Contacts
CREATE POLICY "crm_contacts_select" ON crm_contacts FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "crm_contacts_insert" ON crm_contacts FOR INSERT WITH CHECK (is_org_member(org_id));
CREATE POLICY "crm_contacts_update" ON crm_contacts FOR UPDATE USING (is_org_member(org_id));
CREATE POLICY "crm_contacts_delete" ON crm_contacts FOR DELETE USING (get_org_role(org_id) IN ('owner', 'admin', 'manager'));

-- Companies
CREATE POLICY "crm_companies_select" ON crm_companies FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "crm_companies_insert" ON crm_companies FOR INSERT WITH CHECK (is_org_member(org_id));
CREATE POLICY "crm_companies_update" ON crm_companies FOR UPDATE USING (is_org_member(org_id));
CREATE POLICY "crm_companies_delete" ON crm_companies FOR DELETE USING (get_org_role(org_id) IN ('owner', 'admin', 'manager'));

-- Pipelines
CREATE POLICY "crm_pipelines_select" ON crm_pipelines FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "crm_pipelines_insert" ON crm_pipelines FOR INSERT WITH CHECK (get_org_role(org_id) IN ('owner', 'admin', 'manager'));
CREATE POLICY "crm_pipelines_update" ON crm_pipelines FOR UPDATE USING (get_org_role(org_id) IN ('owner', 'admin', 'manager'));
CREATE POLICY "crm_pipelines_delete" ON crm_pipelines FOR DELETE USING (get_org_role(org_id) IN ('owner', 'admin'));

-- Deal stages
CREATE POLICY "crm_stages_select" ON crm_deal_stages FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "crm_stages_manage" ON crm_deal_stages FOR ALL USING (get_org_role(org_id) IN ('owner', 'admin', 'manager'));

-- Deals
CREATE POLICY "crm_deals_select" ON crm_deals FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "crm_deals_insert" ON crm_deals FOR INSERT WITH CHECK (is_org_member(org_id));
CREATE POLICY "crm_deals_update" ON crm_deals FOR UPDATE USING (is_org_member(org_id));
CREATE POLICY "crm_deals_delete" ON crm_deals FOR DELETE USING (get_org_role(org_id) IN ('owner', 'admin', 'manager'));

-- Deal stage history
CREATE POLICY "crm_history_select" ON crm_deal_stage_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM crm_deals d WHERE d.id = deal_id AND is_org_member(d.org_id))
);
CREATE POLICY "crm_history_insert" ON crm_deal_stage_history FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM crm_deals d WHERE d.id = deal_id AND is_org_member(d.org_id))
);

-- Tasks
CREATE POLICY "crm_tasks_select" ON crm_tasks FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "crm_tasks_insert" ON crm_tasks FOR INSERT WITH CHECK (is_org_member(org_id));
CREATE POLICY "crm_tasks_update" ON crm_tasks FOR UPDATE USING (is_org_member(org_id));
CREATE POLICY "crm_tasks_delete" ON crm_tasks FOR DELETE USING (get_org_role(org_id) IN ('owner', 'admin', 'manager'));

-- Communications
CREATE POLICY "crm_comms_select" ON crm_communications FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "crm_comms_insert" ON crm_communications FOR INSERT WITH CHECK (is_org_member(org_id));
CREATE POLICY "crm_comms_update" ON crm_communications FOR UPDATE USING (is_org_member(org_id) AND auth.uid() = logged_by);
CREATE POLICY "crm_comms_delete" ON crm_communications FOR DELETE USING (get_org_role(org_id) IN ('owner', 'admin', 'manager'));

-- Custom field definitions
CREATE POLICY "crm_fields_select" ON crm_custom_field_defs FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "crm_fields_manage" ON crm_custom_field_defs FOR ALL USING (get_org_role(org_id) IN ('owner', 'admin'));

-- Notifications
CREATE POLICY "crm_notif_select" ON crm_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "crm_notif_update" ON crm_notifications FOR UPDATE USING (auth.uid() = user_id);

-- Audit log
CREATE POLICY "crm_audit_select" ON crm_audit_log FOR SELECT USING (get_org_role(org_id) IN ('owner', 'admin'));
CREATE POLICY "crm_audit_insert" ON crm_audit_log FOR INSERT WITH CHECK (is_org_member(org_id));

-- Imports
CREATE POLICY "crm_imports_select" ON crm_imports FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "crm_imports_insert" ON crm_imports FOR INSERT WITH CHECK (is_org_member(org_id));
CREATE POLICY "crm_imports_update" ON crm_imports FOR UPDATE USING (is_org_member(org_id));

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-add org creator as owner
CREATE OR REPLACE FUNCTION add_org_creator_as_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO org_members (org_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_org_created_add_owner
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION add_org_creator_as_owner();

-- Create default pipeline + stages for new org
CREATE OR REPLACE FUNCTION create_default_pipeline()
RETURNS TRIGGER AS $$
DECLARE
  pipeline_id UUID;
BEGIN
  INSERT INTO crm_pipelines (org_id, name, name_ar, is_default)
  VALUES (NEW.id, 'Sales Pipeline', 'مسار المبيعات', TRUE)
  RETURNING id INTO pipeline_id;

  INSERT INTO crm_deal_stages (pipeline_id, org_id, name, name_ar, position, color, probability, is_won, is_lost) VALUES
    (pipeline_id, NEW.id, 'Lead',          'عميل محتمل',     1, '#9CA3AF', 10, FALSE, FALSE),
    (pipeline_id, NEW.id, 'Qualified',     'مؤهل',           2, '#3B82F6', 25, FALSE, FALSE),
    (pipeline_id, NEW.id, 'Proposal',      'عرض سعر',        3, '#F59E0B', 50, FALSE, FALSE),
    (pipeline_id, NEW.id, 'Negotiation',   'تفاوض',          4, '#8B5CF6', 75, FALSE, FALSE),
    (pipeline_id, NEW.id, 'Won',           'تم الفوز',        5, '#22C55E', 100, TRUE,  FALSE),
    (pipeline_id, NEW.id, 'Lost',          'خسارة',           6, '#EF4444', 0,   FALSE, TRUE);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_org_created_pipeline
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION create_default_pipeline();

-- Create default system roles for new org
CREATE OR REPLACE FUNCTION create_default_roles()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO org_roles (org_id, name, name_ar, permissions, is_system) VALUES
    (NEW.id, 'owner', 'مالك', '{"contacts.read":true,"contacts.write":true,"contacts.delete":true,"companies.read":true,"companies.write":true,"companies.delete":true,"deals.read":true,"deals.write":true,"deals.delete":true,"tasks.read":true,"tasks.write":true,"tasks.delete":true,"pipeline.configure":true,"team.manage":true,"team.invite":true,"reports.view":true,"reports.export":true,"settings.manage":true,"import.execute":true,"audit.view":true,"fields.manage":true}', TRUE),
    (NEW.id, 'admin', 'مدير', '{"contacts.read":true,"contacts.write":true,"contacts.delete":true,"companies.read":true,"companies.write":true,"companies.delete":true,"deals.read":true,"deals.write":true,"deals.delete":true,"tasks.read":true,"tasks.write":true,"tasks.delete":true,"pipeline.configure":true,"team.manage":true,"team.invite":true,"reports.view":true,"reports.export":true,"settings.manage":true,"import.execute":true,"audit.view":true,"fields.manage":true}', TRUE),
    (NEW.id, 'manager', 'مدير مبيعات', '{"contacts.read":true,"contacts.write":true,"contacts.delete":true,"companies.read":true,"companies.write":true,"companies.delete":true,"deals.read":true,"deals.write":true,"deals.delete":true,"tasks.read":true,"tasks.write":true,"tasks.delete":true,"pipeline.configure":false,"team.manage":false,"team.invite":true,"reports.view":true,"reports.export":true,"settings.manage":false,"import.execute":true,"audit.view":false,"fields.manage":false}', TRUE),
    (NEW.id, 'sales_rep', 'مندوب مبيعات', '{"contacts.read":true,"contacts.write":true,"contacts.delete":false,"companies.read":true,"companies.write":true,"companies.delete":false,"deals.read":true,"deals.write":true,"deals.delete":false,"tasks.read":true,"tasks.write":true,"tasks.delete":false,"pipeline.configure":false,"team.manage":false,"team.invite":false,"reports.view":true,"reports.export":false,"settings.manage":false,"import.execute":false,"audit.view":false,"fields.manage":false}', TRUE),
    (NEW.id, 'viewer', 'مشاهد', '{"contacts.read":true,"contacts.write":false,"contacts.delete":false,"companies.read":true,"companies.write":false,"companies.delete":false,"deals.read":true,"deals.write":false,"deals.delete":false,"tasks.read":true,"tasks.write":false,"tasks.delete":false,"pipeline.configure":false,"team.manage":false,"team.invite":false,"reports.view":true,"reports.export":false,"settings.manage":false,"import.execute":false,"audit.view":false,"fields.manage":false}', TRUE);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_org_created_roles
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION create_default_roles();

-- Arabic name normalization trigger for contacts
CREATE OR REPLACE FUNCTION normalize_contact_search_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_name_normalized := regexp_replace(
    translate(
      COALESCE(NEW.first_name_ar, '') || ' ' || COALESCE(NEW.last_name_ar, '') || ' ' ||
      COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''),
      'إأآٱ', 'اااا'
    ),
    '[\u064B-\u065F\u0670]', '', 'g'
  );

  NEW.search_full_text := lower(
    COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '') || ' ' ||
    COALESCE(NEW.first_name_ar, '') || ' ' || COALESCE(NEW.last_name_ar, '') || ' ' ||
    COALESCE(NEW.email, '') || ' ' || COALESCE(NEW.phone, '') || ' ' ||
    COALESCE(NEW.job_title, '') || ' ' || COALESCE(NEW.job_title_ar, '')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_search_normalize
  BEFORE INSERT OR UPDATE ON crm_contacts
  FOR EACH ROW EXECUTE FUNCTION normalize_contact_search_fields();

-- Same for companies
CREATE OR REPLACE FUNCTION normalize_company_search_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_name_normalized := regexp_replace(
    translate(
      COALESCE(NEW.name_ar, '') || ' ' || COALESCE(NEW.name, ''),
      'إأآٱ', 'اااا'
    ),
    '[\u064B-\u065F\u0670]', '', 'g'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER company_search_normalize
  BEFORE INSERT OR UPDATE ON crm_companies
  FOR EACH ROW EXECUTE FUNCTION normalize_company_search_fields();

-- Auto-update last_contacted on contacts when communication is logged
CREATE OR REPLACE FUNCTION update_contact_last_contacted()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE crm_contacts SET last_contacted = NEW.occurred_at, updated_at = now()
  WHERE id = NEW.contact_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_communication_logged
  AFTER INSERT ON crm_communications
  FOR EACH ROW EXECUTE FUNCTION update_contact_last_contacted();

-- Auto-log deal stage changes
CREATE OR REPLACE FUNCTION log_deal_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    INSERT INTO crm_deal_stage_history (deal_id, from_stage_id, to_stage_id, moved_by, duration_in_stage_hours)
    VALUES (
      NEW.id,
      OLD.stage_id,
      NEW.stage_id,
      auth.uid(),
      EXTRACT(EPOCH FROM (now() - OLD.updated_at)) / 3600
    );
    IF EXISTS (SELECT 1 FROM crm_deal_stages WHERE id = NEW.stage_id AND (is_won OR is_lost)) THEN
      NEW.closed_at := now();
      NEW.actual_close := CURRENT_DATE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_deal_stage_change
  BEFORE UPDATE ON crm_deals
  FOR EACH ROW EXECUTE FUNCTION log_deal_stage_change();

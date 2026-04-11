-- ============================================================
-- RASMALAK CRM V2 — BILLING
-- Migration 014: Subscriptions, invoices, payment methods
-- ============================================================

CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan                  TEXT NOT NULL CHECK (plan IN ('entrepreneur','organization','enterprise','custom')),
  status                TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing','active','past_due','canceled','paused')),
  billing_cycle         TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','annual')),
  billing_currency      TEXT NOT NULL DEFAULT 'USD',
  seats_included        INTEGER NOT NULL,
  seats_purchased       INTEGER NOT NULL DEFAULT 0,
  seats_max             INTEGER NOT NULL,
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  regional_provider     TEXT,
  regional_ref          TEXT,
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  trial_ends_at         TIMESTAMPTZ,
  grace_period_ends_at  TIMESTAMPTZ,
  canceled_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id)
);

CREATE TABLE invoices (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id       UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id     TEXT,
  amount                NUMERIC NOT NULL,
  currency              TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','paid','void','uncollectible')),
  period_start          TIMESTAMPTZ,
  period_end            TIMESTAMPTZ,
  pdf_url               TEXT,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payment_methods (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider              TEXT NOT NULL DEFAULT 'stripe',
  type                  TEXT NOT NULL,
  last_four             TEXT,
  brand                 TEXT,
  is_default            BOOLEAN DEFAULT FALSE,
  provider_ref          TEXT,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_org ON subscriptions(org_id);
CREATE INDEX idx_invoices_org ON invoices(org_id);
CREATE INDEX idx_payment_methods_org ON payment_methods(org_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view subscription"
  ON subscriptions FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "Org owner/admin can manage subscription"
  ON subscriptions FOR ALL USING (get_org_role(org_id) IN ('owner','admin'));

CREATE POLICY "Org members can view invoices"
  ON invoices FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "Org members can view payment methods"
  ON payment_methods FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "Org owner/admin can manage payment methods"
  ON payment_methods FOR ALL USING (get_org_role(org_id) IN ('owner','admin'));

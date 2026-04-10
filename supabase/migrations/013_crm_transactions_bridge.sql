-- ============================================================
-- RASMALAK CRM — TRANSACTIONS BRIDGE
-- Migration 013: Link existing transactions to CRM entities
-- ============================================================

-- Bridge to existing transactions table for Rasmalak Finance ↔ CRM integration
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_contact ON transactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_transactions_company ON transactions(company_id);

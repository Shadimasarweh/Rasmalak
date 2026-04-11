-- ============================================================
-- RASMALAK CRM V2 — DEAL SCORING
-- Migration 018: Add AI score columns to crm_deals
-- ============================================================

ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS ai_score INTEGER;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS ai_score_trend TEXT;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS ai_score_reasoning TEXT;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS ai_scored_at TIMESTAMPTZ;

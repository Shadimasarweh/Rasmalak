/**
 * Financial Advice Logger
 * =======================
 * Centralised insert into the `financial_advice` table in Supabase.
 * Both AI-sourced and rule-sourced advice go through this single function
 * to guarantee a uniform audit trail.
 *
 * Expected table schema (Supabase):
 *
 *   financial_advice (
 *     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id       UUID NOT NULL REFERENCES auth.users(id),
 *     source        TEXT NOT NULL,          -- 'ai' | 'rule'
 *     rule_id       TEXT,                   -- null for AI-sourced advice
 *     advice_text   TEXT NOT NULL,
 *     target_metric TEXT,                   -- e.g. 'spending', 'budget', 'savings'
 *     confidence    NUMERIC,                -- 0.0–1.0 (mapped from 'high'→0.9, 'medium'→0.6, 'low'→0.3)
 *     conversation_id TEXT,                 -- null for rule-sourced advice
 *     context_hash  TEXT NOT NULL,          -- SHA-256 hex from computeContextHash
 *     created_at    TIMESTAMPTZ DEFAULT now()
 *   )
 */

import { supabase } from '@/lib/supabaseClient';

// ============================================
// INSERT SHAPE
// ============================================

export interface FinancialAdviceRow {
  user_id: string;
  source: 'ai' | 'rule';
  rule_id?: string | null;
  advice_text: string;
  target_metric?: string | null;
  confidence?: string | null;
  conversation_id?: string | null;
  context_hash: string;
}

// ============================================
// HELPERS
// ============================================

/**
 * The Supabase `confidence` column is NUMERIC, but callers may pass
 * string labels ('high', 'medium', 'low') or numeric strings ('0.9').
 * Convert to a number so the insert never fails on type mismatch.
 */
function normalizeConfidence(value: string | null | undefined): number | null {
  if (value == null) return null;

  // If it's already a parseable number, use it directly
  const num = Number(value);
  if (!isNaN(num)) return num;

  // Map common string labels to numeric values
  const map: Record<string, number> = {
    high: 0.9,
    medium: 0.6,
    low: 0.3,
  };
  return map[value.toLowerCase()] ?? null;
}

// ============================================
// LOGGER
// ============================================

/**
 * Insert a single financial_advice row.
 * Errors are logged but never thrown — callers must not have their
 * control flow disrupted by a failed audit write.
 */
export async function logFinancialAdvice(row: FinancialAdviceRow): Promise<void> {
  try {
    const { error } = await supabase
      .from('financial_advice')
      .insert({
        user_id: row.user_id,
        source: row.source,
        rule_id: row.rule_id ?? null,
        advice_text: row.advice_text,
        target_metric: row.target_metric ?? null,
        confidence: normalizeConfidence(row.confidence),
        conversation_id: row.conversation_id ?? null,
        context_hash: row.context_hash,
      });

    if (error) {
      console.error('[AdviceLogger] Insert failed:', error.message);
    }
  } catch (err) {
    // Network or unexpected errors — log and move on
    console.error('[AdviceLogger] Unexpected error:', err);
  }
}



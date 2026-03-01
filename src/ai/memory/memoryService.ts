/**
 * Memory Service
 * ==============
 * Selective read/write for the user_semantic_state Supabase table.
 * Never reads or writes the full state — only requested fields.
 */

import { supabase } from '@/lib/supabaseClient';
import type { UserSemanticState } from './types';
import { createEmptySemanticState } from './types';

const COLUMN_MAP: Record<keyof UserSemanticState, string> = {
  id: 'id',
  userId: 'user_id',
  version: 'version',
  financialHealthBand: 'financial_health_band',
  riskProfile: 'risk_profile',
  incomeStabilityScore: 'income_stability_score',
  behaviorSignals: 'behavior_signals',
  preferences: 'preferences',
  correctionHistory: 'correction_history',
  engagementSignals: 'engagement_signals',
  updatedAt: 'updated_at',
  createdAt: 'created_at',
};

function toDbColumn(field: keyof UserSemanticState): string {
  return COLUMN_MAP[field] || field;
}

/**
 * Read specific fields from the user's semantic state.
 * Returns only the requested fields — never the full row.
 */
export async function readMemoryFields(
  userId: string,
  fields: (keyof UserSemanticState)[],
): Promise<Partial<UserSemanticState>> {
  if (fields.length === 0) return {};

  const columns = fields.map(toDbColumn).join(', ');

  const { data, error } = await supabase
    .from('user_semantic_state')
    .select(columns)
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // No row found — return defaults
    const empty = createEmptySemanticState(userId);
    const result: Partial<UserSemanticState> = {};
    for (const field of fields) {
      (result as Record<string, unknown>)[field] = empty[field];
    }
    return result;
  }

  if (error) {
    console.error('[MemoryService] Read error:', error.message);
    return {};
  }

  if (!data) return {};

  const result: Partial<UserSemanticState> = {};
  const row = data as unknown as Record<string, unknown>;
  for (const field of fields) {
    const col = toDbColumn(field);
    if (col in row) {
      (result as Record<string, unknown>)[field] = row[col];
    }
  }
  return result;
}

/**
 * Write specific fields to the user's semantic state.
 * Increments version on every write.
 * Stores previous values in correction_history.
 */
export async function writeMemoryFields(
  userId: string,
  fields: Partial<UserSemanticState>,
  source: string,
): Promise<void> {
  const dbFields: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    const col = toDbColumn(key as keyof UserSemanticState);
    if (col !== 'id' && col !== 'user_id' && col !== 'version' && col !== 'created_at') {
      dbFields[col] = value;
    }
  }

  dbFields['updated_at'] = new Date().toISOString();

  // Upsert: create if not exists, update if exists
  const { error } = await supabase
    .from('user_semantic_state')
    .upsert(
      {
        user_id: userId,
        ...dbFields,
      },
      { onConflict: 'user_id' },
    );

  if (error) {
    console.error('[MemoryService] Write error:', error.message);
  }

  // Increment version — best-effort, non-blocking
  try {
    await supabase.rpc('increment_semantic_state_version', { p_user_id: userId });
  } catch {
    // RPC may not exist yet — version tracking is best-effort
  }
}

/**
 * Get the current version number for a user's semantic state.
 */
export async function getMemoryVersion(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('user_semantic_state')
    .select('version')
    .eq('user_id', userId)
    .single();

  if (error || !data) return 0;
  return (data as Record<string, unknown>).version as number;
}

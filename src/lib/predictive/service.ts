/**
 * Predictive persistence — Supabase sync + the prediction ledger.
 *
 * Client-side under the user's own RLS session (no service-role key
 * exists in this deployment; a Phase-3 cron can take over using the same
 * natural keys + engine_version). Every step is independently fail-open:
 * persistence never breaks the UI.
 *
 * Ledger honesty rule: prediction_log rows are INSERTED with
 * ignoreDuplicates and never upserted — the first forecast for a bucket
 * is the one that gets scored. Reconciliation only fills actual/error.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { PREDICTIVE_ENGINE_VERSION, type EngineTransaction } from '@/ai/deterministic/engineTypes';
import { isGoalFunding } from '@/ai/deterministic/engineTypes';
import { isoToDayNumber, monthKeyOf } from '@/ai/deterministic/dates';
import type { PredictiveState } from '@/ai/deterministic/predictiveState';
import { updateBehaviorMemoryFromState } from './memoryUpdates';

const STALE_DELETE_CAP = 100;
const RECONCILE_BATCH = 50;
export const CATEGORY_PREDICTION_CAP = 8;

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface SyncOptions {
  // Injectable so the phase-3 nightly job (service-role, server) reuses
  // the exact same row shapes + natural keys as the client sync.
  client?: SupabaseClient;
  // Behavioural-memory writes stay a client-session concern; the cron
  // must not mutate user_semantic_state.
  includeMemory?: boolean;
}

export async function syncPredictiveState(
  userId: string,
  state: PredictiveState,
  options: SyncOptions = {},
): Promise<void> {
  const db = options.client ?? supabase;
  await syncSeries(db, userId, state).catch((e) => console.warn('[predictive] series sync failed:', e?.message ?? e));
  await syncBaselines(db, userId, state).catch((e) => console.warn('[predictive] baseline sync failed:', e?.message ?? e));
  await logPredictions(db, userId, state).catch((e) => console.warn('[predictive] ledger write failed:', e?.message ?? e));
  if (options.includeMemory !== false) {
    await updateBehaviorMemoryFromState(userId, state).catch((e) =>
      console.warn('[predictive] memory update failed:', e?.message ?? e),
    );
  }
}

async function syncSeries(db: SupabaseClient, userId: string, state: PredictiveState): Promise<void> {
  if (state.series.length > 0) {
    const rows = state.series.map((s) => ({
      user_id: userId,
      series_key: s.key,
      direction: s.direction,
      category_id: s.categoryId,
      subcategory_id: s.subcategoryId,
      merchant_label: s.merchantLabel,
      cadence: s.cadence,
      median_interval_days: s.medianIntervalDays,
      interval_mad_days: s.intervalMadDays,
      amount_median: s.amountMedian,
      amount_mad: s.amountMad,
      anchor_day_of_month: s.anchorDayOfMonth,
      first_date: s.firstDate,
      last_date: s.lastDate,
      next_due_date: s.nextDueDate,
      occurrences: s.occurrences,
      confidence: s.confidence,
      active: s.active,
      source: s.source,
      engine_version: PREDICTIVE_ENGINE_VERSION,
      computed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    const { error } = await db
      .from('recurring_series')
      .upsert(rows, { onConflict: 'user_id,series_key' });
    if (error) throw new Error(error.message);
  }

  // Prune keys the engine no longer produces. Skipped for very large key
  // sets to stay clear of .in() limits — stale rows are harmless caches.
  const keys = state.series.map((s) => s.key);
  if (keys.length > 0 && keys.length <= STALE_DELETE_CAP) {
    await db
      .from('recurring_series')
      .delete()
      .eq('user_id', userId)
      .not('series_key', 'in', `(${keys.map((k) => `"${k.replace(/"/g, '')}"`).join(',')})`);
  }
}

async function syncBaselines(db: SupabaseClient, userId: string, state: PredictiveState): Promise<void> {
  if (state.baselines.length === 0) return;
  const rows = state.baselines.map((b) => ({
    user_id: userId,
    category_id: b.categoryId,
    window_months: b.windowMonths,
    months_with_data: b.monthsWithData,
    monthly_median: b.monthlyMedian,
    monthly_mad: b.monthlyMad,
    monthly_values: b.monthlyValues,
    eligible: b.eligible,
    engine_version: PREDICTIVE_ENGINE_VERSION,
    computed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  const { error } = await db
    .from('category_baselines')
    .upsert(rows, { onConflict: 'user_id,category_id' });
  if (error) throw new Error(error.message);
}

async function logPredictions(db: SupabaseClient, userId: string, state: PredictiveState): Promise<void> {
  if (!state.meta.hasMinimumHistory) return;
  const snapshot = state.cycle.daysElapsed <= 7 ? 'cycle_start' : 'mid_cycle';
  const basis = { ...state.forecast.basis, anchor: state.forecast.cycle.anchor };

  const rows: Record<string, unknown>[] = [
    {
      user_id: userId,
      kind: 'cycle_end_balance',
      target_id: '',
      cycle_start: isoDate(state.cycle.start),
      horizon_date: state.forecast.cycle.end,
      snapshot,
      predicted_p25: state.forecast.endOfCycleBalance.p25,
      predicted_p50: state.forecast.endOfCycleBalance.p50,
      predicted_p75: state.forecast.endOfCycleBalance.p75,
      basis,
      engine_version: PREDICTIVE_ENGINE_VERSION,
    },
  ];

  // category_month rows are deliberately NOT written in v1: the baselines
  // exclude recurring-series members (discretionary-only, for alerts), so
  // scoring them against total category spend would misstate accuracy.
  // The schema supports the kind for when totals-based predictions ship.

  // Append-only: first write per (kind, target, horizon, snapshot) wins.
  const { error } = await db
    .from('prediction_log')
    .upsert(rows, { onConflict: 'user_id,kind,target_id,horizon_date,snapshot', ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export interface ReconcileResult {
  reconciled: number;
}

// Score past-horizon predictions against actuals computed from the LOCAL
// full history (mathematically identical to a server pass — actuals derive
// only from the user's own transactions).
export async function reconcileDuePredictions(
  userId: string,
  txns: EngineTransaction[],
  now: Date = new Date(),
  client?: SupabaseClient,
): Promise<ReconcileResult> {
  const db = client ?? supabase;
  const todayIso = isoDate(now);
  const { data, error } = await db
    .from('prediction_log')
    .select('id, kind, target_id, cycle_start, horizon_date, predicted_p25, predicted_p50, predicted_p75')
    .eq('user_id', userId)
    .is('reconciled_at', null)
    .lt('horizon_date', todayIso)
    .limit(RECONCILE_BATCH);
  if (error || !data || data.length === 0) return { reconciled: 0 };

  let reconciled = 0;
  for (const row of data) {
    const actual = computeActual(
      txns,
      row.kind as string,
      row.target_id as string,
      row.cycle_start as string,
      row.horizon_date as string,
    );
    if (actual == null) continue;
    const p50 = Number(row.predicted_p50);
    const p25 = row.predicted_p25 == null ? null : Number(row.predicted_p25);
    const p75 = row.predicted_p75 == null ? null : Number(row.predicted_p75);
    const absError = Math.abs(actual - p50);
    const { error: updateError } = await db
      .from('prediction_log')
      .update({
        actual_value: actual,
        abs_error: absError,
        pct_error: absError / Math.max(Math.abs(actual), 1),
        within_band: p25 != null && p75 != null ? actual >= p25 && actual <= p75 : null,
        reconciled_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    if (!updateError) reconciled++;
  }
  return { reconciled };
}

function computeActual(
  txns: EngineTransaction[],
  kind: string,
  targetId: string,
  cycleStart: string,
  horizon: string,
): number | null {
  const horizonDay = isoToDayNumber(horizon);
  if (!Number.isFinite(horizonDay)) return null;

  if (kind === 'cycle_end_balance') {
    // Same definition as the store's getNetBalance, capped at the horizon.
    let balance = 0;
    for (const tx of txns) {
      if (!Number.isFinite(tx.amountBase)) continue;
      if (isoToDayNumber(tx.date) > horizonDay) continue;
      balance += tx.type === 'income' ? Math.abs(tx.amountBase) : -Math.abs(tx.amountBase);
    }
    return Math.round(balance * 100) / 100;
  }

  if (kind === 'category_month') {
    // Total non-goal-funding category spend for the prediction's month.
    // Any future writer of this kind MUST predict totals, not
    // discretionary-only baselines (see logPredictions note).
    const month = monthKeyOf(cycleStart);
    let sum = 0;
    for (const tx of txns) {
      if (tx.type !== 'expense' || !Number.isFinite(tx.amountBase)) continue;
      if (isGoalFunding(tx.category)) continue;
      if ((tx.category ?? 'other-expense') !== targetId) continue;
      if (monthKeyOf(tx.date) !== month) continue;
      sum += Math.abs(tx.amountBase);
    }
    return Math.round(sum * 100) / 100;
  }

  return null;
}

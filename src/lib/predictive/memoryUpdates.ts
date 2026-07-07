/**
 * Guarded behaviour-signal writes into user_semantic_state (the AI memory
 * Mustasharak reads). Runs CLIENT-SIDE under the user's own session — the
 * path that actually works under RLS.
 *
 * Guardrails:
 *   - write only on a real change (and past confidence gates)
 *   - respect user pins: if the latest correction for a field came from
 *     the user, the engine never overwrites it
 *   - salary amount is stored as a 500-granularity band, never exact
 */

import { readMemoryFields, writeMemoryFields } from '@/ai/memory/memoryService';
import type { BehaviorSignals, CorrectionEntry } from '@/ai/memory/types';
import type { PredictiveState } from '@/ai/deterministic/predictiveState';

export const MEMORY_WRITE_SOURCE = 'predictive_engine';
export const SALARY_WRITE_MIN_CONFIDENCE = 0.6;
export const IMPULSE_WRITE_DELTA = 0.1;
export const SALARY_BAND_GRANULARITY = 500;

export function salaryBand(amount: number): string {
  const lower = Math.floor(amount / SALARY_BAND_GRANULARITY) * SALARY_BAND_GRANULARITY;
  return `${lower}-${lower + SALARY_BAND_GRANULARITY}`;
}

function isUserPinned(field: string, history: CorrectionEntry[] | undefined): boolean {
  if (!history || history.length === 0) return false;
  const relevant = history.filter((c) => c.field === `behaviorSignals.${field}`);
  if (relevant.length === 0) return false;
  return relevant[relevant.length - 1].source === 'user';
}

export async function updateBehaviorMemoryFromState(
  userId: string,
  state: PredictiveState,
): Promise<string[]> {
  if (!state.meta.hasMinimumHistory) return [];

  const existing = await readMemoryFields(userId, ['behaviorSignals', 'correctionHistory']);
  const current: BehaviorSignals = existing.behaviorSignals ?? {};
  const history = existing.correctionHistory;
  const next: BehaviorSignals = { ...current };
  const written: string[] = [];

  const setIfChanged = <K extends keyof BehaviorSignals>(field: K, value: BehaviorSignals[K]) => {
    if (value == null) return;
    if (isUserPinned(field as string, history)) return;
    if (current[field] === value) return;
    next[field] = value;
    written.push(field as string);
  };

  // Salary facts only when confidently detected.
  if (
    state.salary.source === 'detected' &&
    state.salary.confidence >= SALARY_WRITE_MIN_CONFIDENCE
  ) {
    if (state.salary.paydayDayOfMonth != null) {
      setIfChanged('paydayDayOfMonth', state.salary.paydayDayOfMonth);
    }
    if (state.salary.amountMedian != null && state.salary.amountMedian > 0) {
      setIfChanged('detectedSalaryBand', salaryBand(state.salary.amountMedian));
    }
  }

  // Archetype: only when the scorer produced a winner backed by evidence.
  if (state.archetype.archetype && state.archetype.evidence.length >= 2) {
    setIfChanged('archetype', state.archetype.archetype);
  }

  // Impulse index: dampened — write only on meaningful movement.
  if (state.behavior.impulseIndex != null) {
    const prev = current.impulseIndex;
    if (prev == null || Math.abs(prev - state.behavior.impulseIndex) >= IMPULSE_WRITE_DELTA) {
      setIfChanged('impulseIndex', state.behavior.impulseIndex);
    }
  }

  if (state.behavior.spendTiming && state.behavior.spendTiming.basisCycles >= 2) {
    setIfChanged('spendTiming', state.behavior.spendTiming.profile);
  }
  if (state.behavior.weekendWeekdayRatio != null) {
    const prev = current.weekendWeekdayRatio;
    if (prev == null || Math.abs(prev - state.behavior.weekendWeekdayRatio) >= 0.25) {
      setIfChanged('weekendWeekdayRatio', state.behavior.weekendWeekdayRatio);
    }
  }
  if (state.behavior.budgetAdherenceStreak != null) {
    setIfChanged('budgetAdherenceStreak', state.behavior.budgetAdherenceStreak);
  }

  if (written.length === 0) return [];
  await writeMemoryFields(userId, { behaviorSignals: next }, MEMORY_WRITE_SOURCE);
  return written;
}

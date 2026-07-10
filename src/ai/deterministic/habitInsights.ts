/**
 * Habit insights + course prescriptions — individual roadmap B2 and
 * Pillar D (predictive engine Phase 2).
 *
 * Turns the behaviour signals the engine already computes into a small
 * ranked set of *specific, evidence-carrying* observations, each paired
 * with exactly one nudge and one course from the library. The pairing
 * is the differentiator the roadmap calls out: no competitor holds both
 * live behavioural data AND a structured curriculum, so the mirror can
 * prescribe, not just describe.
 *
 * Pure function over already-computed state — the card renders it, the
 * prompt composer cites it, nothing here does I/O.
 */

import { ComputedBehaviorSignals } from './behaviorProfile';
import { RecurringSeries } from './recurringSeries';

export type HabitInsightId =
  | 'impulse_after_payday'
  | 'weekend_heavy'
  | 'front_loaded_cycle'
  | 'subscription_load'
  | 'adherence_streak';

export interface HabitInsight {
  id: HabitInsightId;
  /** Higher = shown first. Derived from how far the signal deviates. */
  weight: number;
  /** ICU params for the message strings (percent values are 0-100). */
  params: Record<string, number>;
  /** Course subject slug (SUBJECT_ORDER) — UI composes the locale id. */
  courseSubject: string;
  courseLevel: 'basic' | 'intermediate' | 'advanced';
}

// Thresholds: an insight has to be *earned* — a signal in the normal
// band produces nothing, so the card never pads itself with filler.
export const IMPULSE_THRESHOLD = 0.3; // ≥30% of flexible spend in 72h post-income
export const WEEKEND_RATIO_THRESHOLD = 1.8; // weekend day ≥1.8× weekday day
export const FRONT_LOAD_THRESHOLD = 0.45; // ≥45% of cycle spend in first third
export const SUBSCRIPTION_COUNT_THRESHOLD = 3;
export const ADHERENCE_STREAK_THRESHOLD = 3; // months — the positive one

/** Active monthly expense series that look like subscriptions. */
export function subscriptionLoad(series: RecurringSeries[]): {
  count: number;
  monthlyTotal: number;
} {
  let count = 0;
  let monthlyTotal = 0;
  for (const s of series) {
    if (!s.active || s.direction !== 'expense' || s.cadence !== 'monthly') continue;
    if (s.categoryId === 'housing' || s.categoryId === 'bills') continue; // commitments, not subscriptions
    count += 1;
    monthlyTotal += s.amountMedian;
  }
  return { count, monthlyTotal: Math.round(monthlyTotal * 100) / 100 };
}

export function deriveHabitInsights(input: {
  behavior: ComputedBehaviorSignals;
  series: RecurringSeries[];
}): HabitInsight[] {
  const { behavior, series } = input;
  const out: HabitInsight[] = [];

  if (behavior.impulseIndex !== null && behavior.impulseIndex >= IMPULSE_THRESHOLD) {
    out.push({
      id: 'impulse_after_payday',
      weight: behavior.impulseIndex,
      params: { percent: Math.round(behavior.impulseIndex * 100) },
      courseSubject: 'budgeting_money_management',
      courseLevel: 'basic',
    });
  }

  if (
    behavior.weekendWeekdayRatio !== null &&
    behavior.weekendWeekdayRatio >= WEEKEND_RATIO_THRESHOLD
  ) {
    out.push({
      id: 'weekend_heavy',
      weight: behavior.weekendWeekdayRatio / 4, // ratio 2 ≈ weight 0.5
      params: { ratio: Math.round(behavior.weekendWeekdayRatio * 10) / 10 },
      courseSubject: 'budgeting_money_management',
      courseLevel: 'intermediate',
    });
  }

  if (
    behavior.spendTiming &&
    behavior.spendTiming.profile === 'front_loader' &&
    behavior.spendTiming.thirdShares[0] >= FRONT_LOAD_THRESHOLD
  ) {
    out.push({
      id: 'front_loaded_cycle',
      weight: behavior.spendTiming.thirdShares[0],
      params: { percent: Math.round(behavior.spendTiming.thirdShares[0] * 100) },
      courseSubject: 'saving_emergency_planning',
      courseLevel: 'basic',
    });
  }

  const subs = subscriptionLoad(series);
  if (subs.count >= SUBSCRIPTION_COUNT_THRESHOLD && subs.monthlyTotal > 0) {
    out.push({
      id: 'subscription_load',
      weight: 0.3 + subs.count * 0.05,
      params: { count: subs.count, amount: subs.monthlyTotal },
      courseSubject: 'budgeting_money_management',
      courseLevel: 'intermediate',
    });
  }

  // The one positive mirror: a real adherence streak earns encouragement
  // toward the next level, not a warning.
  if (
    behavior.budgetAdherenceStreak !== null &&
    behavior.budgetAdherenceStreak >= ADHERENCE_STREAK_THRESHOLD
  ) {
    out.push({
      id: 'adherence_streak',
      weight: 0.2 + behavior.budgetAdherenceStreak * 0.02,
      params: { months: behavior.budgetAdherenceStreak },
      courseSubject: 'investment_fundamentals',
      courseLevel: 'basic',
    });
  }

  return out.sort((a, b) => b.weight - a.weight);
}

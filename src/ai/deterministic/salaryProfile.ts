/**
 * Salary detection — individual roadmap item A1.
 *
 * Picks the user's salary out of the detected income series, or falls back
 * to the onboarding profile (persona + declared monthly income) so day-one
 * users still get a working Safe-to-Spend.
 *
 * Precedence everywhere downstream: user payday override > detected > calendar.
 */

import type { RecurringSeries } from './recurringSeries';
import { cadenceTolerance } from './recurringSeries';

export interface SalaryProfile {
  source: 'detected' | 'profile_fallback' | 'none';
  paydayDayOfMonth: number | null; // null for biweekly-detected or fallback
  cadence: 'monthly' | 'biweekly' | null;
  amountMedian: number | null; // base currency
  // 0..1 — half interval regularity, half amount stability.
  stability: number | null;
  confidence: number; // 0 for 'none'; fallback pinned at 0.3
  seriesKey: string | null;
  nextPayday: string | null; // ISO
}

export interface ProfileFallback {
  persona: 'salaried' | 'variable' | 'student' | null;
  monthlyIncome: number | null;
}

// Below this share of the user's typical monthly income, a recurring income
// series is a side gig, not the salary — never crown it.
export const SALARY_DOMINANCE_FLOOR = 0.4;
export const SALARY_MIN_CONFIDENCE = 0.4;
export const FALLBACK_CONFIDENCE = 0.3;

export function deriveSalaryProfile(
  series: RecurringSeries[],
  fallback: ProfileFallback,
  medianMonthlyIncome: number,
): SalaryProfile {
  const candidates = series.filter(
    (s) =>
      s.direction === 'income' &&
      s.active &&
      (s.cadence === 'monthly' || s.cadence === 'biweekly') &&
      s.confidence >= SALARY_MIN_CONFIDENCE &&
      (medianMonthlyIncome <= 0 || s.amountMedian >= SALARY_DOMINANCE_FLOOR * medianMonthlyIncome),
  );

  let best: RecurringSeries | null = null;
  let bestScore = -Infinity;
  for (const s of candidates) {
    const score = s.amountMedian * s.confidence * (s.categoryId === 'salary' ? 1.25 : 1);
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  }

  if (best) {
    const intervalRegularity = 1 - Math.min(1, best.intervalMadDays / cadenceTolerance(best.cadence));
    const amountStability =
      best.amountMedian > 0 ? 1 - Math.min(1, best.amountMad / (0.25 * best.amountMedian)) : 0;
    return {
      source: 'detected',
      paydayDayOfMonth: best.cadence === 'monthly' ? best.anchorDayOfMonth : null,
      cadence: best.cadence as 'monthly' | 'biweekly',
      amountMedian: best.amountMedian,
      stability: Math.round((0.5 * intervalRegularity + 0.5 * amountStability) * 1000) / 1000,
      confidence: best.confidence,
      seriesKey: best.key,
      nextPayday: best.nextDueDate,
    };
  }

  if (fallback.persona === 'salaried' && fallback.monthlyIncome != null && fallback.monthlyIncome > 0) {
    return {
      source: 'profile_fallback',
      paydayDayOfMonth: null, // the UI prompts for the day and writes the override
      cadence: null,
      amountMedian: fallback.monthlyIncome,
      stability: null,
      confidence: FALLBACK_CONFIDENCE,
      seriesKey: null,
      nextPayday: null,
    };
  }

  return {
    source: 'none',
    paydayDayOfMonth: null,
    cadence: null,
    amountMedian: null,
    stability: null,
    confidence: 0,
    seriesKey: null,
    nextPayday: null,
  };
}

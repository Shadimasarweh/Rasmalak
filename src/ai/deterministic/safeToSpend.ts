/**
 * Safe-to-Spend (المتاح للصرف) — individual roadmap item A3.
 *
 *   total = currentBalance
 *         − committed bills still due this cycle   (recurring series)
 *         − goal contributions still planned       (deadline-driven funding)
 *         − reserve buffer                         (P75 − P50 discretionary)
 *
 * Deliberately conservative: expected salary income before cycle end is NOT
 * added (a payday-anchored cycle ends the day before payday anyway), and the
 * buffer prices in an above-median spending pace. Every subtraction is
 * itemized in `breakdown` — the "لماذا هذا الرقم؟" explainer renders it and
 * the numbers must sum exactly.
 */

import { dateToDayNumber, isoToDayNumber } from './dates';
import { isGoalFunding, type CycleRange, type EngineTransaction } from './engineTypes';
import type { CashflowForecast } from './cashflowForecast';

export interface SafeToSpendResult {
  total: number; // signed — the UI decides how to render negative honestly
  // Per-day allowance including today: the cycle ends the day BEFORE payday,
  // so days-to-payday = daysRemaining + 1.
  perDay: number;
  daysToPayday: number;
  isNegative: boolean;
  breakdown: {
    currentBalance: number;
    committedRemaining: number;
    goalContributionsRemaining: number;
    reserveBuffer: number;
  };
}

export interface SafeToSpendInput {
  forecast: CashflowForecast;
  // Σ getMonthlyFundingAmount over active goals — supplied by the caller
  // (the engine never imports the goals store).
  plannedGoalContributionsMonthly: number;
  goalContributedThisCycle: number;
}

export function computeSafeToSpend(input: SafeToSpendInput): SafeToSpendResult {
  const committedRemaining = input.forecast.committed.totalRemaining;
  const goalContributionsRemaining = Math.max(
    0,
    (input.plannedGoalContributionsMonthly || 0) - (input.goalContributedThisCycle || 0),
  );
  const reserveBuffer = Math.max(
    0,
    input.forecast.discretionary.remainingP75 - input.forecast.discretionary.remainingP50,
  );

  const total =
    input.forecast.currentBalance - committedRemaining - goalContributionsRemaining - reserveBuffer;
  const daysToPayday = Math.max(1, input.forecast.cycle.daysRemaining + 1);

  return {
    total: round2(total),
    perDay: round2(Math.max(0, total) / daysToPayday),
    daysToPayday,
    isNegative: total < 0,
    breakdown: {
      currentBalance: round2(input.forecast.currentBalance),
      committedRemaining: round2(committedRemaining),
      goalContributionsRemaining: round2(goalContributionsRemaining),
      reserveBuffer: round2(reserveBuffer),
    },
  };
}

// Goal-funding transfers already made this cycle — they reduce what still
// needs to be set aside.
export function sumGoalFundingInCycle(txns: EngineTransaction[], cycle: CycleRange): number {
  const startDay = dateToDayNumber(cycle.start);
  const endDay = dateToDayNumber(cycle.end);
  let sum = 0;
  for (const tx of txns) {
    if (tx.type !== 'expense' || !isGoalFunding(tx.category) || !Number.isFinite(tx.amountBase)) continue;
    const d = isoToDayNumber(tx.date);
    if (d >= startDay && d <= endDay) sum += Math.abs(tx.amountBase);
  }
  return round2(sum);
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

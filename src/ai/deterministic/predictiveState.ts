/**
 * Predictive-state assembler — the single entry point the app calls.
 *
 * Pure: PredictiveInputs in, PredictiveState out. Assembly order matters —
 * series feed salary, salary resolves the cycle, the cycle windows the
 * forecast/deviations, and everything feeds Safe-to-Spend.
 *
 * summarizeForContext() produces the compact slice that rides inside
 * UserFinancialContext to the chat route (the server never sees, nor needs,
 * the full transaction history).
 */

import { getCycleRange, type CycleRange } from '@/lib/cycles';
import { dateToDayNumber, isoToDayNumber, toIso } from './dates';
import { PREDICTIVE_ENGINE_VERSION, type EngineTransaction } from './engineTypes';
import { detectRecurringSeries, collectSeriesMemberIds, type RecurringSeries } from './recurringSeries';
import { deriveSalaryProfile, type ProfileFallback, type SalaryProfile } from './salaryProfile';
import {
  computeCategoryBaselines,
  detectCategoryDeviations,
  type CategoryBaseline,
  type CategoryDeviation,
} from './categoryBaselines';
import { computeCashflowForecast, type CashflowForecast } from './cashflowForecast';
import {
  computeBehaviorSignals,
  computeMedianMonthlyIncome,
  deriveArchetype,
  type Archetype,
  type ArchetypeAux,
  type ArchetypeResult,
  type ComputedBehaviorSignals,
} from './behaviorProfile';
import { computeSafeToSpend, sumGoalFundingInCycle, type SafeToSpendResult } from './safeToSpend';

export interface PredictiveState {
  computedAt: string;
  engineVersion: string;
  series: RecurringSeries[];
  salary: SalaryProfile;
  cycle: CycleRange;
  baselines: CategoryBaseline[];
  deviations: CategoryDeviation[];
  forecast: CashflowForecast;
  behavior: ComputedBehaviorSignals;
  archetype: ArchetypeResult;
  safeToSpend: SafeToSpendResult;
  meta: {
    daysOfHistory: number;
    hasMinimumHistory: boolean; // ≥28 days AND ≥10 transactions
    transactionCount: number;
  };
}

export interface PredictiveInputs {
  transactions: EngineTransaction[];
  // getNetBalance() from the store: all-time Σ income − Σ expense (amountBase).
  currentBalance: number;
  profileFallback: ProfileFallback;
  // profiles.payday_day_of_month — the user's explicit setting always wins
  // over detection.
  paydayOverride: number | null;
  plannedGoalContributionsMonthly: number;
  budgetHistory?: Array<{ monthYear: string; monthlyBudget: number }>;
  aux?: ArchetypeAux;
  now?: Date;
  weekendDays?: number[];
}

export const MIN_HISTORY_DAYS = 28;
export const MIN_HISTORY_TRANSACTIONS = 10;

export function computePredictiveState(input: PredictiveInputs): PredictiveState {
  const now = input.now ?? new Date();
  const nowDay = dateToDayNumber(now);

  const series = detectRecurringSeries(input.transactions, { now });
  const medianMonthlyIncome = computeMedianMonthlyIncome(input.transactions);
  const salary = deriveSalaryProfile(series, input.profileFallback, medianMonthlyIncome);

  // The engine's cycle is payday-anchored whenever a payday is known —
  // Safe-to-Spend is about payday reality regardless of the budget-window
  // setting (that setting governs the UI's budget screens instead).
  const effectivePayday = input.paydayOverride ?? salary.paydayDayOfMonth;
  const cycle = getCycleRange({
    mode: effectivePayday != null ? 'payday' : 'calendar',
    anchorDay: effectivePayday,
    now,
  });

  const seriesMemberIds = collectSeriesMemberIds(series);
  const baselines = computeCategoryBaselines(input.transactions, {
    now,
    excludeTransactionIds: seriesMemberIds,
  });

  const cycleStartDay = dateToDayNumber(cycle.start);
  const cycleTxns = input.transactions.filter((tx) => {
    const d = isoToDayNumber(tx.date);
    return d >= cycleStartDay && d <= nowDay;
  });
  const deviations = detectCategoryDeviations(baselines, cycleTxns, cycle, seriesMemberIds);

  const forecast = computeCashflowForecast({
    transactions: input.transactions,
    series,
    cycle,
    anchorDay: effectivePayday,
    currentBalance: input.currentBalance,
    now,
  });

  const behavior = computeBehaviorSignals({
    transactions: input.transactions,
    series,
    salary,
    budgetHistory: input.budgetHistory,
    now,
    weekendDays: input.weekendDays,
  });
  const archetype = deriveArchetype(behavior, input.aux ?? {});

  const safeToSpend = computeSafeToSpend({
    forecast,
    plannedGoalContributionsMonthly: input.plannedGoalContributionsMonthly,
    goalContributedThisCycle: sumGoalFundingInCycle(input.transactions, cycle),
  });

  const validDays = input.transactions
    .map((t) => isoToDayNumber(t.date))
    .filter((d) => Number.isFinite(d));
  const daysOfHistory = validDays.length > 0 ? Math.max(0, nowDay - Math.min(...validDays)) : 0;

  return {
    computedAt: toIso({ year: now.getFullYear(), monthIndex: now.getMonth(), day: now.getDate() }),
    engineVersion: PREDICTIVE_ENGINE_VERSION,
    series,
    salary,
    cycle,
    baselines,
    deviations,
    forecast,
    behavior,
    archetype,
    safeToSpend,
    meta: {
      daysOfHistory,
      hasMinimumHistory:
        daysOfHistory >= MIN_HISTORY_DAYS && input.transactions.length >= MIN_HISTORY_TRANSACTIONS,
      transactionCount: input.transactions.length,
    },
  };
}

// ============================================================
// Prompt-safe summary (rides in UserFinancialContext.predictive)
// ============================================================

export interface PredictiveContextSummary {
  cycle: { start: string; end: string; daysRemaining: number; anchor: 'payday' | 'calendar' };
  endOfCycleBalance: { p25: number; p50: number; p75: number };
  committedRemaining: number;
  upcomingBills: Array<{ label: string; dueDate: string; amount: number }>;
  safeToSpend: { total: number; perDay: number };
  salary: { detected: boolean; paydayDayOfMonth: number | null };
  baselineDeviations: Array<{
    category: string;
    paceAdjustedSpend: number;
    monthlyMedian: number;
    madUnits: number;
    severity: 'medium' | 'high';
  }>;
  archetype: Archetype | null;
  behavior: {
    impulseIndex: number | null;
    spendTiming: string | null;
    weekendWeekdayRatio: number | null;
  };
  confidence: 'low' | 'medium' | 'high';
}

export function summarizeForContext(state: PredictiveState): PredictiveContextSummary {
  return {
    cycle: state.forecast.cycle,
    endOfCycleBalance: state.forecast.endOfCycleBalance,
    committedRemaining: state.forecast.committed.totalRemaining,
    upcomingBills: [...state.forecast.committed.items]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((i) => ({ label: i.label, dueDate: i.dueDate, amount: i.amount })),
    safeToSpend: { total: state.safeToSpend.total, perDay: state.safeToSpend.perDay },
    salary: {
      detected: state.salary.source === 'detected',
      paydayDayOfMonth: state.salary.paydayDayOfMonth,
    },
    baselineDeviations: state.deviations
      .filter((d): d is CategoryDeviation & { severity: 'medium' | 'high' } => d.severity !== 'none')
      .slice(0, 5)
      .map((d) => ({
        category: d.categoryId,
        paceAdjustedSpend: d.paceAdjustedSpend,
        monthlyMedian: d.monthlyMedian,
        madUnits: d.deviationMadUnits,
        severity: d.severity,
      })),
    archetype: state.archetype.archetype,
    behavior: {
      impulseIndex: state.behavior.impulseIndex,
      spendTiming: state.behavior.spendTiming?.profile ?? null,
      weekendWeekdayRatio: state.behavior.weekendWeekdayRatio,
    },
    confidence: state.forecast.basis.confidence,
  };
}

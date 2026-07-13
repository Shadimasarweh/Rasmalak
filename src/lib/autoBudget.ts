/**
 * autoBudget — Pure suggestion engine for next-month plan amounts.
 *
 * Inputs are plain transaction-shaped data and a reference date. Output is
 * a deterministic per-category suggestion derived from the user's recent
 * spending. No I/O, no React, no LLM here — this is the foundation that
 * the AI refinement (see src/ai/orchestrator.ts) sits on top of.
 *
 * v2 (predictive engine Phase 1, item 4): recency-weighted EWMA over the
 * last 6 completed months with a per-category trend term, replacing the
 * flat 3-month mean. Two robustness rules:
 *   - Absent ≠ zero: a month with no transactions AT ALL is a gap month
 *     (the user wasn't logging) and is dropped from every category's
 *     series; an active month without this category is a true zero.
 *   - Spike guard: the "never below last month" floor is capped at
 *     median + 3×MAD, so a one-off expensive month doesn't pin the plan.
 *
 * Design intent (from the Plan vs Track redesign):
 *   - Past informs future, but past is NOT the plan itself.
 *   - Suggestions must be obviously rounded so users don't think we're
 *     telling them an exact number.
 *   - We need to expose how confident we are so the UI can dim low-signal
 *     suggestions.
 */

import { ewma, leastSquaresSlope, median, mad, effectiveMad } from '@/ai/deterministic/stats';

export interface AutoBudgetTransaction {
  type: 'income' | 'expense';
  amount: number;
  // Base-currency value at the time of entry. Auto-budget projects
  // forward in base currency only — see currency architecture rule
  // in CLAUDE.md.
  amountBase: number;
  date: string; // ISO date
  category: string | null;
}

export interface AutoBudgetCategorySuggestion {
  categoryId: string;
  suggestedAmount: number;
  basedOnMonths: number;
  monthlyAverage: number;
  monthlyMax: number;
  confidence: 'low' | 'medium' | 'high';
  // v2 diagnostics (optional so persisted/serialized v1 shapes stay valid)
  ewma?: number;
  trendPerMonth?: number;
  monthsAbsent?: number;
  // 'prior_blend' = shrunk toward the regional cold-start prior
  // (ai/deterministic/countryPriors.ts) because history is thin.
  method?: 'ewma_v2' | 'prior_blend';
}

export interface AutoBudgetResult {
  byCategory: Record<string, AutoBudgetCategorySuggestion>;
  totalSuggested: number;
  totalAverage: number;
  monthsAnalyzed: number;
  hasEnoughHistory: boolean;
  method?: 'flat_v1' | 'ewma_v2' | 'prior_blend';
}

export interface AutoBudgetOptions {
  // How many full months of history to analyze (1-12). Default 6 — EWMA
  // needs depth; recent months still dominate via the weights.
  lookbackMonths?: number;
  // Reference "now" used for window math. Default new Date().
  now?: Date;
  // Rounding granularity for the suggested amount in the user's currency.
  // Default 5 — produces clean numbers like 25, 100, 235.
  roundTo?: number;
  // Buffer over the projection, expressed as a fraction (0.05 = 5% headroom).
  // Default 0.05 so the plan is realistic, not a stretch goal.
  buffer?: number;
}

const DEFAULT_LOOKBACK = 6;
const DEFAULT_ROUND_TO = 5;
const DEFAULT_BUFFER = 0.05;
// Recency weight for the EWMA and the cap on how much the trend term may
// move the projection (fraction of the EWMA).
const EWMA_ALPHA = 0.5;
const TREND_CLAMP_FRACTION = 0.2;
const SPIKE_GUARD_MAD_MULTIPLIER = 3;

function roundUpTo(value: number, granularity: number): number {
  if (granularity <= 0) return Math.round(value);
  return Math.ceil(value / granularity) * granularity;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1, 0, 0, 0, 0);
}

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0, 23, 59, 59, 999);
}

/**
 * Suggest a per-category plan for the *next* full month based on the last
 * N completed months (excluding the current, partially-elapsed month).
 *
 * The window is closed-open: we include the previous month and earlier
 * but exclude the current month so that mid-month projections don't
 * skew the suggestion downward.
 */
export function suggestNextMonthPlan(
  transactions: AutoBudgetTransaction[],
  options: AutoBudgetOptions = {},
): AutoBudgetResult {
  const lookbackMonths = Math.max(1, Math.min(12, options.lookbackMonths ?? DEFAULT_LOOKBACK));
  const now = options.now ?? new Date();
  const roundTo = options.roundTo ?? DEFAULT_ROUND_TO;
  const buffer = options.buffer ?? DEFAULT_BUFFER;

  // Build window: last N completed months (skip current month), newest first.
  const windowMonths: { year: number; month: number }[] = [];
  for (let offset = 1; offset <= lookbackMonths; offset++) {
    const ref = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    windowMonths.push({ year: ref.getFullYear(), month: ref.getMonth() });
  }

  const windowStart = startOfMonth(
    windowMonths[windowMonths.length - 1].year,
    windowMonths[windowMonths.length - 1].month,
  );
  const windowEnd = endOfMonth(windowMonths[0].year, windowMonths[0].month);

  // category -> monthKey -> total
  const perCategoryPerMonth = new Map<string, Map<string, number>>();
  const monthsWithAnyExpense = new Set<string>();
  // Any transaction (income too) marks a month as "the user was logging" —
  // this is what separates gap months from true zeros.
  const monthsWithAnyActivity = new Set<string>();

  for (const tx of transactions) {
    if (!tx.amountBase || !Number.isFinite(tx.amountBase)) continue;
    const d = new Date(tx.date);
    if (isNaN(d.getTime())) continue;
    if (d < windowStart || d > windowEnd) continue;

    const key = monthKey(d);
    monthsWithAnyActivity.add(key);
    if (tx.type !== 'expense') continue;

    const cat = tx.category || 'other-expense';
    const catMap = perCategoryPerMonth.get(cat) ?? new Map<string, number>();
    // Auto-budget projects in base currency — the user's "spending budget" is base.
    catMap.set(key, (catMap.get(key) ?? 0) + Math.abs(tx.amountBase));
    perCategoryPerMonth.set(cat, catMap);
    monthsWithAnyExpense.add(key);
  }

  const monthsAnalyzed = monthsWithAnyExpense.size;
  const hasEnoughHistory = monthsAnalyzed >= 1;

  // Oldest-first keys of months the user was actually logging in.
  const includedKeys = [...windowMonths]
    .reverse()
    .map(({ year, month }) => `${year}-${String(month + 1).padStart(2, '0')}`)
    .filter((key) => monthsWithAnyActivity.has(key));
  const monthsAbsent = windowMonths.length - includedKeys.length;

  const byCategory: Record<string, AutoBudgetCategorySuggestion> = {};
  let totalSuggested = 0;
  let totalAverage = 0;

  for (const [categoryId, monthMap] of perCategoryPerMonth.entries()) {
    // Oldest-first series over included months; missing entries in an
    // active month are genuine zeros.
    const values = includedKeys.map((key) => monthMap.get(key) ?? 0);
    const monthsWithThisCategory = values.filter((v) => v > 0).length;
    if (monthsWithThisCategory === 0) continue;

    const sum = values.reduce((s, v) => s + v, 0);
    const average = sum / values.length;
    const max = Math.max(...values);

    const smoothed = ewma(values, EWMA_ALPHA);
    const trendCap = TREND_CLAMP_FRACTION * smoothed;
    const trend = Math.max(-trendCap, Math.min(trendCap, leastSquaresSlope(values)));
    const projected = Math.max(0, smoothed + trend);

    // "Never below last month" keeps a fresh commitment funded, but a one-off
    // spike month must not pin the whole plan — cap the floor at a robust
    // upper bound of typical months.
    const lastMonthValue = values[values.length - 1];
    const med = median(values);
    const spikeGuard = med + SPIKE_GUARD_MAD_MULTIPLIER * effectiveMad(mad(values, med), med);
    const floor = Math.min(lastMonthValue, spikeGuard);

    const suggested = roundUpTo(Math.max(projected * (1 + buffer), floor), roundTo);

    const confidence: AutoBudgetCategorySuggestion['confidence'] =
      monthsWithThisCategory >= 3 ? 'high' : monthsWithThisCategory === 2 ? 'medium' : 'low';

    byCategory[categoryId] = {
      categoryId,
      suggestedAmount: suggested,
      basedOnMonths: monthsWithThisCategory,
      monthlyAverage: Math.round(average * 100) / 100,
      monthlyMax: Math.round(max * 100) / 100,
      confidence,
      ewma: Math.round(smoothed * 100) / 100,
      trendPerMonth: Math.round(trend * 100) / 100,
      monthsAbsent,
      method: 'ewma_v2',
    };

    totalSuggested += suggested;
    totalAverage += average;
  }

  return {
    byCategory,
    totalSuggested: roundUpTo(totalSuggested, roundTo),
    totalAverage: Math.round(totalAverage * 100) / 100,
    monthsAnalyzed,
    hasEnoughHistory,
    method: 'ewma_v2',
  };
}

/**
 * Localize the rationale label shown next to a suggested value.
 * Kept here (not in i18n) because the message includes a count interpolation
 * that the i18n module already handles via a generic key.
 */
export function suggestionRationale(
  suggestion: AutoBudgetCategorySuggestion,
  locale: 'en' | 'ar',
): string {
  const monthsWord = locale === 'ar'
    ? (suggestion.basedOnMonths === 1 ? 'شهر واحد' : `${suggestion.basedOnMonths} أشهر`)
    : (suggestion.basedOnMonths === 1 ? '1 month' : `${suggestion.basedOnMonths} months`);
  return locale === 'ar'
    ? `بناءً على متوسط ${monthsWord} السابقة (~${Math.round(suggestion.monthlyAverage)})`
    : `Based on the last ${monthsWord} (~${Math.round(suggestion.monthlyAverage)})`;
}

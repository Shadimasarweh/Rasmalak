/**
 * autoBudget — Pure suggestion engine for next-month plan amounts.
 *
 * Inputs are plain transaction-shaped data and a reference date. Output is
 * a deterministic per-category suggestion derived from the user's recent
 * spending. No I/O, no React, no LLM here — this is the foundation that
 * the AI refinement (see src/ai/orchestrator.ts) sits on top of.
 *
 * Design intent (from the Plan vs Track redesign):
 *   - Past informs future, but past is NOT the plan itself.
 *   - Suggestions must be obviously rounded so users don't think we're
 *     telling them an exact number.
 *   - We need to expose how confident we are so the UI can dim low-signal
 *     suggestions.
 */

export interface AutoBudgetTransaction {
  type: 'income' | 'expense';
  amount: number;
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
}

export interface AutoBudgetResult {
  byCategory: Record<string, AutoBudgetCategorySuggestion>;
  totalSuggested: number;
  totalAverage: number;
  monthsAnalyzed: number;
  hasEnoughHistory: boolean;
}

export interface AutoBudgetOptions {
  // How many full months of history to analyze (1-12). Default 3.
  lookbackMonths?: number;
  // Reference "now" used for window math. Default new Date().
  now?: Date;
  // Rounding granularity for the suggested amount in the user's currency.
  // Default 5 — produces clean numbers like 25, 100, 235.
  roundTo?: number;
  // Buffer over the average, expressed as a fraction (0.05 = 5% headroom).
  // Default 0.05 so the plan is realistic, not a stretch goal.
  buffer?: number;
}

const DEFAULT_LOOKBACK = 3;
const DEFAULT_ROUND_TO = 5;
const DEFAULT_BUFFER = 0.05;

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

  // Build window: last N completed months (skip current month).
  // e.g. if now is 2026-05-04 and lookback=3, window is Feb, Mar, Apr 2026.
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

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (!tx.amount || !Number.isFinite(tx.amount)) continue;
    const d = new Date(tx.date);
    if (isNaN(d.getTime())) continue;
    if (d < windowStart || d > windowEnd) continue;

    const cat = tx.category || 'other-expense';
    const key = monthKey(d);
    const catMap = perCategoryPerMonth.get(cat) ?? new Map<string, number>();
    catMap.set(key, (catMap.get(key) ?? 0) + Math.abs(tx.amount));
    perCategoryPerMonth.set(cat, catMap);
    monthsWithAnyExpense.add(key);
  }

  const monthsAnalyzed = monthsWithAnyExpense.size;
  const hasEnoughHistory = monthsAnalyzed >= 1;

  const byCategory: Record<string, AutoBudgetCategorySuggestion> = {};
  let totalSuggested = 0;
  let totalAverage = 0;

  for (const [categoryId, monthMap] of perCategoryPerMonth.entries()) {
    const monthlyTotals: number[] = [];
    for (const { year, month } of windowMonths) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      // Treat missing months as 0 — a category that didn't appear last month
      // legitimately drags the average down.
      monthlyTotals.push(monthMap.get(key) ?? 0);
    }

    const monthsWithThisCategory = monthlyTotals.filter((v) => v > 0).length;
    if (monthsWithThisCategory === 0) continue;

    const sum = monthlyTotals.reduce((s, v) => s + v, 0);
    const average = sum / monthlyTotals.length;
    const max = Math.max(...monthlyTotals);

    // Use the higher of (average + buffer) and the most recent month so the
    // plan isn't immediately tight if last month was a spike.
    const lastMonthValue = monthlyTotals[0];
    const baseline = Math.max(average * (1 + buffer), lastMonthValue);
    const suggested = roundUpTo(baseline, roundTo);

    const confidence: AutoBudgetCategorySuggestion['confidence'] =
      monthsWithThisCategory >= 3 ? 'high' : monthsWithThisCategory === 2 ? 'medium' : 'low';

    byCategory[categoryId] = {
      categoryId,
      suggestedAmount: suggested,
      basedOnMonths: monthsWithThisCategory,
      monthlyAverage: Math.round(average * 100) / 100,
      monthlyMax: Math.round(max * 100) / 100,
      confidence,
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

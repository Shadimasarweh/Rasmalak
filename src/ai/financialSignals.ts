/**
 * Rasmalak – Deterministic Financial Signals
 * ===========================================
 * A pure-TypeScript computation layer that derives numerical signals
 * from raw financial data.  These signals are injected into the AI
 * context so model reasoning is grounded in deterministic metrics
 * rather than relying entirely on prompt interpretation.
 *
 * Zero external dependencies.  No OpenAI, no network, no side-effects.
 */

// ============================================
// PUBLIC INTERFACE
// ============================================

export interface FinancialSignals {
  /** (income − expenses) / income.  0–1 range. */
  savingsRate?: number;
  /** discretionary / total expenses.  0–1 range. */
  discretionaryRatio?: number;
  /** σ(monthlyExpenses) / μ(monthlyExpenses).  0–1 clamped. */
  expenseVolatility?: number;
  /** 1 − σ(monthlyIncome) / μ(monthlyIncome).  0–1 clamped. */
  incomeStability?: number;
  /** recurring / total expenses.  0–1 range. */
  recurringExpenseRatio?: number;
  /** true when last-month expenses exceed previous month by >10 %. */
  negativeTrendDetected?: boolean;
  /** Average (current / target) across all goals.  0–1 range. */
  goalFundingProgress?: number;
}

export interface SignalSummary {
  totalIncome: number;
  totalExpenses: number;
  recurringExpenses: number;
  discretionaryExpenses: number;
  /** Chronological order – oldest first (e.g. [jan, feb, mar]). */
  monthlyExpenses: number[];
  /** Chronological order – oldest first. */
  monthlyIncome: number[];
  goals?: { target: number; current: number }[];
}

// ============================================
// HELPERS
// ============================================

/** Clamp a number to [0, 1]. */
function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Arithmetic mean.  Returns 0 for empty arrays. */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/** Population standard deviation.  Returns 0 for < 2 values. */
function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  let sumSq = 0;
  for (const v of values) sumSq += (v - avg) ** 2;
  return Math.sqrt(sumSq / values.length);
}

// ============================================
// MAIN COMPUTATION
// ============================================

export function computeFinancialSignals(summary: SignalSummary): FinancialSignals {
  const signals: FinancialSignals = {};

  // 1) savingsRate = (income − expenses) / income
  if (summary.totalIncome > 0) {
    signals.savingsRate = clamp01(
      (summary.totalIncome - summary.totalExpenses) / summary.totalIncome,
    );
  }

  // 2) discretionaryRatio = discretionary / total expenses
  if (summary.totalExpenses > 0) {
    signals.discretionaryRatio = clamp01(
      summary.discretionaryExpenses / summary.totalExpenses,
    );
  }

  // 3) recurringExpenseRatio = recurring / total expenses
  if (summary.totalExpenses > 0) {
    signals.recurringExpenseRatio = clamp01(
      summary.recurringExpenses / summary.totalExpenses,
    );
  }

  // 4) expenseVolatility = stddev(monthly) / mean(monthly)
  if (summary.monthlyExpenses.length >= 2) {
    const mu = mean(summary.monthlyExpenses);
    if (mu > 0) {
      signals.expenseVolatility = clamp01(stddev(summary.monthlyExpenses) / mu);
    }
  }

  // 5) incomeStability = 1 − stddev(monthly) / mean(monthly)
  if (summary.monthlyIncome.length >= 2) {
    const mu = mean(summary.monthlyIncome);
    if (mu > 0) {
      signals.incomeStability = clamp01(1 - stddev(summary.monthlyIncome) / mu);
    }
  }

  // 6) negativeTrendDetected: last > previous by >10 %
  if (summary.monthlyExpenses.length >= 2) {
    const last = summary.monthlyExpenses[summary.monthlyExpenses.length - 1];
    const prev = summary.monthlyExpenses[summary.monthlyExpenses.length - 2];
    if (prev > 0) {
      signals.negativeTrendDetected = (last - prev) / prev > 0.1;
    }
  }

  // 7) goalFundingProgress = avg(current / target)
  if (summary.goals && summary.goals.length > 0) {
    let sum = 0;
    let count = 0;
    for (const g of summary.goals) {
      if (g.target > 0) {
        sum += clamp01(g.current / g.target);
        count++;
      }
    }
    if (count > 0) {
      signals.goalFundingProgress = clamp01(sum / count);
    }
  }

  return signals;
}

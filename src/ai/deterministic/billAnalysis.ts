/**
 * Bill Analysis (Deterministic)
 * ==============================
 * Pure functions that take an `ExtractedDocument` plus the user's recent
 * financial context and produce a small set of actionable insights:
 *
 *   - compareToHistory  — is this bill higher/lower than the typical one
 *                         from the same vendor/category?
 *   - checkDuplicate    — did the user already log a transaction in the
 *                         last 30 days for the same vendor + amount?
 *   - budgetImpact      — what does adding this expense do to the
 *                         remaining category / monthly budget?
 *   - detectRecurring   — count distinct months this vendor appears in
 *                         the last 90 days. >= 2 => likely recurring.
 *
 * NO LLM, NO side effects. This is the deterministic ground truth that
 * the chat agent's prose is grounded in.
 */

import type { ExtractedDocument } from '../types';
import type { UserFinancialContext } from '../types';

export interface HistoricalTransaction {
  amount: number;
  category: string | null;
  description?: string;
  date: string;            // ISO 8601
  vendor?: string;
}

export interface CompareToHistoryResult {
  hasHistory: boolean;
  averageAmount: number | null;       // Average of past matches
  matchCount: number;
  deltaAbsolute: number | null;       // current - average
  deltaPercent: number | null;        // (current - average) / average * 100
  trend: 'higher' | 'lower' | 'similar' | 'unknown';
}

export interface CheckDuplicateResult {
  isDuplicate: boolean;
  candidateDate: string | null;       // Date of the suspected duplicate
  candidateAmount: number | null;
}

export interface BudgetImpactResult {
  hasBudget: boolean;
  monthlyLimit: number | null;
  spent: number;
  remainingBefore: number | null;
  remainingAfter: number | null;
  willOverflow: boolean;              // Adding this bill exceeds budget
  percentageOfMonthlyLimit: number | null;
}

export interface DetectRecurringResult {
  isRecurring: boolean;
  monthsSeen: number;                 // Distinct months in last 90 days
  averageAmount: number | null;
}

export interface BillAnalysis {
  comparison: CompareToHistoryResult;
  duplicate: CheckDuplicateResult;
  budget: BudgetImpactResult;
  recurring: DetectRecurringResult;
}

// ── Helpers ──────────────────────────────────────────────────────────

const DUPLICATE_WINDOW_DAYS = 30;
const RECURRING_WINDOW_DAYS = 90;
const DUPLICATE_AMOUNT_TOLERANCE = 0.02; // 2 % tolerance

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Infinity;
  return Math.abs(a - b) / (1000 * 60 * 60 * 24);
}

function vendorMatches(
  txDescription: string | undefined,
  doc: ExtractedDocument,
): boolean {
  if (!txDescription) return false;
  const desc = txDescription.toLowerCase();
  const candidates = [doc.vendor, doc.vendorCanonical].filter(Boolean) as string[];
  for (const v of candidates) {
    if (desc.includes(v.toLowerCase())) return true;
  }
  return false;
}

// ── compareToHistory ────────────────────────────────────────────────

export function compareToHistory(
  doc: ExtractedDocument,
  history: HistoricalTransaction[],
): CompareToHistoryResult {
  if (doc.amount == null) {
    return {
      hasHistory: false,
      averageAmount: null,
      matchCount: 0,
      deltaAbsolute: null,
      deltaPercent: null,
      trend: 'unknown',
    };
  }

  // Prefer vendor-name matches, fall back to category matches.
  const vendorMatchedTxs = history.filter((tx) => vendorMatches(tx.description, doc));
  const categoryMatchedTxs = doc.category
    ? history.filter((tx) => tx.category === doc.category)
    : [];

  const matches = vendorMatchedTxs.length > 0 ? vendorMatchedTxs : categoryMatchedTxs;
  if (matches.length === 0) {
    return {
      hasHistory: false,
      averageAmount: null,
      matchCount: 0,
      deltaAbsolute: null,
      deltaPercent: null,
      trend: 'unknown',
    };
  }

  const total = matches.reduce((sum, tx) => sum + tx.amount, 0);
  const avg = total / matches.length;
  const delta = doc.amount - avg;
  const pct = avg === 0 ? 0 : (delta / avg) * 100;

  let trend: CompareToHistoryResult['trend'] = 'similar';
  if (Math.abs(pct) >= 10) trend = pct > 0 ? 'higher' : 'lower';

  return {
    hasHistory: true,
    averageAmount: avg,
    matchCount: matches.length,
    deltaAbsolute: delta,
    deltaPercent: pct,
    trend,
  };
}

// ── checkDuplicate ──────────────────────────────────────────────────

export function checkDuplicate(
  doc: ExtractedDocument,
  history: HistoricalTransaction[],
  todayIso: string = new Date().toISOString(),
): CheckDuplicateResult {
  if (doc.amount == null) {
    return { isDuplicate: false, candidateDate: null, candidateAmount: null };
  }

  for (const tx of history) {
    if (daysBetween(tx.date, todayIso) > DUPLICATE_WINDOW_DAYS) continue;

    const amountClose =
      Math.abs(tx.amount - doc.amount) / Math.max(1, doc.amount) <= DUPLICATE_AMOUNT_TOLERANCE;
    if (!amountClose) continue;

    // Either vendor matches in description or category matches.
    const vendorOk = vendorMatches(tx.description, doc);
    const categoryOk = doc.category != null && tx.category === doc.category;
    if (vendorOk || categoryOk) {
      return { isDuplicate: true, candidateDate: tx.date, candidateAmount: tx.amount };
    }
  }

  return { isDuplicate: false, candidateDate: null, candidateAmount: null };
}

// ── budgetImpact ────────────────────────────────────────────────────

export function budgetImpact(
  doc: ExtractedDocument,
  context: UserFinancialContext,
): BudgetImpactResult {
  const budget = context.budget;
  if (!budget) {
    return {
      hasBudget: false,
      monthlyLimit: null,
      spent: context.currentMonth.expenses,
      remainingBefore: null,
      remainingAfter: null,
      willOverflow: false,
      percentageOfMonthlyLimit: null,
    };
  }

  const amount = doc.amount ?? 0;
  const remainingBefore = budget.remaining;
  const remainingAfter = remainingBefore - amount;
  const pct = budget.monthlyLimit > 0 ? (amount / budget.monthlyLimit) * 100 : 0;

  return {
    hasBudget: true,
    monthlyLimit: budget.monthlyLimit,
    spent: budget.spent,
    remainingBefore,
    remainingAfter,
    willOverflow: remainingAfter < 0,
    percentageOfMonthlyLimit: pct,
  };
}

// ── detectRecurring ─────────────────────────────────────────────────

export function detectRecurring(
  doc: ExtractedDocument,
  history: HistoricalTransaction[],
  todayIso: string = new Date().toISOString(),
): DetectRecurringResult {
  if (!doc.vendor && !doc.vendorCanonical) {
    return { isRecurring: false, monthsSeen: 0, averageAmount: null };
  }

  const matches = history.filter((tx) => {
    if (daysBetween(tx.date, todayIso) > RECURRING_WINDOW_DAYS) return false;
    return vendorMatches(tx.description, doc);
  });

  if (matches.length === 0) {
    return {
      isRecurring: doc.isRecurring,
      monthsSeen: 0,
      averageAmount: null,
    };
  }

  const months = new Set<string>();
  let total = 0;
  for (const tx of matches) {
    months.add(tx.date.slice(0, 7)); // YYYY-MM
    total += tx.amount;
  }

  return {
    isRecurring: doc.isRecurring || months.size >= 2,
    monthsSeen: months.size,
    averageAmount: total / matches.length,
  };
}

// ── Composite ───────────────────────────────────────────────────────

export function analyzeBill(
  doc: ExtractedDocument,
  history: HistoricalTransaction[],
  context: UserFinancialContext,
  todayIso: string = new Date().toISOString(),
): BillAnalysis {
  return {
    comparison: compareToHistory(doc, history),
    duplicate: checkDuplicate(doc, history, todayIso),
    budget: budgetImpact(doc, context),
    recurring: detectRecurring(doc, history, todayIso),
  };
}

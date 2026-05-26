/**
 * Emergency Fund baseline calculator.
 *
 * Per the spec in `Emergency funds and Savings Goals.docx`:
 *   "The system analyzes historical transaction data to calculate
 *   average monthly essential expenses. If history is insufficient,
 *   it defaults to a standard 3-to-6-month expense benchmark."
 *
 * Essential = food + bills + housing + transport + health. These
 * are the categories that don't shrink in a crisis. Discretionary
 * spend (entertainment, shopping, etc.) is intentionally excluded
 * from the baseline so the recommended fund only covers what the
 * user can't go without.
 *
 * All sums are in BASE currency (amountBase) to keep the math
 * stable across multi-currency users — the architectural rule from
 * migration 012.
 */

export type EssentialCategoryId =
  | 'food'
  | 'bills'
  | 'housing'
  | 'transport'
  | 'health';

export const ESSENTIAL_CATEGORIES: ReadonlyArray<EssentialCategoryId> = [
  'food',
  'bills',
  'housing',
  'transport',
  'health',
] as const;

export interface BaselineTransaction {
  type: 'income' | 'expense';
  amountBase: number;
  date: string;       // ISO date
  category: string | null;
}

export interface EmergencyFundBaseline {
  /** Average monthly essential expenses in base currency. */
  monthlyEssentials: number;
  /** Number of complete prior months used to compute the average. */
  monthsAnalyzed: number;
  /** True when we had at least 2 prior months of data. */
  hasEnoughHistory: boolean;
  /** Suggested target = monthlyEssentials * targetMonths (default 6). */
  suggestedTarget: number;
  /** The multiplier used (3 or 6 months). */
  targetMonths: 3 | 6;
}

/**
 * Compute the baseline from the user's last N completed months.
 * The current month is intentionally excluded so partial months
 * don't depress the average.
 */
export function computeEmergencyFundBaseline(
  transactions: BaselineTransaction[],
  options: { now?: Date; lookbackMonths?: number; targetMonths?: 3 | 6 } = {},
): EmergencyFundBaseline {
  const now = options.now ?? new Date();
  const lookback = Math.max(1, Math.min(12, options.lookbackMonths ?? 3));
  const targetMonths = options.targetMonths ?? 6;

  // Build a key->total map across the prior `lookback` complete months.
  const months: string[] = [];
  for (let offset = 1; offset <= lookback; offset++) {
    const ref = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push(monthKey(ref));
  }
  const totals = new Map<string, number>(months.map((m) => [m, 0]));
  const monthsWithData = new Set<string>();

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (!tx.amountBase || !Number.isFinite(tx.amountBase)) continue;
    const cat = (tx.category ?? '').toLowerCase();
    if (!ESSENTIAL_CATEGORIES.includes(cat as EssentialCategoryId)) continue;
    const d = new Date(tx.date);
    if (isNaN(d.getTime())) continue;
    const key = monthKey(d);
    if (!totals.has(key)) continue;
    totals.set(key, (totals.get(key) ?? 0) + Math.abs(tx.amountBase));
    monthsWithData.add(key);
  }

  // Average across the months we actually have data for. Months with
  // zero essential spend probably mean missing data, not "the user
  // genuinely spent nothing on food", so we don't dilute by zero
  // months.
  const denom = monthsWithData.size > 0 ? monthsWithData.size : 1;
  const sum = Array.from(totals.values()).reduce((a, b) => a + b, 0);
  const monthlyEssentials = monthsWithData.size > 0 ? sum / denom : 0;
  const hasEnoughHistory = monthsWithData.size >= 2;
  const suggestedTarget = monthlyEssentials * targetMonths;

  return {
    monthlyEssentials,
    monthsAnalyzed: monthsWithData.size,
    hasEnoughHistory,
    suggestedTarget,
    targetMonths,
  };
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Per-cycle allocation: target / cycles_remaining.
 * `cyclesRemaining` is determined by the user's chosen funding
 * horizon (default 12 cycles).
 */
export function computePerCycleAllocation(args: {
  targetAmount: number;
  currentAmount: number;
  cyclesRemaining: number;
}): number {
  const { targetAmount, currentAmount, cyclesRemaining } = args;
  if (!Number.isFinite(cyclesRemaining) || cyclesRemaining <= 0) return 0;
  const remaining = Math.max(0, targetAmount - currentAmount);
  return remaining / cyclesRemaining;
}

/**
 * Convert a monthly contribution to its bi-weekly equivalent (and
 * vice-versa). 26 bi-weekly cycles per year; 12 monthly cycles per
 * year; ratio is 12/26 ≈ 0.4615.
 */
export function convertCadence(args: {
  amount: number;
  from: 'monthly' | 'biweekly';
  to: 'monthly' | 'biweekly';
}): number {
  const { amount, from, to } = args;
  if (from === to) return amount;
  // 12 monthly cycles ≈ 26 bi-weekly cycles per year.
  if (from === 'monthly' && to === 'biweekly') return (amount * 12) / 26;
  return (amount * 26) / 12;
}

/**
 * Number of bi-weekly cycles that fall inside a given calendar
 * month, anchored to a starting date. Used by the Plan page when
 * the user picked bi-weekly cadence so the savings line for the
 * month sums all bi-weekly contributions falling inside it.
 */
export function biweeklyCyclesInMonth(args: {
  anchorDate: string;     // ISO date — first ever bi-weekly tick
  monthYear: string;      // 'YYYY-MM'
}): number {
  const anchor = new Date(args.anchorDate);
  if (isNaN(anchor.getTime())) return 2; // sensible default
  const [yr, mo] = args.monthYear.split('-').map(Number);
  if (!yr || !mo) return 2;
  const monthStart = new Date(yr, mo - 1, 1);
  const monthEnd = new Date(yr, mo, 0, 23, 59, 59, 999);
  let count = 0;
  // Walk forward from the anchor in 14-day steps until we pass the
  // month end. For dates anchor < monthStart we fast-forward.
  let cursor = new Date(anchor.getTime());
  if (cursor > monthEnd) return 0;
  if (cursor < monthStart) {
    const diffDays = Math.floor((monthStart.getTime() - cursor.getTime()) / (1000 * 60 * 60 * 24));
    const skip = Math.floor(diffDays / 14);
    cursor = new Date(cursor.getTime() + skip * 14 * 24 * 60 * 60 * 1000);
  }
  while (cursor <= monthEnd) {
    if (cursor >= monthStart) count++;
    cursor = new Date(cursor.getTime() + 14 * 24 * 60 * 60 * 1000);
  }
  return count;
}

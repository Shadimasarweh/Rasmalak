/**
 * Cooling-off check — individual roadmap B4 (predictive engine Phase 2).
 *
 * Fires only when three things are simultaneously true: the purchase is
 * discretionary, it lands inside the first 72 hours after an income
 * arrival (the impulse window the behaviour engine measures), and it is
 * larger than the user's own 90-day P90 for that category. All three
 * gates exist so the nudge is rare enough to stay welcome — a nudge
 * that fires weekly is furniture within a month.
 *
 * Behavioural, never judgmental: the copy lives in the UI layer and is
 * tone-checked; this module only answers "is this that moment?".
 */

import { EngineTransaction, isGoalFunding } from './engineTypes';
import { quantile } from './stats';
import { utcNoon } from './hijri';

export const COOLING_OFF_WINDOW_DAYS = 3;
export const P90_LOOKBACK_DAYS = 90;
/** Below this many category samples there is no distribution to judge by. */
export const MIN_CATEGORY_SAMPLES = 8;
/** Income events smaller than half the median income txn (refunds,
 * pocket transfers) don't open an impulse window. */
export const INCOME_EVENT_MIN_SHARE = 0.5;
const INCOME_LOOKBACK_DAYS = 45;
const INCOME_MEDIAN_LOOKBACK_DAYS = 180;

/** Committed/necessity categories never trigger a pause. */
export const DISCRETIONARY_CATEGORIES = new Set([
  'food',
  'shopping',
  'entertainment',
  'personal',
  'other-expense',
]);

export interface CoolingOffCheck {
  triggered: boolean;
  basis?: {
    daysSinceIncome: number;
    categoryP90: number;
    sampleCount: number;
  };
}

const DAY_MS = 86_400_000;

function lastIncomeEvent(txns: EngineTransaction[], now: Date): Date | null {
  const nowT = utcNoon(now).getTime();
  const incomes = txns.filter((t) => {
    if (t.type !== 'income' || isGoalFunding(t.category)) return false;
    const at = utcNoon(new Date(t.date)).getTime();
    return at <= nowT && at >= nowT - INCOME_MEDIAN_LOOKBACK_DAYS * DAY_MS;
  });
  if (incomes.length === 0) return null;

  const amounts = incomes.map((t) => Math.abs(t.amountBase)).sort((a, b) => a - b);
  const median = amounts[Math.floor(amounts.length / 2)];
  const floor = median * INCOME_EVENT_MIN_SHARE;

  let latest: number | null = null;
  for (const t of incomes) {
    const at = utcNoon(new Date(t.date)).getTime();
    if (at < nowT - INCOME_LOOKBACK_DAYS * DAY_MS) continue;
    if (Math.abs(t.amountBase) < floor) continue;
    if (latest === null || at > latest) latest = at;
  }
  return latest === null ? null : new Date(latest);
}

export function checkCoolingOff(input: {
  transactions: EngineTransaction[];
  candidate: { category: string | null; amountBase: number; date: Date };
  now?: Date;
}): CoolingOffCheck {
  const { transactions, candidate } = input;
  const now = input.now ?? candidate.date;

  if (!candidate.category || !DISCRETIONARY_CATEGORIES.has(candidate.category)) {
    return { triggered: false };
  }

  const income = lastIncomeEvent(transactions, now);
  if (!income) return { triggered: false };
  const daysSinceIncome =
    (utcNoon(candidate.date).getTime() - income.getTime()) / DAY_MS;
  if (daysSinceIncome < 0 || daysSinceIncome >= COOLING_OFF_WINDOW_DAYS) {
    return { triggered: false };
  }

  const cutoff = utcNoon(now).getTime() - P90_LOOKBACK_DAYS * DAY_MS;
  const samples = transactions
    .filter(
      (t) =>
        t.type === 'expense' &&
        t.category === candidate.category &&
        utcNoon(new Date(t.date)).getTime() >= cutoff,
    )
    .map((t) => Math.abs(t.amountBase));
  if (samples.length < MIN_CATEGORY_SAMPLES) return { triggered: false };

  const p90 = quantile(samples, 0.9);
  if (Math.abs(candidate.amountBase) <= p90) return { triggered: false };

  return {
    triggered: true,
    basis: {
      daysSinceIncome: Math.round(daysSinceIncome * 10) / 10,
      categoryP90: Math.round(p90 * 100) / 100,
      sampleCount: samples.length,
    },
  };
}

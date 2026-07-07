/**
 * Synthetic-transaction builders for predictive-engine unit tests.
 *
 * Imported ONLY by *.test.ts files — never by app code. All randomness goes
 * through the seeded mulberry32 PRNG so every suite is fully reproducible.
 *
 * Builders emit `amount` (a decoy at 2× amountBase) alongside the fields of
 * EngineTransaction: any engine code that accidentally reads `amount`
 * instead of `amountBase` doubles its numbers and fails the assertions.
 */

import { mulberry32 } from './stats';
import { clampAnchorDay } from '@/lib/cycles';
import type { EngineTransaction } from './engineTypes';

export type FixtureTransaction = EngineTransaction & { amount: number };

let idCounter = 0;

function iso(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseMonth(startMonth: string): { year: number; monthIndex: number } {
  const [y, m] = startMonth.split('-').map(Number);
  return { year: y, monthIndex: m - 1 };
}

export function makeTx(overrides: Partial<FixtureTransaction> & { amountBase: number }): FixtureTransaction {
  idCounter += 1;
  return {
    id: `fx-${idCounter}`,
    date: '2026-01-15',
    type: 'expense',
    category: 'food',
    amount: overrides.amountBase * 2,
    ...overrides,
  };
}

export interface SeriesOpts {
  jitterDays?: number;
  amountJitterPct?: number;
  seed?: number;
  // First month of the series, 'YYYY-MM'. Occurrences run forward from here.
  start?: string;
  category?: string;
  description?: string;
  isRecurring?: boolean;
}

// Monthly income landing on (clamped) `day` for `months` consecutive months.
export function salaryEveryMonth(day: number, amountBase: number, months: number, opts: SeriesOpts = {}): FixtureTransaction[] {
  return monthlySeries('income', opts.category ?? 'salary', day, amountBase, months, {
    description: 'Salary ACME Co', ...opts,
  });
}

// Monthly expense (rent, subscription, utility …) on (clamped) `day`.
export function monthlyBill(label: string, day: number, amountBase: number, months: number, opts: SeriesOpts = {}): FixtureTransaction[] {
  return monthlySeries('expense', opts.category ?? 'bills', day, amountBase, months, {
    description: label, ...opts,
  });
}

function monthlySeries(
  type: 'income' | 'expense',
  category: string,
  day: number,
  amountBase: number,
  months: number,
  opts: SeriesOpts,
): FixtureTransaction[] {
  const rng = mulberry32(opts.seed ?? 42);
  const { year, monthIndex } = parseMonth(opts.start ?? '2025-06');
  const out: FixtureTransaction[] = [];
  for (let i = 0; i < months; i++) {
    const ref = new Date(year, monthIndex + i, 1);
    const y = ref.getFullYear();
    const m = ref.getMonth();
    let d = clampAnchorDay(day, y, m);
    if (opts.jitterDays) {
      const jitter = Math.round((rng() * 2 - 1) * opts.jitterDays);
      d = Math.min(Math.max(1, d + jitter), clampAnchorDay(31, y, m));
    }
    let amt = amountBase;
    if (opts.amountJitterPct) {
      amt = amountBase * (1 + (rng() * 2 - 1) * opts.amountJitterPct);
    }
    out.push(makeTx({
      date: iso(y, m, d),
      type,
      category,
      description: opts.description,
      amountBase: Math.round(amt * 100) / 100,
      isRecurring: opts.isRecurring,
    }));
  }
  return out;
}

export interface DailySpendOpts {
  seed?: number;
  // Share of days with no spending at all (models real sparse logging).
  zeroDayShare?: number;
  // Multiply amounts on these days-of-month (payday-effect fixtures).
  boostDays?: { days: number[]; multiplier: number };
  description?: string;
}

// Discretionary spending: one transaction per active day over `days` days
// starting at startDate, uniform 0.25–1.75× around dailyMean on active days.
export function dailySpend(
  categoryId: string,
  dailyMean: number,
  days: number,
  startDate: string,
  opts: DailySpendOpts = {},
): FixtureTransaction[] {
  const rng = mulberry32(opts.seed ?? 7);
  const zeroShare = opts.zeroDayShare ?? 0.3;
  const start = new Date(startDate);
  const out: FixtureTransaction[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    if (rng() < zeroShare) continue;
    // Scale so the long-run mean stays dailyMean despite zero days.
    let amt = (dailyMean / (1 - zeroShare)) * (0.25 + rng() * 1.5);
    if (opts.boostDays && opts.boostDays.days.includes(d.getDate())) {
      amt *= opts.boostDays.multiplier;
    }
    out.push(makeTx({
      date: iso(d.getFullYear(), d.getMonth(), d.getDate()),
      type: 'expense',
      category: categoryId,
      description: opts.description,
      amountBase: Math.round(amt * 100) / 100,
    }));
  }
  return out;
}

// Remove every transaction falling in the given 'YYYY-MM' months — models a
// user who stopped logging (gap months, distinct from true zero months).
export function gapMonths(txns: FixtureTransaction[], monthsToDrop: string[]): FixtureTransaction[] {
  const drop = new Set(monthsToDrop);
  return txns.filter((t) => !drop.has(t.date.slice(0, 7)));
}

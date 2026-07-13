/**
 * Goal risk probability — engine roadmap Phase 3, item 10.
 *
 * "78% chance of reaching your goal on time" has to be a *computed*
 * number: we resample the user's own completed-month net savings
 * (Monte Carlo with a seeded, reproducible PRNG) across the months left
 * to the deadline. No distribution assumptions — bad months the user
 * actually had appear in the simulation at the rate they actually
 * happened. The companion number is actionable, not decorative: the
 * concrete extra amount per month that lifts the goal to 90%.
 *
 * Determinism matters here (same inputs → identical percentages across
 * renders and devices), so the PRNG is seeded per goal and the same
 * draw matrix is reused when searching for the 90% delta — which also
 * makes the search monotone.
 *
 * All amounts in BASE currency (currency rule): callers convert goal
 * targets from currency_native before calling.
 */

import { EngineTransaction, isGoalFunding } from './engineTypes';

export const DEFAULT_ITERATIONS = 2000;
export const MIN_SAVINGS_SAMPLES = 3;
export const TARGET_CONFIDENCE = 0.9;

/** mulberry32 — tiny, seedable, plenty for resampling. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable numeric seed from a goal id (FNV-1a over the string). */
export function seedFromId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Net savings per completed calendar month: income − consumption
 * expenses, in base currency. Goal-funding transfers are NOT
 * consumption — money moved into a goal was saved, which is exactly
 * the capacity this distribution measures. Months without any logged
 * activity are gaps, not zeros. Oldest → newest.
 */
export function monthlyNetSavingsSamples(
  transactions: EngineTransaction[],
  options: { now?: Date; lookbackMonths?: number } = {},
): number[] {
  const now = options.now ?? new Date();
  const lookback = Math.max(1, Math.min(24, options.lookbackMonths ?? 12));

  const byMonth = new Map<string, { net: number; active: boolean }>();
  for (let offset = 1; offset <= lookback; offset++) {
    const ref = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    byMonth.set(`${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`, {
      net: 0,
      active: false,
    });
  }

  for (const t of transactions) {
    const d = new Date(t.date);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const slot = byMonth.get(key);
    if (!slot) continue;
    slot.active = true;
    if (t.type === 'income') slot.net += Math.abs(t.amountBase);
    else if (!isGoalFunding(t.category)) slot.net -= Math.abs(t.amountBase);
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .filter(([, v]) => v.active)
    .map(([, v]) => Math.round(v.net * 100) / 100);
}

export interface GoalRiskInput {
  targetBase: number;
  currentBase: number;
  deadline: string | null | undefined; // ISO date
  monthlySavingsSamples: number[];
  now?: Date;
  seed?: number;
  iterations?: number;
}

export interface GoalRiskResult {
  /** 0..1 probability of reaching the target by the deadline. */
  probability: number;
  monthsRemaining: number;
  /** Extra per month (on top of the historical pattern) to reach 90%.
   * 0 when already there. */
  requiredExtraMonthlyFor90: number;
  basis: {
    samples: number;
    medianMonthlySavings: number;
    iterations: number;
    gap: number;
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function monthsBetween(now: Date, deadline: Date): number {
  const months =
    (deadline.getFullYear() - now.getFullYear()) * 12 +
    (deadline.getMonth() - now.getMonth());
  // A deadline later this month still leaves the rest of this month.
  return Math.max(0, months + (deadline.getDate() >= now.getDate() ? 1 : 0));
}

/**
 * Returns null when the question isn't answerable yet: no deadline to
 * measure against, or fewer than MIN_SAVINGS_SAMPLES months of history
 * (a two-sample "distribution" would be numerology, not probability).
 */
export function estimateGoalRisk(input: GoalRiskInput): GoalRiskResult | null {
  const { targetBase, currentBase, deadline, monthlySavingsSamples } = input;
  if (!deadline) return null;
  if (monthlySavingsSamples.length < MIN_SAVINGS_SAMPLES) return null;

  const now = input.now ?? new Date();
  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) return null;

  const gap = Math.max(0, targetBase - currentBase);
  const monthsRemaining = monthsBetween(now, deadlineDate);
  const iterations = input.iterations ?? DEFAULT_ITERATIONS;
  const med = Math.round(median(monthlySavingsSamples) * 100) / 100;

  const base = {
    samples: monthlySavingsSamples.length,
    medianMonthlySavings: med,
    iterations,
    gap: Math.round(gap * 100) / 100,
  };

  if (gap === 0) {
    return { probability: 1, monthsRemaining, requiredExtraMonthlyFor90: 0, basis: base };
  }
  if (monthsRemaining === 0) {
    // Deadline passed (or today) with a gap left: certainty, not chance.
    return { probability: 0, monthsRemaining, requiredExtraMonthlyFor90: 0, basis: base };
  }

  // One draw matrix, reused for every probability evaluation — this is
  // what makes the 90%-delta search monotone and the result stable.
  const rng = mulberry32(input.seed ?? 42);
  const n = monthlySavingsSamples.length;
  const draws: number[][] = [];
  for (let i = 0; i < iterations; i++) {
    const row: number[] = [];
    for (let m = 0; m < monthsRemaining; m++) {
      row.push(monthlySavingsSamples[Math.floor(rng() * n)]);
    }
    draws.push(row);
  }

  const probabilityWithExtra = (extra: number): number => {
    let hits = 0;
    for (const row of draws) {
      let sum = 0;
      for (const v of row) sum += v + extra;
      if (currentBase + sum >= targetBase) hits++;
    }
    return hits / iterations;
  };

  const probability = probabilityWithExtra(0);

  let requiredExtra = 0;
  if (probability < TARGET_CONFIDENCE) {
    // Upper bound that guarantees success even if every month draws the
    // worst sample: months × (min + extra) ≥ gap.
    const worst = Math.min(...monthlySavingsSamples);
    let lo = 0;
    let hi = Math.max(1, gap / monthsRemaining - worst);
    for (let step = 0; step < 40; step++) {
      const mid = (lo + hi) / 2;
      if (probabilityWithExtra(mid) >= TARGET_CONFIDENCE) hi = mid;
      else lo = mid;
    }
    requiredExtra = Math.ceil(hi);
  }

  return {
    probability: Math.round(probability * 100) / 100,
    monthsRemaining,
    requiredExtraMonthlyFor90: requiredExtra,
    basis: base,
  };
}

import { describe, expect, it } from 'vitest';

import { addDays, eidAlFitrWindow, ramadanWindow } from './hijri';
import { EngineTransaction } from './engineTypes';
import {
  BASELINE_LOOKBACK_DAYS,
  FACTOR_MAX,
  RAMADAN_POPULATION_PRIORS,
  buildRamadanPlan,
} from './ramadanSeasonality';

// All fixtures are built around real windows so the tests stay honest
// against the actual Umm al-Qura tables:
//   prior Ramadan 1447: starts 2026-02-18; "now" = 2026-07-10 → plan for 1448.
const NOW = new Date('2026-07-10T12:00:00Z');
const PRIOR = ramadanWindow(1447);
const BASELINE_START = addDays(PRIOR.start, -BASELINE_LOOKBACK_DAYS);

let seq = 0;
function txn(
  date: Date,
  category: string,
  amountBase: number,
  type: 'income' | 'expense' = 'expense',
): EngineTransaction {
  seq += 1;
  return {
    id: `t${seq}`,
    date: date.toISOString(),
    type,
    category,
    amountBase,
  };
}

/** One txn of `amount` every `stepDays` across [from, from+days). */
function series(
  from: Date,
  days: number,
  stepDays: number,
  category: string,
  amount: number,
): EngineTransaction[] {
  const out: EngineTransaction[] = [];
  for (let d = 0; d < days; d += stepDays) {
    out.push(txn(addDays(from, d), category, amount));
  }
  return out;
}

function yearTwoFixture(): EngineTransaction[] {
  return [
    // Baseline (90d before Ramadan 1447): food 10/day, transport 5/day.
    ...series(BASELINE_START, BASELINE_LOOKBACK_DAYS, 1, 'food', 10),
    ...series(BASELINE_START, BASELINE_LOOKBACK_DAYS, 1, 'transport', 5),
    // During Ramadan 1447: food 15/day (1.5×), transport 3/day (0.6×).
    ...series(PRIOR.start, PRIOR.days, 1, 'food', 15),
    ...series(PRIOR.start, PRIOR.days, 1, 'transport', 3),
  ];
}

describe('buildRamadanPlan — year-2 (personal)', () => {
  it('derives per-category factors from the prior Ramadan vs its baseline', () => {
    const plan = buildRamadanPlan({ transactions: yearTwoFixture(), now: NOW });

    expect(plan.hijriYear).toBe(1448);
    expect(plan.source).toBe('personal');
    expect(plan.meta.hasPriorRamadanCoverage).toBe(true);
    expect(plan.meta.priorRamadanHijriYear).toBe(1447);

    const byCat = Object.fromEntries(plan.adjustments.map((a) => [a.categoryId, a]));
    expect(byCat.food.factor).toBeCloseTo(1.5, 1);
    expect(byCat.transport.factor).toBeCloseTo(0.6, 1);
    expect(byCat.food.source).toBe('personal');
    expect(byCat.food.confidence).toBe('high'); // daily txns on both sides
    expect(byCat.food.basis.priorRamadanHijriYear).toBe(1447);
  });

  it('sorts the largest shifts first', () => {
    const plan = buildRamadanPlan({ transactions: yearTwoFixture(), now: NOW });
    const shifts = plan.adjustments.map((a) => Math.abs(a.factor - 1));
    expect(shifts).toEqual([...shifts].sort((a, b) => b - a));
  });

  it('omits flat categories and clamps outliers', () => {
    const txns = [
      ...yearTwoFixture(),
      // bills: identical DAILY rate on both sides → flat → omitted.
      // (Daily cadence, not weekly: a stride that doesn't divide both
      // window lengths would create a real, unintended rate shift.)
      ...series(BASELINE_START, BASELINE_LOOKBACK_DAYS, 1, 'bills', 40),
      ...series(PRIOR.start, PRIOR.days, 1, 'bills', 40),
      // shopping: 12× explosion → clamped to FACTOR_MAX.
      ...series(BASELINE_START, BASELINE_LOOKBACK_DAYS, 10, 'shopping', 5),
      ...series(PRIOR.start, PRIOR.days, 2, 'shopping', 120),
    ];
    const plan = buildRamadanPlan({ transactions: txns, now: NOW });
    const byCat = Object.fromEntries(plan.adjustments.map((a) => [a.categoryId, a]));

    expect(byCat.bills).toBeUndefined();
    expect(byCat.shopping.factor).toBe(FACTOR_MAX);
  });

  it('ignores thin categories, goal funding, and income', () => {
    const txns = [
      ...yearTwoFixture(),
      // entertainment: only 2 Ramadan txns → below MIN_TXNS_PER_SIDE.
      txn(PRIOR.start, 'entertainment', 50),
      txn(addDays(PRIOR.start, 5), 'entertainment', 50),
      // goal transfers and salary must never shape a spending factor.
      ...series(PRIOR.start, PRIOR.days, 1, 'goal-funding-abc', 100),
      txn(addDays(PRIOR.start, 3), 'salary', 1500, 'income'),
    ];
    const plan = buildRamadanPlan({ transactions: txns, now: NOW });
    const cats = plan.adjustments.map((a) => a.categoryId);

    expect(cats).not.toContain('entertainment');
    expect(cats).not.toContain('goal-funding-abc');
    expect(cats).not.toContain('salary');
  });

  it('suggests an Eid envelope from prior Eid spend, rounded up to 5', () => {
    const eid = eidAlFitrWindow(1447);
    const txns = [
      ...yearTwoFixture(),
      txn(eid.start, 'shopping', 80.3),
      txn(addDays(eid.start, 1), 'food', 37),
    ];
    const plan = buildRamadanPlan({ transactions: txns, now: NOW });

    expect(plan.eidEnvelope).not.toBeNull();
    expect(plan.eidEnvelope!.priorEidSpend).toBeCloseTo(117.3, 2);
    expect(plan.eidEnvelope!.suggestedAmount).toBe(120);
    expect(plan.eidEnvelope!.source).toBe('personal');
  });
});

describe('buildRamadanPlan — year-1 (priors)', () => {
  it('falls back to labelled population priors without prior coverage', () => {
    // History starts AFTER the prior-Ramadan baseline window.
    const txns = series(addDays(PRIOR.endExclusive, 30), 60, 1, 'food', 12);
    const plan = buildRamadanPlan({ transactions: txns, now: NOW });

    expect(plan.meta.hasPriorRamadanCoverage).toBe(false);
    expect(plan.source).toBe('population_prior');
    expect(plan.eidEnvelope).toBeNull();
    const byCat = Object.fromEntries(plan.adjustments.map((a) => [a.categoryId, a]));
    for (const [cat, factor] of Object.entries(RAMADAN_POPULATION_PRIORS)) {
      expect(byCat[cat]?.factor).toBe(factor);
      expect(byCat[cat]?.confidence).toBe('low');
    }
  });

  it('degrades to priors when coverage exists but carries no signal', () => {
    // Old enough history, but nothing categorised around Ramadan.
    const txns = [txn(addDays(BASELINE_START, -10), 'food', 9)];
    const plan = buildRamadanPlan({ transactions: txns, now: NOW });

    expect(plan.meta.hasPriorRamadanCoverage).toBe(true);
    expect(plan.source).toBe('population_prior');
  });
});

describe('buildRamadanPlan — clock behaviour', () => {
  it('targets the ONGOING Ramadan with a zero countdown', () => {
    const during = new Date('2026-03-01T12:00:00Z'); // inside Ramadan 1447
    const plan = buildRamadanPlan({ transactions: [], now: during });

    expect(plan.hijriYear).toBe(1447);
    expect(plan.daysUntilStart).toBe(0);
    expect(plan.meta.priorRamadanHijriYear).toBe(1446);
  });

  it('counts down to the upcoming Ramadan', () => {
    const plan = buildRamadanPlan({ transactions: [], now: NOW });
    expect(plan.daysUntilStart).toBeGreaterThan(180); // Feb 2027 from Jul 2026
    expect(plan.daysUntilStart).toBeLessThan(260);
  });
});

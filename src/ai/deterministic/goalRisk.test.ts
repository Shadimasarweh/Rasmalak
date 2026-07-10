import { describe, expect, it } from 'vitest';

import { EngineTransaction } from './engineTypes';
import {
  MIN_SAVINGS_SAMPLES,
  estimateGoalRisk,
  monthlyNetSavingsSamples,
  mulberry32,
  seedFromId,
} from './goalRisk';

const NOW = new Date('2026-07-10T12:00:00Z');

let seq = 0;
function txn(
  date: string,
  amountBase: number,
  type: 'income' | 'expense',
  category = type === 'income' ? 'salary' : 'food',
): EngineTransaction {
  seq += 1;
  return { id: `t${seq}`, date: `${date}T12:00:00Z`, type, category, amountBase };
}

describe('monthlyNetSavingsSamples', () => {
  it('nets income minus consumption per completed month, oldest first', () => {
    const txns = [
      txn('2026-05-01', 1500, 'income'),
      txn('2026-05-15', 1100, 'expense'),
      txn('2026-06-01', 1500, 'income'),
      txn('2026-06-20', 1300, 'expense'),
      // Current month must not leak in (partially elapsed).
      txn('2026-07-05', 1500, 'income'),
    ];
    expect(monthlyNetSavingsSamples(txns, { now: NOW })).toEqual([400, 200]);
  });

  it('goal funding counts as saved, not spent; gap months are skipped', () => {
    const txns = [
      txn('2026-04-01', 1000, 'income'),
      txn('2026-04-10', 600, 'expense'),
      txn('2026-04-15', 200, 'expense', 'goal-funding-hajj'), // still savings
      // May: nothing logged at all → gap, not a zero sample.
      txn('2026-06-01', 1000, 'income'),
      txn('2026-06-10', 700, 'expense'),
    ];
    expect(monthlyNetSavingsSamples(txns, { now: NOW })).toEqual([400, 300]);
  });
});

describe('estimateGoalRisk', () => {
  const steady = [300, 300, 300, 300, 300, 300];

  it('is certain when the pattern always covers the gap', () => {
    const result = estimateGoalRisk({
      targetBase: 2000,
      currentBase: 1000,
      deadline: '2026-12-25',
      monthlySavingsSamples: steady,
      now: NOW,
    })!;
    // 6 months × 300 = 1800 ≥ gap 1000, every draw.
    expect(result.probability).toBe(1);
    expect(result.requiredExtraMonthlyFor90).toBe(0);
    expect(result.monthsRemaining).toBe(6);
  });

  it('is honest about a lost cause and prices the fix', () => {
    const result = estimateGoalRisk({
      targetBase: 10_000,
      currentBase: 0,
      deadline: '2026-10-25',
      monthlySavingsSamples: steady,
      now: NOW,
    })!;
    expect(result.probability).toBe(0); // 3 × 300 max vs 10k gap
    // The delta must actually deliver 90% when applied.
    const withExtra = estimateGoalRisk({
      targetBase: 10_000,
      currentBase: result.requiredExtraMonthlyFor90 * 0, // unchanged
      deadline: '2026-10-25',
      monthlySavingsSamples: steady.map((s) => s + result.requiredExtraMonthlyFor90),
      now: NOW,
    })!;
    expect(withExtra.probability).toBeGreaterThanOrEqual(0.9);
  });

  it('produces a mid-range probability for genuinely volatile histories', () => {
    const volatile = [800, -200, 500, 0, 700, -100]; // median 250
    const result = estimateGoalRisk({
      targetBase: 3000,
      currentBase: 1200,
      deadline: '2026-12-25',
      monthlySavingsSamples: volatile,
      now: NOW,
    })!;
    expect(result.probability).toBeGreaterThan(0.1);
    expect(result.probability).toBeLessThan(0.95);
    expect(result.requiredExtraMonthlyFor90).toBeGreaterThan(0);
  });

  it('is deterministic per seed and differs across seeds', () => {
    const input = {
      targetBase: 3000,
      currentBase: 1200,
      deadline: '2026-12-25',
      monthlySavingsSamples: [800, -200, 500, 0, 700, -100],
      now: NOW,
    };
    const a = estimateGoalRisk({ ...input, seed: seedFromId('goal-1') })!;
    const b = estimateGoalRisk({ ...input, seed: seedFromId('goal-1') })!;
    expect(a).toEqual(b);
  });

  it('already-funded goals are 100% regardless of history', () => {
    const result = estimateGoalRisk({
      targetBase: 1000,
      currentBase: 1000,
      deadline: '2026-08-01',
      monthlySavingsSamples: [-500, -500, -500],
      now: NOW,
    })!;
    expect(result.probability).toBe(1);
  });

  it('past deadline with a gap is 0, not a simulation', () => {
    const result = estimateGoalRisk({
      targetBase: 1000,
      currentBase: 400,
      deadline: '2026-06-01',
      monthlySavingsSamples: steady,
      now: NOW,
    })!;
    expect(result.monthsRemaining).toBe(0);
    expect(result.probability).toBe(0);
  });

  it('declines to answer without a deadline or enough history', () => {
    expect(
      estimateGoalRisk({
        targetBase: 1000,
        currentBase: 0,
        deadline: null,
        monthlySavingsSamples: steady,
        now: NOW,
      }),
    ).toBeNull();
    expect(
      estimateGoalRisk({
        targetBase: 1000,
        currentBase: 0,
        deadline: '2026-12-25',
        monthlySavingsSamples: steady.slice(0, MIN_SAVINGS_SAMPLES - 1),
        now: NOW,
      }),
    ).toBeNull();
  });
});

describe('prng plumbing', () => {
  it('mulberry32 streams are reproducible and in [0,1)', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const va = a();
      expect(va).toBe(b());
      expect(va).toBeGreaterThanOrEqual(0);
      expect(va).toBeLessThan(1);
    }
  });

  it('seedFromId is stable and spreads distinct ids', () => {
    expect(seedFromId('goal-abc')).toBe(seedFromId('goal-abc'));
    expect(seedFromId('goal-abc')).not.toBe(seedFromId('goal-abd'));
  });
});

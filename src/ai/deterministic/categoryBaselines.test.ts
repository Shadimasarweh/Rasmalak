import { describe, it, expect } from 'vitest';
import { computeCategoryBaselines, detectCategoryDeviations } from './categoryBaselines';
import { getCycleRange } from '@/lib/cycles';
import { makeTx, type FixtureTransaction } from './fixtures';

const NOW = new Date(2026, 5, 15); // June 15, 2026

function monthlyFood(month: string, amount: number): FixtureTransaction {
  return makeTx({ date: `${month}-10`, type: 'expense', category: 'food', amountBase: amount });
}

describe('computeCategoryBaselines', () => {
  it('gates eligibility at 3 months with data', () => {
    const two = computeCategoryBaselines(
      [monthlyFood('2026-04', 100), monthlyFood('2026-05', 110)],
      { now: NOW },
    );
    expect(two[0].eligible).toBe(false);

    const three = computeCategoryBaselines(
      [monthlyFood('2026-03', 95), monthlyFood('2026-04', 100), monthlyFood('2026-05', 110)],
      { now: NOW },
    );
    expect(three[0].eligible).toBe(true);
    expect(three[0].monthlyMedian).toBe(100);
  });

  it('excludes the current partial month from the window', () => {
    const baselines = computeCategoryBaselines(
      [monthlyFood('2026-06', 999), monthlyFood('2026-04', 100), monthlyFood('2026-05', 100), monthlyFood('2026-03', 100)],
      { now: NOW },
    );
    expect(baselines[0].monthlyValues.every((m) => m.month !== '2026-06')).toBe(true);
    expect(baselines[0].monthlyMedian).toBe(100);
  });

  it('drops gap months but keeps true zeros', () => {
    // Feb 2026 has NO transactions at all (gap). March is active via
    // transport but has no food (true zero).
    const txns = [
      monthlyFood('2026-01', 100),
      makeTx({ date: '2026-03-05', type: 'expense', category: 'transport', amountBase: 40 }),
      monthlyFood('2026-04', 100),
      monthlyFood('2026-05', 100),
    ];
    const baselines = computeCategoryBaselines(txns, { now: NOW });
    const food = baselines.find((b) => b.categoryId === 'food')!;
    const months = food.monthlyValues.map((m) => m.month);
    expect(months).not.toContain('2026-02'); // gap month excluded
    expect(months).toContain('2026-03');     // active month included…
    expect(food.monthlyValues.find((m) => m.month === '2026-03')!.value).toBe(0); // …as a genuine zero
    // Median/MAD are computed over spending months only.
    expect(food.monthlyMedian).toBe(100);
    expect(food.monthsWithData).toBe(3);
  });

  it('an income-only month still counts as active (user was logging)', () => {
    const txns = [
      monthlyFood('2026-03', 100),
      makeTx({ date: '2026-04-25', type: 'income', category: 'salary', amountBase: 3000 }),
      monthlyFood('2026-05', 100),
    ];
    const food = computeCategoryBaselines(txns, { now: NOW }).find((b) => b.categoryId === 'food')!;
    expect(food.monthlyValues.map((m) => m.month)).toContain('2026-04');
  });

  it('a single spike month does not move the median (robustness)', () => {
    const txns = [
      monthlyFood('2025-12', 400),
      monthlyFood('2026-01', 400),
      monthlyFood('2026-02', 400),
      monthlyFood('2026-03', 900), // Ramadan-like month
      monthlyFood('2026-04', 400),
      monthlyFood('2026-05', 400),
    ];
    const food = computeCategoryBaselines(txns, { now: NOW })[0];
    expect(food.monthlyMedian).toBe(400);
  });

  it('excludes goal-funding categories and honors excludeTransactionIds', () => {
    const rent = makeTx({ date: '2026-05-01', type: 'expense', category: 'housing', amountBase: 800 });
    const txns = [
      rent,
      makeTx({ date: '2026-05-02', type: 'expense', category: 'goal-funding-abc', amountBase: 150 }),
      monthlyFood('2026-05', 100),
    ];
    const baselines = computeCategoryBaselines(txns, { now: NOW, excludeTransactionIds: new Set([rent.id]) });
    expect(baselines.find((b) => b.categoryId.startsWith('goal-funding'))).toBeUndefined();
    expect(baselines.find((b) => b.categoryId === 'housing')).toBeUndefined();
  });
});

describe('detectCategoryDeviations', () => {
  const historyTxns = [
    monthlyFood('2025-12', 100),
    monthlyFood('2026-01', 100),
    monthlyFood('2026-02', 100),
    monthlyFood('2026-03', 100),
    monthlyFood('2026-04', 100),
    monthlyFood('2026-05', 100),
  ];
  const baselines = computeCategoryBaselines(historyTxns, { now: NOW });
  const midMonthCycle = getCycleRange({ mode: 'calendar', anchorDay: null, now: NOW }); // June, day 15 of 30

  it('flags a pace-adjusted breach in MAD units', () => {
    const cycleTxns = [makeTx({ date: '2026-06-10', type: 'expense', category: 'food', amountBase: 300 })];
    const deviations = detectCategoryDeviations(baselines, cycleTxns, midMonthCycle, new Set());
    expect(deviations).toHaveLength(1);
    // 300 in 15 of 30 days → pace 600 vs median 100, effectiveMad 5 → far past high.
    expect(deviations[0].severity).toBe('high');
    expect(deviations[0].paceAdjustedSpend).toBe(600);
    expect(deviations[0].deviationPct).toBe(500);
  });

  it('stays quiet at normal pace', () => {
    const cycleTxns = [makeTx({ date: '2026-06-10', type: 'expense', category: 'food', amountBase: 50 })];
    const deviations = detectCategoryDeviations(baselines, cycleTxns, midMonthCycle, new Set());
    // pace 100 = median → 0 MAD units → 'none' severity entry, no flag.
    expect(deviations[0]?.severity ?? 'none').toBe('none');
  });

  it('excludes recurring-series member transactions from current spend', () => {
    const rentTx = makeTx({ date: '2026-06-02', type: 'expense', category: 'food', amountBase: 500 });
    const deviations = detectCategoryDeviations(baselines, [rentTx], midMonthCycle, new Set([rentTx.id]));
    expect(deviations).toHaveLength(0);
  });

  it('suppresses pace flags in the first days of the cycle unless the raw spend already breaches', () => {
    const day3Cycle = getCycleRange({ mode: 'calendar', anchorDay: null, now: new Date(2026, 5, 3) });
    // 40 in 3 days paces to 400 — but raw 40 is under median+3·MAD (115): hold.
    const modest = [makeTx({ date: '2026-06-02', type: 'expense', category: 'food', amountBase: 40 })];
    expect(detectCategoryDeviations(baselines, modest, day3Cycle, new Set())).toHaveLength(0);
    // Raw 200 already breaches 115 on day 3: flag immediately.
    const breach = [makeTx({ date: '2026-06-02', type: 'expense', category: 'food', amountBase: 200 })];
    const deviations = detectCategoryDeviations(baselines, breach, day3Cycle, new Set());
    expect(deviations).toHaveLength(1);
    expect(deviations[0].severity).toBe('high');
  });

  it('ignores ineligible baselines (kills the n=1 comparison)', () => {
    const sparse = computeCategoryBaselines([monthlyFood('2026-05', 100)], { now: NOW });
    const cycleTxns = [makeTx({ date: '2026-06-10', type: 'expense', category: 'food', amountBase: 900 })];
    expect(detectCategoryDeviations(sparse, cycleTxns, midMonthCycle, new Set())).toHaveLength(0);
  });
});

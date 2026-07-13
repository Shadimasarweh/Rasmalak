import { describe, expect, it } from 'vitest';

import { EngineTransaction } from './engineTypes';
import { buildCycleReportCard } from './cycleReportCard';

let seq = 0;
const txn = (date: string, amountBase: number, type: 'income' | 'expense', category = 'food'): EngineTransaction => (
  { id: `t${++seq}`, date: `${date}T12:00:00Z`, type, category, amountBase }
);
const at = (s: string) => new Date(`${s}T12:00:00Z`);

const ENDED = { start: at('2026-06-25'), endExclusive: at('2026-07-25') };
const BEFORE = { start: at('2026-05-25'), endExclusive: at('2026-06-25') };

describe('buildCycleReportCard', () => {
  it('reports saved, goal funding as savings, and cycle-over-cycle win/leak', () => {
    const report = buildCycleReportCard({
      transactions: [
        txn('2026-06-25', 1500, 'income', 'salary'),
        txn('2026-07-01', 600, 'expense', 'food'),
        txn('2026-07-05', 200, 'expense', 'shopping'),
        txn('2026-07-10', 100, 'expense', 'goal-funding-x'),
        // Prior cycle: food was 750 (win: −150), shopping 50 (leak: +150).
        txn('2026-06-01', 750, 'expense', 'food'),
        txn('2026-06-05', 50, 'expense', 'shopping'),
      ],
      endedCycle: ENDED,
      previousCycle: BEFORE,
    });
    expect(report.income).toBe(1500);
    expect(report.spent).toBe(800);
    expect(report.saved).toBe(700);
    expect(report.goalFunded).toBe(100);
    expect(report.topWin).toMatchObject({ categoryId: 'food', delta: -150 });
    expect(report.topLeak).toMatchObject({ categoryId: 'shopping', delta: 150 });
  });

  it('ignores sub-threshold wiggles and respects the budget grace', () => {
    const report = buildCycleReportCard({
      transactions: [
        txn('2026-07-01', 100, 'expense', 'food'),
        txn('2026-06-01', 95, 'expense', 'food'), // +5 < MIN_SHIFT_AMOUNT
      ],
      endedCycle: ENDED,
      previousCycle: BEFORE,
      cycleBudget: 99, // 100 ≤ 99×1.02 → within
    });
    expect(report.topLeak).toBeNull();
    expect(report.adherence).toEqual({ budget: 99, spent: 100, within: true });
  });

  it('null adherence without a budget; negative saved is honest', () => {
    const report = buildCycleReportCard({
      transactions: [txn('2026-07-01', 300, 'expense')],
      endedCycle: ENDED,
      previousCycle: BEFORE,
    });
    expect(report.adherence).toBeNull();
    expect(report.saved).toBe(-300);
  });
});

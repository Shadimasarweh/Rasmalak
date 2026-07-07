import { describe, it, expect } from 'vitest';
import { getCycleRange } from '@/lib/cycles';
import { computeCashflowForecast, type CashflowForecast } from './cashflowForecast';
import { computeSafeToSpend, sumGoalFundingInCycle } from './safeToSpend';
import { detectRecurringSeries } from './recurringSeries';
import { monthlyBill, dailySpend, makeTx } from './fixtures';

const NOW = new Date(2026, 5, 15);
const JUNE = getCycleRange({ mode: 'calendar', anchorDay: null, now: NOW });

function buildForecast(currentBalance: number): CashflowForecast {
  const bill = monthlyBill('Internet Co', 20, 40, 6, { start: '2025-12' });
  const spend = dailySpend('food', 20, 90, '2026-03-16', { seed: 8 });
  const txns = [...bill, ...spend];
  const series = detectRecurringSeries(txns, { now: NOW });
  return computeCashflowForecast({
    transactions: txns,
    series,
    cycle: JUNE,
    anchorDay: null,
    currentBalance,
    now: NOW,
  });
}

describe('computeSafeToSpend', () => {
  it('breakdown sums exactly to the total', () => {
    const forecast = buildForecast(1500);
    const result = computeSafeToSpend({
      forecast,
      plannedGoalContributionsMonthly: 200,
      goalContributedThisCycle: 50,
    });
    const b = result.breakdown;
    expect(b.currentBalance - b.committedRemaining - b.goalContributionsRemaining - b.reserveBuffer)
      .toBeCloseTo(result.total, 2);
    expect(b.goalContributionsRemaining).toBe(150);
    expect(b.committedRemaining).toBe(40);
    expect(b.reserveBuffer).toBeGreaterThan(0);
  });

  it('divides by days-to-payday including today', () => {
    const forecast = buildForecast(1500);
    const result = computeSafeToSpend({ forecast, plannedGoalContributionsMonthly: 0, goalContributedThisCycle: 0 });
    // June 15 of 30 → 15 full days remain after today; payday boundary is +16.
    expect(result.daysToPayday).toBe(16);
    expect(result.perDay).toBeCloseTo(Math.max(0, result.total) / 16, 2);
  });

  it('reports negative totals honestly and clamps only the per-day figure', () => {
    const forecast = buildForecast(10); // balance far below committed+buffer
    const result = computeSafeToSpend({
      forecast,
      plannedGoalContributionsMonthly: 300,
      goalContributedThisCycle: 0,
    });
    expect(result.isNegative).toBe(true);
    expect(result.total).toBeLessThan(0);
    expect(result.perDay).toBe(0);
  });

  it('goal contributions already made this cycle reduce what is subtracted', () => {
    const forecast = buildForecast(1500);
    const fresh = computeSafeToSpend({ forecast, plannedGoalContributionsMonthly: 200, goalContributedThisCycle: 0 });
    const funded = computeSafeToSpend({ forecast, plannedGoalContributionsMonthly: 200, goalContributedThisCycle: 200 });
    expect(funded.total - fresh.total).toBeCloseTo(200, 2);
    expect(funded.breakdown.goalContributionsRemaining).toBe(0);
  });
});

describe('sumGoalFundingInCycle', () => {
  it('sums goal-funding expenses inside the cycle only', () => {
    const txns = [
      makeTx({ date: '2026-06-05', type: 'expense', category: 'goal-funding-abc', amountBase: 120 }),
      makeTx({ date: '2026-06-10', type: 'expense', category: 'goal-funding-def', amountBase: 80 }),
      makeTx({ date: '2026-05-20', type: 'expense', category: 'goal-funding-abc', amountBase: 999 }), // prior cycle
      makeTx({ date: '2026-06-08', type: 'expense', category: 'food', amountBase: 50 }),
    ];
    expect(sumGoalFundingInCycle(txns, JUNE)).toBe(200);
  });
});

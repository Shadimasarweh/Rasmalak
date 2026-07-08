import { describe, it, expect } from 'vitest';
import { computePredictiveState, summarizeForContext } from './predictiveState';
import { salaryEveryMonth, monthlyBill, dailySpend, type FixtureTransaction } from './fixtures';

const NOW = new Date(2026, 5, 15); // June 15, 2026

// The end-to-end synthetic user: salaried on the 25th, rent on the 1st,
// steady daily food spend, adherent budget history.
function syntheticUser(): FixtureTransaction[] {
  return [
    ...salaryEveryMonth(25, 3000, 6, { start: '2025-12' }),
    ...monthlyBill('Landlord rent', 1, 800, 6, { start: '2026-01' }),
    ...dailySpend('food', 25, 150, '2026-01-16', { seed: 13, zeroDayShare: 0.25 }),
  ];
}

describe('computePredictiveState — end-to-end synthetic user', () => {
  const state = computePredictiveState({
    transactions: syntheticUser(),
    currentBalance: 2600,
    profileFallback: { persona: 'salaried', monthlyIncome: 3000 },
    paydayOverride: null,
    plannedGoalContributionsMonthly: 150,
    budgetHistory: [
      { monthYear: '2026-03', monthlyBudget: 1700 },
      { monthYear: '2026-04', monthlyBudget: 1700 },
      { monthYear: '2026-05', monthlyBudget: 1700 },
    ],
    aux: { savingsRate: 0.25, discretionaryRatio: 0.45, expenseVolatility: 0.1, recurringExpenseRatio: 0.45 },
    now: NOW,
  });

  it('detects the salary and anchors the cycle to payday', () => {
    expect(state.salary.source).toBe('detected');
    expect(state.salary.paydayDayOfMonth).toBe(25);
    expect(state.cycle.mode).toBe('payday');
    // May 25 .. June 24
    expect(state.cycle.start.getDate()).toBe(25);
    expect(state.forecast.cycle.anchor).toBe('payday');
  });

  it('finds the rent series and keeps it out of discretionary', () => {
    const rent = state.series.find((s) => s.merchantLabel === 'Landlord rent');
    expect(rent).toBeTruthy();
    expect(rent!.cadence).toBe('monthly');
    // Rent was paid June 1 (inside the cycle); nothing further due before June 24.
    expect(state.forecast.committed.items.find((i) => i.label === 'Landlord rent')).toBeUndefined();
  });

  it('produces a coherent ordered forecast band', () => {
    const { p25, p50, p75 } = state.forecast.endOfCycleBalance;
    expect(p25).toBeLessThanOrEqual(p50);
    expect(p50).toBeLessThanOrEqual(p75);
    expect(state.forecast.basis.confidence).not.toBe('low');
  });

  it('computes a Safe-to-Spend below the raw balance with an exact breakdown', () => {
    expect(state.safeToSpend.total).toBeLessThan(2600);
    const b = state.safeToSpend.breakdown;
    expect(b.currentBalance - b.committedRemaining - b.goalContributionsRemaining - b.reserveBuffer)
      .toBeCloseTo(state.safeToSpend.total, 2);
  });

  it('meets the minimum-history gate and stamps the engine version', () => {
    expect(state.meta.hasMinimumHistory).toBe(true);
    expect(state.engineVersion).toBe('1.0.0-p1');
    expect(state.computedAt).toBe('2026-06-15');
  });

  it('grants the planner archetype to this adherent smooth spender', () => {
    expect(state.behavior.budgetAdherenceStreak).toBe(3);
    expect(state.archetype.archetype).toBe('planner');
    expect(state.archetype.evidence.length).toBeGreaterThanOrEqual(2);
  });

  it('summarizeForContext produces the compact prompt-safe slice', () => {
    const summary = summarizeForContext(state);
    expect(summary.salary).toEqual({ detected: true, paydayDayOfMonth: 25 });
    expect(summary.endOfCycleBalance).toEqual(state.forecast.endOfCycleBalance);
    expect(summary.upcomingBills.length).toBeLessThanOrEqual(5);
    expect(summary.archetype).toBe('planner');
    expect(summary.confidence).toBe(state.forecast.basis.confidence);
    // Prompt safety: the summary must never carry raw transactions.
    expect(JSON.stringify(summary)).not.toContain('"transactions"');
  });
});

describe('computePredictiveState — overrides and sparse data', () => {
  it('a payday override beats the detected day', () => {
    const state = computePredictiveState({
      transactions: syntheticUser(),
      currentBalance: 2600,
      profileFallback: { persona: 'salaried', monthlyIncome: 3000 },
      paydayOverride: 1,
      plannedGoalContributionsMonthly: 0,
      now: NOW,
    });
    expect(state.cycle.start.getDate()).toBe(1);
  });

  it('no salary and no fallback → calendar cycle, engine still coherent', () => {
    const spendOnly = dailySpend('food', 15, 40, '2026-05-06', { seed: 2 });
    const state = computePredictiveState({
      transactions: spendOnly,
      currentBalance: 500,
      profileFallback: { persona: 'variable', monthlyIncome: null },
      paydayOverride: null,
      plannedGoalContributionsMonthly: 0,
      now: NOW,
    });
    expect(state.salary.source).toBe('none');
    expect(state.cycle.mode).toBe('calendar');
    expect(state.safeToSpend.daysToPayday).toBe(16);
    expect(Number.isFinite(state.safeToSpend.total)).toBe(true);
  });

  it('empty input yields gates, not NaNs', () => {
    const state = computePredictiveState({
      transactions: [],
      currentBalance: 0,
      profileFallback: { persona: null, monthlyIncome: null },
      paydayOverride: null,
      plannedGoalContributionsMonthly: 0,
      now: NOW,
    });
    expect(state.meta.hasMinimumHistory).toBe(false);
    expect(state.series).toEqual([]);
    expect(state.archetype.archetype).toBeNull();
    expect(Number.isFinite(state.safeToSpend.total)).toBe(true);
    expect(Number.isFinite(state.forecast.endOfCycleBalance.p50)).toBe(true);
  });
});

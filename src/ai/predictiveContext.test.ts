/**
 * Deploy-skew smoke test: the AI context layer must behave identically for
 * clients that never send a predictive summary (old client → new server and
 * vice versa), and consume it cleanly when present.
 */

import { describe, it, expect } from 'vitest';
import { buildUserContext, buildEmptyContext } from './context';
import { detectSpendingAlerts } from './alerts';
import type { PredictiveContextSummary } from './deterministic/predictiveState';

function isoToday(dayOffset = 0): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function makeState(predictive?: PredictiveContextSummary | null) {
  const tx = (over: Record<string, unknown>) => ({
    id: String(Math.abs(JSON.stringify(over).length) + Math.random()),
    amount: 0,
    currency: 'JOD',
    amountBase: 100,
    exchangeRateApplied: 1,
    baseCurrencyAtEntry: 'JOD',
    rateSource: 'central_bank' as const,
    date: isoToday(),
    type: 'expense' as const,
    category: 'food',
    ...over,
  });
  return {
    transactions: [
      tx({ type: 'income', category: 'salary', amountBase: 3000 }),
      tx({ amountBase: 120 }),
      tx({ amountBase: 60, category: 'transport' }),
    ],
    currency: 'JOD',
    language: 'en' as const,
    monthlyBudget: 1000,
    categoryBudgets: {},
    savingsGoals: [],
    onboardingData: null,
    predictive,
  };
}

const SUMMARY: PredictiveContextSummary = {
  cycle: { start: isoToday(-10), end: isoToday(19), daysRemaining: 19, anchor: 'payday' },
  endOfCycleBalance: { p25: -50, p50: 420, p75: 800 },
  committedRemaining: 350,
  upcomingBills: [{ label: 'Internet', dueDate: isoToday(5), amount: 40 }],
  safeToSpend: { total: 310, perDay: 15.5 },
  salary: { detected: true, paydayDayOfMonth: 25 },
  baselineDeviations: [
    { category: 'shopping', paceAdjustedSpend: 600, monthlyMedian: 200, madUnits: 8, severity: 'high' },
  ],
  archetype: 'planner',
  behavior: { impulseIndex: 0.2, spendTiming: 'smooth', weekendWeekdayRatio: 1.1 },
  confidence: 'medium',
};

describe('buildUserContext without predictive (legacy path)', () => {
  it('produces the classic shape with no predictive field', () => {
    const ctx = buildUserContext(makeState());
    expect(ctx.predictive).toBeUndefined();
    expect(Number.isFinite(ctx.currentMonth.projectedEndBalance)).toBe(true);
    expect(Array.isArray(ctx.patterns.unusualSpending)).toBe(true);
    expect(ctx.netBalance).toBe(3000 - 180);
  });

  it('buildEmptyContext is untouched', () => {
    const ctx = buildEmptyContext();
    expect(ctx.predictive).toBeUndefined();
    expect(ctx.totalIncome).toBe(0);
  });
});

describe('buildUserContext with predictive', () => {
  const ctx = buildUserContext(makeState(SUMMARY));

  it('uses the engine P50 as the projected end balance', () => {
    expect(ctx.currentMonth.projectedEndBalance).toBe(420);
    expect(ctx.predictive).toBe(SUMMARY);
  });

  it('maps baseline deviations into the legacy unusualSpending shape', () => {
    expect(ctx.patterns.unusualSpending).toHaveLength(1);
    const u = ctx.patterns.unusualSpending[0];
    expect(u.category).toBe('shopping');
    expect(u.amount).toBe(600);
    expect(u.deviation).toBeCloseTo(200, 5); // (600-200)/200 ×100
  });
});

describe('detectSpendingAlerts across both paths', () => {
  it('legacy path keeps the alert shape', () => {
    const alerts = detectSpendingAlerts(buildUserContext(makeState()));
    for (const alert of alerts) {
      expect(alert).toHaveProperty('id');
      expect(alert).toHaveProperty('titleAr');
      expect(['high', 'medium', 'low']).toContain(alert.severity);
    }
  });

  it('predictive path: pessimistic-only shortfall is a medium two-tier alert', () => {
    const alerts = detectSpendingAlerts(buildUserContext(makeState(SUMMARY)));
    const low = alerts.find((a) => a.type === 'low_balance_predicted');
    expect(low).toBeTruthy();
    expect(low!.severity).toBe('medium'); // p25 < 0 ≤ p50
  });

  it('predictive path: median shortfall is high severity', () => {
    const short = { ...SUMMARY, endOfCycleBalance: { p25: -300, p50: -120, p75: 60 } };
    const alerts = detectSpendingAlerts(buildUserContext(makeState(short)));
    const low = alerts.find((a) => a.type === 'low_balance_predicted');
    expect(low!.severity).toBe('high');
  });

  it('predictive path: category spikes come from MAD deviations', () => {
    const alerts = detectSpendingAlerts(buildUserContext(makeState(SUMMARY)));
    const spike = alerts.find((a) => a.type === 'category_spike');
    expect(spike).toBeTruthy();
    expect(spike!.severity).toBe('high');
    expect(spike!.metric?.threshold).toBe(200);
  });
});

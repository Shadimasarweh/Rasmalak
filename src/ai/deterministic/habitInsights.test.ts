import { describe, expect, it } from 'vitest';

import { ComputedBehaviorSignals } from './behaviorProfile';
import { RecurringSeries } from './recurringSeries';
import {
  ADHERENCE_STREAK_THRESHOLD,
  IMPULSE_THRESHOLD,
  deriveHabitInsights,
  subscriptionLoad,
} from './habitInsights';

function signals(overrides: Partial<ComputedBehaviorSignals> = {}): ComputedBehaviorSignals {
  return {
    spendTiming: null,
    impulseIndex: null,
    smallTxnPerWeek: null,
    weekendWeekdayRatio: null,
    budgetAdherenceStreak: null,
    categoryDrift: [],
    basis: { daysOfHistory: 120, cycles: 4, transactionCount: 200 },
    ...overrides,
  };
}

function series(overrides: Partial<RecurringSeries> = {}): RecurringSeries {
  return {
    key: `s-${Math.abs(JSON.stringify(overrides).length)}-${overrides.merchantLabel ?? 'x'}`,
    direction: 'expense',
    categoryId: 'entertainment',
    subcategoryId: null,
    merchantLabel: 'Streaming',
    cadence: 'monthly',
    medianIntervalDays: 30,
    intervalMadDays: 1,
    amountMedian: 10,
    amountMad: 0,
    anchorDayOfMonth: 5,
    firstDate: '2026-01-05',
    lastDate: '2026-06-05',
    nextDueDate: '2026-07-05',
    occurrences: 6,
    confidence: 0.9,
    confidenceGrade: 'high',
    active: true,
    source: 'detected',
    ...overrides,
  } as RecurringSeries;
}

describe('deriveHabitInsights', () => {
  it('returns nothing when every signal sits in the normal band', () => {
    expect(deriveHabitInsights({ behavior: signals(), series: [] })).toEqual([]);
    expect(
      deriveHabitInsights({
        behavior: signals({ impulseIndex: IMPULSE_THRESHOLD - 0.01, weekendWeekdayRatio: 1.2 }),
        series: [],
      }),
    ).toEqual([]);
  });

  it('flags post-payday impulse spending with its evidence', () => {
    const out = deriveHabitInsights({
      behavior: signals({ impulseIndex: 0.42 }),
      series: [],
    });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('impulse_after_payday');
    expect(out[0].params.percent).toBe(42);
    expect(out[0].courseSubject).toBe('budgeting_money_management');
  });

  it('flags weekend-heavy and front-loaded patterns', () => {
    const out = deriveHabitInsights({
      behavior: signals({
        weekendWeekdayRatio: 2.1,
        spendTiming: { profile: 'front_loader', thirdShares: [0.55, 0.3, 0.15], basisCycles: 3 },
      }),
      series: [],
    });
    const ids = out.map((i) => i.id);
    expect(ids).toContain('weekend_heavy');
    expect(ids).toContain('front_loaded_cycle');
    expect(out.find((i) => i.id === 'front_loaded_cycle')!.params.percent).toBe(55);
  });

  it('ignores smooth spenders regardless of shares', () => {
    const out = deriveHabitInsights({
      behavior: signals({
        spendTiming: { profile: 'smooth', thirdShares: [0.5, 0.3, 0.2], basisCycles: 3 },
      }),
      series: [],
    });
    expect(out).toEqual([]);
  });

  it('celebrates a real adherence streak instead of warning', () => {
    const out = deriveHabitInsights({
      behavior: signals({ budgetAdherenceStreak: ADHERENCE_STREAK_THRESHOLD }),
      series: [],
    });
    expect(out[0].id).toBe('adherence_streak');
    expect(out[0].courseSubject).toBe('investment_fundamentals');
  });

  it('ranks by weight, biggest deviation first', () => {
    const out = deriveHabitInsights({
      behavior: signals({ impulseIndex: 0.9, weekendWeekdayRatio: 1.9 }),
      series: [],
    });
    expect(out.map((i) => i.id)).toEqual(['impulse_after_payday', 'weekend_heavy']);
  });
});

describe('subscriptionLoad', () => {
  it('counts active monthly expense series, excluding rent-like commitments', () => {
    const load = subscriptionLoad([
      series({ merchantLabel: 'Netflix', amountMedian: 12 }),
      series({ merchantLabel: 'Gym', categoryId: 'personal', amountMedian: 25 }),
      series({ merchantLabel: 'Cloud', categoryId: 'other-expense', amountMedian: 3.5 }),
      series({ merchantLabel: 'Rent', categoryId: 'housing', amountMedian: 400 }),
      series({ merchantLabel: 'Electricity', categoryId: 'bills', amountMedian: 60 }),
      series({ merchantLabel: 'Salary', direction: 'income', categoryId: 'salary', amountMedian: 1500 }),
      series({ merchantLabel: 'Old box', active: false, amountMedian: 9 }),
      series({ merchantLabel: 'Insurance', cadence: 'yearly', amountMedian: 120 }),
    ]);
    expect(load.count).toBe(3);
    expect(load.monthlyTotal).toBeCloseTo(40.5, 2);
  });

  it('surfaces as an insight only from the count threshold up', () => {
    const two = [series({ merchantLabel: 'A' }), series({ merchantLabel: 'B' })];
    expect(
      deriveHabitInsights({ behavior: signals(), series: two }).map((i) => i.id),
    ).not.toContain('subscription_load');

    const three = [...two, series({ merchantLabel: 'C', amountMedian: 20 })];
    const out = deriveHabitInsights({ behavior: signals(), series: three });
    expect(out.map((i) => i.id)).toContain('subscription_load');
    expect(out.find((i) => i.id === 'subscription_load')!.params.count).toBe(3);
  });
});

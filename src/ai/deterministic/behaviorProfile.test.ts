import { describe, it, expect } from 'vitest';
import {
  computeBehaviorSignals,
  deriveArchetype,
  type ComputedBehaviorSignals,
} from './behaviorProfile';
import { detectRecurringSeries } from './recurringSeries';
import { deriveSalaryProfile, type SalaryProfile } from './salaryProfile';
import { makeTx, salaryEveryMonth, type FixtureTransaction } from './fixtures';
import { isoToDayNumber } from './dates';

const NOW = new Date(2026, 5, 15); // June 15, 2026

const NO_SALARY: SalaryProfile = {
  source: 'none',
  paydayDayOfMonth: null,
  cadence: null,
  amountMedian: null,
  stability: null,
  confidence: 0,
  seriesKey: null,
  nextPayday: null,
};

function signalsFrom(txns: FixtureTransaction[], extra?: Partial<Parameters<typeof computeBehaviorSignals>[0]>) {
  return computeBehaviorSignals({
    transactions: txns,
    series: [],
    salary: NO_SALARY,
    now: NOW,
    ...extra,
  });
}

describe('impulse index', () => {
  it('captures discretionary spend clustered within 72h of salary arrival', () => {
    const salaryTxns = salaryEveryMonth(25, 3000, 3, { start: '2026-03' }); // Mar/Apr/May 25
    const series = detectRecurringSeries(salaryTxns, { now: NOW });
    const salary = deriveSalaryProfile(series, { persona: null, monthlyIncome: null }, 3000);
    expect(salary.source).toBe('detected');

    // Distinct amounts/days so the spends never form their own series.
    const postPayday = [
      makeTx({ date: '2026-03-26', type: 'expense', category: 'shopping', amountBase: 95 }),
      makeTx({ date: '2026-04-27', type: 'expense', category: 'shopping', amountBase: 140 }),
      makeTx({ date: '2026-05-26', type: 'expense', category: 'shopping', amountBase: 60 }),
    ];
    const spread = [
      makeTx({ date: '2026-04-10', type: 'expense', category: 'food', amountBase: 18 }),
      makeTx({ date: '2026-05-12', type: 'expense', category: 'food', amountBase: 25 }),
      makeTx({ date: '2026-06-08', type: 'expense', category: 'food', amountBase: 33 }),
    ];

    const signals = computeBehaviorSignals({
      transactions: [...salaryTxns, ...postPayday, ...spread],
      series,
      salary,
      now: NOW,
    });
    // 295 of 371 discretionary base units land in the 72h window.
    expect(signals.impulseIndex).not.toBeNull();
    expect(signals.impulseIndex!).toBeGreaterThan(0.7);
  });

  it('is null without income events', () => {
    const signals = signalsFrom([
      makeTx({ date: '2026-05-10', type: 'expense', category: 'food', amountBase: 30 }),
    ]);
    expect(signals.impulseIndex).toBeNull();
  });
});

describe('spend timing', () => {
  it('detects a front loader over completed calendar cycles', () => {
    const txns: FixtureTransaction[] = [];
    for (const month of ['2026-03', '2026-04', '2026-05']) {
      // Heavy in the first third, token spend later — varied amounts so no
      // accidental recurring series forms.
      txns.push(
        makeTx({ date: `${month}-02`, type: 'expense', category: 'shopping', amountBase: 90 + txns.length }),
        makeTx({ date: `${month}-04`, type: 'expense', category: 'food', amountBase: 70 + txns.length }),
        makeTx({ date: `${month}-20`, type: 'expense', category: 'food', amountBase: 10 + txns.length }),
      );
    }
    const signals = signalsFrom(txns);
    expect(signals.spendTiming).not.toBeNull();
    expect(signals.spendTiming!.profile).toBe('front_loader');
    expect(signals.spendTiming!.basisCycles).toBeGreaterThanOrEqual(2);
    expect(signals.spendTiming!.thirdShares[0]).toBeGreaterThan(0.45);
  });

  it('is null below two cycles of data', () => {
    const signals = signalsFrom([
      makeTx({ date: '2026-05-02', type: 'expense', category: 'food', amountBase: 50 }),
    ]);
    expect(signals.spendTiming).toBeNull();
  });
});

describe('weekend ratio and small transactions', () => {
  it('reports weekend-vs-weekday spending with the Fri/Sat default', () => {
    const txns: FixtureTransaction[] = [];
    // Cover April 1 .. June 13 daily; weekends 3× weekdays (amount varies
    // ±1 to avoid forming series).
    const start = isoToDayNumber('2026-04-01');
    const end = isoToDayNumber('2026-06-13');
    for (let d = start; d <= end; d++) {
      const dow = ((d + 4) % 7 + 7) % 7;
      const weekend = dow === 5 || dow === 6;
      const dt = new Date(d * 86_400_000);
      const iso = dt.toISOString().slice(0, 10);
      txns.push(
        makeTx({
          date: iso,
          type: 'expense',
          category: 'entertainment',
          amountBase: (weekend ? 30 : 10) + (d % 3),
        }),
      );
    }
    const signals = signalsFrom(txns);
    expect(signals.weekendWeekdayRatio).not.toBeNull();
    expect(signals.weekendWeekdayRatio!).toBeGreaterThan(1.5);
  });

  it('counts small transactions per week against the salary reference', () => {
    const salary: SalaryProfile = { ...NO_SALARY, source: 'detected', amountMedian: 3000, confidence: 0.9 };
    const txns: FixtureTransaction[] = [];
    for (let i = 0; i < 30; i++) {
      // 30 coffees under the 0.5%-of-salary threshold (15), inside 90d.
      txns.push(makeTx({ date: `2026-05-${String((i % 28) + 1).padStart(2, '0')}`, type: 'expense', category: 'food', amountBase: 3 + (i % 5) }));
    }
    const signals = signalsFrom(txns, { salary });
    expect(signals.smallTxnPerWeek).not.toBeNull();
    expect(signals.smallTxnPerWeek!).toBeGreaterThan(1.5);
  });
});

describe('budget adherence streak', () => {
  const spend = (month: string, amount: number) =>
    makeTx({ date: `${month}-10`, type: 'expense', category: 'food', amountBase: amount });

  it('counts consecutive adherent completed months (with 2% grace)', () => {
    const signals = signalsFrom(
      [spend('2026-03', 480), spend('2026-04', 510), spend('2026-05', 490)],
      {
        budgetHistory: [
          { monthYear: '2026-03', monthlyBudget: 500 },
          { monthYear: '2026-04', monthlyBudget: 500 }, // 510 ≤ 500×1.02
          { monthYear: '2026-05', monthlyBudget: 500 },
        ],
      },
    );
    expect(signals.budgetAdherenceStreak).toBe(3);
  });

  it('breaks the streak on an over-budget month', () => {
    const signals = signalsFrom(
      [spend('2026-03', 480), spend('2026-04', 600), spend('2026-05', 490)],
      {
        budgetHistory: [
          { monthYear: '2026-03', monthlyBudget: 500 },
          { monthYear: '2026-04', monthlyBudget: 500 },
          { monthYear: '2026-05', monthlyBudget: 500 },
        ],
      },
    );
    expect(signals.budgetAdherenceStreak).toBe(1);
  });

  it('is null without budget history', () => {
    expect(signalsFrom([spend('2026-05', 100)]).budgetAdherenceStreak).toBeNull();
  });
});

describe('category drift', () => {
  it('flags share shifts of 5+ points between trailing and prior quarters', () => {
    const txns: FixtureTransaction[] = [];
    for (const month of ['2025-12', '2026-01', '2026-02']) {
      txns.push(
        makeTx({ date: `${month}-08`, type: 'expense', category: 'food', amountBase: 100 }),
        makeTx({ date: `${month}-12`, type: 'expense', category: 'transport', amountBase: 100 }),
      );
    }
    for (const month of ['2026-03', '2026-04', '2026-05']) {
      txns.push(
        makeTx({ date: `${month}-08`, type: 'expense', category: 'food', amountBase: 200 }),
        makeTx({ date: `${month}-12`, type: 'expense', category: 'transport', amountBase: 100 }),
      );
    }
    const signals = signalsFrom(txns);
    const food = signals.categoryDrift.find((d) => d.categoryId === 'food');
    expect(food).toBeTruthy();
    expect(food!.direction).toBe('up');
    expect(Math.abs(food!.sharePctPointChange)).toBeGreaterThanOrEqual(5);
  });

  it('is empty below six active completed months', () => {
    const signals = signalsFrom([
      makeTx({ date: '2026-04-08', type: 'expense', category: 'food', amountBase: 100 }),
      makeTx({ date: '2026-05-08', type: 'expense', category: 'food', amountBase: 100 }),
    ]);
    expect(signals.categoryDrift).toEqual([]);
  });
});

describe('deriveArchetype', () => {
  const base: ComputedBehaviorSignals = {
    spendTiming: null,
    impulseIndex: null,
    smallTxnPerWeek: null,
    weekendWeekdayRatio: null,
    budgetAdherenceStreak: null,
    categoryDrift: [],
    basis: { daysOfHistory: 120, cycles: 3, transactionCount: 80 },
  };

  it('crowns the planner with streak + low impulse + smooth timing', () => {
    const result = deriveArchetype(
      {
        ...base,
        budgetAdherenceStreak: 3,
        impulseIndex: 0.1,
        spendTiming: { profile: 'smooth', thirdShares: [0.34, 0.33, 0.33], basisCycles: 3 },
      },
      {},
    );
    expect(result.archetype).toBe('planner');
    expect(result.evidence.length).toBeGreaterThanOrEqual(2);
    expect(result.evidence.map((e) => e.signal)).toContain('adherence_streak');
  });

  it('crowns the impulsive with high impulse + small-txn frequency + front loading', () => {
    const result = deriveArchetype(
      {
        ...base,
        impulseIndex: 0.55,
        smallTxnPerWeek: 14,
        spendTiming: { profile: 'front_loader', thirdShares: [0.6, 0.25, 0.15], basisCycles: 3 },
      },
      {},
    );
    expect(result.archetype).toBe('impulsive');
  });

  it('crowns the seasonal on volatility + drift', () => {
    const result = deriveArchetype(
      {
        ...base,
        categoryDrift: [
          { categoryId: 'food', direction: 'up', sharePctPointChange: 9 },
          { categoryId: 'travel', direction: 'up', sharePctPointChange: 7 },
        ],
      },
      { expenseVolatility: 0.5 },
    );
    expect(result.archetype).toBe('seasonal');
  });

  it('crowns the cautious on savings rate + low discretionary share', () => {
    const result = deriveArchetype(base, { savingsRate: 0.3, discretionaryRatio: 0.2 });
    expect(result.archetype).toBe('cautious');
  });

  it('returns null (still learning) below the score threshold', () => {
    const result = deriveArchetype(base, {});
    expect(result.archetype).toBeNull();
    expect(result.evidence).toEqual([]);
  });

  it('breaks ties by positive framing (planner over impulsive)', () => {
    // planner: streak(+2) + smooth(+1) = 3; impulsive: impulse(+2) + smallTxn(+1) = 3
    const result = deriveArchetype(
      {
        ...base,
        budgetAdherenceStreak: 2,
        impulseIndex: 0.45,
        smallTxnPerWeek: 12,
        spendTiming: { profile: 'smooth', thirdShares: [0.33, 0.34, 0.33], basisCycles: 2 },
      },
      {},
    );
    expect(result.archetype).toBe('planner');
  });
});

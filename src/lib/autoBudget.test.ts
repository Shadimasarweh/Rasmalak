/**
 * autoBudget unit tests — the living spec for the suggestion engine.
 * Run: npm run test:unit
 */

import { describe, it, expect } from 'vitest';
import {
  AutoBudgetTransaction,
  suggestNextMonthPlan,
  suggestionRationale,
} from './autoBudget';

// "Now" used for tests so windows are deterministic.
const NOW = new Date(2026, 4, 15); // May 15, 2026 (month is 0-indexed)

function tx(date: string, category: string, amount: number, type: 'income' | 'expense' = 'expense'): AutoBudgetTransaction {
  // Tests treat the user as already in their base currency, so
  // amountBase mirrors amount.
  return { date, category, amount, amountBase: amount, type };
}

describe('suggestNextMonthPlan', () => {
  it('empty transactions => empty result, no history', () => {
    const r = suggestNextMonthPlan([], { now: NOW });
    expect(Object.keys(r.byCategory).length).toBe(0);
    expect(r.hasEnoughHistory).toBe(false);
    expect(r.totalSuggested).toBe(0);
  });

  it('current month spending is excluded from suggestions', () => {
    // Only one transaction, in current month -> no signal.
    const r = suggestNextMonthPlan([tx('2026-05-10', 'food', 100)], { now: NOW });
    expect(Object.keys(r.byCategory).length).toBe(0);
  });

  it('one prior month with one category => suggestion with buffer + rounding', () => {
    const r = suggestNextMonthPlan(
      [tx('2026-04-12', 'food', 220)],
      { now: NOW, lookbackMonths: 1, roundTo: 5, buffer: 0.05 },
    );
    const food = r.byCategory['food'];
    expect(food).toBeTruthy();
    // average = 220, +5% = 231, max(lastMonth=220, 231) = 231, ceil to 5 = 235
    expect(food.suggestedAmount).toBe(235);
    expect(food.basedOnMonths).toBe(1);
    expect(food.confidence).toBe('low');
  });

  it('3 months: suggestion never goes below the most recent month', () => {
    const r = suggestNextMonthPlan(
      [
        tx('2026-02-05', 'transport', 100),
        tx('2026-03-05', 'transport', 100),
        tx('2026-04-05', 'transport', 300), // spike
      ],
      { now: NOW, lookbackMonths: 3, roundTo: 5, buffer: 0.05 },
    );
    const t = r.byCategory['transport'];
    // average = (100+100+300)/3 = 166.67, +5% = 175, max(last=300, 175) = 300
    expect(t.suggestedAmount).toBe(300);
    expect(t.confidence).toBe('high');
  });

  it('missing months count as zero in the average', () => {
    const r = suggestNextMonthPlan(
      [tx('2026-04-10', 'shopping', 600)],
      { now: NOW, lookbackMonths: 3, roundTo: 5, buffer: 0 },
    );
    const s = r.byCategory['shopping'];
    // average across 3 months with only 1 month populated = 600/3 = 200
    // baseline = max(200, last=600) = 600
    expect(s.suggestedAmount).toBe(600);
    expect(s.basedOnMonths).toBe(1);
    expect(s.confidence).toBe('low');
  });

  it('income transactions are skipped', () => {
    const r = suggestNextMonthPlan(
      [tx('2026-04-01', 'salary', 5000, 'income')],
      { now: NOW },
    );
    expect(Object.keys(r.byCategory).length).toBe(0);
  });

  it('multiple categories aggregate independently', () => {
    const r = suggestNextMonthPlan(
      [
        tx('2026-04-01', 'food', 100),
        tx('2026-04-15', 'food', 200),
        tx('2026-04-20', 'bills', 400),
      ],
      { now: NOW, lookbackMonths: 1, buffer: 0, roundTo: 5 },
    );
    // food: total 300, avg 300, baseline=max(300, 300)=300
    expect(r.byCategory['food'].suggestedAmount).toBe(300);
    expect(r.byCategory['bills'].suggestedAmount).toBe(400);
  });

  it('null category falls into other-expense', () => {
    const t: AutoBudgetTransaction = { type: 'expense', amount: 50, amountBase: 50, date: '2026-04-10', category: null };
    const r = suggestNextMonthPlan([t], { now: NOW, lookbackMonths: 1 });
    expect(r.byCategory['other-expense']).toBeTruthy();
  });

  it('totalSuggested is rounded to roundTo granularity', () => {
    const r = suggestNextMonthPlan(
      [
        tx('2026-04-01', 'food', 91),
        tx('2026-04-02', 'transport', 33),
      ],
      { now: NOW, lookbackMonths: 1, buffer: 0, roundTo: 10 },
    );
    // food: 91 -> 100, transport: 33 -> 40, sum = 140, already multiple of 10
    expect(r.byCategory['food'].suggestedAmount).toBe(100);
    expect(r.byCategory['transport'].suggestedAmount).toBe(40);
    expect(r.totalSuggested).toBe(140);
  });
});

describe('suggestionRationale', () => {
  it('returns localized strings', () => {
    const en = suggestionRationale({
      categoryId: 'food', suggestedAmount: 300, basedOnMonths: 3,
      monthlyAverage: 280, monthlyMax: 320, confidence: 'high',
    }, 'en');
    expect(en).toContain('3 months');
    const ar = suggestionRationale({
      categoryId: 'food', suggestedAmount: 300, basedOnMonths: 3,
      monthlyAverage: 280, monthlyMax: 320, confidence: 'high',
    }, 'ar');
    expect(ar).toContain('أشهر');
  });
});

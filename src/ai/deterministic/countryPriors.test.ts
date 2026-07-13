import { describe, expect, it } from 'vitest';

import { AutoBudgetTransaction, suggestNextMonthPlan } from '@/lib/autoBudget';
import {
  CATEGORY_SHARE_PRIORS,
  EXPENSE_RATE_OF_INCOME,
  FULL_TRUST_MONTHS,
  categorySharePrior,
  coldStartCategoryBudget,
  suggestPlanWithColdStart,
} from './countryPriors';

const NOW = new Date('2026-07-10T12:00:00Z');

function expense(date: string, category: string, amountBase: number): AutoBudgetTransaction {
  return { type: 'expense', amount: amountBase, amountBase, date, category };
}

/** `months` consecutive completed months of `amount`/month in `category`. */
function history(category: string, amount: number, months: number): AutoBudgetTransaction[] {
  const out: AutoBudgetTransaction[] = [];
  for (let m = 1; m <= months; m++) {
    const d = new Date(Date.UTC(2026, 6 - m, 10, 12)); // walk back from June
    out.push(expense(d.toISOString(), category, amount));
  }
  return out;
}

describe('share tables', () => {
  it('every regional table sums to exactly 1', () => {
    for (const [group, shares] of Object.entries(CATEGORY_SHARE_PRIORS)) {
      const sum = Object.values(shares).reduce((a, b) => a + b, 0);
      expect(sum, `${group} shares`).toBeCloseTo(1, 9);
    }
  });

  it('maps countries to their regional group, unknowns to the default', () => {
    expect(categorySharePrior('SA')).toBe(CATEGORY_SHARE_PRIORS.gcc);
    expect(categorySharePrior('JO')).toBe(CATEGORY_SHARE_PRIORS.levant_egypt);
    expect(categorySharePrior('MA')).toBe(CATEGORY_SHARE_PRIORS.maghreb);
    expect(categorySharePrior('OTHER')).toBe(CATEGORY_SHARE_PRIORS.levant_egypt);
    expect(categorySharePrior(null)).toBe(CATEGORY_SHARE_PRIORS.levant_egypt);
  });
});

describe('coldStartCategoryBudget', () => {
  it('scales shares to income at the planned spend rate, in clean steps', () => {
    const budget = coldStartCategoryBudget({ countryCode: 'JO', monthlyIncomeBase: 1000 });
    expect(budget).not.toBeNull();
    const total = Object.values(budget!).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(1000 * EXPENSE_RATE_OF_INCOME - 30);
    expect(total).toBeLessThan(1000 * EXPENSE_RATE_OF_INCOME + 30);
    for (const amount of Object.values(budget!)) {
      expect(amount % 5).toBe(0);
    }
    // Regional structure survives the scaling.
    expect(budget!.food).toBeGreaterThan(budget!.entertainment);
  });

  it('returns null without a usable income', () => {
    expect(coldStartCategoryBudget({ countryCode: 'JO', monthlyIncomeBase: null })).toBeNull();
    expect(coldStartCategoryBudget({ countryCode: 'JO', monthlyIncomeBase: 0 })).toBeNull();
    expect(coldStartCategoryBudget({ countryCode: 'JO', monthlyIncomeBase: NaN })).toBeNull();
  });
});

describe('suggestPlanWithColdStart', () => {
  it('day-one user gets the pure prior as a usable plan', () => {
    const result = suggestPlanWithColdStart([], {
      now: NOW,
      countryCode: 'JO',
      monthlyIncomeBase: 1000,
    });
    const prior = coldStartCategoryBudget({ countryCode: 'JO', monthlyIncomeBase: 1000 })!;

    expect(result.method).toBe('prior_blend');
    expect(result.hasEnoughHistory).toBe(true); // the whole point of item 9
    for (const [cat, amount] of Object.entries(prior)) {
      expect(result.byCategory[cat]?.suggestedAmount).toBe(amount);
      expect(result.byCategory[cat]?.confidence).toBe('low');
      expect(result.byCategory[cat]?.method).toBe('prior_blend');
    }
  });

  it('is exactly the personal plan when income is unknown', () => {
    const txns = history('food', 300, 1);
    const result = suggestPlanWithColdStart(txns, { now: NOW, countryCode: 'JO' });
    const personal = suggestNextMonthPlan(txns, { now: NOW });
    expect(result).toEqual(personal);
  });

  it('is exactly the personal plan once history reaches full trust', () => {
    const txns = history('food', 300, FULL_TRUST_MONTHS + 1);
    const result = suggestPlanWithColdStart(txns, {
      now: NOW,
      countryCode: 'JO',
      monthlyIncomeBase: 1000,
    });
    const personal = suggestNextMonthPlan(txns, { now: NOW });
    expect(result).toEqual(personal);
    expect(result.method).not.toBe('prior_blend');
  });

  it('blends shared categories and fades prior-only ones at 1 month of history', () => {
    const txns = history('food', 300, 1);
    const result = suggestPlanWithColdStart(txns, {
      now: NOW,
      countryCode: 'JO',
      monthlyIncomeBase: 1000,
    });
    const personal = suggestNextMonthPlan(txns, { now: NOW });
    const prior = coldStartCategoryBudget({ countryCode: 'JO', monthlyIncomeBase: 1000 })!;
    const w = 1 / FULL_TRUST_MONTHS;

    // Shared category: weighted mix of observed and prior.
    const expectedFood =
      Math.round((w * personal.byCategory.food.suggestedAmount + (1 - w) * prior.food) / 5) * 5;
    expect(result.byCategory.food.suggestedAmount).toBe(expectedFood);
    expect(result.byCategory.food.method).toBe('prior_blend');

    // Prior-only category: present, but already fading (2/3 of prior).
    const expectedHousing = Math.round(((1 - w) * prior.housing) / 5) * 5;
    expect(result.byCategory.housing.suggestedAmount).toBe(expectedHousing);
    expect(result.byCategory.housing.confidence).toBe('low');
  });

  it('never shrinks a personal-only category toward zero', () => {
    const txns = history('travel', 200, 1); // not in any prior table
    const result = suggestPlanWithColdStart(txns, {
      now: NOW,
      countryCode: 'SA',
      monthlyIncomeBase: 2000,
    });
    const personal = suggestNextMonthPlan(txns, { now: NOW });
    expect(result.byCategory.travel).toEqual(personal.byCategory.travel);
  });
});

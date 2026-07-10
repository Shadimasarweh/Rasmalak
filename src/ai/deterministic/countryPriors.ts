/**
 * Cold-start country priors — predictive engine Phase 2, item 9.
 *
 * A day-one user has zero transaction history, so every personal model
 * (EWMA auto-budget, baselines, forecasts) is silent. But onboarding
 * already told us two things: the user's country and their monthly
 * income. This module turns those into a *sane starting budget* —
 * per-category shares typical for their region, scaled to their income
 * — and then fades it out as real history accumulates (shrinkage
 * blending). The prior is a scaffold, never a verdict: every consumer
 * labels prior-derived numbers at low confidence.
 *
 * Shares are deliberately coarse (three regional groups, not eighteen
 * flimsy per-country tables) and deliberately boring — regional
 * household-budget structure, not lifestyle guesses.
 */

import {
  AutoBudgetCategorySuggestion,
  AutoBudgetOptions,
  AutoBudgetResult,
  AutoBudgetTransaction,
  suggestNextMonthPlan,
} from '@/lib/autoBudget';

// ── Regional share tables ─────────────────────────────────────────────
// Values are shares of the monthly EXPENSE budget (each table sums to 1).

type RegionGroup = 'gcc' | 'levant_egypt' | 'maghreb';

const GROUP_BY_COUNTRY: Record<string, RegionGroup> = {
  SA: 'gcc', AE: 'gcc', KW: 'gcc', QA: 'gcc', BH: 'gcc', OM: 'gcc',
  JO: 'levant_egypt', EG: 'levant_egypt', LB: 'levant_egypt',
  IQ: 'levant_egypt', SY: 'levant_egypt', SD: 'levant_egypt', YE: 'levant_egypt',
  MA: 'maghreb', DZ: 'maghreb', TN: 'maghreb', LY: 'maghreb',
};

const DEFAULT_GROUP: RegionGroup = 'levant_egypt';

export const CATEGORY_SHARE_PRIORS: Record<RegionGroup, Record<string, number>> = {
  gcc: {
    housing: 0.32, food: 0.18, transport: 0.12, bills: 0.08, shopping: 0.08,
    education: 0.06, entertainment: 0.05, health: 0.04, personal: 0.04,
    'other-expense': 0.03,
  },
  levant_egypt: {
    housing: 0.25, food: 0.27, transport: 0.13, bills: 0.09, shopping: 0.07,
    health: 0.05, education: 0.05, entertainment: 0.04, personal: 0.03,
    'other-expense': 0.02,
  },
  maghreb: {
    housing: 0.22, food: 0.3, transport: 0.12, bills: 0.08, shopping: 0.07,
    education: 0.06, health: 0.05, entertainment: 0.04, personal: 0.03,
    'other-expense': 0.03,
  },
};

/** Planned spend as a share of income: budget to 75%, leaving margin
 * for saving — consistent with the health score's savings guidance. */
export const EXPENSE_RATE_OF_INCOME = 0.75;

/** Months of real history at which the prior has fully faded out. */
export const FULL_TRUST_MONTHS = 3;

export function categorySharePrior(countryCode: string | null | undefined): Record<string, number> {
  const group = (countryCode && GROUP_BY_COUNTRY[countryCode]) || DEFAULT_GROUP;
  return CATEGORY_SHARE_PRIORS[group];
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/**
 * A pure-prior starting budget: regional shares × (income × 75%).
 * Returns null when income is unknown — a prior without a scale would
 * just be made-up numbers.
 */
export function coldStartCategoryBudget(input: {
  countryCode: string | null | undefined;
  monthlyIncomeBase: number | null | undefined;
  round?: number;
}): Record<string, number> | null {
  const income = input.monthlyIncomeBase;
  if (!income || !Number.isFinite(income) || income <= 0) return null;
  const step = input.round ?? 5;
  const budgetTotal = income * EXPENSE_RATE_OF_INCOME;
  const shares = categorySharePrior(input.countryCode);
  const out: Record<string, number> = {};
  for (const [categoryId, share] of Object.entries(shares)) {
    const amount = roundTo(budgetTotal * share, step);
    if (amount > 0) out[categoryId] = amount;
  }
  return out;
}

export interface ColdStartOptions extends AutoBudgetOptions {
  countryCode?: string | null;
  monthlyIncomeBase?: number | null;
}

/**
 * `suggestNextMonthPlan` with shrinkage toward the regional prior while
 * history is thin (< FULL_TRUST_MONTHS):
 *
 * - categories seen in BOTH: `w·personal + (1−w)·prior`, w = months/3
 * - prior-only categories: `(1−w)·prior` — they fade out as the user's
 *   real pattern takes over
 * - personal-only categories: untouched (observed spending is never
 *   shrunk toward a prior of zero)
 *
 * At ≥3 months of history, or without onboarding income, this is
 * exactly `suggestNextMonthPlan` — same object, no re-labelling.
 */
export function suggestPlanWithColdStart(
  transactions: AutoBudgetTransaction[],
  options: ColdStartOptions = {},
): AutoBudgetResult {
  const personal = suggestNextMonthPlan(transactions, options);
  const months = personal.monthsAnalyzed;
  if (months >= FULL_TRUST_MONTHS) return personal;

  const prior = coldStartCategoryBudget({
    countryCode: options.countryCode,
    monthlyIncomeBase: options.monthlyIncomeBase,
    round: options.roundTo ?? 5,
  });
  if (!prior) return personal;

  const step = options.roundTo ?? 5;
  const w = Math.max(0, Math.min(1, months / FULL_TRUST_MONTHS));
  const byCategory: Record<string, AutoBudgetCategorySuggestion> = {};

  const categories = new Set([
    ...Object.keys(personal.byCategory),
    ...Object.keys(prior),
  ]);
  for (const categoryId of categories) {
    const own = personal.byCategory[categoryId];
    const priorAmount = prior[categoryId];

    if (own && priorAmount === undefined) {
      byCategory[categoryId] = own;
      continue;
    }
    if (own && priorAmount !== undefined) {
      const blended = roundTo(w * own.suggestedAmount + (1 - w) * priorAmount, step);
      if (blended <= 0) continue;
      byCategory[categoryId] = {
        ...own,
        suggestedAmount: blended,
        confidence: 'low',
        method: 'prior_blend',
      };
      continue;
    }
    // Prior-only: present while young, gone once trusted.
    const fading = roundTo((1 - w) * (priorAmount as number), step);
    if (fading <= 0) continue;
    byCategory[categoryId] = {
      categoryId,
      suggestedAmount: fading,
      basedOnMonths: months,
      monthlyAverage: 0,
      monthlyMax: 0,
      confidence: 'low',
      method: 'prior_blend',
    };
  }

  const totalSuggested = Object.values(byCategory).reduce(
    (sum, s) => sum + s.suggestedAmount,
    0,
  );

  return {
    ...personal,
    byCategory,
    totalSuggested,
    // The entire point of the prior: day-one users get a usable plan
    // instead of an empty state.
    hasEnoughHistory:
      personal.hasEnoughHistory || Object.keys(byCategory).length > 0,
    method: 'prior_blend',
  };
}

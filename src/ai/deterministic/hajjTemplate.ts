/**
 * Hajj goal template — individual roadmap C4.
 *
 * A prefilled savings goal: country-typical local-package cost in the
 * statutory local currency, deadline anchored to 1 Dhu al-Hijjah two
 * hijri years out (enough runway for the Monte Carlo to say something
 * kinder than 0%). The costs are deliberately round, clearly-labelled
 * starting points — packages vary wildly; the user edits freely. The
 * "85% ready by 1450" line comes free from the existing goal-risk chip
 * once the goal exists.
 */

import { firstDayOfHijriMonth, hijriParts, DHU_AL_HIJJAH_MONTH } from './hijri';

/** Typical local Hajj-package cost by residence country (local currency).
 * Rough public-package figures, rounded — starting points, not quotes. */
export const HAJJ_COST_PRIORS: Record<string, { amount: number; currency: string }> = {
  SA: { amount: 15_000, currency: 'SAR' }, // domestic packages
  AE: { amount: 25_000, currency: 'AED' },
  KW: { amount: 2_000, currency: 'KWD' },
  QA: { amount: 25_000, currency: 'QAR' },
  BH: { amount: 2_500, currency: 'BHD' },
  OM: { amount: 2_500, currency: 'OMR' },
  JO: { amount: 4_500, currency: 'JOD' },
  EG: { amount: 350_000, currency: 'EGP' },
  LB: { amount: 6_000, currency: 'USD' }, // priced in USD in practice
  IQ: { amount: 9_000_000, currency: 'IQD' },
  MA: { amount: 65_000, currency: 'MAD' },
  DZ: { amount: 900_000, currency: 'DZD' },
  TN: { amount: 20_000, currency: 'TND' },
};

const DEFAULT_PRIOR = { amount: 6_000, currency: 'USD' };

/** Hijri years of runway the template gives by default. */
export const HAJJ_RUNWAY_HIJRI_YEARS = 2;

export interface HajjGoalTemplate {
  name: string;
  nameAr: string;
  targetAmount: number;
  currency: string;
  deadlineIso: string; // 1 Dhu al-Hijjah of the target hijri year
  targetHijriYear: number;
}

export function buildHajjGoalTemplate(input: {
  countryCode: string | null | undefined;
  now?: Date;
}): HajjGoalTemplate {
  const now = input.now ?? new Date();
  const prior = (input.countryCode && HAJJ_COST_PRIORS[input.countryCode]) || DEFAULT_PRIOR;
  const targetHijriYear = hijriParts(now).year + HAJJ_RUNWAY_HIJRI_YEARS;
  const deadline = firstDayOfHijriMonth(targetHijriYear, DHU_AL_HIJJAH_MONTH);
  return {
    name: `Hajj ${targetHijriYear} AH`,
    nameAr: `الحج ${targetHijriYear}هـ`,
    targetAmount: prior.amount,
    currency: prior.currency,
    deadlineIso: deadline.toISOString().slice(0, 10),
    targetHijriYear,
  };
}

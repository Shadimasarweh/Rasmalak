/**
 * Jordanian Personal Income Tax Calculator
 *
 * Implements the formulas in `Jordanian Income Tax.xlsx`, which mirror
 * the Jordanian personal income tax brackets:
 *
 *   Income build-up:
 *     totalIncome    = salaries & other income
 *                    + retirement salary above JOD 2,500
 *                    - disability exemption (JOD 2,000 per eligible person)
 *     taxableIncome  = totalIncome - personal deduction (max JOD 9,000)
 *                                  - family deduction (max JOD 9,000)
 *                                  - other deductions (medical, education…)
 *     adjustedIncome = taxableIncome - accepted donations
 *                      (donations capped at 25% of taxableIncome)
 *
 *   Progressive brackets on adjustedIncome:
 *     first  JOD 5,000          →  5%
 *     second JOD 5,000          → 10%
 *     third  JOD 5,000          → 15%
 *     fourth JOD 5,000          → 20%
 *     JOD 20,000 – 1,000,000    → 25%
 *     above JOD 1,000,000       → 30%
 *
 * The spreadsheet notes the deduction caps in its labels without
 * enforcing them in formulas; here the caps ARE enforced so the web
 * result never exceeds what the law allows. All amounts are JOD.
 */

export interface JordanIncomeTaxInput {
  /** Annual salaries and other income (JOD). */
  employmentIncome: number;
  /** Annual retirement salary above the JOD 2,500/month exempt portion. */
  retirementIncome: number;
  /** Number of eligible persons for the disability exemption. */
  disabilityCount: number;
  /** Personal deduction claimed; capped at JOD 9,000. */
  personalDeduction: number;
  /** Family deduction claimed; capped at JOD 9,000. */
  familyDeduction: number;
  /** Other deductions — medical, education etc. (JOD 1,000 per person). */
  otherDeductions: number;
  /** Tax-accepted donations; capped at 25% of taxable income. */
  contributions: number;
}

export type JordanTaxBracketKey =
  | 'first5k'
  | 'second5k'
  | 'third5k'
  | 'fourth5k'
  | 'over20k'
  | 'over1m';

export interface JordanTaxBracketRow {
  key: JordanTaxBracketKey;
  /** Marginal rate as a 0–1 fraction. */
  rate: number;
  /** Slice of adjusted taxable income that falls in this bracket. */
  amount: number;
  /** Tax due on this bracket's slice. */
  tax: number;
}

export interface JordanIncomeTaxResult {
  /** disabilityCount × JOD 2,000. */
  disabilityExemption: number;
  totalIncome: number;
  /** Personal deduction after the JOD 9,000 cap. */
  personalDeductionApplied: number;
  /** Family deduction after the JOD 9,000 cap. */
  familyDeductionApplied: number;
  taxableIncome: number;
  /** Donations after the 25%-of-taxable-income cap. */
  contributionsApplied: number;
  adjustedTaxableIncome: number;
  brackets: JordanTaxBracketRow[];
  totalTax: number;
  /** totalTax / totalIncome; 0 when there is no income. */
  effectiveRate: number;
  /** totalIncome - totalTax. */
  netIncomeAfterTax: number;
}

export const DISABILITY_EXEMPTION_PER_PERSON = 2000;
export const PERSONAL_DEDUCTION_MAX = 9000;
export const FAMILY_DEDUCTION_MAX = 9000;
export const CONTRIBUTIONS_MAX_SHARE = 0.25;

const BRACKET_DEFS: { key: JordanTaxBracketKey; size: number; rate: number }[] = [
  { key: 'first5k', size: 5000, rate: 0.05 },
  { key: 'second5k', size: 5000, rate: 0.10 },
  { key: 'third5k', size: 5000, rate: 0.15 },
  { key: 'fourth5k', size: 5000, rate: 0.20 },
  { key: 'over20k', size: 980000, rate: 0.25 },
  { key: 'over1m', size: Infinity, rate: 0.30 },
];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clampNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function calculateJordanIncomeTax(input: JordanIncomeTaxInput): JordanIncomeTaxResult {
  const employmentIncome = clampNonNegative(input.employmentIncome);
  const retirementIncome = clampNonNegative(input.retirementIncome);
  const disabilityCount = Math.floor(clampNonNegative(input.disabilityCount));

  const disabilityExemption = disabilityCount * DISABILITY_EXEMPTION_PER_PERSON;
  const totalIncome = Math.max(0, employmentIncome + retirementIncome - disabilityExemption);

  const personalDeductionApplied = Math.min(clampNonNegative(input.personalDeduction), PERSONAL_DEDUCTION_MAX);
  const familyDeductionApplied = Math.min(clampNonNegative(input.familyDeduction), FAMILY_DEDUCTION_MAX);
  const otherDeductions = clampNonNegative(input.otherDeductions);

  const taxableIncome = Math.max(
    0,
    totalIncome - personalDeductionApplied - familyDeductionApplied - otherDeductions,
  );

  const contributionsApplied = Math.min(
    clampNonNegative(input.contributions),
    taxableIncome * CONTRIBUTIONS_MAX_SHARE,
  );
  const adjustedTaxableIncome = Math.max(0, taxableIncome - contributionsApplied);

  let remaining = adjustedTaxableIncome;
  const brackets: JordanTaxBracketRow[] = BRACKET_DEFS.map((def) => {
    const amount = Math.min(remaining, def.size);
    remaining -= amount;
    return {
      key: def.key,
      rate: def.rate,
      amount: round2(amount),
      tax: round2(amount * def.rate),
    };
  });

  // Sum the rounded per-bracket taxes so the total always matches the
  // bracket table shown to the user.
  const totalTax = round2(brackets.reduce((sum, b) => sum + b.tax, 0));
  const effectiveRate = totalIncome > 0 ? totalTax / totalIncome : 0;

  return {
    disabilityExemption: round2(disabilityExemption),
    totalIncome: round2(totalIncome),
    personalDeductionApplied: round2(personalDeductionApplied),
    familyDeductionApplied: round2(familyDeductionApplied),
    taxableIncome: round2(taxableIncome),
    contributionsApplied: round2(contributionsApplied),
    adjustedTaxableIncome: round2(adjustedTaxableIncome),
    brackets,
    totalTax,
    effectiveRate: Math.round(effectiveRate * 10000) / 10000,
    netIncomeAfterTax: round2(totalIncome - totalTax),
  };
}

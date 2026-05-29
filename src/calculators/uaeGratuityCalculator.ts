/**
 * UAE Employee Gratuity Calculator
 *
 * Implements the formulas in `UAE Employee Gratuity Calculation.xlsx`
 * which mirror UAE Labour Law end-of-service entitlements.
 *
 * Inputs:
 *   - contractType: 'limited' | 'unlimited'
 *   - joiningDate, endDate (defaults to today)
 *   - basicSalary (monthly)
 *   - housing, transportation (allowances; included in totalSalary
 *     for context but NOT used in the gratuity formula — gratuity
 *     is computed against basic salary only)
 *
 * Output rules (in months of service, where 1 year = 12 months):
 *   - Limited contracts:
 *       <60 months: months * (basic*21/30) / 12
 *       >=60 months: 60 * (basic*21/30)/12 + (months-60) * basic/12
 *
 *   - Unlimited contracts (employee resignation):
 *       <37 months  (1-3 yrs): months * (basic*21/30) * 1/3 / 12
 *       37-59       (3-5 yrs): months * (basic*21/30) * 2/3 / 12
 *       >=60        (>5 yrs):  months * (basic*21/30) / 12
 *
 * The math collapses to "X days of basic per year of service",
 * scaled by the unlimited-contract reduction factor. We expose
 * intermediate values so the page can show its work.
 */

export type ContractType = 'limited' | 'unlimited';

export interface UaeGratuityInput {
  contractType: ContractType;
  joiningDate: string;     // ISO 'YYYY-MM-DD'
  endDate: string;         // ISO 'YYYY-MM-DD'
  basicSalary: number;     // monthly basic
  housing: number;         // monthly housing allowance (informational)
  transportation: number;  // monthly transport allowance (informational)
}

export interface UaeGratuityResult {
  monthsOfService: number;
  yearsOfService: number;       // monthsOfService / 12, two-decimal
  totalSalary: number;          // basic + housing + transportation
  /** Equivalent days-of-basic-pay accrued for this gratuity. */
  equivalentDaysOfBasic: number;
  /** Final gratuity payout in monthly pay currency. */
  gratuity: number;
  /** Which bracket of the formula table fired. Helps the UI explain. */
  bracket: 'limited_under_5y' | 'limited_5y_plus' | 'unlimited_1_3y' | 'unlimited_3_5y' | 'unlimited_5y_plus' | 'invalid';
}

function diffMonths(from: Date, to: Date): number {
  // DATEDIF(from, to, "M") in Excel: full months between, no rounding up.
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return 0;
  if (to < from) return 0;
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateUaeGratuity(input: UaeGratuityInput): UaeGratuityResult {
  const { contractType, joiningDate, endDate, basicSalary, housing, transportation } = input;

  const start = new Date(joiningDate);
  const end = new Date(endDate);
  const monthsOfService = diffMonths(start, end);
  const yearsOfService = round2(monthsOfService / 12);
  const totalSalary = round2(basicSalary + housing + transportation);

  if (monthsOfService <= 0 || basicSalary <= 0) {
    return {
      monthsOfService,
      yearsOfService,
      totalSalary,
      equivalentDaysOfBasic: 0,
      gratuity: 0,
      bracket: 'invalid',
    };
  }

  // 21 days of basic per year, expressed as a per-month accrual:
  //   monthlyAccrualAt21d = basicSalary * 21 / 30 / 12
  // Multiplying by months gives total accrual at the 21-day rate.
  const accrual21 = basicSalary * 21 / 30 / 12;
  // 30 days of basic per year (i.e. one full month / year).
  const accrual30 = basicSalary / 12;

  let gratuity = 0;
  let bracket: UaeGratuityResult['bracket'] = 'invalid';

  if (contractType === 'limited') {
    if (monthsOfService < 60) {
      gratuity = monthsOfService * accrual21;
      bracket = 'limited_under_5y';
    } else {
      gratuity = 60 * accrual21 + (monthsOfService - 60) * accrual30;
      bracket = 'limited_5y_plus';
    }
  } else {
    // Unlimited contracts — employee resignation reductions.
    if (monthsOfService < 37) {
      gratuity = monthsOfService * accrual21 * (1 / 3);
      bracket = 'unlimited_1_3y';
    } else if (monthsOfService < 60) {
      gratuity = monthsOfService * accrual21 * (2 / 3);
      bracket = 'unlimited_3_5y';
    } else {
      gratuity = monthsOfService * accrual21;
      bracket = 'unlimited_5y_plus';
    }
  }

  // Convert the gratuity back into "days of basic" so the UI can
  // explain the entitlement in human terms.
  const dailyBasic = basicSalary / 30;
  const equivalentDaysOfBasic = dailyBasic > 0 ? round2(gratuity / dailyBasic) : 0;

  return {
    monthsOfService,
    yearsOfService,
    totalSalary,
    equivalentDaysOfBasic,
    gratuity: round2(gratuity),
    bracket,
  };
}

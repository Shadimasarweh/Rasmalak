/**
 * KSA End of Service (Gratuity) Calculator
 *
 * Implements the formulas in `KSA Gratuity.xlsx`, which mirror the
 * Saudi Labor Law end-of-service award, simplified to a flat rate per
 * bracket of total service length.
 *
 * Inputs:
 *   - endReason: 'employee' (resignation) | 'employer' (termination)
 *   - joiningDate, endDate (defaults to today)
 *   - basicSalary (monthly)
 *   - housing, transportation (allowances; included in totalSalary for
 *     context but NOT used in the award formula — the award is
 *     computed against basic salary only)
 *
 * Award rules (in months of service, where 1 year = 12 months):
 *   - Ended by employee (resignation):
 *       <=24 months:        no award
 *       24 < m <= 60:       (basic / 3)     * m / 12   (1/3 month per year)
 *       60 < m < 120:       (basic * 2 / 3) * m / 12   (2/3 month per year)
 *       >=120 months:        basic          * m / 12   (full month per year)
 *
 *   - Ended by employer:
 *       <=60 months:        (basic / 2) * m / 12       (half month per year)
 *       >60 months:          basic      * m / 12       (full month per year)
 *
 * The source sheet leaves exactly-120-months undefined (uses strict
 * `<` and `>`); we resolve it upward — ten completed years earn the
 * full award. Intermediate values are exposed so the page can show
 * its work.
 */

export type KsaEndReason = 'employee' | 'employer';

export interface KsaGratuityInput {
  endReason: KsaEndReason;
  joiningDate: string;     // ISO 'YYYY-MM-DD'
  endDate: string;         // ISO 'YYYY-MM-DD'
  basicSalary: number;     // monthly basic
  housing: number;         // monthly housing allowance (informational)
  transportation: number;  // monthly transport allowance (informational)
}

export interface KsaGratuityResult {
  monthsOfService: number;
  yearsOfService: number;       // monthsOfService / 12, two-decimal
  totalSalary: number;          // basic + housing + transportation
  /** Award expressed in months of basic pay. */
  equivalentMonthsOfBasic: number;
  /** Final end-of-service award in monthly pay currency. */
  gratuity: number;
  /** Which bracket of the formula table fired. Helps the UI explain. */
  bracket: 'employee_under_2y' | 'employee_2_5y' | 'employee_5_10y' | 'employee_10y_plus' | 'employer_under_5y' | 'employer_5y_plus' | 'invalid';
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

export function calculateKsaGratuity(input: KsaGratuityInput): KsaGratuityResult {
  const { endReason, joiningDate, endDate, basicSalary, housing, transportation } = input;

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
      equivalentMonthsOfBasic: 0,
      gratuity: 0,
      bracket: 'invalid',
    };
  }

  const years = monthsOfService / 12;

  let gratuity = 0;
  let bracket: KsaGratuityResult['bracket'];

  if (endReason === 'employee') {
    if (monthsOfService <= 24) {
      gratuity = 0;
      bracket = 'employee_under_2y';
    } else if (monthsOfService <= 60) {
      gratuity = (basicSalary / 3) * years;
      bracket = 'employee_2_5y';
    } else if (monthsOfService < 120) {
      gratuity = basicSalary * (2 / 3) * years;
      bracket = 'employee_5_10y';
    } else {
      gratuity = basicSalary * years;
      bracket = 'employee_10y_plus';
    }
  } else {
    if (monthsOfService <= 60) {
      gratuity = (basicSalary / 2) * years;
      bracket = 'employer_under_5y';
    } else {
      gratuity = basicSalary * years;
      bracket = 'employer_5y_plus';
    }
  }

  return {
    monthsOfService,
    yearsOfService,
    totalSalary,
    equivalentMonthsOfBasic: round2(gratuity / basicSalary),
    gratuity: round2(gratuity),
    bracket,
  };
}

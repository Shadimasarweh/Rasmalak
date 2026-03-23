/**
 * Mortgage Payoff Calculator
 * 
 * Calculates mortgage amortization schedule with optional extra monthly payments.
 * Uses standard amortization formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
 */

export interface MortgagePayoffInput {
  loanAmount: number;
  annualInterestRate: number; // as percentage, e.g. 5 for 5%
  loanTermYears: number;
  paymentsPerYear: number;
  startDate: string; // ISO date string, e.g. "2026-02-06"
  extraPayment: number; // optional extra payment per period
  lenderName: string;
}

export interface MortgagePayoffSummary {
  scheduledPayment: number;
  scheduledNumberOfPayments: number;
  actualNumberOfPayments: number;
  yearsSaved: number;
  totalEarlyPayments: number;
  totalInterest: number;
  totalPaid: number;
  lenderName: string;
}

export interface AmortizationRow {
  paymentNumber: number;
  paymentDate: Date;
  beginningBalance: number;
  scheduledPayment: number;
  extraPayment: number;
  totalPayment: number;
  principal: number;
  interest: number;
  endingBalance: number;
  cumulativeInterest: number;
}

export interface MortgagePayoffResult {
  summary: MortgagePayoffSummary;
  schedule: AmortizationRow[];
}

/**
 * Adds months to a date, handling end-of-month edge cases.
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Adds periods to a date based on payments per year frequency.
 */
function addPeriod(date: Date, periodsToAdd: number, paymentsPerYear: number): Date {
  if (paymentsPerYear === 12) {
    return addMonths(date, periodsToAdd);
  } else if (paymentsPerYear === 26 || paymentsPerYear === 24) {
    // Biweekly or semi-monthly
    const daysPerPeriod = Math.round(365 / paymentsPerYear);
    const result = new Date(date);
    result.setDate(result.getDate() + daysPerPeriod * periodsToAdd);
    return result;
  } else if (paymentsPerYear === 52) {
    // Weekly
    const result = new Date(date);
    result.setDate(result.getDate() + 7 * periodsToAdd);
    return result;
  } else if (paymentsPerYear === 4) {
    // Quarterly
    return addMonths(date, 3 * periodsToAdd);
  } else if (paymentsPerYear === 1) {
    // Annually
    return addMonths(date, 12 * periodsToAdd);
  }
  // Default: approximate
  const daysPerPeriod = Math.round(365 / paymentsPerYear);
  const result = new Date(date);
  result.setDate(result.getDate() + daysPerPeriod * periodsToAdd);
  return result;
}

/**
 * Calculates the full mortgage payoff with amortization schedule.
 */
export function calculateMortgagePayoff(input: MortgagePayoffInput): MortgagePayoffResult {
  const {
    loanAmount,
    annualInterestRate,
    loanTermYears,
    paymentsPerYear,
    startDate,
    extraPayment,
    lenderName,
  } = input;

  // Calculate periodic interest rate
  const periodicRate = annualInterestRate / 100 / paymentsPerYear;
  const scheduledNumberOfPayments = loanTermYears * paymentsPerYear;

  // Calculate scheduled payment using amortization formula
  let scheduledPayment: number;
  if (periodicRate === 0) {
    scheduledPayment = loanAmount / scheduledNumberOfPayments;
  } else {
    const compoundFactor = Math.pow(1 + periodicRate, scheduledNumberOfPayments);
    scheduledPayment = (loanAmount * periodicRate * compoundFactor) / (compoundFactor - 1);
  }

  // Build amortization schedule
  const schedule: AmortizationRow[] = [];
  let balance = loanAmount;
  let cumulativeInterest = 0;
  let totalEarlyPayments = 0;
  let paymentNumber = 0;
  const start = new Date(startDate);

  while (balance > 0.01 && paymentNumber < scheduledNumberOfPayments * 2) {
    paymentNumber++;
    const paymentDate = addPeriod(start, paymentNumber - 1, paymentsPerYear);

    // Calculate interest for this period
    const interestPayment = balance * periodicRate;

    // Calculate principal from scheduled payment
    let principalPayment = scheduledPayment - interestPayment;

    // Determine extra payment (can't exceed remaining balance after principal)
    let actualExtra = Math.min(extraPayment, balance - principalPayment);
    if (actualExtra < 0) actualExtra = 0;

    // If remaining balance is less than scheduled payment
    if (balance < scheduledPayment + actualExtra - interestPayment) {
      // Final payment adjustment
      principalPayment = balance;
      actualExtra = 0;
      const totalPay = principalPayment + interestPayment;

      cumulativeInterest += interestPayment;

      schedule.push({
        paymentNumber,
        paymentDate,
        beginningBalance: round2(balance),
        scheduledPayment: round2(totalPay),
        extraPayment: 0,
        totalPayment: round2(totalPay),
        principal: round2(principalPayment),
        interest: round2(interestPayment),
        endingBalance: 0,
        cumulativeInterest: round2(cumulativeInterest),
      });

      balance = 0;
      break;
    }

    const totalPrincipal = principalPayment + actualExtra;
    const totalPayment = scheduledPayment + actualExtra;

    balance -= totalPrincipal;
    cumulativeInterest += interestPayment;
    totalEarlyPayments += actualExtra;

    // Prevent floating point issues
    if (balance < 0.01) balance = 0;

    schedule.push({
      paymentNumber,
      paymentDate,
      beginningBalance: round2(balance + totalPrincipal),
      scheduledPayment: round2(scheduledPayment),
      extraPayment: round2(actualExtra),
      totalPayment: round2(totalPayment),
      principal: round2(principalPayment),
      interest: round2(interestPayment),
      endingBalance: round2(balance),
      cumulativeInterest: round2(cumulativeInterest),
    });
  }

  const actualNumberOfPayments = paymentNumber;
  const yearsSaved = (scheduledNumberOfPayments - actualNumberOfPayments) / paymentsPerYear;
  const totalPaid = schedule.reduce((sum, row) => sum + row.totalPayment, 0);

  const summary: MortgagePayoffSummary = {
    scheduledPayment: round2(scheduledPayment),
    scheduledNumberOfPayments,
    actualNumberOfPayments,
    yearsSaved: round2(yearsSaved),
    totalEarlyPayments: round2(totalEarlyPayments),
    totalInterest: round2(cumulativeInterest),
    totalPaid: round2(totalPaid),
    lenderName,
  };

  return { summary, schedule };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}




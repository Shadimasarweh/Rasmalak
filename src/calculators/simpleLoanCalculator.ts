/**
 * Simple Loan Calculator
 *
 * Calculates a standard amortization schedule for a fixed-rate loan.
 * Uses the formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
 */

export interface SimpleLoanInput {
  loanAmount: number;
  annualInterestRate: number; // percentage, e.g. 5.5
  loanPeriodYears: number;
  startDate: string; // ISO date, e.g. "2026-02-09"
}

export interface SimpleLoanSummary {
  monthlyPayment: number;
  numberOfPayments: number;
  totalInterest: number;
  totalCost: number;
}

export interface SimpleLoanRow {
  paymentNumber: number;
  paymentDate: Date;
  beginningBalance: number;
  payment: number;
  principal: number;
  interest: number;
  endingBalance: number;
}

export interface SimpleLoanResult {
  summary: SimpleLoanSummary;
  schedule: SimpleLoanRow[];
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateSimpleLoan(input: SimpleLoanInput): SimpleLoanResult {
  const { loanAmount, annualInterestRate, loanPeriodYears, startDate } = input;

  const monthlyRate = annualInterestRate / 100 / 12;
  const numberOfPayments = Math.round(loanPeriodYears * 12);

  // Calculate monthly payment
  let monthlyPayment: number;
  if (monthlyRate === 0) {
    monthlyPayment = loanAmount / numberOfPayments;
  } else {
    const compoundFactor = Math.pow(1 + monthlyRate, numberOfPayments);
    monthlyPayment = (loanAmount * monthlyRate * compoundFactor) / (compoundFactor - 1);
  }

  // Build amortization schedule
  const schedule: SimpleLoanRow[] = [];
  let balance = loanAmount;
  let totalInterest = 0;
  const start = new Date(startDate);

  for (let i = 1; i <= numberOfPayments && balance > 0.01; i++) {
    const paymentDate = addMonths(start, i);
    const interestPayment = balance * monthlyRate;
    let principalPayment = monthlyPayment - interestPayment;

    // Last payment adjustment
    if (principalPayment > balance) {
      principalPayment = balance;
    }

    const actualPayment = principalPayment + interestPayment;
    const endingBalance = Math.max(0, balance - principalPayment);
    totalInterest += interestPayment;

    schedule.push({
      paymentNumber: i,
      paymentDate,
      beginningBalance: round2(balance),
      payment: round2(actualPayment),
      principal: round2(principalPayment),
      interest: round2(interestPayment),
      endingBalance: round2(endingBalance),
    });

    balance = endingBalance;
  }

  const totalCost = round2(loanAmount + totalInterest);

  return {
    summary: {
      monthlyPayment: round2(monthlyPayment),
      numberOfPayments,
      totalInterest: round2(totalInterest),
      totalCost,
    },
    schedule,
  };
}




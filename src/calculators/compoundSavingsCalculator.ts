/**
 * Compound Savings Calculator
 *
 * Calculates future value of savings with compound interest,
 * regular deposits, and optional extra annual contributions.
 * Matches the logic from the Excel-based Compound Savings Calculator.
 */

export type DepositFrequency = 'monthly' | 'quarterly' | 'annually';

export interface CompoundSavingsInput {
  yearsToInvest: number;
  initialInvestment: number;
  annualInterestRate: number; // decimal, e.g. 0.04 for 4%
  depositAmount: number;
  depositFrequency: DepositFrequency;
  extraAnnualDeposit: number;
}

export interface CompoundSavingsSummary {
  futureValue: number;
  totalInvested: number;
  interestEarned: number;
}

export interface CompoundSavingsRow {
  year: number;
  rate: number;
  interest: number;
  scheduledDeposits: number;
  extraDeposit: number;
  balance: number;
  cumulativeContribution: number;
  cumulativeInterest: number;
}

export interface CompoundSavingsResult {
  summary: CompoundSavingsSummary;
  schedule: CompoundSavingsRow[];
}

function depositsPerYear(freq: DepositFrequency): number {
  switch (freq) {
    case 'monthly': return 12;
    case 'quarterly': return 4;
    case 'annually': return 1;
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateCompoundSavings(input: CompoundSavingsInput): CompoundSavingsResult {
  const {
    yearsToInvest,
    initialInvestment,
    annualInterestRate,
    depositAmount,
    depositFrequency,
    extraAnnualDeposit,
  } = input;

  const periodsPerYear = depositsPerYear(depositFrequency);
  const periodicRate = annualInterestRate / periodsPerYear;
  const yearlyDeposit = depositAmount * periodsPerYear;

  const schedule: CompoundSavingsRow[] = [];
  let balance = initialInvestment;
  let cumulativeContribution = initialInvestment;
  let cumulativeInterest = 0;

  for (let year = 1; year <= yearsToInvest; year++) {
    let yearInterest = 0;

    for (let p = 0; p < periodsPerYear; p++) {
      const periodInterest = balance * periodicRate;
      yearInterest += periodInterest;
      balance += periodInterest + depositAmount;
    }

    balance += extraAnnualDeposit;
    cumulativeContribution += yearlyDeposit + extraAnnualDeposit;
    cumulativeInterest += yearInterest;

    schedule.push({
      year,
      rate: annualInterestRate,
      interest: round2(yearInterest),
      scheduledDeposits: round2(yearlyDeposit),
      extraDeposit: round2(extraAnnualDeposit),
      balance: round2(balance),
      cumulativeContribution: round2(cumulativeContribution),
      cumulativeInterest: round2(cumulativeInterest),
    });
  }

  return {
    summary: {
      futureValue: round2(balance),
      totalInvested: round2(cumulativeContribution),
      interestEarned: round2(cumulativeInterest),
    },
    schedule,
  };
}

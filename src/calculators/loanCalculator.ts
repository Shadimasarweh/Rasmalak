export interface LoanInput {
  incomeMonthly: number;
  monthlyDebt: number;
  interestRateAnnual: number;
  loanAmount: number;
  durationMonths: number;
}

export interface LoanResult {
  monthlyPayment: number;
  debtToIncomeRatio: number;
  affordable: boolean;
}

/**
 * Calculates loan affordability based on income, existing debt, and loan terms.
 * Uses standard amortization formula for monthly payment calculation.
 * 
 * @param input - Loan parameters including income, debt, interest rate, amount, and duration
 * @returns Loan result with monthly payment, debt-to-income ratio, and affordability flag
 */
export function calculateLoan(input: LoanInput): LoanResult {
  const {
    incomeMonthly,
    monthlyDebt,
    interestRateAnnual,
    loanAmount,
    durationMonths,
  } = input;

  // Calculate monthly interest rate
  const monthlyInterestRate = interestRateAnnual / 100 / 12;

  let monthlyPayment: number;

  if (monthlyInterestRate === 0) {
    // Simple division for zero interest loans
    monthlyPayment = loanAmount / durationMonths;
  } else {
    // Standard amortization formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
    const compoundFactor = Math.pow(1 + monthlyInterestRate, durationMonths);
    monthlyPayment =
      (loanAmount * monthlyInterestRate * compoundFactor) / (compoundFactor - 1);
  }

  // Calculate total monthly debt obligations including new loan
  const totalMonthlyDebt = monthlyDebt + monthlyPayment;

  // Calculate debt-to-income ratio as a percentage
  const debtToIncomeRatio =
    incomeMonthly > 0 ? (totalMonthlyDebt / incomeMonthly) * 100 : 100;

  // Loan is affordable if DTI ratio is 40% or below
  const affordable = debtToIncomeRatio <= 40;

  return {
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    debtToIncomeRatio: Math.round(debtToIncomeRatio * 100) / 100,
    affordable,
  };
}

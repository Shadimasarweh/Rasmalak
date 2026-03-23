export interface SavingsRateInput {
  incomeMonthly: number;
  totalExpenses: number;
  monthlyDebtPayment: number;
}

export interface SavingsRateResult {
  monthlySavings: number;
  savingsRate: number;
  isLowSavingsRate: boolean;
  monthsToGoal: number | null;
}

export interface SavingsGoalInput extends SavingsRateInput {
  targetAmount: number;
  currentSavings?: number;
}

/**
 * Calculates savings rate and related metrics.
 * 
 * @param input - Financial parameters including income, expenses, and debt payments
 * @returns Savings metrics including monthly savings, rate percentage, and low savings flag
 */
export function calculateSavingsRate(
  input: SavingsRateInput
): SavingsRateResult {
  const { incomeMonthly, totalExpenses, monthlyDebtPayment } = input;

  // Monthly savings after all expenses and debt payments
  const monthlySavings = Math.max(
    0,
    incomeMonthly - totalExpenses - monthlyDebtPayment
  );

  // Savings rate as a percentage of income
  const savingsRate =
    incomeMonthly > 0 ? (monthlySavings / incomeMonthly) * 100 : 0;

  // Low savings rate if below 10% of income
  const isLowSavingsRate = savingsRate < 10;

  return {
    monthlySavings: Math.round(monthlySavings * 100) / 100,
    savingsRate: Math.round(savingsRate * 100) / 100,
    isLowSavingsRate,
    monthsToGoal: null,
  };
}

/**
 * Calculates savings rate with goal projection.
 * 
 * @param input - Financial parameters including target savings goal
 * @returns Savings metrics including months required to reach goal
 */
export function calculateSavingsWithGoal(
  input: SavingsGoalInput
): SavingsRateResult {
  const baseResult = calculateSavingsRate(input);

  const { targetAmount, currentSavings = 0 } = input;
  const remainingAmount = targetAmount - currentSavings;

  let monthsToGoal: number | null = null;

  if (baseResult.monthlySavings > 0 && remainingAmount > 0) {
    monthsToGoal = Math.ceil(remainingAmount / baseResult.monthlySavings);
  } else if (remainingAmount <= 0) {
    monthsToGoal = 0;
  }

  return {
    ...baseResult,
    monthsToGoal,
  };
}



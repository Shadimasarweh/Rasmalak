export interface AffordabilityInput {
  incomeMonthly: number;
  totalExpenses: number;
  monthlyDebtPayment: number;
}

export interface AffordabilityResult {
  disposableIncome: number;
  expenseToIncomeRatio: number;
  debtToIncomeRatio: number;
  savingsCapacity: number;
  isOverspending: boolean;
}

/**
 * Calculates general affordability metrics based on income, expenses, and debt.
 * 
 * @param input - Financial parameters including income, expenses, and debt payments
 * @returns Affordability metrics including disposable income, ratios, and overspending flag
 */
export function calculateAffordability(
  input: AffordabilityInput
): AffordabilityResult {
  const { incomeMonthly, totalExpenses, monthlyDebtPayment } = input;

  // Disposable income after all expenses and debt payments
  const disposableIncome = incomeMonthly - totalExpenses - monthlyDebtPayment;

  // Expense-to-income ratio as a percentage
  const expenseToIncomeRatio =
    incomeMonthly > 0 ? (totalExpenses / incomeMonthly) * 100 : 100;

  // Debt-to-income ratio as a percentage
  const debtToIncomeRatio =
    incomeMonthly > 0 ? (monthlyDebtPayment / incomeMonthly) * 100 : 100;

  // Savings capacity is what remains after expenses and debt
  const savingsCapacity = Math.max(0, disposableIncome);

  // Overspending if expenses exceed 90% of income
  const isOverspending = expenseToIncomeRatio > 90;

  return {
    disposableIncome: Math.round(disposableIncome * 100) / 100,
    expenseToIncomeRatio: Math.round(expenseToIncomeRatio * 100) / 100,
    debtToIncomeRatio: Math.round(debtToIncomeRatio * 100) / 100,
    savingsCapacity: Math.round(savingsCapacity * 100) / 100,
    isOverspending,
  };
}



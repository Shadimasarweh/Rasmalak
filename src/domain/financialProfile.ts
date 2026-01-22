export interface FinancialProfile {
  userId: string;
  income: {
    amount: number;
    frequency: "monthly" | "weekly" | "irregular";
  };
  savingsGoal?: {
    targetAmount: number;
    targetDate: Date;
  };
  liabilities?: {
    totalDebt: number;
    monthlyDebtPayment: number;
  };
}

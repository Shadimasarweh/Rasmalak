import type { Rule, RuleContext, RuleResult } from "./Rule";

/**
 * Low Savings Rate Rule
 * 
 * Condition: savings < 10% of income
 * Severity: info
 * Insight code: LOW_SAVINGS_RATE
 */
export const lowSavingsRule: Rule = {
  id: "low-savings",
  appliesTo: ["individual", "self_employed", "sme"],

  evaluate(ctx: RuleContext): RuleResult | null {
    const { profile, transactions } = ctx;

    // Get monthly income amount
    const monthlyIncome = normalizeToMonthlyIncome(profile);

    if (monthlyIncome <= 0) {
      return null;
    }

    // Calculate total expenses and debt payments
    const totalExpenses = calculateMonthlyExpenses(transactions);
    const monthlyDebtPayment = profile.liabilities?.monthlyDebtPayment ?? 0;

    // Calculate savings (income minus expenses and debt)
    const monthlySavings = monthlyIncome - totalExpenses - monthlyDebtPayment;
    const savingsRate = monthlySavings / monthlyIncome;

    // Check if savings rate is below 10%
    const threshold = 0.1;

    if (savingsRate < threshold) {
      return {
        ruleId: this.id,
        severity: "info",
        insightCode: "LOW_SAVINGS_RATE",
        payload: {
          monthlySavings: Math.max(0, monthlySavings),
          monthlyIncome,
          savingsRate: Math.round(savingsRate * 100),
          threshold: Math.round(threshold * 100),
        },
      };
    }

    return null;
  },
};

/**
 * Normalizes income to monthly amount based on frequency.
 */
function normalizeToMonthlyIncome(profile: { income: { amount: number; frequency: string } }): number {
  const { amount, frequency } = profile.income;

  switch (frequency) {
    case "monthly":
      return amount;
    case "weekly":
      return amount * 4.33;
    case "irregular":
      return amount;
    default:
      return amount;
  }
}

/**
 * Calculates total expenses from transactions in the current month.
 */
function calculateMonthlyExpenses(transactions: { type: string; amount: number; date: Date }[]): number {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return transactions
    .filter((t) => {
      const txDate = new Date(t.date);
      return (
        t.type === "expense" &&
        txDate.getMonth() === currentMonth &&
        txDate.getFullYear() === currentYear
      );
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

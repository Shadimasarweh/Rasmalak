import type { Rule, RuleContext, RuleResult } from "./Rule";
import type { FinancialProfile } from "../domain/financialProfile";
import type { Transaction } from "../domain/transaction";

/**
 * Monthly Overspending Rule
 * 
 * Condition: total expenses > 90% of income
 * Severity: warning
 * Insight code: MONTHLY_OVERSPEND
 */
export const overspendingRule: Rule = {
  id: "overspending",
  appliesTo: ["individual", "self_employed", "sme"],

  evaluate(ctx: RuleContext): RuleResult | null {
    const { profile, transactions } = ctx;

    // Get monthly income amount
    const monthlyIncome = normalizeToMonthlyIncome(profile);

    if (monthlyIncome <= 0) {
      return null;
    }

    // Calculate total expenses from transactions in current month
    const totalExpenses = calculateMonthlyExpenses(transactions);

    // Check if expenses exceed 90% of income
    const expenseRatio = totalExpenses / monthlyIncome;
    const threshold = 0.9;

    if (expenseRatio > threshold) {
      return {
        ruleId: this.id,
        severity: "warning",
        insightCode: "MONTHLY_OVERSPEND",
        payload: {
          totalExpenses,
          monthlyIncome,
          expenseRatio: Math.round(expenseRatio * 100),
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
function normalizeToMonthlyIncome(profile: FinancialProfile): number {
  const { amount, frequency } = profile.income;

  switch (frequency) {
    case "monthly":
      return amount;
    case "weekly":
      return amount * 4.33; // Average weeks per month
    case "irregular":
      // For irregular income, use the provided amount as-is (assumed monthly average)
      return amount;
    default:
      return amount;
  }
}

/**
 * Calculates total expenses from transactions in the current month.
 */
function calculateMonthlyExpenses(transactions: Transaction[]): number {
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



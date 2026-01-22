import type { Rule, RuleContext, RuleResult } from "./Rule";

/**
 * High Debt Risk Rule
 * 
 * Condition: debt-to-income ratio > 40%
 * Severity: critical
 * Insight code: HIGH_DEBT_RISK
 */
export const highDebtRiskRule: Rule = {
  id: "high-debt-risk",
  appliesTo: ["individual", "self_employed", "sme"],

  evaluate(ctx: RuleContext): RuleResult | null {
    const { profile } = ctx;

    // Get monthly income amount
    const monthlyIncome = normalizeToMonthlyIncome(profile);

    if (monthlyIncome <= 0) {
      return null;
    }

    // Get monthly debt payment
    const monthlyDebtPayment = profile.liabilities?.monthlyDebtPayment ?? 0;

    if (monthlyDebtPayment <= 0) {
      return null;
    }

    // Calculate debt-to-income ratio
    const debtToIncomeRatio = monthlyDebtPayment / monthlyIncome;
    const threshold = 0.4;

    if (debtToIncomeRatio > threshold) {
      return {
        ruleId: this.id,
        severity: "critical",
        insightCode: "HIGH_DEBT_RISK",
        payload: {
          monthlyDebtPayment,
          monthlyIncome,
          debtToIncomeRatio: Math.round(debtToIncomeRatio * 100),
          threshold: Math.round(threshold * 100),
          totalDebt: profile.liabilities?.totalDebt ?? 0,
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

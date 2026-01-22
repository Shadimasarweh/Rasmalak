/**
 * MVP Test Harness for Rasmalak Core Logic
 * 
 * This file validates the domain models, calculators, and rules engine
 * using deterministic mock data. It is a developer confidence harness,
 * not a production test suite.
 * 
 * Expected behavior:
 * - All calculators return sane numeric values
 * - All three MVP rules trigger (overspending, low savings, high debt)
 * - insights.length === 3
 * 
 * Run with: npx ts-node src/tests/runMvpScenario.ts
 *       or: npx tsx src/tests/runMvpScenario.ts
 */

// ============================================================================
// Imports
// ============================================================================

import type { User } from "../domain/user";
import type { FinancialProfile } from "../domain/financialProfile";
import type { Transaction } from "../domain/transaction";
import type { RuleContext } from "../rules/Rule";

import {
  calculateLoan,
  calculateAffordability,
  calculateSavingsRate,
} from "../calculators";

import {
  overspendingRule,
  lowSavingsRule,
  highDebtRiskRule,
} from "../rules";

import { runRules } from "../application/ruleRunner";

// ============================================================================
// Mock Data
// ============================================================================

/**
 * Mock User: Individual user in Jordan using JOD currency.
 */
const mockUser: User = {
  id: "user-001",
  type: "individual",
  country: "JO",
  currency: "JOD",
  language: "ar",
  createdAt: new Date("2025-01-01"),
};

/**
 * Mock Financial Profile:
 * - Monthly income: 1000 JOD
 * - Monthly debt payment: 450 JOD (45% of income → triggers HIGH_DEBT_RISK at >40%)
 * - No savings goal defined
 * 
 * This profile is designed to trigger the high debt risk rule.
 */
const mockProfile: FinancialProfile = {
  userId: "user-001",
  income: {
    amount: 1000,
    frequency: "monthly",
  },
  liabilities: {
    totalDebt: 10000,
    monthlyDebtPayment: 450, // 45% DTI ratio → triggers HIGH_DEBT_RISK
  },
};

/**
 * Helper: Get current month dates for transactions.
 * Rules filter by current month/year, so we must use current dates.
 */
function getCurrentMonthDate(day: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), day);
}

/**
 * Mock Transactions:
 * - 1 income transaction (salary)
 * - Multiple expense transactions totaling 920 JOD (92% of income → triggers MONTHLY_OVERSPEND at >90%)
 * 
 * Expense breakdown:
 * - Rent: 400 JOD
 * - Groceries: 200 JOD
 * - Utilities: 100 JOD
 * - Transport: 120 JOD
 * - Entertainment: 100 JOD
 * Total expenses: 920 JOD (92% of 1000 JOD income)
 * 
 * Combined with 450 JOD debt payment:
 * - Remaining: 1000 - 920 - 450 = -370 JOD (negative, so savings = 0)
 * - Savings rate: 0% → triggers LOW_SAVINGS_RATE at <10%
 */
const mockTransactions: Transaction[] = [
  // Income
  {
    id: "tx-001",
    userId: "user-001",
    type: "income",
    category: "salary",
    amount: 1000,
    date: getCurrentMonthDate(1),
    notes: "Monthly salary",
  },
  // Expenses (current month)
  {
    id: "tx-002",
    userId: "user-001",
    type: "expense",
    category: "rent",
    amount: 400,
    date: getCurrentMonthDate(5),
    notes: "Monthly rent",
  },
  {
    id: "tx-003",
    userId: "user-001",
    type: "expense",
    category: "groceries",
    amount: 200,
    date: getCurrentMonthDate(7),
  },
  {
    id: "tx-004",
    userId: "user-001",
    type: "expense",
    category: "utilities",
    amount: 100,
    date: getCurrentMonthDate(10),
    notes: "Electricity and water",
  },
  {
    id: "tx-005",
    userId: "user-001",
    type: "expense",
    category: "transport",
    amount: 120,
    date: getCurrentMonthDate(12),
  },
  {
    id: "tx-006",
    userId: "user-001",
    type: "expense",
    category: "entertainment",
    amount: 100,
    date: getCurrentMonthDate(15),
  },
];

// ============================================================================
// Calculator Execution
// ============================================================================

console.log("=".repeat(60));
console.log("RASMALAK MVP TEST HARNESS");
console.log("=".repeat(60));
console.log();

// Calculate total expenses from transactions (matching rule logic)
const totalExpenses = mockTransactions
  .filter((t) => t.type === "expense")
  .reduce((sum, t) => sum + t.amount, 0);

console.log("📊 INPUT DATA SUMMARY");
console.log("-".repeat(40));
console.log(`User ID: ${mockUser.id}`);
console.log(`User Type: ${mockUser.type}`);
console.log(`Monthly Income: ${mockProfile.income.amount} ${mockUser.currency}`);
console.log(`Monthly Debt Payment: ${mockProfile.liabilities?.monthlyDebtPayment} ${mockUser.currency}`);
console.log(`Total Expenses (this month): ${totalExpenses} ${mockUser.currency}`);
console.log(`Transaction Count: ${mockTransactions.length}`);
console.log();

// --- Loan Calculator ---
const loanResult = calculateLoan({
  incomeMonthly: mockProfile.income.amount,
  monthlyDebt: mockProfile.liabilities?.monthlyDebtPayment ?? 0,
  interestRateAnnual: 8.5, // Typical personal loan rate
  loanAmount: 5000,
  durationMonths: 24,
});

console.log("🏦 LOAN CALCULATOR");
console.log("-".repeat(40));
console.log(`Loan Amount: 5000 ${mockUser.currency} @ 8.5% for 24 months`);
console.log(`Monthly Payment: ${loanResult.monthlyPayment} ${mockUser.currency}`);
console.log(`DTI Ratio (with new loan): ${loanResult.debtToIncomeRatio}%`);
console.log(`Affordable: ${loanResult.affordable ? "Yes" : "No"}`);
console.log();

// --- Affordability Calculator ---
const affordabilityResult = calculateAffordability({
  incomeMonthly: mockProfile.income.amount,
  totalExpenses: totalExpenses,
  monthlyDebtPayment: mockProfile.liabilities?.monthlyDebtPayment ?? 0,
});

console.log("💰 AFFORDABILITY CALCULATOR");
console.log("-".repeat(40));
console.log(`Disposable Income: ${affordabilityResult.disposableIncome} ${mockUser.currency}`);
console.log(`Expense-to-Income Ratio: ${affordabilityResult.expenseToIncomeRatio}%`);
console.log(`Debt-to-Income Ratio: ${affordabilityResult.debtToIncomeRatio}%`);
console.log(`Savings Capacity: ${affordabilityResult.savingsCapacity} ${mockUser.currency}`);
console.log(`Is Overspending: ${affordabilityResult.isOverspending ? "Yes" : "No"}`);
console.log();

// --- Savings Rate Calculator ---
const savingsResult = calculateSavingsRate({
  incomeMonthly: mockProfile.income.amount,
  totalExpenses: totalExpenses,
  monthlyDebtPayment: mockProfile.liabilities?.monthlyDebtPayment ?? 0,
});

console.log("💵 SAVINGS RATE CALCULATOR");
console.log("-".repeat(40));
console.log(`Monthly Savings: ${savingsResult.monthlySavings} ${mockUser.currency}`);
console.log(`Savings Rate: ${savingsResult.savingsRate}%`);
console.log(`Is Low Savings Rate: ${savingsResult.isLowSavingsRate ? "Yes" : "No"}`);
console.log();

// Store calculator results for rule context
const calculatorResults: Record<string, unknown> = {
  loan: loanResult,
  affordability: affordabilityResult,
  savings: savingsResult,
};

// ============================================================================
// Rules Execution
// ============================================================================

// Build the rule context
const ruleContext: RuleContext = {
  user: mockUser,
  profile: mockProfile,
  transactions: mockTransactions,
  calculatorResults: calculatorResults,
};

// All MVP rules
const allRules = [overspendingRule, lowSavingsRule, highDebtRiskRule];

// Run the rules pipeline
const insights = runRules(allRules, ruleContext);

console.log("⚠️  RULES ENGINE RESULTS");
console.log("-".repeat(40));
console.log(`Total Insights Generated: ${insights.length}`);
console.log();

if (insights.length === 0) {
  console.log("❌ No insights triggered. Check threshold values.");
} else {
  insights.forEach((insight, index) => {
    console.log(`[${index + 1}] ${insight.severity.toUpperCase()}`);
    console.log(`    Title Key: ${insight.titleKey}`);
    console.log(`    Body Key: ${insight.bodyKey}`);
    if (insight.payload) {
      console.log(`    Payload: ${JSON.stringify(insight.payload, null, 2).replace(/\n/g, "\n    ")}`);
    }
    console.log();
  });
}

// ============================================================================
// Validation Summary
// ============================================================================

console.log("=".repeat(60));
console.log("VALIDATION SUMMARY");
console.log("=".repeat(60));

const expectedInsights = 3;
const hasOverspend = insights.some((i) => i.titleKey.includes("overspend"));
const hasLowSavings = insights.some((i) => i.titleKey.includes("low_savings"));
const hasHighDebt = insights.some((i) => i.titleKey.includes("high_debt"));

console.log(`✓ Insights count: ${insights.length} (expected: ${expectedInsights})`);
console.log(`✓ MONTHLY_OVERSPEND triggered: ${hasOverspend ? "Yes ✓" : "No ✗"}`);
console.log(`✓ LOW_SAVINGS_RATE triggered: ${hasLowSavings ? "Yes ✓" : "No ✗"}`);
console.log(`✓ HIGH_DEBT_RISK triggered: ${hasHighDebt ? "Yes ✓" : "No ✗"}`);
console.log();

if (insights.length === expectedInsights && hasOverspend && hasLowSavings && hasHighDebt) {
  console.log("🎉 ALL MVP RULES VALIDATED SUCCESSFULLY");
} else {
  console.log("⚠️  VALIDATION INCOMPLETE - Review rule thresholds");
  
  // Diagnostic info
  console.log();
  console.log("Diagnostic Info:");
  console.log(`  Expense Ratio: ${(totalExpenses / mockProfile.income.amount * 100).toFixed(1)}% (threshold: >90%)`);
  console.log(`  DTI Ratio: ${((mockProfile.liabilities?.monthlyDebtPayment ?? 0) / mockProfile.income.amount * 100).toFixed(1)}% (threshold: >40%)`);
  const monthlySavings = mockProfile.income.amount - totalExpenses - (mockProfile.liabilities?.monthlyDebtPayment ?? 0);
  const savingsRate = Math.max(0, monthlySavings) / mockProfile.income.amount * 100;
  console.log(`  Savings Rate: ${savingsRate.toFixed(1)}% (threshold: <10%)`);
}

console.log();
console.log("=".repeat(60));

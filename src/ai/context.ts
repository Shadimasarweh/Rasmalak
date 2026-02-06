/**
 * Rasmalak AI Context Builder
 * ===========================
 * Transforms app data (transactions, budgets, goals) into
 * the UserFinancialContext structure the AI needs.
 * 
 * This is the bridge between your Zustand stores and the AI.
 */

import { UserFinancialContext, CategorySpending } from './types';

// ============================================
// TYPES (matching your transaction store)
// ============================================

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  date: string;
  type: 'income' | 'expense';
  category: string | null;
  description?: string;
}

interface SavingsGoal {
  id: string;
  name: string;
  nameAr: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  color: string;
}

interface AppState {
  transactions: Transaction[];
  currency: string;
  language: 'ar' | 'en';
  monthlyBudget: number;
  categoryBudgets: Record<string, number>;
  savingsGoals: SavingsGoal[];
  onboardingData?: {
    segment: 'individual' | 'self_employed' | 'sme';
  } | null;
}

// ============================================
// DATE HELPERS
// ============================================

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getDaysRemainingInMonth(): number {
  const now = new Date();
  const endOfMonth = getEndOfMonth(now);
  return endOfMonth.getDate() - now.getDate();
}

function isInCurrentMonth(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  return (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

function isInLastMonth(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return (
    date.getMonth() === lastMonth.getMonth() &&
    date.getFullYear() === lastMonth.getFullYear()
  );
}

// ============================================
// COMPUTATION HELPERS
// ============================================

function computeTotalIncome(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

function computeTotalExpenses(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

function computeSpendingByCategory(transactions: Transaction[]): CategorySpending[] {
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  const totalExpenses = computeTotalExpenses(transactions);
  
  // Group by category
  const categoryMap = new Map<string, { amount: number; count: number }>();
  
  for (const tx of expenseTransactions) {
    const category = tx.category || 'other';
    const existing = categoryMap.get(category) || { amount: 0, count: 0 };
    categoryMap.set(category, {
      amount: existing.amount + Math.abs(tx.amount),
      count: existing.count + 1,
    });
  }
  
  // Convert to array and compute percentages
  const result: CategorySpending[] = [];
  for (const [category, data] of categoryMap.entries()) {
    result.push({
      category,
      amount: data.amount,
      percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
      transactionCount: data.count,
    });
  }
  
  // Sort by amount descending
  return result.sort((a, b) => b.amount - a.amount);
}

function detectUnusualSpending(
  currentMonthTransactions: Transaction[],
  lastMonthTransactions: Transaction[]
): Array<{ category: string; amount: number; deviation: number }> {
  const currentByCategory = computeSpendingByCategory(currentMonthTransactions);
  const lastByCategory = computeSpendingByCategory(lastMonthTransactions);
  
  const unusual: Array<{ category: string; amount: number; deviation: number }> = [];
  
  for (const current of currentByCategory) {
    const last = lastByCategory.find(c => c.category === current.category);
    if (last && last.amount > 0) {
      const deviation = ((current.amount - last.amount) / last.amount) * 100;
      // Flag if more than 30% above last month
      if (deviation > 30) {
        unusual.push({
          category: current.category,
          amount: current.amount,
          deviation,
        });
      }
    }
  }
  
  return unusual.sort((a, b) => b.deviation - a.deviation);
}

function detectRecurringExpenses(
  transactions: Transaction[]
): Array<{ description: string; amount: number; frequency: 'weekly' | 'monthly' | 'yearly' }> {
  // Simple detection: look for similar amounts with same description
  const descriptionMap = new Map<string, { amounts: number[]; dates: string[] }>();
  
  for (const tx of transactions.filter(t => t.type === 'expense')) {
    const desc = (tx.description || tx.category || 'unknown').toLowerCase();
    const existing = descriptionMap.get(desc) || { amounts: [], dates: [] };
    existing.amounts.push(Math.abs(tx.amount));
    existing.dates.push(tx.date);
    descriptionMap.set(desc, existing);
  }
  
  const recurring: Array<{ description: string; amount: number; frequency: 'weekly' | 'monthly' | 'yearly' }> = [];
  
  for (const [desc, data] of descriptionMap.entries()) {
    // If appears 2+ times with similar amounts, likely recurring
    if (data.amounts.length >= 2) {
      const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;
      const variance = data.amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / data.amounts.length;
      const stdDev = Math.sqrt(variance);
      
      // If amounts are consistent (low variance), it's probably recurring
      if (stdDev / avgAmount < 0.1) { // Less than 10% variance
        recurring.push({
          description: desc,
          amount: avgAmount,
          frequency: 'monthly', // Assume monthly for now
        });
      }
    }
  }
  
  return recurring.slice(0, 5); // Top 5
}

function computeMonthComparison(
  currentMonthTransactions: Transaction[],
  lastMonthTransactions: Transaction[]
): { incomeChange: number; expenseChange: number; trend: 'improving' | 'stable' | 'declining' } {
  const currentIncome = computeTotalIncome(currentMonthTransactions);
  const currentExpenses = computeTotalExpenses(currentMonthTransactions);
  const lastIncome = computeTotalIncome(lastMonthTransactions);
  const lastExpenses = computeTotalExpenses(lastMonthTransactions);
  
  const incomeChange = lastIncome > 0 
    ? ((currentIncome - lastIncome) / lastIncome) * 100 
    : 0;
  const expenseChange = lastExpenses > 0 
    ? ((currentExpenses - lastExpenses) / lastExpenses) * 100 
    : 0;
  
  // Determine trend
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  const netChange = (currentIncome - currentExpenses) - (lastIncome - lastExpenses);
  
  if (netChange > 0 && Math.abs(netChange) > 50) {
    trend = 'improving';
  } else if (netChange < 0 && Math.abs(netChange) > 50) {
    trend = 'declining';
  }
  
  return { incomeChange, expenseChange, trend };
}

function projectEndOfMonthBalance(
  currentBalance: number,
  currentMonthExpenses: number,
  daysElapsed: number,
  daysRemaining: number
): number {
  if (daysElapsed === 0) return currentBalance;
  
  const dailySpendRate = currentMonthExpenses / daysElapsed;
  const projectedRemainingExpenses = dailySpendRate * daysRemaining;
  
  return currentBalance - projectedRemainingExpenses;
}

// ============================================
// MAIN CONTEXT BUILDER
// ============================================

/**
 * Build the UserFinancialContext from app state
 * This is called before every AI interaction
 */
export function buildUserContext(state: AppState): UserFinancialContext {
  const {
    transactions,
    currency,
    language,
    monthlyBudget,
    categoryBudgets,
    savingsGoals,
    onboardingData,
  } = state;
  
  // Split transactions by time period
  const currentMonthTransactions = transactions.filter(t => isInCurrentMonth(t.date));
  const lastMonthTransactions = transactions.filter(t => isInLastMonth(t.date));
  
  // Compute basic metrics
  const totalIncome = computeTotalIncome(transactions);
  const totalExpenses = computeTotalExpenses(transactions);
  const netBalance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netBalance / totalIncome) : 0;
  
  // Current month metrics
  const currentMonthIncome = computeTotalIncome(currentMonthTransactions);
  const currentMonthExpenses = computeTotalExpenses(currentMonthTransactions);
  const daysRemaining = getDaysRemainingInMonth();
  const now = new Date();
  const daysElapsed = now.getDate();
  
  // Spending analysis
  const spendingByCategory = computeSpendingByCategory(currentMonthTransactions);
  const topSpendingCategories = spendingByCategory.slice(0, 3).map(c => c.category);
  
  // Month comparison
  const comparedToLastMonth = computeMonthComparison(
    currentMonthTransactions,
    lastMonthTransactions
  );
  
  // Pattern detection
  const unusualSpending = detectUnusualSpending(
    currentMonthTransactions,
    lastMonthTransactions
  );
  const recurringExpenses = detectRecurringExpenses(transactions);
  
  // Project end of month
  const projectedEndBalance = projectEndOfMonthBalance(
    netBalance,
    currentMonthExpenses,
    daysElapsed,
    daysRemaining
  );
  
  // Build budget status if budget is set
  let budget: UserFinancialContext['budget'] = undefined;
  if (monthlyBudget > 0) {
    const spent = currentMonthExpenses;
    budget = {
      monthlyLimit: monthlyBudget,
      spent,
      remaining: monthlyBudget - spent,
      percentageUsed: (spent / monthlyBudget) * 100,
      isOverBudget: spent > monthlyBudget,
    };
  }
  
  // Build goals
  const goals = savingsGoals.map(goal => {
    const progressPercentage = goal.targetAmount > 0 
      ? (goal.currentAmount / goal.targetAmount) * 100 
      : 0;
    
    // Estimate completion date based on current savings rate
    let estimatedCompletionDate: string | undefined;
    const remaining = goal.targetAmount - goal.currentAmount;
    const monthlySavings = netBalance > 0 ? netBalance : 0;
    
    if (monthlySavings > 0 && remaining > 0) {
      const monthsNeeded = remaining / monthlySavings;
      const completionDate = new Date();
      completionDate.setMonth(completionDate.getMonth() + Math.ceil(monthsNeeded));
      estimatedCompletionDate = completionDate.toISOString().split('T')[0];
    }
    
    return {
      name: language === 'ar' ? goal.nameAr || goal.name : goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      progressPercentage,
      estimatedCompletionDate,
    };
  });
  
  // Build final context
  const context: UserFinancialContext = {
    // Basic metrics
    totalIncome,
    totalExpenses,
    netBalance,
    savingsRate,
    
    // Current month
    currentMonth: {
      income: currentMonthIncome,
      expenses: currentMonthExpenses,
      daysRemaining,
      projectedEndBalance,
    },
    
    // Spending breakdown
    spendingByCategory,
    topSpendingCategories,
    
    // Trends
    comparedToLastMonth,
    
    // Patterns
    patterns: {
      hasRecurringExpenses: recurringExpenses.length > 0,
      recurringExpenses,
      unusualSpending,
    },
    
    // Goals
    goals,
    
    // Budget
    budget,
    
    // User profile
    userType: onboardingData?.segment || 'individual',
    currency,
    language,
  };
  
  return context;
}

// ============================================
// HELPER FOR PARTIAL CONTEXT
// ============================================

/**
 * Build a minimal context when full data isn't available
 * (e.g., for non-authenticated users)
 */
export function buildEmptyContext(
  currency: string = 'JOD',
  language: 'ar' | 'en' = 'ar'
): UserFinancialContext {
  return {
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    savingsRate: 0,
    currentMonth: {
      income: 0,
      expenses: 0,
      daysRemaining: getDaysRemainingInMonth(),
      projectedEndBalance: 0,
    },
    spendingByCategory: [],
    topSpendingCategories: [],
    comparedToLastMonth: {
      incomeChange: 0,
      expenseChange: 0,
      trend: 'stable',
    },
    patterns: {
      hasRecurringExpenses: false,
      recurringExpenses: [],
      unusualSpending: [],
    },
    goals: [],
    budget: undefined,
    userType: 'individual',
    currency,
    language,
  };
}

// ============================================
// CONTEXT SUMMARY FOR LOGGING/DEBUG
// ============================================

/**
 * Get a short summary of the context (for logging)
 */
export function getContextSummary(context: UserFinancialContext): string {
  return `[Context] Income: ${context.totalIncome}, Expenses: ${context.totalExpenses}, Balance: ${context.netBalance}, Categories: ${context.spendingByCategory.length}, Goals: ${context.goals.length}`;
}



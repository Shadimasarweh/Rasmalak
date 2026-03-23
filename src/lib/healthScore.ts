export interface HealthScoreFactor {
  id: string;
  score: number; // 0-100
  weight: number; // 0-1, all weights sum to 1
  status: 'good' | 'fair' | 'needs_work';
}

export interface HealthScoreResult {
  overall: number; // 0-100 weighted average
  rating: 'excellent' | 'good' | 'fair' | 'needs_work';
  factors: HealthScoreFactor[];
}

interface HealthScoreInput {
  monthlyIncome: number;
  monthlyExpenses: number;
  budgetLimit: number;
  budgetSpent: number;
  categoriesOverBudget: number;
  totalCategories: number;
  emergencyFundCurrent: number;
  averageMonthlyExpenses: number;
  goalsOnTrack: number;
  totalGoals: number;
  daysLoggedThisMonth: number;
  daysInMonth: number;
  coursesCompleted: number;
  totalCourses: number;
}

export function calculateHealthScore(input: HealthScoreInput): HealthScoreResult {
  // 1. Savings rate (25% weight)
  // Target: 20%+ = 100, 10-20% scales linearly, <10% = score * 5
  const savingsRate = input.monthlyIncome > 0
    ? (input.monthlyIncome - input.monthlyExpenses) / input.monthlyIncome
    : 0;
  const savingsScore = Math.min(100, Math.max(0, Math.round(
    savingsRate >= 0.2 ? 100 :
    savingsRate >= 0.1 ? 50 + (savingsRate - 0.1) * 500 :
    savingsRate >= 0 ? savingsRate * 500 : 0
  )));

  // 2. Budget adherence (20% weight)
  // Based on % of categories within budget
  const adherenceRatio = input.totalCategories > 0
    ? (input.totalCategories - input.categoriesOverBudget) / input.totalCategories
    : 1;
  const budgetScore = Math.round(adherenceRatio * 100);

  // 3. Emergency fund (20% weight)
  // Target: 6 months = 100, 3 months = 70, linear below
  const monthsCovered = input.averageMonthlyExpenses > 0
    ? input.emergencyFundCurrent / input.averageMonthlyExpenses
    : 0;
  const emergencyScore = Math.min(100, Math.round(
    monthsCovered >= 6 ? 100 :
    monthsCovered >= 3 ? 70 + (monthsCovered - 3) * 10 :
    monthsCovered * 23.3
  ));

  // 4. Goal progress (15% weight)
  const goalScore = input.totalGoals > 0
    ? Math.round((input.goalsOnTrack / input.totalGoals) * 100)
    : 50; // neutral if no goals set

  // 5. Tracking consistency (10% weight)
  const consistencyScore = input.daysInMonth > 0
    ? Math.round((input.daysLoggedThisMonth / input.daysInMonth) * 100)
    : 0;

  // 6. Financial literacy (10% weight)
  const literacyScore = input.totalCourses > 0
    ? Math.round((input.coursesCompleted / input.totalCourses) * 100)
    : 0;

  const factors: HealthScoreFactor[] = [
    { id: 'savings_rate', score: savingsScore, weight: 0.25, status: getStatus(savingsScore) },
    { id: 'budget_adherence', score: budgetScore, weight: 0.20, status: getStatus(budgetScore) },
    { id: 'emergency_fund', score: emergencyScore, weight: 0.20, status: getStatus(emergencyScore) },
    { id: 'goal_progress', score: goalScore, weight: 0.15, status: getStatus(goalScore) },
    { id: 'consistency', score: consistencyScore, weight: 0.10, status: getStatus(consistencyScore) },
    { id: 'literacy', score: literacyScore, weight: 0.10, status: getStatus(literacyScore) },
  ];

  const overall = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0)
  );

  return {
    overall,
    rating: overall >= 80 ? 'excellent' : overall >= 60 ? 'good' : overall >= 40 ? 'fair' : 'needs_work',
    factors,
  };
}

function getStatus(score: number): 'good' | 'fair' | 'needs_work' {
  if (score >= 70) return 'good';
  if (score >= 40) return 'fair';
  return 'needs_work';
}

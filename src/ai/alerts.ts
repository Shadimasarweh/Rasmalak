/**
 * Rasmalak AI Alerts & Suggestions
 * =================================
 * Proactive alerts for spending and goal suggestions.
 * These run automatically based on user data patterns.
 */

import { UserFinancialContext, InsightCard, GeneratedInsight } from './types';

// ============================================
// ALERT TYPES
// ============================================

export type AlertType = 
  | 'overspending_warning'      // Spending too fast this month
  | 'budget_exceeded'           // Over budget
  | 'category_spike'            // Unusual spending in a category
  | 'low_balance_predicted'     // Will run out before month end
  | 'recurring_detected'        // New recurring expense detected
  | 'savings_opportunity'       // Could save more based on patterns
  | 'goal_milestone'            // Close to reaching a goal
  | 'goal_at_risk';             // Goal may not be met on time

export interface SpendingAlert {
  id: string;
  type: AlertType;
  severity: 'high' | 'medium' | 'low';
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  actionLabel?: string;
  actionLabelAr?: string;
  actionRoute?: string;
  metric?: {
    value: number;
    unit: string;
    threshold?: number;
  };
  createdAt: string;
  expiresAt?: string;
  dismissed?: boolean;
}

export interface GoalSuggestion {
  id: string;
  type: 'new_goal' | 'adjust_goal' | 'accelerate_goal';
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  suggestedAmount?: number;
  suggestedName?: string;
  suggestedNameAr?: string;
  reasoning: string;
  reasoningAr: string;
  confidence: 'high' | 'medium' | 'low';
}

// ============================================
// SPENDING ALERT DETECTION
// ============================================

/**
 * Analyze user context and generate spending alerts
 * These are rule-based (no AI call needed) for speed
 */
export function detectSpendingAlerts(context: UserFinancialContext): SpendingAlert[] {
  const alerts: SpendingAlert[] = [];
  const now = new Date().toISOString();
  const currency = context.currency || 'JOD';
  
  // 1. BUDGET EXCEEDED
  if (context.budget && context.budget.isOverBudget) {
    const overAmount = context.budget.spent - context.budget.monthlyLimit;
    alerts.push({
      id: `alert_budget_${Date.now()}`,
      type: 'budget_exceeded',
      severity: 'high',
      title: 'Budget Exceeded',
      titleAr: 'تجاوزت الميزانية',
      message: `You've spent ${overAmount.toLocaleString()} ${currency} over your monthly budget.`,
      messageAr: `صرفت ${overAmount.toLocaleString()} ${currency} أكثر من ميزانيتك الشهرية.`,
      actionLabel: 'Review Spending',
      actionLabelAr: 'راجع مصاريفك',
      actionRoute: '/transactions',
      metric: {
        value: context.budget.percentageUsed,
        unit: '%',
        threshold: 100,
      },
      createdAt: now,
    });
  }
  
  // 2. OVERSPENDING WARNING (80%+ of budget used with days remaining)
  if (context.budget && !context.budget.isOverBudget) {
    const percentUsed = context.budget.percentageUsed;
    const daysRemaining = context.currentMonth.daysRemaining;
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const expectedPercent = ((daysInMonth - daysRemaining) / daysInMonth) * 100;
    
    if (percentUsed > expectedPercent + 15 && percentUsed > 60) {
      alerts.push({
        id: `alert_overspending_${Date.now()}`,
        type: 'overspending_warning',
        severity: 'medium',
        title: 'Spending Too Fast',
        titleAr: 'صرف سريع',
        message: `You've used ${percentUsed.toFixed(0)}% of your budget with ${daysRemaining} days left.`,
        messageAr: `صرفت ${percentUsed.toFixed(0)}% من ميزانيتك وباقي ${daysRemaining} يوم.`,
        actionLabel: 'See Budget',
        actionLabelAr: 'شوف الميزانية',
        actionRoute: '/budget',
        metric: {
          value: percentUsed,
          unit: '%',
          threshold: expectedPercent,
        },
        createdAt: now,
      });
    }
  }
  
  // 3. LOW BALANCE PREDICTED
  if (context.currentMonth.projectedEndBalance < 0) {
    alerts.push({
      id: `alert_lowbalance_${Date.now()}`,
      type: 'low_balance_predicted',
      severity: 'high',
      title: 'May Run Short',
      titleAr: 'قد لا يكفي',
      message: `At current pace, you may be short ${Math.abs(context.currentMonth.projectedEndBalance).toLocaleString()} ${currency} by month end.`,
      messageAr: `بهالمعدل، ممكن ينقصك ${Math.abs(context.currentMonth.projectedEndBalance).toLocaleString()} ${currency} آخر الشهر.`,
      actionLabel: 'Plan Ahead',
      actionLabelAr: 'خطط مقدماً',
      actionRoute: '/budget',
      metric: {
        value: context.currentMonth.projectedEndBalance,
        unit: currency,
      },
      createdAt: now,
    });
  }
  
  // 4. CATEGORY SPIKE (unusual spending detected)
  for (const unusual of context.patterns.unusualSpending.slice(0, 2)) {
    if (unusual.deviation > 50) { // More than 50% above normal
      alerts.push({
        id: `alert_spike_${unusual.category}_${Date.now()}`,
        type: 'category_spike',
        severity: unusual.deviation > 100 ? 'high' : 'medium',
        title: `High ${unusual.category} Spending`,
        titleAr: `صرف عالي على ${unusual.category}`,
        message: `${unusual.deviation.toFixed(0)}% higher than usual in ${unusual.category}.`,
        messageAr: `${unusual.deviation.toFixed(0)}% أعلى من المعتاد على ${unusual.category}.`,
        actionLabel: 'View Details',
        actionLabelAr: 'شوف التفاصيل',
        actionRoute: '/transactions',
        metric: {
          value: unusual.amount,
          unit: currency,
        },
        createdAt: now,
      });
    }
  }
  
  // 5. SAVINGS OPPORTUNITY
  if (context.savingsRate < 0.1 && context.netBalance > 0) {
    // Saving less than 10% but has positive balance
    const potentialSavings = context.totalIncome * 0.2 - (context.totalIncome - context.totalExpenses);
    if (potentialSavings > 0) {
      alerts.push({
        id: `alert_savings_${Date.now()}`,
        type: 'savings_opportunity',
        severity: 'low',
        title: 'Save More?',
        titleAr: 'وفّر أكثر؟',
        message: `You could save up to ${potentialSavings.toLocaleString()} ${currency} more per month.`,
        messageAr: `ممكن توفر لغاية ${potentialSavings.toLocaleString()} ${currency} أكثر بالشهر.`,
        actionLabel: 'Set a Goal',
        actionLabelAr: 'حط هدف',
        actionRoute: '/goals',
        createdAt: now,
      });
    }
  }
  
  // 6. GOAL MILESTONE
  for (const goal of context.goals) {
    if (goal.progressPercentage >= 75 && goal.progressPercentage < 100) {
      alerts.push({
        id: `alert_goal_${goal.name}_${Date.now()}`,
        type: 'goal_milestone',
        severity: 'low',
        title: 'Almost There!',
        titleAr: 'قربت توصل!',
        message: `${goal.progressPercentage.toFixed(0)}% towards your "${goal.name}" goal!`,
        messageAr: `${goal.progressPercentage.toFixed(0)}% من هدف "${goal.name}"!`,
        actionLabel: 'View Goal',
        actionLabelAr: 'شوف الهدف',
        actionRoute: '/goals',
        metric: {
          value: goal.progressPercentage,
          unit: '%',
          threshold: 100,
        },
        createdAt: now,
      });
    }
  }
  
  return alerts;
}

// ============================================
// GOAL SUGGESTIONS
// ============================================

/**
 * Generate goal suggestions based on spending patterns
 */
export function generateGoalSuggestions(context: UserFinancialContext): GoalSuggestion[] {
  const suggestions: GoalSuggestion[] = [];
  const currency = context.currency || 'JOD';
  
  // 1. EMERGENCY FUND (if no such goal exists)
  const hasEmergencyGoal = context.goals.some(g => 
    g.name.toLowerCase().includes('emergency') || 
    g.name.includes('طوارئ') ||
    g.name.includes('احتياط')
  );
  
  if (!hasEmergencyGoal && context.netBalance > 0) {
    const monthlyExpenses = context.currentMonth.expenses || context.totalExpenses / 3;
    const emergencyTarget = monthlyExpenses * 3; // 3 months expenses
    
    suggestions.push({
      id: 'suggest_emergency',
      type: 'new_goal',
      title: 'Start an Emergency Fund',
      titleAr: 'ابدأ صندوق طوارئ',
      description: `Build a safety net of ${emergencyTarget.toLocaleString()} ${currency} (3 months expenses).`,
      descriptionAr: `اعمل شبكة أمان بقيمة ${emergencyTarget.toLocaleString()} ${currency} (مصاريف 3 شهور).`,
      suggestedAmount: emergencyTarget,
      suggestedName: 'Emergency Fund',
      suggestedNameAr: 'صندوق الطوارئ',
      reasoning: 'Based on your monthly expenses, having 3 months saved provides good security.',
      reasoningAr: 'بناءً على مصاريفك الشهرية، توفير 3 شهور يعطيك أمان مالي.',
      confidence: 'high',
    });
  }
  
  // 2. REDUCE HIGH SPENDING CATEGORY
  if (context.spendingByCategory.length > 0) {
    const topCategory = context.spendingByCategory[0];
    if (topCategory.percentage > 30) { // If one category is more than 30% of spending
      const savingsTarget = topCategory.amount * 0.2; // Suggest saving 20% of that category
      
      suggestions.push({
        id: `suggest_reduce_${topCategory.category}`,
        type: 'new_goal',
        title: `Reduce ${topCategory.category} Spending`,
        titleAr: `قلل صرف ${topCategory.category}`,
        description: `Your ${topCategory.category} spending is ${topCategory.percentage.toFixed(0)}% of total. Try saving ${savingsTarget.toLocaleString()} ${currency}/month.`,
        descriptionAr: `صرفك على ${topCategory.category} يمثل ${topCategory.percentage.toFixed(0)}% من المجموع. حاول توفر ${savingsTarget.toLocaleString()} ${currency}/شهر.`,
        suggestedAmount: savingsTarget * 6, // 6 month goal
        suggestedName: `${topCategory.category} Savings`,
        suggestedNameAr: `توفير ${topCategory.category}`,
        reasoning: `${topCategory.category} is your largest expense category.`,
        reasoningAr: `${topCategory.category} هي أكبر فئة مصاريف عندك.`,
        confidence: 'medium',
      });
    }
  }
  
  // 3. VACATION/REWARD GOAL (if saving well)
  if (context.savingsRate >= 0.15 && context.goals.length < 3) {
    const monthlyIncome = context.currentMonth.income || context.totalIncome / 3;
    const vacationTarget = monthlyIncome * 2; // 2 months income
    
    suggestions.push({
      id: 'suggest_vacation',
      type: 'new_goal',
      title: 'Reward Yourself',
      titleAr: 'كافئ نفسك',
      description: `You're saving well! Consider setting a fun goal like a vacation (${vacationTarget.toLocaleString()} ${currency}).`,
      descriptionAr: `انت بتوفر منيح! فكر بهدف ممتع مثل سفرة (${vacationTarget.toLocaleString()} ${currency}).`,
      suggestedAmount: vacationTarget,
      suggestedName: 'Vacation Fund',
      suggestedNameAr: 'صندوق السفر',
      reasoning: 'Your savings rate is healthy - you deserve to plan something fun!',
      reasoningAr: 'معدل التوفير عندك ممتاز - تستاهل تخطط لشي ممتع!',
      confidence: 'medium',
    });
  }
  
  // 4. ACCELERATE EXISTING GOAL (if ahead of schedule)
  for (const goal of context.goals) {
    if (goal.progressPercentage > 50 && goal.estimatedCompletionDate) {
      const completion = new Date(goal.estimatedCompletionDate);
      const now = new Date();
      const monthsRemaining = (completion.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
      
      if (monthsRemaining > 3 && context.savingsRate > 0.1) {
        suggestions.push({
          id: `suggest_accelerate_${goal.name}`,
          type: 'accelerate_goal',
          title: `Speed Up "${goal.name}"`,
          titleAr: `سرّع "${goal.name}"`,
          description: `You could reach this goal faster by adding a bit more each month.`,
          descriptionAr: `ممكن توصل لهالهدف أسرع لو زدت شوي كل شهر.`,
          reasoning: `You're making good progress and have room in your budget.`,
          reasoningAr: `انت ماشي منيح وعندك مجال بالميزانية.`,
          confidence: 'low',
        });
        break; // Only suggest one acceleration
      }
    }
  }
  
  return suggestions.slice(0, 3); // Max 3 suggestions
}

// ============================================
// CONVERT TO INSIGHT CARDS
// ============================================

/**
 * Convert alerts to InsightCard format for display
 */
export function alertsToInsightCards(alerts: SpendingAlert[], language: 'ar' | 'en'): InsightCard[] {
  return alerts.map(alert => ({
    id: alert.id,
    type: alert.severity === 'high' ? 'warning' : alert.severity === 'medium' ? 'info' : 'tip',
    title: language === 'ar' ? alert.titleAr : alert.title,
    titleAr: alert.titleAr,
    message: language === 'ar' ? alert.messageAr : alert.message,
    messageAr: alert.messageAr,
    metric: alert.metric,
    action: alert.actionRoute ? {
      id: `action_${alert.id}`,
      label: alert.actionLabel || 'View',
      labelAr: alert.actionLabelAr || 'عرض',
      action: 'navigate',
      payload: alert.actionRoute,
    } : undefined,
  }));
}

/**
 * Convert suggestions to InsightCard format
 */
export function suggestionsToInsightCards(suggestions: GoalSuggestion[], language: 'ar' | 'en'): InsightCard[] {
  return suggestions.map(suggestion => ({
    id: suggestion.id,
    type: 'tip' as const,
    title: language === 'ar' ? suggestion.titleAr : suggestion.title,
    titleAr: suggestion.titleAr,
    message: language === 'ar' ? suggestion.descriptionAr : suggestion.description,
    messageAr: suggestion.descriptionAr,
    metric: suggestion.suggestedAmount ? {
      value: suggestion.suggestedAmount,
      unit: 'JOD',
    } : undefined,
    action: {
      id: `action_${suggestion.id}`,
      label: 'Create Goal',
      labelAr: 'أنشئ هدف',
      action: 'navigate',
      payload: '/goals',
    },
  }));
}


/**
 * useAIInsights Hook
 * ==================
 * React hook for accessing AI-generated alerts and suggestions.
 * Updates automatically when user data changes.
 */

'use client';

import { useMemo } from 'react';
import { useTransactions } from '@/store/transactionStore';
import { 
  useCurrency, 
  useLanguage, 
  useMonthlyBudget, 
  useCategoryBudgets, 
  useSavingsGoals,
  useOnboardingData,
} from '@/store/useStore';
import { buildUserContext } from '../context';
import { 
  detectSpendingAlerts, 
  generateGoalSuggestions,
  alertsToInsightCards,
  suggestionsToInsightCards,
  SpendingAlert,
  GoalSuggestion,
} from '../alerts';
import { InsightCard } from '../types';

export interface AIInsights {
  // Raw data
  alerts: SpendingAlert[];
  suggestions: GoalSuggestion[];
  
  // Formatted for display
  alertCards: InsightCard[];
  suggestionCards: InsightCard[];
  allCards: InsightCard[];
  
  // Summary
  hasHighPriorityAlert: boolean;
  alertCount: number;
  suggestionCount: number;
}

/**
 * Hook to get AI-generated insights based on user's financial data
 */
export function useAIInsights(): AIInsights {
  // Get user data from stores
  const { transactions } = useTransactions();
  const currency = useCurrency();
  const language = useLanguage();
  const monthlyBudget = useMonthlyBudget();
  const categoryBudgets = useCategoryBudgets();
  const savingsGoals = useSavingsGoals();
  const onboardingData = useOnboardingData();
  
  // Build context and generate insights
  const insights = useMemo(() => {
    // Build user context
    const context = buildUserContext({
      transactions,
      currency,
      language,
      monthlyBudget,
      categoryBudgets,
      savingsGoals,
      onboardingData,
    });
    
    // Generate alerts and suggestions (these are rule-based, no API call)
    const alerts = detectSpendingAlerts(context);
    const suggestions = generateGoalSuggestions(context);
    
    // Convert to display format
    const alertCards = alertsToInsightCards(alerts, language);
    const suggestionCards = suggestionsToInsightCards(suggestions, language);
    
    // Combine all cards, alerts first (higher priority)
    const allCards = [...alertCards, ...suggestionCards];
    
    return {
      alerts,
      suggestions,
      alertCards,
      suggestionCards,
      allCards,
      hasHighPriorityAlert: alerts.some(a => a.severity === 'high'),
      alertCount: alerts.length,
      suggestionCount: suggestions.length,
    };
  }, [transactions, currency, language, monthlyBudget, categoryBudgets, savingsGoals, onboardingData]);
  
  return insights;
}

/**
 * Hook to get only spending alerts
 */
export function useSpendingAlerts(): SpendingAlert[] {
  const { alerts } = useAIInsights();
  return alerts;
}

/**
 * Hook to get only goal suggestions
 */
export function useGoalSuggestions(): GoalSuggestion[] {
  const { suggestions } = useAIInsights();
  return suggestions;
}



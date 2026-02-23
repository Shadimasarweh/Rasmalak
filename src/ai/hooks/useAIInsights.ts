/**
 * useAIInsights Hook
 * ==================
 * React hook for accessing AI-generated alerts and suggestions.
 * Updates automatically when user data changes.
 *
 * Every rule-generated recommendation is logged to the financial_advice
 * table with a deterministic context_hash before it becomes visible to
 * UI components.  This mirrors the accountability applied to AI-sourced
 * advice in src/ai/service.ts.
 */

'use client';

import { useMemo, useEffect, useRef } from 'react';
import { useTransactions } from '@/store/transactionStore';
import { 
  useCurrency, 
  useLanguage, 
  useOnboardingData,
} from '@/store/useStore';
import { useBudget } from '@/store/budgetStore';
import { useGoals } from '@/store/goalsStore';
import { useUser as useAuthUser } from '@/store/authStore';
import { buildUserContext } from '../context';
import { 
  detectSpendingAlerts, 
  generateGoalSuggestions,
  alertsToInsightCards,
  suggestionsToInsightCards,
  SpendingAlert,
  GoalSuggestion,
  AlertType,
} from '../alerts';
import { InsightCard, UserFinancialContext } from '../types';
import { computeContextHash } from '../contextHash';
import { logFinancialAdvice } from '../adviceLogger';

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

// ============================================
// ALERT → METRIC MAPPING
// ============================================

function alertTypeToMetric(type: AlertType): string {
  switch (type) {
    case 'budget_exceeded':
      return 'budget';
    case 'overspending_warning':
    case 'category_spike':
    case 'recurring_detected':
      return 'spending';
    case 'low_balance_predicted':
      return 'cashflow';
    case 'savings_opportunity':
      return 'savings';
    case 'goal_milestone':
    case 'goal_at_risk':
      return 'goals';
    default:
      return 'general';
  }
}

function suggestionTypeToMetric(type: string): string {
  switch (type) {
    case 'new_goal':
    case 'adjust_goal':
    case 'accelerate_goal':
      return 'goals';
    default:
      return 'general';
  }
}

// ============================================
// ADVICE LOGGING EFFECT
// ============================================

/**
 * Logs rule-based alerts and suggestions to the financial_advice table.
 * Uses a ref-based set keyed on (type + contextHash) to avoid duplicate
 * inserts across re-renders with identical financial state.
 */
function useLogRuleAdvice(
  alerts: SpendingAlert[],
  suggestions: GoalSuggestion[],
  context: UserFinancialContext,
  language: 'ar' | 'en',
) {
  const userId = useAuthUser()?.id;
  const loggedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    if (alerts.length === 0 && suggestions.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        const contextHash = await computeContextHash(context);
        if (cancelled) return;

        for (const alert of alerts) {
          const key = `alert_${alert.type}_${contextHash}`;
          if (loggedRef.current.has(key)) continue;
          loggedRef.current.add(key);

          const adviceText = language === 'ar' ? alert.messageAr : alert.message;
          await logFinancialAdvice({
            user_id: userId,
            source: 'rule',
            rule_id: alert.type,
            advice_text: adviceText,
            target_metric: alertTypeToMetric(alert.type),
            confidence: null,
            context_hash: contextHash,
          });
        }

        for (const suggestion of suggestions) {
          const key = `suggestion_${suggestion.type}_${contextHash}`;
          if (loggedRef.current.has(key)) continue;
          loggedRef.current.add(key);

          const adviceText = language === 'ar' ? suggestion.descriptionAr : suggestion.description;
          await logFinancialAdvice({
            user_id: userId,
            source: 'rule',
            rule_id: suggestion.type,
            advice_text: adviceText,
            target_metric: suggestionTypeToMetric(suggestion.type),
            confidence: suggestion.confidence,
            context_hash: contextHash,
          });
        }
      } catch (err) {
        console.error('[useAIInsights] Failed to log rule advice:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [alerts, suggestions, context, language, userId]);
}

// ============================================
// MAIN HOOK
// ============================================

/**
 * Hook to get AI-generated insights based on user's financial data.
 * Rule-based alerts and suggestions are logged to financial_advice
 * with a context_hash in the same render cycle that produces them.
 */
export function useAIInsights(): AIInsights {
  // Get user data from stores
  const { transactions } = useTransactions();
  const currency = useCurrency();
  const language = useLanguage();
  const { monthlyBudget, categoryBudgets } = useBudget();
  const { savingsGoals } = useGoals();
  const onboardingData = useOnboardingData();
  
  // Build context (memoized so downstream effects have a stable reference)
  const context = useMemo(() => buildUserContext({
    transactions,
    currency,
    language,
    monthlyBudget,
    categoryBudgets,
    savingsGoals,
    onboardingData,
  }), [transactions, currency, language, monthlyBudget, categoryBudgets, savingsGoals, onboardingData]);

  // Generate alerts and suggestions (rule-based, synchronous)
  const alerts = useMemo(() => detectSpendingAlerts(context), [context]);
  const suggestions = useMemo(() => generateGoalSuggestions(context), [context]);

  // Log every rule-generated recommendation to financial_advice
  useLogRuleAdvice(alerts, suggestions, context, language);

  // Build display cards
  const insights = useMemo(() => {
    const alertCards = alertsToInsightCards(alerts, language);
    const suggestionCards = suggestionsToInsightCards(suggestions, language);
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
  }, [alerts, suggestions, language]);
  
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



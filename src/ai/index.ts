/**
 * Rasmalak AI Module
 * ==================
 * Central export for all AI functionality.
 * 
 * Usage:
 *   import { aiService } from '@/ai';
 *   const response = await aiService.chat(message, context, conversationId);
 */

// Main service
export { aiService } from './service';

// Types
export type {
  AIIntent,
  AIEntity,
  EntityType,
  ConfidenceLevel,
  IntentClassification,
  MessageRole,
  AIMessage,
  AIConversation,
  CategorySpending,
  TimeSeriesPoint,
  UserFinancialContext,
  SuggestedAction,
  InsightCard,
  AIResponse,
  ChatRequest,
  ChatResponse,
  AIProvider,
  AIProviderConfig,
  InsightTrigger,
  GeneratedInsight,
} from './types';

// Configuration
export { AI_CONFIG, AI_FEATURES, AI_SAFETY } from './config';

// Context Builder
export { buildUserContext, buildEmptyContext, getContextSummary } from './context';

// Context Hashing (single source of truth — no other module may duplicate this)
export { computeContextHash } from './contextHash';

// Advice Logger
export { logFinancialAdvice } from './adviceLogger';
export type { FinancialAdviceRow } from './adviceLogger';

// Alerts & Suggestions
export { 
  detectSpendingAlerts, 
  generateGoalSuggestions,
  alertsToInsightCards,
  suggestionsToInsightCards,
} from './alerts';
export type { SpendingAlert, GoalSuggestion, AlertType } from './alerts';

// React Hooks
export { useAIInsights, useSpendingAlerts, useGoalSuggestions } from './hooks/useAIInsights';


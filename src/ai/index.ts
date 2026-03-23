/**
 * Rasmalak AI Module
 * ==================
 * Central export for all AI functionality.
 * 
 * The orchestrator is the primary entry point for AI interactions.
 * Legacy aiService is preserved for backward compatibility.
 */

// ─── Orchestrator (primary entry point) ───
export { orchestrator, AIOrchestrator } from './orchestrator';
export type { OrchestratorInput, OrchestratorOutput, ExplanationTrace } from './orchestrator/types';

// ─── Legacy service (backward compatibility) ───
export { aiService } from './service';

// ─── Agents ───
export type { AgentDefinition, AgentId, AgentPromptParams, FinancialContextSlice } from './agents/types';
export { getAgent, findAgentForIntent, getAllAgents } from './agents/registry';

// ─── Memory ───
export type { UserSemanticState } from './memory/types';
export { readMemoryFields, writeMemoryFields } from './memory/memoryService';

// ─── Context ───
export type { ContextSliceType } from './context/sliceTypes';
export { selectContext } from './context/contextSelector';

// ─── Deterministic ───
export {
  computeFinancialSignals,
  computeFinancialHealth,
  deriveAdvisoryState,
  computeProjections,
} from './deterministic';
export type {
  FinancialSignals,
  SignalSummary,
  FinancialHealthResult,
  FinancialHealthBand,
  FinancialAdvisoryState,
  DeterministicOutputs,
  ProjectionResult,
} from './deterministic';

// ─── Validation ───
export { validateOutput } from './validation/pipeline';
export type { ValidationResult, ValidationError } from './validation/pipeline';
export { evaluatePolicy } from './agents/policyAgent';

// ─── Types ───
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
  AttachmentType,
  MessageAttachment,
} from './types';

// ─── Configuration ───
export { AI_CONFIG, AI_FEATURES, AI_SAFETY } from './config';

// ─── Context Builder ───
export { buildUserContext, buildEmptyContext, getContextSummary } from './context';

// ─── Context Hashing ───
export { computeContextHash } from './contextHash';

// ─── Advice Logger ───
export { logFinancialAdvice } from './adviceLogger';
export type { FinancialAdviceRow } from './adviceLogger';

// ─── Alerts & Suggestions ───
export { 
  detectSpendingAlerts, 
  generateGoalSuggestions,
  alertsToInsightCards,
  suggestionsToInsightCards,
} from './alerts';
export type { SpendingAlert, GoalSuggestion, AlertType } from './alerts';

// ─── React Hooks ───
export { useAIInsights, useSpendingAlerts, useGoalSuggestions } from './hooks/useAIInsights';

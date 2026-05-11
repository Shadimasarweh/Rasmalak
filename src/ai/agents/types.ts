/**
 * Agent System Types
 * ==================
 * Defines the contract all domain agents must implement.
 * Agents are prompt template modules, not separate LLM invocations.
 * The orchestrator picks one agent per request and composes a single call.
 */

import type { AIIntent, UserFinancialContext, ExtractedDocument } from '../types';
import type { UserSemanticState } from '../memory/types';
import type { DeterministicOutputs } from '../deterministic';
import type { BillAnalysis } from '../deterministic/billAnalysis';
import type { ContextSliceType } from '../context/sliceTypes';

export type AgentId =
  | 'profile'
  | 'insight'
  | 'recommendation'
  | 'policy'
  | 'chat'
  | 'document_extractor';

export interface AgentPromptParams {
  language: 'ar' | 'en';
  contextSlices: FinancialContextSlice[];
  memoryFields: Partial<UserSemanticState>;
  deterministic: DeterministicOutputs | null;
  userMessage: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  /**
   * Optional structured document data — populated by the orchestrator
   * when the user uploaded a bill/receipt and the extractor agent ran
   * successfully. The chat agent uses this in place of the raw image.
   */
  documentContext?: {
    extracted: ExtractedDocument;
    analysis: BillAnalysis;
    transcribeRequested: boolean;
  };
}

export interface FinancialContextSlice {
  type: ContextSliceType;
  content: string;
  tokenEstimate: number;
}

export interface AgentDefinition {
  id: AgentId;
  name: string;
  description: string;
  /** Intents this agent can handle. */
  supportedIntents: AIIntent[];
  /** Memory fields this agent needs injected into its prompt. */
  requiredMemoryFields: (keyof UserSemanticState)[];
  /** Financial context slices this agent needs. */
  requiredContextSlices: ContextSliceType[];
  /** Whether deterministic computations must run before this agent. */
  needsDeterministicLayer: boolean;
  /** Builds the system prompt for this agent's LLM call. */
  systemPromptBuilder: (params: AgentPromptParams) => string;
  /** JSON schema for structured output (null = free-text). */
  outputSchema: Record<string, unknown> | null;
  /** Max tokens this agent should consume from the context window. */
  maxContextTokens: number;
  /** Whether this agent can write to memory. */
  canWriteMemory: boolean;
  /** Memory fields this agent is authorized to write. */
  writableMemoryFields: (keyof UserSemanticState)[];
}

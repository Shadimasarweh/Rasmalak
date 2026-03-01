/**
 * Orchestrator I/O Types
 * ======================
 * Input/output contracts for the central AIOrchestrator.
 */

import type { AgentId } from '../agents/types';
import type {
  AIResponse,
  AIIntent,
  ConfidenceLevel,
  UserFinancialContext,
  MessageAttachment,
} from '../types';
import type { UserSemanticState } from '../memory/types';
import type { DeterministicOutputs } from '../deterministic';
import type { ValidationResult } from '../validation/pipeline';

export interface OrchestratorInput {
  message: string;
  context: UserFinancialContext;
  conversationId: string;
  language: 'ar' | 'en';
  userId?: string;
  attachments?: MessageAttachment[];
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface OrchestratorOutput {
  response: AIResponse;
  conversationId: string;
  trace: ExplanationTrace;
}

export interface ExplanationTrace {
  intent: AIIntent;
  intentConfidence: ConfidenceLevel;
  agentId: AgentId;
  memoryFieldsUsed: string[];
  memoryFieldsWritten: string[];
  deterministicValues: Record<string, number | string | boolean | null>;
  contextSlicesUsed: string[];
  validationResults: ValidationResult[];
  confidenceScore: number;
  processingTimeMs: number;
  retried: boolean;
  timestamp: string;
}

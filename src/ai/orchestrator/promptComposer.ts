/**
 * Prompt Composer
 * ===============
 * Composes the final prompt from the selected agent's template,
 * injecting only the relevant context slices, memory fields,
 * and deterministic outputs.
 */

import type { AgentDefinition, AgentPromptParams, FinancialContextSlice } from '../agents/types';
import type { UserSemanticState } from '../memory/types';
import type { DeterministicOutputs } from '../deterministic';
import type { MessageAttachment } from '../types';

export interface ComposedPrompt {
  systemPrompt: string;
  attachmentInstructions: string | null;
  tokenEstimate: number;
}

/**
 * Compose the final prompt for a single LLM call.
 */
export function composePrompt(
  agent: AgentDefinition,
  params: {
    language: 'ar' | 'en';
    contextSlices: FinancialContextSlice[];
    memoryFields: Partial<UserSemanticState>;
    deterministic: DeterministicOutputs | null;
    userMessage: string;
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
    attachments?: MessageAttachment[];
  },
): ComposedPrompt {
  const agentParams: AgentPromptParams = {
    language: params.language,
    contextSlices: params.contextSlices,
    memoryFields: params.memoryFields,
    deterministic: params.deterministic,
    userMessage: params.userMessage,
    conversationHistory: params.conversationHistory,
  };

  const basePrompt = agent.systemPromptBuilder(agentParams);

  let attachmentInstructions: string | null = null;
  if (params.attachments && params.attachments.length > 0) {
    attachmentInstructions = params.language === 'ar'
      ? 'المستخدم أرفق ملف/صورة. قم بتحليل المحتوى المرفق ونفذ طلب المستخدم.'
      : 'The user has attached a file/image. Analyze the attached content and perform the requested task.';
  }

  const detectedLang = detectMessageLanguage(params.userMessage);
  const langDirective =
    detectedLang === 'ar'
      ? 'The user wrote in Arabic. Your ENTIRE reply MUST be in Arabic (match their dialect — Jordanian, Egyptian, Gulf, or Fusha). Do NOT reply in English.'
      : detectedLang === 'en'
      ? 'The user wrote in English. Your ENTIRE reply MUST be in English. Do NOT reply in Arabic.'
      : 'The user mixed Arabic and English. Reply in Arabic as the default, matching their dialect.';

  const languageEnforcement = `\n\n## LANGUAGE RULE (highest priority — overrides everything)\n${langDirective}`;

  const systemPrompt = [
    basePrompt,
    attachmentInstructions,
    languageEnforcement,
  ].filter(Boolean).join('\n\n');

  const tokenEstimate = estimateTokens(systemPrompt);

  return {
    systemPrompt,
    attachmentInstructions,
    tokenEstimate,
  };
}

/**
 * Detect the language of a user message by counting Arabic vs Latin characters.
 * Returns 'ar', 'en', or 'mixed'.
 */
function detectMessageLanguage(message: string): 'ar' | 'en' | 'mixed' {
  const arabicChars = (message.match(/[\u0600-\u06FF]/g) || []).length;
  const latinChars = (message.match(/[a-zA-Z]/g) || []).length;
  const total = arabicChars + latinChars;
  if (total === 0) return 'en';
  const arabicRatio = arabicChars / total;
  if (arabicRatio >= 0.6) return 'ar';
  if (arabicRatio <= 0.2) return 'en';
  return 'mixed';
}

/**
 * Rough token estimation: ~4 chars per token for English, ~2 for Arabic.
 */
function estimateTokens(text: string): number {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const otherChars = text.length - arabicChars;
  return Math.ceil(arabicChars / 2 + otherChars / 4);
}

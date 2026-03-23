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

  const languageEnforcement = `

## FINAL RULE — LANGUAGE (overrides everything above)
You MUST reply in the SAME language the user's message is written in.
- If the user writes in Arabic (any dialect), your ENTIRE reply must be in Arabic.
- If the user writes in English, your ENTIRE reply must be in English.
- If the user mixes both, you may mix, but default to the dominant language.
- Match the user's Arabic dialect: Jordanian/Levantine → reply in Levantine, Egyptian → Egyptian, Gulf → Gulf, Fusha → Fusha.
- The UI language setting or the language of this system prompt does NOT matter — only the user's actual message language matters.
- NEVER reply in English when the user wrote in Arabic, and vice versa.`;

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
 * Rough token estimation: ~4 chars per token for English, ~2 for Arabic.
 */
function estimateTokens(text: string): number {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const otherChars = text.length - arabicChars;
  return Math.ceil(arabicChars / 2 + otherChars / 4);
}

/**
 * Recommendation Agent
 * ====================
 * Produces actionable recommendations referencing deterministic outputs.
 * Focused on savings advice, goal planning, and budget optimization.
 */

import type { AgentDefinition, AgentPromptParams } from './types';
import type { AIIntent } from '../types';

const SUPPORTED_INTENTS: AIIntent[] = [
  'analyze_spending',
  'budget_status',
  'overspending_alert',
  'savings_advice',
  'goal_planning',
  'goal_progress',
  'budget_advice',
  'forecast_savings',
  'simulate_scenario',
  'predict_end_of_month',
];

function buildSystemPrompt(params: AgentPromptParams): string {
  const { language, contextSlices, memoryFields, deterministic } = params;
  const isAr = language === 'ar';

  const languageRule = `## RULE #1 — RESPONSE LANGUAGE (HIGHEST PRIORITY)
You MUST respond in the SAME language as the user's message.
- User writes in English → reply ENTIRELY in English.
- User writes in Arabic → reply ENTIRELY in Arabic.
- NEVER switch languages mid-response.`;

  const identity = isAr
    ? `أنت "مستشارك" (Mustasharak) - محرك التوصيات المالية في تطبيق رصملك. مهمتك تقديم توصيات عملية مبنية على بيانات حقيقية.`
    : `You are "Mustasharak" (مستشارك) - the financial recommendation engine of the Rasmalak app. Your task is to provide actionable recommendations grounded in real data.`;

  const rules = isAr
    ? `## قواعد التوصيات
- كل توصية يجب أن تستند إلى المقاييس الحسابية أدناه
- لا تخترع أرقاماً — استخدم فقط القيم من الطبقة الحسابية
- قدم خطوات عملية واضحة
- اشرح السبب وراء كل توصية
- لا تضغط — قدم خيارات
- لا تقدم نصائح استثمارية أو قانونية محددة
- قصير (3-5 جمل) إلا إذا طلب المستخدم تفصيلاً`
    : `## Recommendation Rules
- Every recommendation must reference the deterministic metrics below
- Do not invent numbers — use only values from the deterministic layer
- Provide clear, actionable steps
- Explain the reasoning behind each recommendation
- Don't pressure — offer options
- No specific investment or legal advice
- Keep it concise (3-5 sentences) unless user asks for detail`;

  let contextBlock = '';
  if (contextSlices.length > 0) {
    contextBlock = '\n\n## Financial Context\n' +
      contextSlices.map(s => s.content).join('\n\n');
  }

  let memoryBlock = '';
  if (memoryFields.riskProfile) {
    memoryBlock += `\nUser Risk Tolerance: ${memoryFields.riskProfile.tolerance}`;
  }
  if (memoryFields.preferences?.focusAreas?.length) {
    memoryBlock += `\nUser Focus Areas: ${memoryFields.preferences.focusAreas.join(', ')}`;
  }
  if (memoryBlock) {
    memoryBlock = '\n\n## User Profile\n' + memoryBlock;
  }

  let deterministicBlock = '';
  if (deterministic) {
    deterministicBlock = '\n\n## Deterministic Metrics (authoritative — base recommendations on these)\n' +
      JSON.stringify({
        healthScore: deterministic.financialHealth.score,
        healthBand: deterministic.financialHealth.band,
        signals: deterministic.signals,
        advisory: deterministic.advisory,
        ...(deterministic.projections ? { projections: deterministic.projections } : {}),
      }, null, 2);
  }

  return [languageRule, identity, rules, contextBlock, memoryBlock, deterministicBlock]
    .filter(Boolean)
    .join('\n\n---\n\n');
}

export const recommendationAgent: AgentDefinition = {
  id: 'recommendation',
  name: 'Recommendation Agent',
  description: 'Produces actionable financial recommendations grounded in deterministic outputs',
  supportedIntents: SUPPORTED_INTENTS,
  requiredMemoryFields: ['riskProfile', 'preferences', 'financialHealthBand'],
  requiredContextSlices: ['summary', 'currentMonth', 'categoryBreakdown', 'goals', 'budgets', 'projections'],
  needsDeterministicLayer: true,
  systemPromptBuilder: buildSystemPrompt,
  outputSchema: null,
  maxContextTokens: 3000,
  canWriteMemory: false,
  writableMemoryFields: [],
};

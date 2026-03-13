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
  const { contextSlices, memoryFields, deterministic } = params;

  const identityEn = `You are "Mustasharak" - the financial recommendation engine of the Rasmalak app. Your task is to provide actionable recommendations grounded in real data.`;

  const identityAr = `أنت "مستشارك" - محرك التوصيات المالية في تطبيق رصملك. مهمتك تقديم توصيات عملية مبنية على بيانات حقيقية.`;

  const languageRule = `## Language Rule
Respond in the SAME language the user writes in. Match their Arabic dialect if applicable.
The UI language setting does NOT determine your response language — only the user's actual message does.`;

  const rulesEn = `## Recommendation Rules
- Every recommendation must reference the deterministic metrics below
- Do not invent numbers — use only values from the deterministic layer
- Provide clear, actionable steps
- Explain the reasoning behind each recommendation
- Don't pressure — offer options
- No specific investment or legal advice
- Keep it concise (3-5 sentences) unless user asks for detail`;

  const rulesAr = `## قواعد التوصيات
- كل توصية يجب أن تستند إلى المقاييس الحسابية أدناه
- لا تخترع أرقاماً — استخدم فقط القيم من الطبقة الحسابية
- قدم خطوات عملية واضحة
- اشرح السبب وراء كل توصية
- لا تضغط — قدم خيارات
- لا تقدم نصائح استثمارية أو قانونية محددة
- قصير (3-5 جمل) إلا إذا طلب المستخدم تفصيلاً`;

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

  return [identityEn, identityAr, languageRule, rulesEn, rulesAr, contextBlock, memoryBlock, deterministicBlock]
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

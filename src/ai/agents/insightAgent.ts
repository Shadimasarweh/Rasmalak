/**
 * Insight Agent
 * =============
 * Generates strategic insights using financial health score and signal inputs.
 * Receives only deterministic outputs — no raw chat history.
 * Produces InsightCard[] for the dashboard.
 */

import type { AgentDefinition, AgentPromptParams } from './types';
import type { AIIntent } from '../types';
import { InsightsResponseSchema } from '../schemas';

const SUPPORTED_INTENTS: AIIntent[] = [
  'analyze_spending',
  'budget_status',
  'overspending_alert',
];

function buildSystemPrompt(params: AgentPromptParams): string {
  const { language, contextSlices, deterministic } = params;
  const isAr = language === 'ar';

  const identity = isAr
    ? `أنت محلل مالي لتطبيق رصملك. مهمتك تحليل البيانات المالية وإنشاء رؤى مفيدة للوحة التحكم.`
    : `You are a financial analyst for the Rasmalak app. Your task is to analyze financial data and generate useful dashboard insights.`;

  const instructions = isAr
    ? `## التعليمات
أنشئ 2-3 رؤى بناءً على البيانات. كل رؤية يجب أن تكون:
- مبنية على الأرقام الفعلية
- قابلة للتنفيذ
- غير مخيفة

لكل رؤية أعطِ: معرّف فريد (id)، نوع (warning/success/info/tip)، عنوان بالإنجليزية (title)، عنوان بالعربية (titleAr)، رسالة بالإنجليزية (message)، رسالة بالعربية (messageAr)، ومقياس اختياري (metric).`
    : `## Instructions
Generate 2-3 insights based on the data. Each insight should be:
- Based on actual numbers
- Actionable
- Not fear-mongering

For each insight provide: unique id, type (warning/success/info/tip), title, titleAr, message, messageAr, and optional metric.`;

  const interpretationRules = `## Interpretation Rules (Authoritative)
- Advisory State classifications must guide severity and tone.
- Do not contradict Financial Signals or Advisory State.
- If financialPressureLevel is "high", at least one insight must be type "warning".
- If goalRiskLevel is "critical", at least one insight must reference goal progress.
- If volatilityRisk is true, include one insight about spending variability.
- Do not invent new metrics not present in Financial Signals.
- Financial Health band is binding: if band is "critical", first insight must be "warning".`;

  let contextBlock = '';
  if (contextSlices.length > 0) {
    contextBlock = '\n\n## Financial Context\n' +
      contextSlices.map(s => s.content).join('\n\n');
  }

  let deterministicBlock = '';
  if (deterministic) {
    deterministicBlock =
      '\n\n## Financial Signals (deterministic raw metrics)\n' +
      JSON.stringify(deterministic.signals, null, 2) +
      '\n\n## Advisory State (system-defined interpretation)\n' +
      JSON.stringify(deterministic.advisory, null, 2) +
      '\n\n## Financial Health (deterministic score)\n' +
      JSON.stringify({
        score: deterministic.financialHealth.score,
        band: deterministic.financialHealth.band,
        components: deterministic.financialHealth.components,
      }, null, 2);
  }

  return [identity, instructions, interpretationRules, contextBlock, deterministicBlock]
    .filter(Boolean)
    .join('\n\n---\n\n');
}

export const insightAgent: AgentDefinition = {
  id: 'insight',
  name: 'Insight Agent',
  description: 'Generates strategic insights from deterministic financial signals',
  supportedIntents: SUPPORTED_INTENTS,
  requiredMemoryFields: ['financialHealthBand'],
  requiredContextSlices: ['summary', 'currentMonth', 'categoryBreakdown', 'trends'],
  needsDeterministicLayer: true,
  systemPromptBuilder: buildSystemPrompt,
  outputSchema: InsightsResponseSchema,
  maxContextTokens: 2000,
  canWriteMemory: false,
  writableMemoryFields: [],
};

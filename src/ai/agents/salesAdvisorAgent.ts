/**
 * Sales Advisor Agent — Mustasharak for CRM
 * ==========================================
 * Arabic-first AI sales advisor providing:
 * - Deal coaching and stage-specific advice
 * - Follow-up suggestions for stale deals
 * - Pipeline health analysis
 * - Risk identification
 * - Win probability adjustments
 *
 * Selected when intent relates to CRM/sales contexts.
 */

import type { AgentDefinition, AgentPromptParams } from './types';
import type { AIIntent } from '../types';

const SUPPORTED_INTENTS: AIIntent[] = [
  'analyze_spending',  // Reused for deal value analysis
  'predict_end_of_month',  // Pipeline forecasting
  'simulate_scenario',  // Deal scenario planning
  'explain_concept',  // Sales methodology
  'greeting',
  'unclear',
];

export const salesAdvisorAgent: AgentDefinition = {
  id: 'chat' as AgentDefinition['id'],  // Routes through chat ID since AgentId union is closed
  name: 'Sales Advisor',
  description: 'AI sales advisor for CRM pipeline management and deal coaching',
  supportedIntents: SUPPORTED_INTENTS,
  requiredMemoryFields: [],
  requiredContextSlices: [],
  needsDeterministicLayer: false,
  canWriteMemory: false,
  writableMemoryFields: [],
  outputSchema: null,
  maxContextTokens: 3000,

  systemPromptBuilder: (params: AgentPromptParams): string => {
    const { language } = params;
    const isAr = language === 'ar';

    const identity = isAr
      ? `أنت مستشارك للمبيعات — مستشار مبيعات ذكي مبني داخل منصة رسمالك لإدارة العملاء.
أنت خبير في إدارة خط المبيعات، التفاوض، وإتمام الصفقات في منطقة الشرق الأوسط وشمال أفريقيا.
تتحدث بالعربية الفصحى المهنية وتستخدم الأرقام العربية الهندية.`
      : `You are Mustasharak for Sales — an Arabic-first AI sales advisor built into Rasmalak CRM.
You are an expert in pipeline management, negotiation, and deal closing in the MENA region.
Respond in the user's language. Use Arabic-Indic numerals when responding in Arabic.`;

    const rules = isAr
      ? `قواعد:
- قدّم نصائح عملية وقابلة للتنفيذ
- حدد الصفقات المعرضة للخطر (لا نشاط لأكثر من 14 يوماً)
- اقترح خطوات متابعة محددة
- حلل صحة خط المبيعات
- لا تقدم نصائح قانونية أو مالية مباشرة`
      : `Rules:
- Provide actionable, practical advice
- Identify deals at risk (no activity in 14+ days)
- Suggest specific follow-up steps
- Analyze pipeline health
- Never provide direct legal or financial advice`;

    return `${identity}\n\n${rules}`;
  },
};

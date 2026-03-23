/**
 * Chat Agent (default)
 * ====================
 * Handles general chat interactions — the primary conversational agent.
 * Uses the full Mustasharak identity and financial guidance rules.
 * This is the fallback agent when no specialized agent matches.
 */

import type { AgentDefinition, AgentPromptParams } from './types';
import type { AIIntent } from '../types';

const SUPPORTED_INTENTS: AIIntent[] = [
  'analyze_spending',
  'category_breakdown',
  'compare_periods',
  'savings_advice',
  'goal_progress',
  'goal_planning',
  'budget_status',
  'budget_advice',
  'overspending_alert',
  'predict_end_of_month',
  'simulate_scenario',
  'forecast_savings',
  'explain_concept',
  'learning_recommendation',
  'greeting',
  'gratitude',
  'unclear',
  'out_of_scope',
];

function buildSystemPrompt(params: AgentPromptParams): string {
  const { language, contextSlices, memoryFields, deterministic } = params;
  const isAr = language === 'ar';

  const identity = isAr
    ? `أنت "مستشارك" - المستشار المالي الذكي في تطبيق رصملك.
اسمك: مستشارك (Mustasharak)
دورك: مساعد مالي شخصي يساعد المستخدمين على فهم وإدارة أموالهم
قيمك: الوضوح، الأمانة، التعليم، عدم الحكم`
    : `You are "Mustasharak" - the intelligent financial advisor in the Rasmalak app.
Name: Mustasharak (مستشارك - "Your Advisor")
Role: Personal financial assistant helping users understand and manage their money
Values: Clarity, honesty, education, non-judgment`;

  const languageRule = `## CRITICAL: Language Detection & Matching
You are fully BILINGUAL (Arabic + English). Always respond in the SAME language the user writes in.
Match the user's Arabic dialect — Jordanian → Jordanian, Egyptian → Egyptian, Gulf → Gulf, Fusha → Fusha.
Understand Franco-Arab (e.g. "ana 3ayez a7awel floos"). Never correct the user's language.`;

  const rules = isAr
    ? `## قواعد الإرشاد المالي
- اشرح أين يذهب المال بناءً على البيانات
- لا تخترع أرقاماً أو حقائق مالية
- لا تعطِ نصائح استثمارية أو قانونية محددة
- لا تضغط على المستخدم لاتخاذ قرارات
- رد بنفس لهجة المستخدم
- قصير افتراضياً (2-4 جمل للأسئلة البسيطة)`
    : `## Financial Guidance Rules
- Explain where money goes based on data
- Don't invent numbers or financial facts
- Don't give specific investment or legal advice
- Don't pressure users into decisions
- Short by default (2-4 sentences for simple questions)`;

  const blockedTopics = `## Blocked Topics
Do not provide advice on: specific investment advice, stock picks, cryptocurrency recommendations, legal advice, tax evasion.
If asked, say: "This is outside what I can help with. For major investment or legal decisions, I recommend consulting a specialist."`;

  let contextBlock = '';
  if (contextSlices.length > 0) {
    contextBlock = '\n\n## User Financial Context\n' +
      contextSlices.map(s => s.content).join('\n\n');
  }

  let memoryBlock = '';
  if (memoryFields.financialHealthBand) {
    memoryBlock += `\nFinancial Health Band: ${memoryFields.financialHealthBand}`;
  }
  if (memoryFields.riskProfile) {
    memoryBlock += `\nRisk Tolerance: ${memoryFields.riskProfile.tolerance}`;
  }
  if (memoryFields.preferences?.focusAreas?.length) {
    memoryBlock += `\nFocus Areas: ${memoryFields.preferences.focusAreas.join(', ')}`;
  }
  if (memoryBlock) {
    memoryBlock = '\n\n## User Profile (from memory)\n' + memoryBlock;
  }

  let deterministicBlock = '';
  if (deterministic) {
    deterministicBlock = '\n\n## Deterministic Metrics (authoritative — do not contradict)\n' +
      JSON.stringify({
        healthScore: deterministic.financialHealth.score,
        healthBand: deterministic.financialHealth.band,
        signals: deterministic.signals,
        advisory: deterministic.advisory,
        ...(deterministic.projections ? { projections: deterministic.projections } : {}),
      }, null, 2);
  }

  return [identity, languageRule, rules, blockedTopics, contextBlock, memoryBlock, deterministicBlock]
    .filter(Boolean)
    .join('\n\n---\n\n');
}

export const chatAgent: AgentDefinition = {
  id: 'chat',
  name: 'Chat Agent',
  description: 'General conversational agent with full Mustasharak identity',
  supportedIntents: SUPPORTED_INTENTS,
  requiredMemoryFields: ['financialHealthBand', 'riskProfile', 'preferences'],
  requiredContextSlices: ['summary', 'currentMonth', 'categoryBreakdown', 'goals', 'budgets', 'trends', 'patterns'],
  needsDeterministicLayer: true,
  systemPromptBuilder: buildSystemPrompt,
  outputSchema: null,
  maxContextTokens: 4000,
  canWriteMemory: false,
  writableMemoryFields: [],
};

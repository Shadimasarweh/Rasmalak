/**
 * User Profile Agent
 * ==================
 * Extracts/updates user preferences, goals, and risk tolerance.
 * Writes to structured memory. Does not produce direct user-facing responses.
 * Used internally by the orchestrator after detecting profile-relevant signals.
 */

import type { AgentDefinition, AgentPromptParams } from './types';
import type { AIIntent } from '../types';

const SUPPORTED_INTENTS: AIIntent[] = [
  'goal_planning',
  'savings_advice',
  'budget_advice',
];

function buildSystemPrompt(params: AgentPromptParams): string {
  const { language, contextSlices, deterministic } = params;
  const isAr = language === 'ar';

  const identity = isAr
    ? `أنت وحدة تحليل ملف المستخدم في تطبيق رصملك. مهمتك استخراج معلومات الملف الشخصي المالي من رسائل المستخدم.`
    : `You are the user profile analysis module of the Rasmalak app. Your task is to extract financial profile information from user messages.`;

  const instructions = `## Instructions
Analyze the user's message and financial context to extract or update profile information.
Return a JSON object with any of these fields that can be determined:

- riskTolerance: "conservative" | "moderate" | "aggressive"
- focusAreas: string[] (e.g. ["saving", "budgeting", "debt_reduction"])
- preferredDialect: string (detected from message language/dialect)
- goalTypes: string[] (types of financial goals the user has expressed)

Only include fields where you have reasonable confidence (>0.7).
Do NOT guess or speculate. Only extract what is explicitly or strongly implied.`;

  let contextBlock = '';
  if (contextSlices.length > 0) {
    contextBlock = '\n\n## Financial Context\n' +
      contextSlices.map(s => s.content).join('\n\n');
  }

  let deterministicBlock = '';
  if (deterministic) {
    deterministicBlock = '\n\n## Current Metrics\n' +
      JSON.stringify({
        healthBand: deterministic.financialHealth.band,
        savingsRate: deterministic.signals.savingsRate,
        incomeStability: deterministic.signals.incomeStability,
      }, null, 2);
  }

  return [identity, instructions, contextBlock, deterministicBlock]
    .filter(Boolean)
    .join('\n\n');
}

export const profileAgent: AgentDefinition = {
  id: 'profile',
  name: 'User Profile Agent',
  description: 'Extracts and updates user preferences, goals, and risk tolerance',
  supportedIntents: SUPPORTED_INTENTS,
  requiredMemoryFields: ['riskProfile', 'preferences', 'behaviorSignals'],
  requiredContextSlices: ['summary', 'goals', 'patterns'],
  needsDeterministicLayer: true,
  systemPromptBuilder: buildSystemPrompt,
  outputSchema: {
    type: 'object',
    properties: {
      riskTolerance: {
        anyOf: [
          { type: 'string', enum: ['conservative', 'moderate', 'aggressive'] },
          { type: 'null' },
        ],
      },
      focusAreas: {
        anyOf: [
          { type: 'array', items: { type: 'string' } },
          { type: 'null' },
        ],
      },
      preferredDialect: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
      },
      goalTypes: {
        anyOf: [
          { type: 'array', items: { type: 'string' } },
          { type: 'null' },
        ],
      },
    },
    required: ['riskTolerance', 'focusAreas', 'preferredDialect', 'goalTypes'],
    additionalProperties: false,
  },
  maxContextTokens: 1500,
  canWriteMemory: true,
  writableMemoryFields: ['riskProfile', 'preferences', 'behaviorSignals'],
};

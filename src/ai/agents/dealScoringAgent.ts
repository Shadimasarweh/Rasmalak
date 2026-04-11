/**
 * Deal Scoring Agent — Mustasharak's scoring engine
 * ==================================================
 * Analyzes deal context and produces a structured JSON score.
 * Called by the score-deals cron job, not by user chat.
 *
 * Input: deal context block (stage, activity, contact, history)
 * Output: JSON { score, trend, reasoning, riskFactors, suggestedActions, confidence }
 */

import type { AgentDefinition, AgentPromptParams } from './types';
import type { AIIntent } from '../types';

const SUPPORTED_INTENTS: AIIntent[] = [
  'analyze_spending',  // Reused for deal analysis
];

export const dealScoringAgent: AgentDefinition = {
  id: 'chat' as AgentDefinition['id'],
  name: 'Deal Scoring',
  description: 'AI deal scoring engine that produces structured score JSON for pipeline deals',
  supportedIntents: SUPPORTED_INTENTS,
  requiredMemoryFields: [],
  requiredContextSlices: [],
  needsDeterministicLayer: false,
  canWriteMemory: false,
  writableMemoryFields: [],
  maxContextTokens: 2000,

  outputSchema: {
    type: 'object',
    properties: {
      score: { type: 'number', minimum: 0, maximum: 100 },
      trend: { type: 'string', enum: ['improving', 'stable', 'declining'] },
      reasoning: { type: 'string' },
      riskFactors: { type: 'array', items: { type: 'string' } },
      suggestedActions: { type: 'array', items: { type: 'string' } },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
    },
    required: ['score', 'trend', 'reasoning', 'riskFactors', 'suggestedActions', 'confidence'],
  },

  systemPromptBuilder: (_params: AgentPromptParams): string => {
    return `You are Mustasharak's deal scoring engine, part of Rasmalak CRM.

Your task: analyze the provided deal context and produce a JSON score.

Scoring criteria:
- Activity level (communications in last 30 days vs org average)
- Recency (days since last contact — lower is better)
- Stage velocity (days in current stage vs org average for this stage)
- Task health (overdue tasks reduce score)
- Deal value and probability

Output ONLY valid JSON matching this structure:
{
  "score": <0-100>,
  "trend": "improving" | "stable" | "declining",
  "reasoning": "<1-2 sentences explaining the score>",
  "riskFactors": ["<factor 1>", "<factor 2>"],
  "suggestedActions": ["<action 1>", "<action 2>"],
  "confidence": <0.0-1.0>
}

Rules:
- Score 70-100: healthy deal, on track
- Score 40-69: needs attention
- Score 0-39: at risk
- Trend is based on comparing current activity to 2 weeks ago
- Risk factors should be specific and actionable
- Suggested actions should be concrete next steps
- Confidence reflects how much data you had to work with (more data = higher)
- Always produce valid JSON. No markdown, no commentary outside the JSON.`;
  },
};

/**
 * Build the context block injected as the user message for scoring.
 * This is called by the cron job, not by the orchestrator.
 */
export function buildDealScoringContext(deal: {
  title: string;
  value: number | null;
  currency: string;
  stageName: string;
  daysInStage: number;
  avgDaysForStage: number;
  commsLast30Days: number;
  orgAvgComms: number;
  daysSinceLastContact: number;
  openTasks: number;
  overdueTasks: number;
  contactName: string | null;
  contactTitle: string | null;
  contactCompany: string | null;
  historicalWinRate: number;
  probability: number;
}): string {
  return `Score this deal:

Deal: ${deal.title}, value ${deal.value ?? 0} ${deal.currency}
Stage: ${deal.stageName} (entered ${deal.daysInStage} days ago, average for this stage: ${deal.avgDaysForStage} days)
Activity: ${deal.commsLast30Days} communications in last 30 days (org average: ${deal.orgAvgComms})
Last contact: ${deal.daysSinceLastContact} days ago
Tasks: ${deal.openTasks} open, ${deal.overdueTasks} overdue
Contact: ${deal.contactName ?? 'Unknown'}${deal.contactTitle ? `, ${deal.contactTitle}` : ''}${deal.contactCompany ? ` at ${deal.contactCompany}` : ''}
Probability: ${deal.probability}%
Historical: Win rate for deals at this stage with similar activity: ${deal.historicalWinRate}%`;
}

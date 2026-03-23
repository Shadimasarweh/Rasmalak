/**
 * Policy Agent (Rule-Based)
 * =========================
 * Evaluates compliance with Rasmalak rules. No LLM call.
 * Flags risk, misinformation, or financial overreach via
 * string/pattern matching on AI outputs.
 *
 * This agent runs as part of the validation pipeline, not as an LLM agent.
 */

import type { AgentDefinition, AgentPromptParams } from './types';
import type { DeterministicOutputs } from '../deterministic';

export interface PolicyViolation {
  rule: string;
  severity: 'warning' | 'block';
  description: string;
  matchedPattern?: string;
}

const PROHIBITED_PATTERNS: Array<{
  pattern: RegExp;
  rule: string;
  severity: 'warning' | 'block';
  description: string;
}> = [
  {
    pattern: /\b(guaranteed|مضمون|ضمان)\b.*\b(return|profit|ربح|عائد)\b/i,
    rule: 'no_guaranteed_returns',
    severity: 'block',
    description: 'Claims guaranteed financial returns',
  },
  {
    pattern: /\b(buy|sell|invest in|اشتر[يِ]?|بيع|استثمر في)\b.*\b(stock|share|سهم|أسهم|bitcoin|بتكوين|crypto|كريبتو|عملة رقمية)\b/i,
    rule: 'no_specific_investment',
    severity: 'block',
    description: 'Specific investment recommendation',
  },
  {
    pattern: /\b(you must|you should definitely|يجب عليك|لازم تسوي|لازم)\b.*\b(invest|استثمر|حط فلوسك)\b/i,
    rule: 'no_imperative_investment',
    severity: 'block',
    description: 'Imperative investment directive',
  },
  {
    pattern: /\b(tax evasion|تهرب ضريبي|hide.*income|اخف[يِ]?.*دخل)\b/i,
    rule: 'no_tax_evasion',
    severity: 'block',
    description: 'Tax evasion suggestion',
  },
  {
    pattern: /\b(legal advice|مشورة قانونية|نصيحة قانونية|legally you should|قانونياً يجب)\b/i,
    rule: 'no_legal_advice',
    severity: 'warning',
    description: 'Providing legal advice',
  },
  {
    pattern: /\b(100%|certain|أكيد|مؤكد)\b.*\b(will|سوف|رح|بيصير)\b.*\b(profit|grow|increase|يزيد|يرتفع|ربح)\b/i,
    rule: 'no_certainty_claims',
    severity: 'warning',
    description: 'False certainty about financial outcomes',
  },
  {
    pattern: /\b(hurry|act now|quickly|بسرعة|اسرع|لا تضيع الفرصة|الحق)\b.*\b(invest|buy|sell|استثمر|اشتري|بيع)\b/i,
    rule: 'no_urgency_pressure',
    severity: 'warning',
    description: 'Urgency pressure for financial decisions',
  },
];

/**
 * Evaluate AI output against Rasmalak policy rules.
 * Pure function — no LLM call, no side effects.
 */
export function evaluatePolicy(
  output: string,
  _deterministic?: DeterministicOutputs | null,
): PolicyViolation[] {
  const violations: PolicyViolation[] = [];

  for (const rule of PROHIBITED_PATTERNS) {
    const match = output.match(rule.pattern);
    if (match) {
      violations.push({
        rule: rule.rule,
        severity: rule.severity,
        description: rule.description,
        matchedPattern: match[0],
      });
    }
  }

  return violations;
}

/**
 * Check if any violations are blocking (require revision).
 */
export function hasBlockingViolations(violations: PolicyViolation[]): boolean {
  return violations.some(v => v.severity === 'block');
}

// PolicyAgent definition — included in registry but never routed to for LLM calls.
// Its evaluatePolicy function is called directly by the validation pipeline.
export const policyAgent: AgentDefinition = {
  id: 'policy',
  name: 'Policy Agent',
  description: 'Rule-based compliance checker — no LLM call',
  supportedIntents: [],
  requiredMemoryFields: [],
  requiredContextSlices: [],
  needsDeterministicLayer: false,
  systemPromptBuilder: (_params: AgentPromptParams) => '',
  outputSchema: null,
  maxContextTokens: 0,
  canWriteMemory: false,
  writableMemoryFields: [],
};

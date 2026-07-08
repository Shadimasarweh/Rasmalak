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

// Each rule fires when EVERY term group is present in the output.
//
// Terms are matched as substrings, not with `\b` word boundaries. JS `\b`
// is ASCII-only, so it never fires next to Arabic letters (verified:
// /\bمضمون\b/ fails on «ربح مضمون») — which silently disabled every Arabic
// rule here. Substring matching also survives Arabic inflection (tanwīn,
// the definite article, attached pronouns) that a whole-word test would miss.
// Groups are ANDed order-independently because Arabic places the adjective
// after the noun («ربح مضمون») — the reverse of the English order these
// rules were first written in. For a safety filter, over-matching (a retry)
// is the safe failure direction.
const PROHIBITED_PATTERNS: Array<{
  terms: RegExp[];
  rule: string;
  severity: 'warning' | 'block';
  description: string;
}> = [
  {
    terms: [/(guaranteed|مضمون|ضمان)/i, /(return|profit|ربح|أرباح|عائد|عوائد)/i],
    rule: 'no_guaranteed_returns',
    severity: 'block',
    description: 'Claims guaranteed financial returns',
  },
  {
    terms: [/(buy|sell|invest in|اشتر[يِ]?|بيع|استثمر في)/i, /(stock|share|سهم|أسهم|bitcoin|بتكوين|crypto|كريبتو|عملة رقمية)/i],
    rule: 'no_specific_investment',
    severity: 'block',
    description: 'Specific investment recommendation',
  },
  {
    terms: [/(you must|you should definitely|يجب عليك|لازم تسوي|لازم)/i, /(invest|استثمر|حط فلوسك)/i],
    rule: 'no_imperative_investment',
    severity: 'block',
    description: 'Imperative investment directive',
  },
  {
    terms: [/(tax evasion|تهرب ضريبي|hide.*income|اخف[يِ]?.*دخل)/i],
    rule: 'no_tax_evasion',
    severity: 'block',
    description: 'Tax evasion suggestion',
  },
  {
    terms: [/(legal advice|مشورة قانونية|نصيحة قانونية|legally you should|قانونياً يجب)/i],
    rule: 'no_legal_advice',
    severity: 'warning',
    description: 'Providing legal advice',
  },
  {
    terms: [/(100%|certain|أكيد|مؤكد)/i, /(will|سوف|رح|بيصير)/i, /(profit|grow|increase|يزيد|يرتفع|ربح)/i],
    rule: 'no_certainty_claims',
    severity: 'warning',
    description: 'False certainty about financial outcomes',
  },
  {
    terms: [/(hurry|act now|quickly|بسرعة|اسرع|لا تضيع الفرصة|الحق)/i, /(invest|buy|sell|استثمر|اشتري|بيع)/i],
    rule: 'no_urgency_pressure',
    severity: 'warning',
    description: 'Urgency pressure for financial decisions',
  },
];

/**
 * Normalize text for more robust pattern matching:
 * collapse whitespace, strip diacritics, normalize Unicode.
 */
function normalizeForMatching(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.\-_*~`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Evaluate AI output against Rasmalak policy rules.
 * Pure function — no LLM call, no side effects.
 */
export function evaluatePolicy(
  output: string,
  _deterministic?: DeterministicOutputs | null,
): PolicyViolation[] {
  const violations: PolicyViolation[] = [];
  const normalized = normalizeForMatching(output);

  for (const rule of PROHIBITED_PATTERNS) {
    // A rule fires only when all of its term groups are present (in either the
    // normalized or the raw output). Order between groups does not matter.
    const hits = rule.terms.map(
      term => (normalized.match(term) || output.match(term) || [])[0],
    );
    if (hits.every(Boolean)) {
      violations.push({
        rule: rule.rule,
        severity: rule.severity,
        description: rule.description,
        matchedPattern: hits.join(' + '),
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

/**
 * Tone and Risk Filter
 * ====================
 * Checks for imperative financial directives, urgency language,
 * and scope-exceeding advisory tone.
 */

import type { ValidationResult, ValidationError } from './pipeline';

interface ToneRule {
  terms: RegExp[];
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

// A rule fires when every term group is present. Terms match as substrings
// rather than with `\b`: JS word boundaries are ASCII-only and never fire next
// to Arabic letters, so the `\b`-anchored originals were dead for Arabic. Groups
// are ANDed order-independently because Arabic word order differs from English.
const TONE_RULES: ToneRule[] = [
  {
    terms: [/(you must|you need to|you have to|لازم|يجب عليك|ضروري)/i, /(immediately|now|right away|حالاً|فوراً|دلوقتي|هسه)/i],
    code: 'URGENCY_PRESSURE',
    message: 'Combines imperative language with urgency — exceeds advisory scope',
    severity: 'warning',
  },
  {
    terms: [/(I (guarantee|promise)|أضمن|أوعدك|ضامنلك)/i],
    code: 'PERSONAL_GUARANTEE',
    message: 'AI making personal guarantees',
    severity: 'error',
  },
  {
    terms: [/(stupid|foolish|idiot|غبي|حمار|أهبل|مجنون)/i, /(decision|choice|spending|صرف|قرار|اختيار)/i],
    code: 'JUDGMENTAL_TONE',
    message: 'Judgmental language about user decisions',
    severity: 'error',
  },
  {
    terms: [/(as a (financial|legal|tax) (advisor|professional)|كمستشار (مالي|قانوني|ضريبي) مرخص)/i],
    code: 'PROFESSIONAL_IMPERSONATION',
    message: 'Claiming to be a licensed professional',
    severity: 'error',
  },
  {
    terms: [/(don'?t worry|لا تقلق|ما تخاف)/i, /(everything will be (fine|ok)|كل شيء بيصير تمام)/i],
    code: 'FALSE_REASSURANCE',
    message: 'Providing false reassurance about financial outcomes',
    severity: 'warning',
  },
];

export function filterToneAndRisk(output: string): ValidationResult {
  const errors: ValidationError[] = [];

  for (const rule of TONE_RULES) {
    if (rule.terms.every(term => term.test(output))) {
      errors.push({
        code: rule.code,
        message: rule.message,
        severity: rule.severity,
      });
    }
  }

  return {
    passed: errors.filter(e => e.severity === 'error').length === 0,
    stage: 'tone_risk',
    errors,
  };
}

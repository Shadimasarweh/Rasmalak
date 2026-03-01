/**
 * Tone and Risk Filter
 * ====================
 * Checks for imperative financial directives, urgency language,
 * and scope-exceeding advisory tone.
 */

import type { ValidationResult, ValidationError } from './pipeline';

interface ToneRule {
  pattern: RegExp;
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

const TONE_RULES: ToneRule[] = [
  {
    pattern: /\b(you must|you need to|you have to|لازم|يجب عليك|ضروري)\b.*\b(immediately|now|right away|حالاً|فوراً|دلوقتي|هسه)\b/i,
    code: 'URGENCY_PRESSURE',
    message: 'Combines imperative language with urgency — exceeds advisory scope',
    severity: 'warning',
  },
  {
    pattern: /\b(I (guarantee|promise)|أضمن|أوعدك|ضامنلك)\b/i,
    code: 'PERSONAL_GUARANTEE',
    message: 'AI making personal guarantees',
    severity: 'error',
  },
  {
    pattern: /\b(stupid|foolish|idiot|غبي|حمار|أهبل|مجنون)\b.*\b(decision|choice|spending|صرف|قرار|اختيار)\b/i,
    code: 'JUDGMENTAL_TONE',
    message: 'Judgmental language about user decisions',
    severity: 'error',
  },
  {
    pattern: /\b(as a (financial|legal|tax) (advisor|professional)|كمستشار (مالي|قانوني|ضريبي) مرخص)\b/i,
    code: 'PROFESSIONAL_IMPERSONATION',
    message: 'Claiming to be a licensed professional',
    severity: 'error',
  },
  {
    pattern: /\b(don'?t worry|لا تقلق|ما تخاف)\b.*\b(everything will be (fine|ok)|كل شيء بيصير تمام)\b/i,
    code: 'FALSE_REASSURANCE',
    message: 'Providing false reassurance about financial outcomes',
    severity: 'warning',
  },
];

export function filterToneAndRisk(output: string): ValidationResult {
  const errors: ValidationError[] = [];

  for (const rule of TONE_RULES) {
    if (rule.pattern.test(output)) {
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

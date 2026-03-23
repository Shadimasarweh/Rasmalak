/**
 * Numerical Validator
 * ===================
 * Cross-checks numbers mentioned in AI output against deterministic outputs.
 * Flags significant discrepancies that could constitute hallucination.
 */

import type { ValidationResult, ValidationError } from './pipeline';
import type { DeterministicOutputs } from '../deterministic';

const TOLERANCE = 0.15; // 15% tolerance for floating point/rounding

/**
 * Extract percentage values from text.
 */
function extractPercentages(text: string): Array<{ value: number; context: string }> {
  const results: Array<{ value: number; context: string }> = [];
  const patterns = [
    /(\d+(?:\.\d+)?)\s*%/g,
    /(\d+(?:\.\d+)?)\s*بالمئة/g,
    /(\d+(?:\.\d+)?)\s*بالمية/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      results.push({
        value: parseFloat(match[1]),
        context: text.substring(
          Math.max(0, match.index - 30),
          Math.min(text.length, match.index + match[0].length + 30),
        ),
      });
    }
  }

  return results;
}

/**
 * Check if a value is within tolerance of an expected value.
 */
function isWithinTolerance(actual: number, expected: number): boolean {
  if (expected === 0) return actual === 0;
  return Math.abs(actual - expected) / Math.abs(expected) <= TOLERANCE;
}

export function validateNumerical(
  output: string,
  deterministic: DeterministicOutputs,
): ValidationResult {
  const errors: ValidationError[] = [];
  const percentages = extractPercentages(output);

  for (const pct of percentages) {
    const value = pct.value / 100;

    // Check against savings rate
    if (deterministic.signals.savingsRate != null) {
      const savingsKeywords = /savings?\s*rate|معدل\s*(ال)?ادخار|نسبة\s*(ال)?توفير/i;
      if (savingsKeywords.test(pct.context)) {
        const expected = deterministic.signals.savingsRate * 100;
        if (!isWithinTolerance(pct.value, expected)) {
          errors.push({
            code: 'SAVINGS_RATE_MISMATCH',
            message: `Savings rate stated as ${pct.value}% but computed value is ${expected.toFixed(1)}%`,
            severity: 'warning',
          });
        }
      }
    }

    // Check against health score
    const healthKeywords = /health\s*score|نقاط\s*(ال)?صحة|درجة\s*(ال)?صحة/i;
    if (healthKeywords.test(pct.context)) {
      const expected = deterministic.financialHealth.score;
      if (!isWithinTolerance(pct.value, expected)) {
        errors.push({
          code: 'HEALTH_SCORE_MISMATCH',
          message: `Health score stated as ${pct.value} but computed value is ${expected}`,
          severity: 'warning',
        });
      }
    }
  }

  return {
    passed: errors.filter(e => e.severity === 'error').length === 0,
    stage: 'numerical',
    errors,
  };
}

/**
 * Policy Compliance Check
 * =======================
 * Scans AI output for prohibited patterns.
 * Expands on the existing blockedTopics with more granular rules.
 */

import type { ValidationResult, ValidationError } from './pipeline';
import type { DeterministicOutputs } from '../deterministic';
import { evaluatePolicy, hasBlockingViolations } from '../agents/policyAgent';

export function checkPolicyCompliance(
  output: string,
  deterministic: DeterministicOutputs | null,
): ValidationResult {
  const violations = evaluatePolicy(output, deterministic);

  const errors: ValidationError[] = violations.map(v => ({
    code: `POLICY_${v.rule.toUpperCase()}`,
    message: v.description + (v.matchedPattern ? ` (matched: "${v.matchedPattern}")` : ''),
    severity: v.severity === 'block' ? 'error' : 'warning',
  }));

  return {
    passed: !hasBlockingViolations(violations),
    stage: 'policy_compliance',
    errors,
  };
}

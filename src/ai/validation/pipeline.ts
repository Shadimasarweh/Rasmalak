/**
 * Validation Pipeline
 * ===================
 * All AI-generated outputs pass through this pipeline before user display.
 * Every stage is rule-based — no LLM calls.
 *
 * Stages:
 * 1. Schema Validator — structured output integrity
 * 2. Numerical Validator — cross-check against deterministic outputs
 * 3. Policy Compliance Check — prohibited patterns
 * 4. Tone and Risk Filter — advisory tone scope
 */

import type { AgentDefinition } from '../agents/types';
import type { DeterministicOutputs } from '../deterministic';
import type { ContextSelection } from '../context/contextSelector';
import { validateSchema } from './schemaValidator';
import { validateNumerical } from './numericalValidator';
import { checkPolicyCompliance } from './policyComplianceCheck';
import { filterToneAndRisk } from './toneAndRiskFilter';

export interface ValidationError {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface ValidationResult {
  passed: boolean;
  stage: string;
  errors: ValidationError[];
}

/**
 * Run all validation stages on the AI output.
 * Returns an array of results — one per stage.
 */
export async function validateOutput(
  output: string,
  agent: AgentDefinition,
  deterministic: DeterministicOutputs | null,
  context: ContextSelection,
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // 1. Schema validation (only if agent defines a schema)
  if (agent.outputSchema) {
    results.push(validateSchema(output, agent.outputSchema));
  }

  // 2. Numerical validation
  if (deterministic) {
    results.push(validateNumerical(output, deterministic));
  }

  // 3. Policy compliance
  results.push(checkPolicyCompliance(output, deterministic));

  // 4. Tone and risk filter
  results.push(filterToneAndRisk(output));

  return results;
}

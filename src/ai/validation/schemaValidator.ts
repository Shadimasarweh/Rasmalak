/**
 * Schema Validator
 * ================
 * Validates that structured AI output can be parsed as valid JSON
 * and has the expected top-level structure.
 */

import type { ValidationResult, ValidationError } from './pipeline';

export function validateSchema(
  output: string,
  schema: Record<string, unknown>,
): ValidationResult {
  const errors: ValidationError[] = [];

  // Attempt JSON parse
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    errors.push({
      code: 'INVALID_JSON',
      message: 'Output is not valid JSON',
      severity: 'error',
    });
    return { passed: false, stage: 'schema', errors };
  }

  // Check top-level type
  if (typeof parsed !== 'object' || parsed === null) {
    errors.push({
      code: 'NOT_OBJECT',
      message: 'Output is not a JSON object',
      severity: 'error',
    });
    return { passed: false, stage: 'schema', errors };
  }

  // Check required fields from schema
  const required = schema.required as string[] | undefined;
  if (required && Array.isArray(required)) {
    for (const field of required) {
      if (!(field in (parsed as Record<string, unknown>))) {
        errors.push({
          code: 'MISSING_FIELD',
          message: `Required field "${field}" is missing`,
          severity: 'error',
        });
      }
    }
  }

  return {
    passed: errors.length === 0,
    stage: 'schema',
    errors,
  };
}

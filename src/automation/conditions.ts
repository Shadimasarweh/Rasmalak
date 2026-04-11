/**
 * Automation Condition Evaluation
 * Evaluates workflow conditions against entity data using AND/OR logic.
 */

import type { WorkflowCondition, ConditionOperator } from '@/types/crm';

/**
 * Evaluate a list of conditions against entity data.
 * Default logic between conditions is AND. Conditions with logic='or' start an OR group.
 */
export function evaluateConditions(
  conditions: WorkflowCondition[],
  entityData: Record<string, unknown>
): boolean {
  if (!conditions || conditions.length === 0) return true;

  // Group conditions by their logic operator
  // Default: all conditions are AND unless marked with logic='or'
  let result = true;

  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];
    const condResult = evaluateSingle(condition, entityData);

    if (i === 0) {
      result = condResult;
      continue;
    }

    if (condition.logic === 'or') {
      result = result || condResult;
    } else {
      result = result && condResult;
    }
  }

  return result;
}

function evaluateSingle(
  condition: WorkflowCondition,
  data: Record<string, unknown>
): boolean {
  const fieldValue = getNestedValue(data, condition.field);
  const compareValue = condition.value;

  return applyOperator(condition.operator, fieldValue, compareValue);
}

function applyOperator(
  operator: ConditionOperator,
  fieldValue: unknown,
  compareValue: unknown
): boolean {
  switch (operator) {
    case 'equals':
      if (fieldValue == null) return compareValue == null;
      return String(fieldValue) === String(compareValue);

    case 'not_equals':
      if (fieldValue == null) return compareValue != null;
      return String(fieldValue) !== String(compareValue);

    case 'contains':
      return String(fieldValue ?? '').toLowerCase()
        .includes(String(compareValue ?? '').toLowerCase());

    case 'not_contains':
      return !String(fieldValue ?? '').toLowerCase()
        .includes(String(compareValue ?? '').toLowerCase());

    case 'greater_than': {
      const n = Number(fieldValue);
      return !isNaN(n) && n > Number(compareValue);
    }

    case 'less_than': {
      const n = Number(fieldValue);
      return !isNaN(n) && n < Number(compareValue);
    }

    case 'greater_or_equal': {
      const n = Number(fieldValue);
      return !isNaN(n) && n >= Number(compareValue);
    }

    case 'less_or_equal': {
      const n = Number(fieldValue);
      return !isNaN(n) && n <= Number(compareValue);
    }

    case 'is_empty':
      return fieldValue === null || fieldValue === undefined || fieldValue === '';

    case 'is_not_empty':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';

    case 'in_list': {
      const list = Array.isArray(compareValue) ? compareValue : String(compareValue).split(',');
      return list.map(String).includes(String(fieldValue));
    }

    case 'not_in_list': {
      const list = Array.isArray(compareValue) ? compareValue : String(compareValue).split(',');
      return !list.map(String).includes(String(fieldValue));
    }

    case 'days_since_greater': {
      const dateStr = fieldValue as string | null;
      if (!dateStr) return true; // No date = infinite days since
      const daysSince = Math.floor(
        (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSince > Number(compareValue);
    }

    case 'days_since_less': {
      const dateStr = fieldValue as string | null;
      if (!dateStr) return false;
      const daysSince = Math.floor(
        (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSince < Number(compareValue);
    }

    default:
      return false;
  }
}

/** Resolve dot-notation field paths: "contact.company" → data.contact.company */
function getNestedValue(data: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((obj, key) => {
    if (obj && typeof obj === 'object') {
      return (obj as Record<string, unknown>)[key];
    }
    return undefined;
  }, data);
}

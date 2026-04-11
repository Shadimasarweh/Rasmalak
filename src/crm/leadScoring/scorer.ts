/**
 * Lead Scoring — Rule-based scorer
 * =================================
 * Evaluates contacts against org-defined scoring rules.
 * Returns a score + breakdown for full transparency.
 * Deterministic, not ML — MENA clients need explainable scoring.
 */

import { supabase } from '@/lib/supabaseClient';

export interface ScoreResult {
  totalScore: number;
  breakdown: Array<{
    ruleId: string;
    ruleName: string;
    field: string;
    matched: boolean;
    points: number;
  }>;
}

interface ScoringRule {
  id: string;
  name: string | null;
  field: string;
  operator: string;
  value: string;
  points: number;
}

/**
 * Score a single contact against all active rules for the org.
 */
export async function scoreContact(
  orgId: string,
  contactData: Record<string, unknown>
): Promise<ScoreResult> {
  try {
    const { data: rules } = await supabase
      .from('crm_lead_scoring_rules')
      .select('id, name, field, operator, value, points')
      .eq('org_id', orgId)
      .eq('is_active', true);

    if (!rules || rules.length === 0) {
      return { totalScore: 0, breakdown: [] };
    }

    const breakdown = rules.map((rule: ScoringRule) => {
      const matched = evaluateRule(rule, contactData);
      return {
        ruleId: rule.id,
        ruleName: rule.name ?? rule.field,
        field: rule.field,
        matched,
        points: matched ? rule.points : 0,
      };
    });

    const totalScore = breakdown.reduce((sum, b) => sum + b.points, 0);

    return { totalScore, breakdown };
  } catch (err) {
    console.warn('[LeadScoring] Error scoring contact:', err);
    return { totalScore: 0, breakdown: [] };
  }
}

/**
 * Score a contact and persist the result.
 */
export async function scoreAndPersist(
  orgId: string,
  contactId: string,
  contactData: Record<string, unknown>
): Promise<ScoreResult> {
  const result = await scoreContact(orgId, contactData);

  try {
    await supabase
      .from('crm_contacts')
      .update({
        lead_score: result.totalScore,
        lead_score_breakdown: result.breakdown,
      })
      .eq('id', contactId)
      .eq('org_id', orgId);
  } catch (err) {
    console.warn('[LeadScoring] Error persisting score:', err);
  }

  return result;
}

function evaluateRule(
  rule: ScoringRule,
  data: Record<string, unknown>
): boolean {
  const fieldValue = getNestedValue(data, rule.field);
  const compareValue = rule.value;

  switch (rule.operator) {
    case 'equals':
      if (fieldValue == null) return false;
      return String(fieldValue) === compareValue;
    case 'not_equals':
      if (fieldValue == null) return false;
      return String(fieldValue) !== compareValue;
    case 'contains':
      return String(fieldValue ?? '').toLowerCase().includes(compareValue.toLowerCase());
    case 'not_contains':
      return !String(fieldValue ?? '').toLowerCase().includes(compareValue.toLowerCase());
    case 'greater_than': {
      const n = Number(fieldValue);
      return !isNaN(n) && n > Number(compareValue);
    }
    case 'less_than': {
      const n = Number(fieldValue);
      return !isNaN(n) && n < Number(compareValue);
    }
    case 'is_empty':
      return fieldValue == null || fieldValue === '';
    case 'is_not_empty':
      return fieldValue != null && fieldValue !== '';
    case 'in_list': {
      const list = compareValue.split(',').map(s => s.trim());
      return list.includes(String(fieldValue));
    }
    default:
      return false;
  }
}

function getNestedValue(data: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((obj, key) => {
    if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
    return undefined;
  }, data);
}

/**
 * Lead Routing — Rule-based assignment
 * =====================================
 * Routes contacts to sales reps based on configurable rules.
 * Supports: round-robin, territory (country/city), skill (industry).
 * Notifies assigned rep immediately.
 */

import { supabase } from '@/lib/supabaseClient';

interface RoutingRule {
  id: string;
  type: 'round_robin' | 'territory' | 'skill' | 'manual';
  conditions: Array<{ field: string; operator: string; value: unknown }>;
  config: Record<string, unknown>;
  priority: number;
}

interface RouteResult {
  assignedTo: string | null;
  ruleId: string | null;
  ruleName: string | null;
  method: string;
}

/**
 * Route a contact to a sales rep based on org routing rules.
 * Evaluates rules by priority. First matching rule wins.
 */
export async function routeContact(
  orgId: string,
  contactData: Record<string, unknown>
): Promise<RouteResult> {
  try {
    const { data: rules } = await supabase
      .from('crm_routing_rules')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (!rules || rules.length === 0) {
      return { assignedTo: null, ruleId: null, ruleName: null, method: 'none' };
    }

    for (const row of rules) {
      const rule: RoutingRule = {
        id: row.id,
        type: row.type,
        conditions: (row.conditions as RoutingRule['conditions']) ?? [],
        config: (row.config as Record<string, unknown>) ?? {},
        priority: row.priority,
      };

      // Check if conditions match
      if (!matchConditions(rule.conditions, contactData)) continue;

      // Apply routing method
      const assignedTo = await applyRouting(orgId, rule);
      if (assignedTo) {
        return {
          assignedTo,
          ruleId: rule.id,
          ruleName: row.name as string,
          method: rule.type,
        };
      }
    }

    return { assignedTo: null, ruleId: null, ruleName: null, method: 'no_match' };
  } catch (err) {
    console.warn('[LeadRouter] Error routing contact:', err);
    return { assignedTo: null, ruleId: null, ruleName: null, method: 'error' };
  }
}

/**
 * Route and persist assignment, then notify the rep.
 */
export async function routeAndAssign(
  orgId: string,
  contactId: string,
  contactData: Record<string, unknown>
): Promise<RouteResult> {
  const result = await routeContact(orgId, contactData);

  if (result.assignedTo) {
    try {
      await supabase
        .from('crm_contacts')
        .update({
          assigned_to: result.assignedTo,
          routed_at: new Date().toISOString(),
          routed_by_rule: result.ruleId,
        })
        .eq('id', contactId)
        .eq('org_id', orgId);

      // Notify assigned rep immediately
      await supabase.from('crm_notifications').insert({
        org_id: orgId,
        user_id: result.assignedTo,
        title: `New lead assigned: ${contactData.name ?? 'Unknown'}`,
        body: `You've been assigned a new contact via ${result.method} routing (${result.ruleName}).`,
        type: 'lead_assignment',
        entity_type: 'contact',
        entity_id: contactId,
      });
    } catch (err) {
      console.warn('[LeadRouter] Error persisting assignment:', err);
    }
  }

  return result;
}

// ── Internal ────────────────────────────────────────────────

function matchConditions(
  conditions: RoutingRule['conditions'],
  data: Record<string, unknown>
): boolean {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every(cond => {
    const fieldValue = getNestedValue(data, cond.field);
    switch (cond.operator) {
      case 'equals':
        return String(fieldValue) === String(cond.value);
      case 'contains':
        return String(fieldValue ?? '').toLowerCase().includes(String(cond.value ?? '').toLowerCase());
      case 'in_list': {
        const list = Array.isArray(cond.value) ? cond.value : String(cond.value).split(',');
        return list.map(String).includes(String(fieldValue));
      }
      default:
        // Unknown operators fail closed — misconfigured conditions don't match
        return false;
    }
  });
}

async function applyRouting(orgId: string, rule: RoutingRule): Promise<string | null> {
  switch (rule.type) {
    case 'round_robin':
      return roundRobinAssign(orgId, rule.config);

    case 'territory':
      return territoryAssign(orgId, rule.config);

    case 'skill':
      return skillAssign(orgId, rule.config);

    case 'manual':
      return (rule.config.userId as string) ?? null;

    default:
      return null;
  }
}

async function roundRobinAssign(
  orgId: string,
  config: Record<string, unknown>
): Promise<string | null> {
  // Get team members eligible for assignment
  const roles = (config.roles as string[]) ?? ['sales_rep', 'manager'];
  const { data: members } = await supabase
    .from('org_members')
    .select('user_id')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .in('role', roles)
    .order('joined_at', { ascending: true });

  if (!members || members.length === 0) return null;

  // Find who was last assigned (simple round-robin via count)
  const { count } = await supabase
    .from('crm_contacts')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .not('routed_at', 'is', null);

  const index = (count ?? 0) % members.length;
  return members[index].user_id;
}

async function territoryAssign(
  orgId: string,
  config: Record<string, unknown>
): Promise<string | null> {
  // config.assignments: { "UAE": "user-id-1", "KSA": "user-id-2" }
  const assignments = config.assignments as Record<string, string> | undefined;
  if (!assignments) return null;

  // Territory already matched via conditions — return the configured user
  const territory = config.matchedTerritory as string | undefined;
  if (territory && assignments[territory]) return assignments[territory];

  // Fallback: return first assignment
  const values = Object.values(assignments);
  return values.length > 0 ? values[0] : null;
}

async function skillAssign(
  orgId: string,
  config: Record<string, unknown>
): Promise<string | null> {
  // config.skillMap: { "real_estate": "user-id-1", "technology": "user-id-2" }
  const skillMap = config.skillMap as Record<string, string> | undefined;
  if (!skillMap) return null;

  const industry = config.matchedIndustry as string | undefined;
  if (industry && skillMap[industry]) return skillMap[industry];

  return null;
}

function getNestedValue(data: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((obj, key) => {
    if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
    return undefined;
  }, data);
}

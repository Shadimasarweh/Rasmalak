/**
 * Automation Engine
 * Core orchestrator: evaluates workflows against trigger events.
 * Pipeline: trigger match → condition evaluation → sequential action execution → log.
 */

import { supabase } from '@/lib/supabaseClient';
import { doesTriggerMatch, type TriggerEvent } from './triggers';
import { evaluateConditions } from './conditions';
import { executeAction, type ActionResult } from './actions';
import type { CrmWorkflow } from '@/types/crm';

export interface WorkflowExecutionResult {
  workflowId: string;
  conditionsMet: boolean;
  actionsExecuted: ActionResult[];
  error: string | null;
  executionMs: number;
}

/**
 * Evaluate a single workflow against a trigger event.
 * Returns execution result with timing.
 */
export async function evaluateWorkflow(
  workflow: CrmWorkflow,
  triggerEvent: TriggerEvent
): Promise<WorkflowExecutionResult> {
  const startTime = performance.now();

  try {
    // 1. Check trigger match
    if (!doesTriggerMatch(workflow.triggerType, workflow.triggerConfig, triggerEvent)) {
      return {
        workflowId: workflow.id,
        conditionsMet: false,
        actionsExecuted: [],
        error: null,
        executionMs: Math.round(performance.now() - startTime),
      };
    }

    // 2. Fetch entity data for condition evaluation
    const entityData = await fetchEntityData(
      triggerEvent.entityType,
      triggerEvent.entityId,
      triggerEvent.data
    );

    // 3. Evaluate conditions
    const conditionsMet = evaluateConditions(workflow.conditions, entityData);

    if (!conditionsMet) {
      await logExecution(workflow, triggerEvent, false, [], null, startTime);
      return {
        workflowId: workflow.id,
        conditionsMet: false,
        actionsExecuted: [],
        error: null,
        executionMs: Math.round(performance.now() - startTime),
      };
    }

    // 4. Execute actions sequentially (order matters)
    const sortedActions = [...workflow.actions].sort((a, b) => a.order - b.order);
    const results: ActionResult[] = [];

    for (const action of sortedActions) {
      // Handle wait actions — they pause the sequence
      if (action.type === 'wait') {
        const waitResult = await executeAction(action, {
          orgId: workflow.orgId,
          entityType: triggerEvent.entityType,
          entityId: triggerEvent.entityId,
          entityData,
          workflowId: workflow.id,
          userId: workflow.createdBy ?? undefined,
        });
        results.push(waitResult);
        // Wait actions pause remaining actions for the scheduler to resume
        break;
      }

      const result = await executeAction(action, {
        orgId: workflow.orgId,
        entityType: triggerEvent.entityType,
        entityId: triggerEvent.entityId,
        entityData,
        workflowId: workflow.id,
        userId: workflow.createdBy ?? undefined,
      });
      results.push(result);

      // Stop on action failure
      if (!result.success) break;
    }

    // 5. Update workflow run stats
    await supabase
      .from('crm_workflows')
      .update({
        run_count: (workflow.runCount ?? 0) + 1,
        last_run_at: new Date().toISOString(),
      })
      .eq('id', workflow.id);

    // 6. Log execution
    const error = results.find(r => !r.success)?.error ?? null;
    await logExecution(workflow, triggerEvent, true, results, error, startTime);

    return {
      workflowId: workflow.id,
      conditionsMet: true,
      actionsExecuted: results,
      error,
      executionMs: Math.round(performance.now() - startTime),
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown engine error';
    await logExecution(workflow, triggerEvent, false, [], errorMsg, startTime);
    return {
      workflowId: workflow.id,
      conditionsMet: false,
      actionsExecuted: [],
      error: errorMsg,
      executionMs: Math.round(performance.now() - startTime),
    };
  }
}

/**
 * Process all active workflows for an org against a trigger event.
 */
export async function processEvent(event: TriggerEvent): Promise<WorkflowExecutionResult[]> {
  try {
    const { data: workflows, error } = await supabase
      .from('crm_workflows')
      .select('*')
      .eq('org_id', event.orgId)
      .eq('is_active', true)
      .limit(100); // Safety cap to prevent unbounded processing

    if (error) {
      console.warn('[AutomationEngine] Failed to fetch workflows:', error.message);
      return [];
    }
    if (!workflows || workflows.length === 0) return [];

    if (workflows.length === 100) {
      console.warn(`[AutomationEngine] Workflow limit hit for org ${event.orgId} — some workflows may be skipped`);
    }

    const results: WorkflowExecutionResult[] = [];

    for (const row of workflows) {
      const workflow = mapRowToWorkflow(row);
      const result = await evaluateWorkflow(workflow, event);
      results.push(result);
    }

    return results;
  } catch (err) {
    console.warn('[AutomationEngine] processEvent error:', err instanceof Error ? err.message : err);
    return [];
  }
}

// ── Internal helpers ─────────────────────────────────────────

async function fetchEntityData(
  entityType: string,
  entityId: string,
  eventData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const tableMap: Record<string, string> = {
    deal: 'crm_deals',
    contact: 'crm_contacts',
    task: 'crm_tasks',
    communication: 'crm_communications',
  };

  const table = tableMap[entityType];
  if (!table) return eventData;

  try {
    const { data } = await supabase
      .from(table)
      .select('*')
      .eq('id', entityId)
      .single();

    return { ...eventData, ...(data ?? {}) };
  } catch {
    return eventData;
  }
}

async function logExecution(
  workflow: CrmWorkflow,
  event: TriggerEvent,
  conditionsMet: boolean,
  actions: ActionResult[],
  error: string | null,
  startTime: number
): Promise<void> {
  try {
    await supabase.from('crm_workflow_log').insert({
      workflow_id: workflow.id,
      org_id: workflow.orgId,
      trigger_event: {
        type: event.type,
        entityType: event.entityType,
        entityId: event.entityId,
        timestamp: event.timestamp,
      },
      conditions_met: conditionsMet,
      actions_executed: actions.map(a => ({
        type: a.actionType,
        success: a.success,
        details: a.details,
        error: a.error,
      })),
      error,
      execution_ms: Math.round(performance.now() - startTime),
    });
  } catch {
    // Logging failure should not break workflow execution
  }
}

/** Map snake_case DB row to camelCase CrmWorkflow */
function mapRowToWorkflow(row: Record<string, unknown>): CrmWorkflow {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    name: row.name as string,
    nameAr: (row.name_ar as string) ?? null,
    description: (row.description as string) ?? null,
    descriptionAr: (row.description_ar as string) ?? null,
    triggerType: row.trigger_type as CrmWorkflow['triggerType'],
    triggerConfig: (row.trigger_config as Record<string, unknown>) ?? {},
    conditions: (row.conditions as CrmWorkflow['conditions']) ?? [],
    actions: (row.actions as CrmWorkflow['actions']) ?? [],
    isActive: row.is_active as boolean,
    runCount: (row.run_count as number) ?? 0,
    lastRunAt: (row.last_run_at as string) ?? null,
    installedFrom: (row.installed_from as string) ?? null,
    createdBy: (row.created_by as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

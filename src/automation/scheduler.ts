/**
 * Automation Scheduler
 * Called by cron every 5 minutes. Handles:
 * 1. Scheduled triggers (time-based workflows)
 * 2. task_overdue detection
 * 3. no_activity detection
 */

import { supabase } from '@/lib/supabaseClient';
import { processEvent } from './engine';
import type { TriggerEvent } from './triggers';

/**
 * Run all scheduled automation checks across all orgs.
 * Each check type generates TriggerEvents fed to the engine.
 */
export async function runScheduledAutomation(): Promise<{
  processed: number;
  errors: number;
}> {
  let processed = 0;
  let errors = 0;

  try {
    // 1. Check for overdue tasks
    const overdueResults = await checkOverdueTasks();
    processed += overdueResults.processed;
    errors += overdueResults.errors;

    // 2. Check for inactive deals/contacts (no_activity trigger)
    const inactivityResults = await checkInactivity();
    processed += inactivityResults.processed;
    errors += inactivityResults.errors;

    // 3. Fire scheduled triggers (cron-type workflows)
    const scheduledResults = await fireScheduledTriggers();
    processed += scheduledResults.processed;
    errors += scheduledResults.errors;
  } catch {
    errors++;
  }

  return { processed, errors };
}

async function checkOverdueTasks(): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  try {
    const { data: overdueTasks } = await supabase
      .from('crm_tasks')
      .select('id, org_id, assigned_to, title, due_date, related_entity_type, related_entity_id')
      .eq('status', 'pending')
      .lt('due_date', new Date().toISOString())
      .limit(100);

    if (!overdueTasks) return { processed, errors };

    for (const task of overdueTasks) {
      const event: TriggerEvent = {
        type: 'task_overdue',
        orgId: task.org_id,
        entityType: 'task',
        entityId: task.id,
        data: {
          title: task.title,
          dueDate: task.due_date,
          assignedTo: task.assigned_to,
          relatedEntityType: task.related_entity_type,
          relatedEntityId: task.related_entity_id,
        },
        timestamp: new Date().toISOString(),
      };

      try {
        await processEvent(event);
        processed++;
      } catch {
        errors++;
      }
    }
  } catch {
    errors++;
  }

  return { processed, errors };
}

async function checkInactivity(): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  try {
    // Find all no_activity workflows to know what inactivity thresholds to check
    const { data: workflows } = await supabase
      .from('crm_workflows')
      .select('org_id, trigger_config')
      .eq('trigger_type', 'no_activity')
      .eq('is_active', true);

    if (!workflows || workflows.length === 0) return { processed, errors };

    // Group by org to batch queries
    const orgConfigs = new Map<string, number[]>();
    for (const wf of workflows) {
      const days = (wf.trigger_config as Record<string, unknown>)?.days as number;
      if (!days) continue;
      const existing = orgConfigs.get(wf.org_id) ?? [];
      existing.push(days);
      orgConfigs.set(wf.org_id, existing);
    }

    for (const [orgId, dayThresholds] of orgConfigs) {
      const minDays = Math.min(...dayThresholds);
      const cutoff = new Date(Date.now() - minDays * 86400000).toISOString();

      // Find deals with no recent communication
      const { data: staleDealIds } = await supabase.rpc('find_stale_deals', {
        p_org_id: orgId,
        p_cutoff: cutoff,
      });

      // Fallback: if RPC doesn't exist, query directly
      if (!staleDealIds) {
        const { data: deals } = await supabase
          .from('crm_deals')
          .select('id, title, value, assigned_to, updated_at')
          .eq('org_id', orgId)
          .not('status', 'eq', 'won')
          .not('status', 'eq', 'lost')
          .lt('updated_at', cutoff)
          .limit(50);

        if (deals) {
          for (const deal of deals) {
            const event: TriggerEvent = {
              type: 'no_activity',
              orgId,
              entityType: 'deal',
              entityId: deal.id,
              data: {
                title: deal.title,
                value: deal.value,
                assignedTo: deal.assigned_to,
                lastActivityAt: deal.updated_at,
              },
              timestamp: new Date().toISOString(),
            };

            try {
              await processEvent(event);
              processed++;
            } catch {
              errors++;
            }
          }
        }
      }
    }
  } catch {
    errors++;
  }

  return { processed, errors };
}

async function fireScheduledTriggers(): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  try {
    // Find workflows with scheduled triggers
    const { data: workflows } = await supabase
      .from('crm_workflows')
      .select('*')
      .eq('trigger_type', 'scheduled')
      .eq('is_active', true);

    if (!workflows) return { processed, errors };

    const now = new Date();

    for (const wf of workflows) {
      const config = wf.trigger_config as Record<string, unknown>;
      const schedule = config.schedule as string; // e.g. 'daily', 'weekly', 'monthly'
      const lastRun = wf.last_run_at ? new Date(wf.last_run_at as string) : null;

      if (!shouldRunScheduled(schedule, lastRun, now)) continue;

      const event: TriggerEvent = {
        type: 'scheduled',
        orgId: wf.org_id,
        entityType: (config.entityType as string as TriggerEvent['entityType']) ?? 'deal',
        entityId: (config.entityId as string) ?? wf.org_id,
        data: { schedule, triggeredAt: now.toISOString(), workflowId: wf.id },
        timestamp: now.toISOString(),
      };

      try {
        // Scheduled workflows: process directly via the engine
        await processEvent(event);
        processed++;
      } catch {
        errors++;
      }
    }
  } catch {
    errors++;
  }

  return { processed, errors };
}

function shouldRunScheduled(
  schedule: string,
  lastRun: Date | null,
  now: Date
): boolean {
  if (!lastRun) return true;

  const elapsed = now.getTime() - lastRun.getTime();
  const HOUR = 3600000;

  switch (schedule) {
    case 'every_5_minutes':
      return elapsed >= 5 * 60000;
    case 'hourly':
      return elapsed >= HOUR;
    case 'daily':
      return elapsed >= 24 * HOUR;
    case 'weekly':
      return elapsed >= 7 * 24 * HOUR;
    case 'monthly':
      // Compare calendar months to avoid 28-day drift (13 runs/year)
      return lastRun.getMonth() !== now.getMonth() || lastRun.getFullYear() !== now.getFullYear();
    default:
      return elapsed >= 24 * HOUR;
  }
}

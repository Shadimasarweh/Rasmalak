/**
 * Automation: Evaluate Trigger
 * ============================
 * POST endpoint called by Supabase database webhooks when CRM entities change.
 * Receives a trigger event and runs it through all active workflows for the org.
 */

import { NextResponse } from 'next/server';
import { processEvent } from '@/automation/engine';
import type { TriggerEvent } from '@/automation/triggers';
import type { TriggerType } from '@/types/crm';

const VALID_TRIGGER_TYPES: TriggerType[] = [
  'deal_created', 'deal_stage_changed', 'deal_value_changed', 'deal_closed',
  'contact_created', 'contact_updated', 'contact_tagged',
  'task_overdue', 'task_completed',
  'communication_logged', 'no_activity', 'scheduled',
];

export async function POST(request: Request) {
  // Verify webhook secret (Supabase database webhooks send this header)
  const authHeader = request.headers.get('authorization');
  const webhookSecret = process.env.AUTOMATION_WEBHOOK_SECRET || process.env.CRON_SECRET;

  if (authHeader !== `Bearer ${webhookSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const triggerType = body.type as TriggerType;
    if (!triggerType || !VALID_TRIGGER_TYPES.includes(triggerType)) {
      return NextResponse.json({ error: 'Invalid trigger type' }, { status: 400 });
    }

    if (!body.orgId || !body.entityId) {
      return NextResponse.json({ error: 'Missing orgId or entityId' }, { status: 400 });
    }

    const event: TriggerEvent = {
      type: triggerType,
      orgId: body.orgId,
      entityType: body.entityType ?? 'deal',
      entityId: body.entityId,
      data: body.data ?? {},
      previousData: body.previousData,
      timestamp: body.timestamp ?? new Date().toISOString(),
    };

    // Process asynchronously — respond immediately
    const results = await processEvent(event);

    const executed = results.filter(r => r.conditionsMet);
    const failed = results.filter(r => r.error);

    return NextResponse.json({
      ok: true,
      workflowsEvaluated: results.length,
      workflowsExecuted: executed.length,
      errors: failed.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

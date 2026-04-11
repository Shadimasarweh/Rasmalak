/**
 * Automation Trigger Matching
 * Evaluates whether an incoming event matches a workflow's trigger configuration.
 */

import type { TriggerType } from '@/types/crm';

export interface TriggerEvent {
  type: TriggerType;
  orgId: string;
  entityType: 'deal' | 'contact' | 'task' | 'communication';
  entityId: string;
  data: Record<string, unknown>;
  previousData?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Check if a trigger event matches a workflow's trigger type and config.
 * Config fields vary per trigger type — e.g. deal_stage_changed may filter by fromStage/toStage.
 */
export function doesTriggerMatch(
  triggerType: TriggerType,
  triggerConfig: Record<string, unknown>,
  event: TriggerEvent
): boolean {
  if (event.type !== triggerType) return false;

  switch (triggerType) {
    case 'deal_stage_changed':
      return matchDealStageChanged(triggerConfig, event);

    case 'deal_value_changed':
      return matchDealValueChanged(triggerConfig, event);

    case 'deal_closed':
      return matchDealClosed(triggerConfig, event);

    case 'contact_tagged':
      return matchContactTagged(triggerConfig, event);

    case 'no_activity':
      return matchNoActivity(triggerConfig, event);

    case 'scheduled':
      // When scheduler fires a 'scheduled' event, it always matches
      return true;

    // These trigger on any event of the type — no config filtering needed
    case 'deal_created':
    case 'contact_created':
    case 'contact_updated':
    case 'task_overdue':
    case 'task_completed':
    case 'communication_logged':
      return true;

    default:
      return false;
  }
}

function matchDealStageChanged(
  config: Record<string, unknown>,
  event: TriggerEvent
): boolean {
  const { fromStage, toStage } = config;
  const eventFrom = event.previousData?.stageId ?? event.previousData?.stageName;
  const eventTo = event.data.stageId ?? event.data.stageName;

  if (fromStage && fromStage !== eventFrom) return false;
  if (toStage && toStage !== eventTo) return false;
  return true;
}

function matchDealValueChanged(
  config: Record<string, unknown>,
  event: TriggerEvent
): boolean {
  const threshold = config.threshold as number | undefined;
  if (!threshold) return true;

  const oldValue = (event.previousData?.value as number) ?? 0;
  const newValue = (event.data.value as number) ?? 0;
  const changePercent = oldValue > 0
    ? Math.abs((newValue - oldValue) / oldValue) * 100
    : 100;

  return changePercent >= threshold;
}

function matchDealClosed(
  config: Record<string, unknown>,
  event: TriggerEvent
): boolean {
  const outcome = config.outcome as string | undefined;
  if (!outcome) return true;
  return event.data.outcome === outcome; // 'won' or 'lost'
}

function matchContactTagged(
  config: Record<string, unknown>,
  event: TriggerEvent
): boolean {
  const requiredTag = config.tag as string | undefined;
  if (!requiredTag) return true;

  const addedTag = event.data.tag as string | undefined;
  return addedTag === requiredTag;
}

function matchNoActivity(
  config: Record<string, unknown>,
  event: TriggerEvent
): boolean {
  const days = config.days as number | undefined;
  if (!days) return true;

  const lastActivity = event.data.lastActivityAt as string | undefined;
  if (!lastActivity) return true;

  const daysSince = Math.floor(
    (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSince >= days;
}

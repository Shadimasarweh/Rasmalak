/**
 * Preview Builder
 * ===============
 * Fetches external events and shows which match CRM contacts
 * BEFORE any data is stored. User must confirm to start syncing.
 */

import type { IntegrationAdapter, ServiceConnection, UnifiedCalendarEvent } from '@/types/crm';
import { isEventRelevant } from './contactGate';

export interface PrivacyPreview {
  matched: UnifiedCalendarEvent[];
  unmatchedCount: number;
  totalFetched: number;
}

/**
 * Build a preview of what would be synced from an external calendar.
 * Does NOT store anything — preview only.
 */
export async function buildPreview(
  adapter: IntegrationAdapter,
  connection: ServiceConnection,
  since: Date
): Promise<PrivacyPreview> {
  // Fetch recent events from external service
  const events = await adapter.fetchEvents(connection, since);

  const matched: UnifiedCalendarEvent[] = [];
  let unmatchedCount = 0;

  for (const event of events) {
    const result = await isEventRelevant(connection.orgId, event);
    if (result.relevant) {
      matched.push(event);
    } else {
      unmatchedCount++;
    }
  }

  return {
    matched,
    unmatchedCount,
    totalFetched: events.length,
  };
}

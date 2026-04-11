/**
 * Sync Engine
 * ============
 * Core bidirectional sync between external services and CRM entities.
 * Uses contactGate for privacy filtering and event_sync_map for dedup.
 */

import { supabase } from '@/lib/supabaseClient';
import { mapFromDb, mapToDb } from '@/types/crm';
import type { ServiceConnection, UnifiedCalendarEvent, EventSyncMap, SyncResult } from '@/types/crm';
import { createHash } from 'crypto';

/**
 * Hash event data to detect changes for conflict resolution.
 */
function hashEvent(event: UnifiedCalendarEvent): string {
  const relevant = `${event.title}|${event.startTime}|${event.endTime}|${event.description}|${event.location}`;
  return createHash('sha256').update(relevant).digest('hex').substring(0, 16);
}

/**
 * Sync an external event into CRM (create task + communication).
 * Returns the entity ID if created/updated, null if skipped.
 */
export async function syncEventToCRM(
  connection: ServiceConnection,
  event: UnifiedCalendarEvent,
  matchedContactIds: string[]
): Promise<{ action: 'created' | 'updated' | 'skipped'; entityId: string | null }> {
  const orgId = connection.orgId;
  const newHash = hashEvent(event);

  try {
    // Check if this event was already synced
    const { data: existing } = await supabase
      .from('event_sync_map')
      .select('*')
      .eq('connection_id', connection.id)
      .eq('external_event_id', event.externalId)
      .single();

    if (existing) {
      const syncMap = mapFromDb<EventSyncMap>(existing);
      // Skip if unchanged
      if (syncMap.syncHash === newHash) {
        return { action: 'skipped', entityId: syncMap.entityId };
      }

      // Update existing CRM entity
      if (syncMap.entityType === 'task') {
        await supabase.from('crm_tasks').update({
          title: event.title,
          description: event.description,
          due_date: event.startTime,
          updated_at: new Date().toISOString(),
        }).eq('id', syncMap.entityId);
      }

      // Update sync hash
      await supabase.from('event_sync_map').update({
        sync_hash: newHash,
        last_synced_at: new Date().toISOString(),
      }).eq('id', syncMap.id);

      return { action: 'updated', entityId: syncMap.entityId };
    }

    // Create new CRM entity based on event type
    let entityType: string;
    let entityId: string;

    if (event.type === 'meeting' || event.type === 'call') {
      // Create as task (meeting/call to attend)
      const { data: task, error } = await supabase.from('crm_tasks').insert({
        org_id: orgId,
        title: event.title,
        description: event.description,
        type: event.type === 'meeting' ? 'meeting' : 'call',
        status: 'pending',
        due_date: event.startTime,
        contact_id: matchedContactIds[0] || null,
        created_by: connection.userId,
      }).select().single();

      if (error || !task) return { action: 'skipped', entityId: null };
      entityType = 'task';
      entityId = task.id;

      // Also log as communication if it has already occurred
      if (new Date(event.startTime) < new Date()) {
        await supabase.from('crm_communications').insert({
          org_id: orgId,
          contact_id: matchedContactIds[0] || null,
          type: event.type === 'meeting' ? 'meeting' : 'call',
          subject: event.title,
          body: event.description,
          occurred_at: event.startTime,
          duration_mins: event.duration,
          logged_by: connection.userId,
        });
      }
    } else {
      // Email messages → communication only
      const { data: comm, error } = await supabase.from('crm_communications').insert({
        org_id: orgId,
        contact_id: matchedContactIds[0] || null,
        type: 'email',
        direction: event.rawPayload?.direction as string || 'inbound',
        subject: event.title,
        body: event.description,
        occurred_at: event.startTime,
        logged_by: connection.userId,
      }).select().single();

      if (error || !comm) return { action: 'skipped', entityId: null };
      entityType = 'communication';
      entityId = comm.id;
    }

    // Record in sync map
    await supabase.from('event_sync_map').insert({
      connection_id: connection.id,
      external_event_id: event.externalId,
      entity_type: entityType,
      entity_id: entityId,
      sync_hash: newHash,
    });

    return { action: 'created', entityId };
  } catch (err) {
    console.warn('[SyncEngine] Error syncing event:', err);
    return { action: 'skipped', entityId: null };
  }
}

/**
 * Batch sync multiple events. Returns summary stats.
 */
export async function batchSync(
  connection: ServiceConnection,
  events: UnifiedCalendarEvent[],
  contactMatchFn: (event: UnifiedCalendarEvent) => Promise<string[]>
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: 0 };

  for (const event of events) {
    try {
      const matchedContacts = await contactMatchFn(event);
      const { action } = await syncEventToCRM(connection, event, matchedContacts);
      result[action === 'created' ? 'created' : action === 'updated' ? 'updated' : 'skipped']++;
    } catch {
      result.errors++;
    }
  }

  return result;
}

/**
 * Contact Gate
 * ============
 * Checks if external events are relevant to CRM contacts.
 * Calendar: only sync events where attendees match contacts.
 * Email: sync all, but return matched contacts for auto-linking.
 */

import { supabase } from '@/lib/supabaseClient';
import { mapFromDb } from '@/types/crm';
import type { CrmContact, UnifiedCalendarEvent } from '@/types/crm';

export interface ContactGateResult {
  relevant: boolean;
  matchedContacts: CrmContact[];
}

/**
 * Check if an event is relevant to the org's contacts.
 * An event is relevant if any attendee email matches a CRM contact's email.
 */
export async function isEventRelevant(
  orgId: string,
  event: UnifiedCalendarEvent
): Promise<ContactGateResult> {
  const attendeeEmails = [
    ...(event.organizer ? [event.organizer.email] : []),
    ...event.attendees.map(a => a.email),
  ].filter(Boolean).map(e => e.toLowerCase());

  if (attendeeEmails.length === 0) {
    return { relevant: false, matchedContacts: [] };
  }

  try {
    const { data, error } = await supabase
      .from('crm_contacts')
      .select('*')
      .eq('org_id', orgId)
      .in('email', attendeeEmails);

    if (error || !data || data.length === 0) {
      return { relevant: false, matchedContacts: [] };
    }

    return {
      relevant: true,
      matchedContacts: data.map(r => mapFromDb<CrmContact>(r)),
    };
  } catch {
    return { relevant: false, matchedContacts: [] };
  }
}

/**
 * Get matched contact IDs for an event's attendees.
 * Utility for syncEngine to get contact links without full gate check.
 */
export async function getMatchedContactIds(
  orgId: string,
  event: UnifiedCalendarEvent
): Promise<string[]> {
  const result = await isEventRelevant(orgId, event);
  return result.matchedContacts.map(c => c.id);
}

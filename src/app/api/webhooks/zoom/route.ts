/**
 * Zoom Webhook Handler
 * ====================
 * Handles meeting.ended events to auto-log meetings to CRM contacts.
 * Verifies Zoom webhook secret, responds 200 immediately.
 */

import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  const body = await request.text();
  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Zoom endpoint URL validation (setup requirement)
  if (payload.event === 'endpoint.url_validation') {
    const plainToken = (payload.payload as Record<string, unknown>)?.plainToken as string;
    const secret = process.env.ZOOM_WEBHOOK_SECRET || '';
    const hashForValidation = createHmac('sha256', secret).update(plainToken).digest('hex');
    return NextResponse.json({ plainToken, encryptedToken: hashForValidation });
  }

  // Verify signature for other events
  const timestamp = request.headers.get('x-zm-request-timestamp') || '';
  const signature = request.headers.get('x-zm-signature') || '';
  const secret = process.env.ZOOM_WEBHOOK_SECRET || '';

  if (secret && signature) {
    const message = `v0:${timestamp}:${body}`;
    const hash = createHmac('sha256', secret).update(message).digest('hex');
    const expected = `v0=${hash}`;
    if (signature !== expected) {
      console.warn('[Zoom Webhook] Signature mismatch');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  // Process meeting.ended events
  try {
    if (payload.event === 'meeting.ended') {
      const meetingPayload = (payload.payload as Record<string, unknown>)?.object as Record<string, unknown>;
      if (meetingPayload) {
        const topic = (meetingPayload.topic as string) || 'Zoom Meeting';
        const startTime = meetingPayload.start_time as string;
        const endTime = meetingPayload.end_time as string;
        const duration = meetingPayload.duration as number;
        const participants = (meetingPayload.participants as Array<{ email?: string; name?: string }>) || [];

        // Match participant emails against CRM contacts
        const participantEmails = participants
          .map(p => p.email?.toLowerCase())
          .filter(Boolean) as string[];

        if (participantEmails.length > 0) {
          // Find matching contacts across all orgs (RLS will scope properly)
          const { data: contacts } = await supabase
            .from('crm_contacts')
            .select('id, org_id')
            .in('email', participantEmails)
            .limit(10);

          if (contacts && contacts.length > 0) {
            // Auto-log communication for each matched contact
            for (const contact of contacts) {
              await supabase.from('crm_communications').insert({
                org_id: contact.org_id,
                contact_id: contact.id,
                type: 'meeting',
                subject: topic,
                occurred_at: startTime,
                duration_mins: duration || null,
                outcome: 'connected',
                logged_by: contact.org_id, // Will be resolved to connection owner
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Zoom Webhook] Processing error:', err);
  }

  return NextResponse.json({ received: true });
}

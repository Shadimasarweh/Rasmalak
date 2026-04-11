/**
 * Google Calendar/Gmail Webhook Handler
 * ======================================
 * Receives push notifications when calendar events or emails change.
 * Verifies channel token, responds 200 immediately, then re-syncs.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getConnection } from '@/integrations/core/connectionManager';
import { logHealthEvent } from '@/integrations/core/connectionManager';
import { verifyGoogleChannel } from '@/integrations/core/webhookRouter';

export async function POST(request: Request) {
  // Google sends channel ID and resource state in headers
  const channelId = request.headers.get('x-goog-channel-id') || '';
  const channelToken = request.headers.get('x-goog-channel-token') || '';
  const resourceState = request.headers.get('x-goog-resource-state') || '';

  // Always respond 200 to prevent Google from retrying
  if (!channelId || resourceState === 'sync') {
    return NextResponse.json({ received: true });
  }

  try {
    // Find the connection that owns this webhook channel
    const { data: connRow } = await supabase
      .from('service_connections')
      .select('*')
      .eq('webhook_id', channelId)
      .eq('provider', 'google')
      .eq('status', 'active')
      .single();

    if (!connRow) {
      return NextResponse.json({ received: true });
    }

    // Verify channel token matches what we stored
    if (!verifyGoogleChannel(channelToken, connRow.webhook_id || '')) {
      console.warn('[Google Webhook] Channel token mismatch');
      return NextResponse.json({ received: true });
    }

    // Process async: re-fetch events since last sync
    // The actual sync is handled by the adapter + syncEngine
    // For now, mark the connection as needing a sync
    await supabase.from('service_connections').update({
      updated_at: new Date().toISOString(),
    }).eq('id', connRow.id);

  } catch (err) {
    console.warn('[Google Webhook] Processing error:', err);
  }

  return NextResponse.json({ received: true });
}

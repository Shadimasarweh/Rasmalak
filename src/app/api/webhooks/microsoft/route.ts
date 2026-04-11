/**
 * Microsoft Graph Webhook Handler
 * ================================
 * Handles subscription validation and change notifications
 * for Outlook Calendar, Email, and Teams.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  const url = new URL(request.url);

  // Microsoft subscription validation: return validationToken as text/plain
  const validationToken = url.searchParams.get('validationToken');
  if (validationToken) {
    return new Response(validationToken, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  try {
    const body = await request.json();
    const notifications = body?.value as Array<{
      subscriptionId: string;
      clientState: string;
      changeType: string;
      resource: string;
      resourceData?: Record<string, unknown>;
    }>;

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ received: true });
    }

    for (const notification of notifications) {
      // Find connection by webhook_id (subscription ID)
      const { data: connRow } = await supabase
        .from('service_connections')
        .select('id, org_id')
        .eq('webhook_id', notification.subscriptionId)
        .eq('provider', 'microsoft')
        .eq('status', 'active')
        .single();

      if (!connRow) continue;

      // Mark connection as needing sync
      await supabase.from('service_connections').update({
        updated_at: new Date().toISOString(),
      }).eq('id', connRow.id);
    }
  } catch (err) {
    console.warn('[Microsoft Webhook] Processing error:', err);
  }

  return NextResponse.json({ received: true });
}

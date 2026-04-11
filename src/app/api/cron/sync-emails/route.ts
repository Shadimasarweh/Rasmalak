/**
 * Cron: Sync Emails
 * =================
 * Runs every 5 minutes. Fetches new emails for all active email connections.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getConnection, updateSyncStatus } from '@/integrations/core/connectionManager';
import { batchSync } from '@/integrations/core/syncEngine';
import { getMatchedContactIds } from '@/integrations/privacy/contactGate';
import { gmailAdapter } from '@/integrations/adapters/gmail';
import { outlookAdapter } from '@/integrations/adapters/outlook';
import type { IntegrationAdapter, UnifiedCalendarEvent } from '@/types/crm';

const ADAPTERS: Record<string, IntegrationAdapter> = {
  'google:email': gmailAdapter,
  'microsoft:email': outlookAdapter,
};

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let synced = 0;
  let errors = 0;

  try {
    const { data: connections } = await supabase
      .from('service_connections')
      .select('id, provider, service_type, org_id')
      .eq('status', 'active')
      .in('service_type', ['email']);

    if (!connections) return NextResponse.json({ ok: true, synced: 0 });

    for (const row of connections) {
      try {
        const adapterKey = `${row.provider}:${row.service_type}`;
        const adapter = ADAPTERS[adapterKey];
        if (!adapter) continue;

        const conn = await getConnection(row.id);
        if (!conn) continue;

        const since = conn.lastSyncAt ? new Date(conn.lastSyncAt) : new Date(Date.now() - 24 * 60 * 60 * 1000);
        const events = await adapter.fetchEvents(conn, since);

        const result = await batchSync(conn, events, async (event: UnifiedCalendarEvent) => {
          return getMatchedContactIds(conn.orgId, event);
        });

        await updateSyncStatus(conn.id, { ...result, lastRun: new Date().toISOString() });
        synced += result.created + result.updated;
      } catch (err) {
        console.warn(`[Cron] Email sync error for ${row.id}:`, err);
        errors++;
      }
    }
  } catch (err) {
    console.warn('[Cron] Email sync batch error:', err);
  }

  return NextResponse.json({ ok: true, synced, errors });
}

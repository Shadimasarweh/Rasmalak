/**
 * Cron: Renew Expiring Webhooks
 * ==============================
 * Runs daily at 3AM. Renews webhooks expiring within 24 hours.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getConnection, logHealthEvent } from '@/integrations/core/connectionManager';
import { googleCalendarAdapter } from '@/integrations/adapters/googleCalendar';
import { microsoftCalendarAdapter } from '@/integrations/adapters/microsoftCalendar';
import type { IntegrationAdapter } from '@/types/crm';

const ADAPTERS: Record<string, IntegrationAdapter> = {
  'google:calendar': googleCalendarAdapter,
  'microsoft:calendar': microsoftCalendarAdapter,
};

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  let renewed = 0;
  let failed = 0;

  try {
    const { data: connections } = await supabase
      .from('service_connections')
      .select('id, provider, service_type, org_id')
      .eq('status', 'active')
      .not('webhook_id', 'is', null)
      .lt('webhook_expires', cutoff);

    if (!connections) return NextResponse.json({ ok: true, renewed: 0 });

    for (const row of connections) {
      try {
        const adapterKey = `${row.provider}:${row.service_type}`;
        const adapter = ADAPTERS[adapterKey];
        if (!adapter) continue;

        const conn = await getConnection(row.id);
        if (!conn) continue;

        await adapter.renewWebhook(conn);
        renewed++;
      } catch (err) {
        console.warn(`[Cron] Webhook renewal failed for ${row.id}:`, err);
        await logHealthEvent(row.org_id, row.id, 'webhook_renewal_failed', 'warning', `Webhook renewal failed: ${err}`);
        failed++;
      }
    }
  } catch (err) {
    console.warn('[Cron] Webhook renewal batch error:', err);
  }

  return NextResponse.json({ ok: true, renewed, failed });
}

/**
 * Cron: Health Check
 * ==================
 * Runs every 6 hours. Tests each active connection with a lightweight API call.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getConnection, updateStatus, logHealthEvent } from '@/integrations/core/connectionManager';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let healthy = 0;
  let unhealthy = 0;

  try {
    const { data: connections } = await supabase
      .from('service_connections')
      .select('id, provider, service_type, org_id')
      .eq('status', 'active');

    if (!connections) return NextResponse.json({ ok: true, healthy: 0 });

    for (const row of connections) {
      try {
        const conn = await getConnection(row.id);
        if (!conn) continue;

        const isHealthy = await testConnection(conn.provider, conn.accessToken);

        if (isHealthy) {
          healthy++;
        } else {
          await updateStatus(conn.id, 'error', 'Health check failed — API not responding');
          await logHealthEvent(row.org_id, conn.id, 'health_check_failed', 'warning', 'Connection health check failed');
          unhealthy++;
        }
      } catch {
        unhealthy++;
      }
    }
  } catch (err) {
    console.warn('[Cron] Health check batch error:', err);
  }

  return NextResponse.json({ ok: true, healthy, unhealthy });
}

/** Lightweight API test per provider */
async function testConnection(provider: string, accessToken: string): Promise<boolean> {
  const endpoints: Record<string, string> = {
    google: 'https://www.googleapis.com/oauth2/v1/tokeninfo',
    microsoft: 'https://graph.microsoft.com/v1.0/me',
    zoom: 'https://api.zoom.us/v2/users/me',
  };

  const url = endpoints[provider];
  if (!url) return true; // Slack doesn't need health checks (no expiring tokens)

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

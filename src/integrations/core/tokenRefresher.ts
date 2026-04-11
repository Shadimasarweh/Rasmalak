/**
 * Token Refresher
 * ===============
 * Finds connections with tokens expiring within 2 hours and refreshes them.
 * Called by cron job (/api/cron/refresh-tokens).
 */

import { supabase } from '@/lib/supabaseClient';
import { mapFromDb } from '@/types/crm';
import type { ServiceConnection } from '@/types/crm';
import { getConnection, updateTokens, updateStatus, logHealthEvent } from './connectionManager';

const REFRESH_WINDOW_HOURS = 2;

/** Provider-specific refresh endpoints */
const REFRESH_URLS: Record<string, string> = {
  google: 'https://oauth2.googleapis.com/token',
  microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
};

/**
 * Find all connections with tokens expiring soon and refresh them.
 */
export async function refreshExpiring(): Promise<{ refreshed: number; failed: number }> {
  const cutoff = new Date(Date.now() + REFRESH_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  let refreshed = 0;
  let failed = 0;

  try {
    const { data: rows } = await supabase
      .from('service_connections')
      .select('id, org_id, provider')
      .eq('status', 'active')
      .not('refresh_token', 'is', null)
      .lt('token_expires_at', cutoff);

    if (!rows || rows.length === 0) return { refreshed: 0, failed: 0 };

    for (const row of rows) {
      try {
        const conn = await getConnection(row.id);
        if (!conn || !conn.refreshToken) continue;

        const result = await refreshToken(conn);
        if (result) {
          await updateTokens(conn.id, {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken || conn.refreshToken,
            expiresAt: result.expiresAt,
            scopes: conn.scopes,
          });
          refreshed++;
        } else {
          await updateStatus(conn.id, 'token_expired', 'Token refresh failed');
          await logHealthEvent(row.org_id, conn.id, 'token_refresh_failed', 'error', 'Failed to refresh OAuth token');
          failed++;
        }
      } catch (err) {
        console.warn(`[TokenRefresher] Error refreshing ${row.id}:`, err);
        failed++;
      }
    }
  } catch (err) {
    console.warn('[TokenRefresher] Error finding expiring tokens:', err);
  }

  return { refreshed, failed };
}

/**
 * Refresh a single token using provider-specific endpoint.
 */
async function refreshToken(
  conn: ServiceConnection
): Promise<{ accessToken: string; refreshToken?: string; expiresAt: Date } | null> {
  const url = REFRESH_URLS[conn.provider];
  if (!url || !conn.refreshToken) return null;

  const params: Record<string, string> = {
    grant_type: 'refresh_token',
    refresh_token: conn.refreshToken,
  };

  if (conn.provider === 'google') {
    params.client_id = process.env.GOOGLE_CLIENT_ID || '';
    params.client_secret = process.env.GOOGLE_CLIENT_SECRET || '';
  } else if (conn.provider === 'microsoft') {
    params.client_id = process.env.MICROSOFT_CLIENT_ID || '';
    params.client_secret = process.env.MICROSOFT_CLIENT_SECRET || '';
    params.scope = conn.scopes.join(' ');
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });

    if (!response.ok) {
      console.warn(`[TokenRefresher] Provider returned ${response.status} for ${conn.provider}`);
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || undefined,
      expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
    };
  } catch (err) {
    console.warn(`[TokenRefresher] Network error refreshing ${conn.provider}:`, err);
    return null;
  }
}

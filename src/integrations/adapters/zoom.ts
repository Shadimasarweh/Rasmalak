/**
 * Zoom Adapter
 * ============
 * Auto-logs completed Zoom meetings to CRM contacts.
 * Meeting ended events come via webhook (handled in webhook route).
 * This adapter provides the OAuth flow and event fetching.
 */

import type { IntegrationAdapter, ServiceConnection, UnifiedCalendarEvent, OAuthState } from '@/types/crm';
import { createConnection } from '@/integrations/core/connectionManager';

const AUTH_URL = 'https://zoom.us/oauth';
const API_URL = 'https://api.zoom.us/v2';

export const zoomAdapter: IntegrationAdapter = {
  provider: 'zoom',
  serviceType: 'zoom',

  async connect(userId: string, orgId: string): Promise<string> {
    const state: OAuthState = { provider: 'zoom', serviceType: 'zoom', userId, orgId };
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.ZOOM_CLIENT_ID || '',
      redirect_uri: process.env.ZOOM_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || 'https://crm.rasmalak.com/api/integrations/callback',
      state: JSON.stringify(state),
    });
    return `${AUTH_URL}/authorize?${params}`;
  },

  async handleCallback(code: string, stateStr: string): Promise<ServiceConnection> {
    const state: OAuthState = JSON.parse(stateStr);
    const credentials = Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64');

    const tokenRes = await fetch(`${AUTH_URL}/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, grant_type: 'authorization_code', redirect_uri: process.env.ZOOM_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || '' }),
    });

    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);
    const tokens = await tokenRes.json();

    // Get user info
    const userRes = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = userRes.ok ? await userRes.json() : {};

    const conn = await createConnection({
      orgId: state.orgId, userId: state.userId,
      provider: 'zoom', serviceType: 'zoom',
      tokens: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        scopes: (tokens.scope || '').split(' '),
      },
      connectedEmail: userInfo.email || undefined,
    });

    if (!conn) throw new Error('Failed to create connection');
    return conn;
  },

  async disconnect(): Promise<void> {},

  async fetchEvents(connection: ServiceConnection, since: Date): Promise<UnifiedCalendarEvent[]> {
    const fromDate = since.toISOString().split('T')[0];
    const url = `${API_URL}/users/me/meetings?type=previous_meetings&from=${fromDate}&page_size=50`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${connection.accessToken}` },
    });
    if (!res.ok) return [];

    const data = await res.json();
    return (data.meetings || []).map((m: Record<string, unknown>) => ({
      externalId: String(m.id || m.uuid),
      provider: 'zoom',
      type: 'meeting' as const,
      title: (m.topic as string) || 'Zoom Meeting',
      description: (m.agenda as string) || null,
      startTime: (m.start_time as string) || new Date().toISOString(),
      endTime: (m.end_time as string) || null,
      duration: (m.duration as number) || null,
      location: null,
      videoLink: (m.join_url as string) || null,
      organizer: connection.connectedEmail ? { email: connection.connectedEmail, name: '' } : null,
      attendees: [],
      isRecurring: (m.type as number) === 8,
      rawPayload: m,
    }));
  },

  async pushEvent(): Promise<string> { throw new Error('Zoom meetings are created via Zoom, not CRM'); },
  async updateEvent(): Promise<void> {},
  async deleteEvent(): Promise<void> {},
  async registerWebhook(): Promise<{ webhookId: string; expires: Date }> {
    // Zoom webhooks configured in Zoom Marketplace app settings, not via API
    return { webhookId: 'app-level', expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) };
  },
  async renewWebhook(): Promise<{ webhookId: string; expires: Date }> {
    return { webhookId: 'app-level', expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) };
  },
};

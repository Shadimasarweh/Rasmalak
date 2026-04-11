/**
 * Microsoft Teams Adapter
 * =======================
 * Captures ad-hoc Teams calls (not scheduled meetings — those come via Calendar).
 * Requires CallRecords.Read.All (application-level, admin consent).
 */

import type { IntegrationAdapter, ServiceConnection, UnifiedCalendarEvent, OAuthState } from '@/types/crm';
import { createConnection } from '@/integrations/core/connectionManager';

const SCOPES = 'CallRecords.Read.All offline_access User.Read';
const GRAPH_URL = 'https://graph.microsoft.com/v1.0';
const TENANT = process.env.MICROSOFT_TENANT_ID || 'common';
const AUTH_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0`;

async function graphFetch(url: string, accessToken: string): Promise<Response> {
  return fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } });
}

export const microsoftTeamsAdapter: IntegrationAdapter = {
  provider: 'microsoft',
  serviceType: 'teams',

  async connect(userId: string, orgId: string): Promise<string> {
    const state: OAuthState = { provider: 'microsoft', serviceType: 'teams', userId, orgId };
    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID || '',
      response_type: 'code',
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI || '',
      scope: SCOPES,
      state: JSON.stringify(state),
      prompt: 'admin_consent',
    });
    return `${AUTH_URL}/authorize?${params}`;
  },

  async handleCallback(code: string, stateStr: string): Promise<ServiceConnection> {
    const state: OAuthState = JSON.parse(stateStr);
    const tokenRes = await fetch(`${AUTH_URL}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: process.env.MICROSOFT_CLIENT_ID || '',
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI || '',
        grant_type: 'authorization_code', scope: SCOPES,
      }),
    });

    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);
    const tokens = await tokenRes.json();

    const conn = await createConnection({
      orgId: state.orgId, userId: state.userId,
      provider: 'microsoft', serviceType: 'teams',
      tokens: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        scopes: SCOPES.split(' '),
      },
    });

    if (!conn) throw new Error('Failed to create connection');
    return conn;
  },

  async disconnect(): Promise<void> {},

  async fetchEvents(connection: ServiceConnection, since: Date): Promise<UnifiedCalendarEvent[]> {
    const filter = `startDateTime ge ${since.toISOString()}`;
    const url = `${GRAPH_URL}/communications/callRecords?$filter=${encodeURIComponent(filter)}&$top=50`;
    const res = await graphFetch(url, connection.accessToken);
    if (!res.ok) return [];

    const data = await res.json();
    return (data.value || []).map((record: Record<string, unknown>) => {
      const participants = ((record.participants || []) as Array<{ user?: { displayName: string }; identity?: { user?: { displayName: string } } }>)
        .map(p => ({ email: '', name: p.user?.displayName || p.identity?.user?.displayName || 'Unknown' }));

      const startTime = record.startDateTime as string;
      const endTime = record.endDateTime as string;
      const startMs = new Date(startTime).getTime();
      const endMs = new Date(endTime).getTime();

      return {
        externalId: record.id as string,
        provider: 'microsoft',
        type: (record.type === 'groupCall' ? 'meeting' : 'call') as 'meeting' | 'call',
        title: `Teams ${record.type === 'groupCall' ? 'Meeting' : 'Call'}`,
        description: null,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration: Math.round((endMs - startMs) / 60000),
        location: null,
        videoLink: (record.joinWebUrl as string) || null,
        organizer: participants[0] ? { email: '', name: participants[0].name } : null,
        attendees: participants,
        isRecurring: false,
        rawPayload: record,
      } satisfies UnifiedCalendarEvent;
    });
  },

  async pushEvent(): Promise<string> { throw new Error('Teams calls cannot be pushed from CRM'); },
  async updateEvent(): Promise<void> { /* Not applicable */ },
  async deleteEvent(): Promise<void> { /* Not applicable */ },
  async registerWebhook(): Promise<{ webhookId: string; expires: Date }> {
    return { webhookId: '', expires: new Date() };
  },
  async renewWebhook(): Promise<{ webhookId: string; expires: Date }> {
    return { webhookId: '', expires: new Date() };
  },
};

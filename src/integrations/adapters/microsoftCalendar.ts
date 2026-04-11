/**
 * Microsoft Calendar Adapter (Outlook Calendar via Graph API)
 * ===========================================================
 * Implements IntegrationAdapter using Microsoft Graph v1.0.
 * Subscriptions have max 3-day lifetime and must be renewed.
 */

import type { IntegrationAdapter, ServiceConnection, UnifiedCalendarEvent, OAuthState } from '@/types/crm';
import { createConnection, updateWebhook } from '@/integrations/core/connectionManager';

const SCOPES = 'Calendars.ReadWrite offline_access User.Read';
const GRAPH_URL = 'https://graph.microsoft.com/v1.0';
const TENANT = process.env.MICROSOFT_TENANT_ID || 'common';
const AUTH_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0`;

async function graphFetch(url: string, accessToken: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...options.headers },
  });
  if (res.status === 401) throw new Error('TOKEN_EXPIRED');
  return res;
}

export const microsoftCalendarAdapter: IntegrationAdapter = {
  provider: 'microsoft',
  serviceType: 'calendar',

  async connect(userId: string, orgId: string): Promise<string> {
    const state: OAuthState = { provider: 'microsoft', serviceType: 'calendar', userId, orgId };
    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID || '',
      response_type: 'code',
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI || '',
      scope: SCOPES,
      state: JSON.stringify(state),
      prompt: 'consent',
    });
    return `${AUTH_URL}/authorize?${params}`;
  },

  async handleCallback(code: string, stateStr: string): Promise<ServiceConnection> {
    const state: OAuthState = JSON.parse(stateStr);

    const tokenRes = await fetch(`${AUTH_URL}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.MICROSOFT_CLIENT_ID || '',
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI || '',
        grant_type: 'authorization_code',
        scope: SCOPES,
      }),
    });

    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);
    const tokens = await tokenRes.json();

    const profileRes = await graphFetch(`${GRAPH_URL}/me`, tokens.access_token);
    const profile = profileRes.ok ? await profileRes.json() : {};

    const conn = await createConnection({
      orgId: state.orgId,
      userId: state.userId,
      provider: 'microsoft',
      serviceType: 'calendar',
      tokens: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        scopes: SCOPES.split(' '),
      },
      connectedEmail: profile.mail || profile.userPrincipalName || undefined,
    });

    if (!conn) throw new Error('Failed to create connection');
    return conn;
  },

  async disconnect(): Promise<void> { /* connectionManager handles cleanup */ },

  async fetchEvents(connection: ServiceConnection, since: Date): Promise<UnifiedCalendarEvent[]> {
    const filter = `start/dateTime ge '${since.toISOString()}'`;
    const url = `${GRAPH_URL}/me/events?$filter=${encodeURIComponent(filter)}&$top=250&$orderby=start/dateTime`;
    const res = await graphFetch(url, connection.accessToken);
    if (!res.ok) return [];

    const data = await res.json();
    return (data.value || []).map((item: Record<string, unknown>) => {
      const start = (item.start as Record<string, string>)?.dateTime;
      const end = (item.end as Record<string, string>)?.dateTime;
      const startMs = start ? new Date(start).getTime() : Date.now();
      const endMs = end ? new Date(end).getTime() : startMs;

      const attendees = ((item.attendees || []) as Array<{ emailAddress: { address: string; name: string }; status?: { response: string } }>)
        .map(a => ({ email: a.emailAddress.address, name: a.emailAddress.name, rsvp: a.status?.response }));

      return {
        externalId: item.id as string,
        provider: 'microsoft',
        type: (item.isOnlineMeeting ? 'meeting' : 'meeting') as 'meeting',
        title: (item.subject as string) || 'No title',
        description: (item.bodyPreview as string) || null,
        startTime: start ? new Date(start).toISOString() : new Date().toISOString(),
        endTime: end ? new Date(end).toISOString() : null,
        duration: Math.round((endMs - startMs) / 60000) || null,
        location: (item.location as Record<string, string>)?.displayName || null,
        videoLink: (item.onlineMeeting as Record<string, string>)?.joinUrl || null,
        organizer: (item.organizer as Record<string, Record<string, string>>)?.emailAddress
          ? { email: (item.organizer as Record<string, Record<string, string>>).emailAddress.address, name: (item.organizer as Record<string, Record<string, string>>).emailAddress.name }
          : null,
        attendees,
        isRecurring: !!(item.seriesMasterId),
        rawPayload: item,
      } satisfies UnifiedCalendarEvent;
    });
  },

  async pushEvent(connection: ServiceConnection, event: UnifiedCalendarEvent): Promise<string> {
    const msEvent = {
      subject: event.title,
      body: { contentType: 'text', content: event.description || '' },
      start: { dateTime: event.startTime, timeZone: 'UTC' },
      end: { dateTime: event.endTime || event.startTime, timeZone: 'UTC' },
      location: event.location ? { displayName: event.location } : undefined,
      attendees: event.attendees.map(a => ({ emailAddress: { address: a.email, name: a.name }, type: 'required' })),
    };

    const res = await graphFetch(`${GRAPH_URL}/me/events`, connection.accessToken, {
      method: 'POST',
      body: JSON.stringify(msEvent),
    });
    if (!res.ok) throw new Error(`Push failed: ${res.status}`);
    const created = await res.json();
    return created.id;
  },

  async updateEvent(connection: ServiceConnection, externalId: string, event: Partial<UnifiedCalendarEvent>): Promise<void> {
    const patch: Record<string, unknown> = {};
    if (event.title) patch.subject = event.title;
    if (event.description !== undefined) patch.body = { contentType: 'text', content: event.description || '' };
    if (event.startTime) patch.start = { dateTime: event.startTime, timeZone: 'UTC' };
    if (event.endTime) patch.end = { dateTime: event.endTime, timeZone: 'UTC' };

    await graphFetch(`${GRAPH_URL}/me/events/${externalId}`, connection.accessToken, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  async deleteEvent(connection: ServiceConnection, externalId: string): Promise<void> {
    await graphFetch(`${GRAPH_URL}/me/events/${externalId}`, connection.accessToken, { method: 'DELETE' });
  },

  async registerWebhook(connection: ServiceConnection): Promise<{ webhookId: string; expires: Date }> {
    const expires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 - 60000); // ~3 days minus 1 min buffer
    const clientState = crypto.randomUUID();

    const res = await graphFetch(`${GRAPH_URL}/subscriptions`, connection.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        changeType: 'created,updated,deleted',
        notificationUrl: 'https://crm.rasmalak.com/api/webhooks/microsoft',
        resource: '/me/events',
        expirationDateTime: expires.toISOString(),
        clientState,
      }),
    });

    if (!res.ok) throw new Error(`Subscription creation failed: ${res.status}`);
    const sub = await res.json();
    await updateWebhook(connection.id, sub.id, expires);
    return { webhookId: sub.id, expires };
  },

  async renewWebhook(connection: ServiceConnection): Promise<{ webhookId: string; expires: Date }> {
    if (!connection.webhookId) return this.registerWebhook(connection);

    const newExpires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 - 60000);

    const res = await graphFetch(`${GRAPH_URL}/subscriptions/${connection.webhookId}`, connection.accessToken, {
      method: 'PATCH',
      body: JSON.stringify({ expirationDateTime: newExpires.toISOString() }),
    });

    if (!res.ok) {
      // Subscription may have expired — re-register
      return this.registerWebhook(connection);
    }

    await updateWebhook(connection.id, connection.webhookId, newExpires);
    return { webhookId: connection.webhookId, expires: newExpires };
  },
};

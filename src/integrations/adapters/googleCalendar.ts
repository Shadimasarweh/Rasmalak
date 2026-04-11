/**
 * Google Calendar Adapter
 * =======================
 * Implements IntegrationAdapter for Google Calendar API v3.
 * OAuth2 with offline access for token refresh.
 */

import type { IntegrationAdapter, ServiceConnection, UnifiedCalendarEvent } from '@/types/crm';
import { createConnection, updateWebhook, logHealthEvent } from '@/integrations/core/connectionManager';
import { encrypt } from '@/integrations/core/encryption';
import type { OAuthState } from '@/types/crm';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
const BASE_URL = 'https://www.googleapis.com/calendar/v3';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

async function googleFetch(url: string, accessToken: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...options.headers },
  });
  if (res.status === 401) throw new Error('TOKEN_EXPIRED');
  if (res.status === 429) throw new Error('RATE_LIMITED');
  return res;
}

export const googleCalendarAdapter: IntegrationAdapter = {
  provider: 'google',
  serviceType: 'calendar',

  async connect(userId: string, orgId: string): Promise<string> {
    const state: OAuthState = { provider: 'google', serviceType: 'calendar', userId, orgId };
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || '',
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: JSON.stringify(state),
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  },

  async handleCallback(code: string, stateStr: string): Promise<ServiceConnection> {
    const state: OAuthState = JSON.parse(stateStr);

    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || '',
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);
    const tokens = await tokenRes.json();

    // Get user's email for display
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = profileRes.ok ? await profileRes.json() : {};

    const conn = await createConnection({
      orgId: state.orgId,
      userId: state.userId,
      provider: 'google',
      serviceType: 'calendar',
      tokens: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        scopes: SCOPES,
      },
      connectedEmail: profile.email || undefined,
    });

    if (!conn) throw new Error('Failed to create connection');
    return conn;
  },

  async disconnect(connectionId: string): Promise<void> {
    // Token revocation handled by connectionManager.deleteConnection
  },

  async fetchEvents(connection: ServiceConnection, since: Date): Promise<UnifiedCalendarEvent[]> {
    const url = `${BASE_URL}/calendars/primary/events?timeMin=${since.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=250`;
    const res = await googleFetch(url, connection.accessToken);
    if (!res.ok) return [];

    const data = await res.json();
    const events: UnifiedCalendarEvent[] = [];

    for (const item of (data.items || [])) {
      if (item.status === 'cancelled') continue;

      const start = item.start?.dateTime || item.start?.date;
      const end = item.end?.dateTime || item.end?.date;
      if (!start) continue;

      const startMs = new Date(start).getTime();
      const endMs = end ? new Date(end).getTime() : startMs;
      const durationMins = Math.round((endMs - startMs) / 60000);

      events.push({
        externalId: item.id,
        provider: 'google',
        type: item.conferenceData ? 'meeting' : 'meeting',
        title: item.summary || 'No title',
        description: item.description || null,
        startTime: new Date(start).toISOString(),
        endTime: end ? new Date(end).toISOString() : null,
        duration: durationMins > 0 ? durationMins : null,
        location: item.location || null,
        videoLink: item.hangoutLink || item.conferenceData?.entryPoints?.[0]?.uri || null,
        organizer: item.organizer ? { email: item.organizer.email, name: item.organizer.displayName || '' } : null,
        attendees: (item.attendees || []).map((a: Record<string, string>) => ({
          email: a.email, name: a.displayName || '', rsvp: a.responseStatus,
        })),
        isRecurring: !!item.recurringEventId,
        rawPayload: item,
      });
    }

    return events;
  },

  async pushEvent(connection: ServiceConnection, event: UnifiedCalendarEvent): Promise<string> {
    const gcalEvent = {
      summary: event.title,
      description: event.description,
      start: { dateTime: event.startTime },
      end: { dateTime: event.endTime || event.startTime },
      location: event.location,
      attendees: event.attendees.map(a => ({ email: a.email, displayName: a.name })),
    };

    const res = await googleFetch(`${BASE_URL}/calendars/primary/events`, connection.accessToken, {
      method: 'POST',
      body: JSON.stringify(gcalEvent),
    });

    if (!res.ok) throw new Error(`Push failed: ${res.status}`);
    const created = await res.json();
    return created.id;
  },

  async updateEvent(connection: ServiceConnection, externalId: string, event: Partial<UnifiedCalendarEvent>): Promise<void> {
    const patch: Record<string, unknown> = {};
    if (event.title) patch.summary = event.title;
    if (event.description !== undefined) patch.description = event.description;
    if (event.startTime) patch.start = { dateTime: event.startTime };
    if (event.endTime) patch.end = { dateTime: event.endTime };
    if (event.location !== undefined) patch.location = event.location;

    await googleFetch(`${BASE_URL}/calendars/primary/events/${externalId}`, connection.accessToken, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  async deleteEvent(connection: ServiceConnection, externalId: string): Promise<void> {
    await googleFetch(`${BASE_URL}/calendars/primary/events/${externalId}`, connection.accessToken, {
      method: 'DELETE',
    });
  },

  async registerWebhook(connection: ServiceConnection): Promise<{ webhookId: string; expires: Date }> {
    const channelId = crypto.randomUUID();
    const expiration = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    const res = await googleFetch(`${BASE_URL}/calendars/primary/events/watch`, connection.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        id: channelId,
        type: 'web_hook',
        address: `${process.env.NEXT_PUBLIC_APP_URL || 'https://crm.rasmalak.com'}/api/webhooks/google`,
        expiration,
        token: channelId,
      }),
    });

    if (!res.ok) throw new Error(`Webhook registration failed: ${res.status}`);

    const expires = new Date(expiration);
    await updateWebhook(connection.id, channelId, expires);
    return { webhookId: channelId, expires };
  },

  async renewWebhook(connection: ServiceConnection): Promise<{ webhookId: string; expires: Date }> {
    // Stop old channel first
    if (connection.webhookId) {
      try {
        await googleFetch(`${BASE_URL}/channels/stop`, connection.accessToken, {
          method: 'POST',
          body: JSON.stringify({ id: connection.webhookId, resourceId: connection.webhookId }),
        });
      } catch { /* Old channel may already be expired */ }
    }

    return this.registerWebhook(connection);
  },
};

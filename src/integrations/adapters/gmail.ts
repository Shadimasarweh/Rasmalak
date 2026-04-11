/**
 * Gmail Adapter
 * =============
 * Implements IntegrationAdapter for Gmail API v1.
 * Fetches emails, sends from CRM, auto-links to contacts.
 */

import type { IntegrationAdapter, ServiceConnection, UnifiedCalendarEvent } from '@/types/crm';
import { createConnection } from '@/integrations/core/connectionManager';
import type { OAuthState } from '@/types/crm';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
];
const BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';

async function gmailFetch(url: string, accessToken: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...options.headers },
  });
  if (res.status === 401) throw new Error('TOKEN_EXPIRED');
  return res;
}

export const gmailAdapter: IntegrationAdapter = {
  provider: 'google',
  serviceType: 'email',

  async connect(userId: string, orgId: string): Promise<string> {
    const state: OAuthState = { provider: 'google', serviceType: 'email', userId, orgId };
    const allScopes = [...SCOPES, 'https://www.googleapis.com/auth/calendar.events'];
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || '',
      response_type: 'code',
      scope: allScopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: JSON.stringify(state),
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  },

  async handleCallback(code: string, stateStr: string): Promise<ServiceConnection> {
    const state: OAuthState = JSON.parse(stateStr);
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
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

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = profileRes.ok ? await profileRes.json() : {};

    const conn = await createConnection({
      orgId: state.orgId,
      userId: state.userId,
      provider: 'google',
      serviceType: 'email',
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

  async disconnect(): Promise<void> { /* handled by connectionManager */ },

  async fetchEvents(connection: ServiceConnection, since: Date): Promise<UnifiedCalendarEvent[]> {
    const epoch = Math.floor(since.getTime() / 1000);
    const listUrl = `${BASE_URL}/messages?q=after:${epoch}&maxResults=50`;
    const listRes = await gmailFetch(listUrl, connection.accessToken);
    if (!listRes.ok) return [];

    const listData = await listRes.json();
    const messageIds: string[] = (listData.messages || []).map((m: { id: string }) => m.id);
    const events: UnifiedCalendarEvent[] = [];

    for (const msgId of messageIds.slice(0, 50)) {
      try {
        const msgRes = await gmailFetch(`${BASE_URL}/messages/${msgId}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Subject&metadataHeaders=Date`, connection.accessToken);
        if (!msgRes.ok) continue;

        const msg = await msgRes.json();
        const headers = (msg.payload?.headers || []) as { name: string; value: string }[];
        const getHeader = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

        const from = getHeader('From');
        const to = getHeader('To');
        const cc = getHeader('Cc');
        const subject = getHeader('Subject');
        const date = getHeader('Date');

        // Determine direction based on connected email
        const isOutbound = from.toLowerCase().includes((connection.connectedEmail || '').toLowerCase());

        // Extract all email addresses for contact matching
        const allEmails = [from, to, cc].join(',');
        const emailMatches = allEmails.match(/[\w.-]+@[\w.-]+/g) || [];

        events.push({
          externalId: msgId,
          provider: 'google',
          type: 'message',
          title: subject || '(no subject)',
          description: msg.snippet || null,
          startTime: date ? new Date(date).toISOString() : new Date().toISOString(),
          endTime: null,
          duration: null,
          location: null,
          videoLink: null,
          organizer: { email: from.match(/[\w.-]+@[\w.-]+/)?.[0] || '', name: from.replace(/<.*>/, '').trim() },
          attendees: emailMatches.map(e => ({ email: e, name: '' })),
          isRecurring: false,
          rawPayload: { threadId: msg.threadId, direction: isOutbound ? 'outbound' : 'inbound', labelIds: msg.labelIds },
        });
      } catch { continue; }
    }

    return events;
  },

  async pushEvent(connection: ServiceConnection, event: UnifiedCalendarEvent): Promise<string> {
    // Build RFC 2822 message for sending
    const to = event.attendees[0]?.email || '';
    const subject = event.title;
    const body = event.description || '';

    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      body,
    ].join('\r\n');

    const encoded = Buffer.from(message).toString('base64url');

    const res = await gmailFetch(`${BASE_URL}/messages/send`, connection.accessToken, {
      method: 'POST',
      body: JSON.stringify({ raw: encoded }),
    });

    if (!res.ok) throw new Error(`Send failed: ${res.status}`);
    const sent = await res.json();
    return sent.id;
  },

  async updateEvent(): Promise<void> { /* Emails are immutable */ },
  async deleteEvent(): Promise<void> { /* Not applicable for email */ },
  async registerWebhook(): Promise<{ webhookId: string; expires: Date }> {
    // Gmail uses push notifications via Cloud Pub/Sub — deferred to production setup
    return { webhookId: '', expires: new Date() };
  },
  async renewWebhook(): Promise<{ webhookId: string; expires: Date }> {
    return { webhookId: '', expires: new Date() };
  },
};

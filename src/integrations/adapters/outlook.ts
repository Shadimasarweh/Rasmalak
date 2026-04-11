/**
 * Outlook Email Adapter (Microsoft Graph)
 * ========================================
 * Implements IntegrationAdapter for Outlook Mail via Graph API.
 * Same contact matching and auto-logging pattern as Gmail.
 */

import type { IntegrationAdapter, ServiceConnection, UnifiedCalendarEvent, OAuthState } from '@/types/crm';
import { createConnection } from '@/integrations/core/connectionManager';

const SCOPES = 'Mail.ReadWrite Mail.Send offline_access User.Read';
const GRAPH_URL = 'https://graph.microsoft.com/v1.0';
const TENANT = process.env.MICROSOFT_TENANT_ID || 'common';
const AUTH_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0`;

async function graphFetch(url: string, accessToken: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...options.headers },
  });
}

export const outlookAdapter: IntegrationAdapter = {
  provider: 'microsoft',
  serviceType: 'email',

  async connect(userId: string, orgId: string): Promise<string> {
    const state: OAuthState = { provider: 'microsoft', serviceType: 'email', userId, orgId };
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
        code, client_id: process.env.MICROSOFT_CLIENT_ID || '',
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI || '',
        grant_type: 'authorization_code', scope: SCOPES,
      }),
    });

    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);
    const tokens = await tokenRes.json();

    const profileRes = await graphFetch(`${GRAPH_URL}/me`, tokens.access_token);
    const profile = profileRes.ok ? await profileRes.json() : {};

    const conn = await createConnection({
      orgId: state.orgId, userId: state.userId,
      provider: 'microsoft', serviceType: 'email',
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

  async disconnect(): Promise<void> {},

  async fetchEvents(connection: ServiceConnection, since: Date): Promise<UnifiedCalendarEvent[]> {
    const filter = `receivedDateTime ge ${since.toISOString()}`;
    const url = `${GRAPH_URL}/me/messages?$filter=${encodeURIComponent(filter)}&$top=50&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,from,toRecipients,ccRecipients,receivedDateTime,conversationId`;
    const res = await graphFetch(url, connection.accessToken);
    if (!res.ok) return [];

    const data = await res.json();
    return (data.value || []).map((msg: Record<string, unknown>) => {
      const from = (msg.from as Record<string, Record<string, string>>)?.emailAddress;
      const toRecipients = (msg.toRecipients as Array<{ emailAddress: { address: string; name: string } }>) || [];
      const ccRecipients = (msg.ccRecipients as Array<{ emailAddress: { address: string; name: string } }>) || [];

      const isOutbound = from?.address?.toLowerCase() === (connection.connectedEmail || '').toLowerCase();
      const allAttendees = [
        ...(from ? [{ email: from.address, name: from.name }] : []),
        ...toRecipients.map(r => ({ email: r.emailAddress.address, name: r.emailAddress.name })),
        ...ccRecipients.map(r => ({ email: r.emailAddress.address, name: r.emailAddress.name })),
      ];

      return {
        externalId: msg.id as string,
        provider: 'microsoft',
        type: 'message' as const,
        title: (msg.subject as string) || '(no subject)',
        description: (msg.bodyPreview as string) || null,
        startTime: (msg.receivedDateTime as string) || new Date().toISOString(),
        endTime: null,
        duration: null,
        location: null,
        videoLink: null,
        organizer: from ? { email: from.address, name: from.name } : null,
        attendees: allAttendees,
        isRecurring: false,
        rawPayload: { conversationId: msg.conversationId, direction: isOutbound ? 'outbound' : 'inbound' },
      } satisfies UnifiedCalendarEvent;
    });
  },

  async pushEvent(connection: ServiceConnection, event: UnifiedCalendarEvent): Promise<string> {
    const to = event.attendees[0]?.email || '';
    const message = {
      subject: event.title,
      body: { contentType: 'HTML', content: event.description || '' },
      toRecipients: [{ emailAddress: { address: to } }],
    };

    const res = await graphFetch(`${GRAPH_URL}/me/sendMail`, connection.accessToken, {
      method: 'POST',
      body: JSON.stringify({ message, saveToSentItems: true }),
    });

    if (!res.ok) throw new Error(`Send failed: ${res.status}`);
    return crypto.randomUUID(); // sendMail doesn't return message ID
  },

  async updateEvent(): Promise<void> { /* Emails immutable */ },
  async deleteEvent(): Promise<void> { /* Not applicable */ },
  async registerWebhook(): Promise<{ webhookId: string; expires: Date }> {
    return { webhookId: '', expires: new Date() };
  },
  async renewWebhook(): Promise<{ webhookId: string; expires: Date }> {
    return { webhookId: '', expires: new Date() };
  },
};

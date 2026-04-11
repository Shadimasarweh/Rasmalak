/**
 * Slack Adapter
 * =============
 * Outbound: Posts CRM events (deal_won, new_lead, etc.) to configured Slack channels.
 * Inbound: "Log to CRM" message shortcut handled by webhook route.
 */

import type { IntegrationAdapter, ServiceConnection, UnifiedCalendarEvent, OAuthState } from '@/types/crm';
import { supabase } from '@/lib/supabaseClient';
import { createConnection } from '@/integrations/core/connectionManager';
import { mapFromDb } from '@/types/crm';
import type { SlackChannelConfig } from '@/types/crm';

/**
 * Post a Block Kit message to a Slack channel.
 */
export async function postToSlack(
  botToken: string,
  channelId: string,
  blocks: Record<string, unknown>[],
  text: string
): Promise<boolean> {
  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: channelId, blocks, text }),
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

/**
 * Build a Block Kit message for a CRM event.
 * Uses Rasmalak green (#2D6A4F) as accent color.
 */
export function buildEventBlocks(
  eventType: string,
  entityName: string,
  assignedRep: string,
  dealValue?: string
): Record<string, unknown>[] {
  const typeLabels: Record<string, string> = {
    deal_won: '🎉 Deal Won',
    deal_lost: '❌ Deal Lost',
    deal_stage_changed: '📊 Deal Stage Changed',
    task_overdue: '⏰ Task Overdue',
    new_lead: '🆕 New Lead',
  };

  const blocks: Record<string, unknown>[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${typeLabels[eventType] || eventType}*\n${entityName}`,
      },
    },
  ];

  const fields: Record<string, unknown>[] = [
    { type: 'mrkdwn', text: `*Rep:* ${assignedRep}` },
  ];
  if (dealValue) fields.push({ type: 'mrkdwn', text: `*Value:* ${dealValue}` });

  blocks.push({ type: 'section', fields });
  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: '📎 _Rasmalak CRM_' }],
  });

  return blocks;
}

/**
 * Notify relevant Slack channels about a CRM event.
 */
export async function notifySlackChannels(
  orgId: string,
  eventType: string,
  entityName: string,
  assignedRep: string,
  dealValue?: string
): Promise<void> {
  try {
    // Find active Slack configs for this org + event type
    const { data: configs } = await supabase
      .from('slack_channel_configs')
      .select('*, service_connections(*)')
      .eq('org_id', orgId)
      .eq('is_active', true);

    if (!configs) return;

    const botToken = process.env.SLACK_BOT_TOKEN || '';
    const blocks = buildEventBlocks(eventType, entityName, assignedRep, dealValue);
    const text = `${eventType}: ${entityName}`;

    for (const config of configs) {
      const cfg = mapFromDb<SlackChannelConfig>(config);
      if (cfg.eventTypes.includes(eventType) || cfg.eventTypes.length === 0) {
        await postToSlack(botToken, cfg.channelId, blocks, text);
      }
    }
  } catch (err) {
    console.warn('[Slack Adapter] Error posting to channels:', err);
  }
}

export const slackAdapter: IntegrationAdapter = {
  provider: 'slack',
  serviceType: 'slack',

  async connect(userId: string, orgId: string): Promise<string> {
    const state: OAuthState = { provider: 'slack', serviceType: 'slack', userId, orgId };
    const params = new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID || '',
      scope: 'channels:read,chat:write,commands,users:read',
      redirect_uri: process.env.SLACK_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || '',
      state: JSON.stringify(state),
    });
    return `https://slack.com/oauth/v2/authorize?${params}`;
  },

  async handleCallback(code: string, stateStr: string): Promise<ServiceConnection> {
    const state: OAuthState = JSON.parse(stateStr);
    const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: process.env.SLACK_CLIENT_ID || '',
        client_secret: process.env.SLACK_CLIENT_SECRET || '',
      }),
    });

    const data = await tokenRes.json();
    if (!data.ok) throw new Error(`Slack OAuth failed: ${data.error}`);

    const conn = await createConnection({
      orgId: state.orgId, userId: state.userId,
      provider: 'slack', serviceType: 'slack',
      tokens: {
        accessToken: data.access_token,
        refreshToken: null,
        expiresAt: null, // Slack tokens don't expire
        scopes: (data.scope || '').split(','),
      },
      externalAccountId: data.team?.id || undefined,
    });

    if (!conn) throw new Error('Failed to create connection');
    return conn;
  },

  async disconnect(): Promise<void> {},
  async fetchEvents(): Promise<UnifiedCalendarEvent[]> { return []; },
  async pushEvent(): Promise<string> { return ''; },
  async updateEvent(): Promise<void> {},
  async deleteEvent(): Promise<void> {},
  async registerWebhook(): Promise<{ webhookId: string; expires: Date }> {
    return { webhookId: 'events-api', expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) };
  },
  async renewWebhook(): Promise<{ webhookId: string; expires: Date }> {
    return { webhookId: 'events-api', expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) };
  },
};

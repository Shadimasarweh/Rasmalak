/**
 * WhatsApp Business API Adapter
 * =============================
 * Sends template messages and free-form messages via Meta Graph API.
 * Handles 24h conversation window tracking.
 */

import { supabase } from '@/lib/supabaseClient';
import { encrypt, decrypt } from '@/integrations/core/encryption';

const GRAPH_API = 'https://graph.facebook.com/v18.0';

interface SendTemplateParams {
  accountId: string;
  to: string;
  templateName: string;
  language: string;
  components?: Array<{
    type: 'body' | 'header';
    parameters: Array<{ type: 'text'; text: string }>;
  }>;
}

interface SendTextParams {
  accountId: string;
  to: string;
  text: string;
}

/**
 * Send a template message (allowed anytime, no 24h restriction).
 */
export async function sendTemplateMessage(params: SendTemplateParams): Promise<{ messageId: string } | null> {
  try {
    const account = await getAccount(params.accountId);
    if (!account) return null;

    const token = decrypt(account.access_token);
    const phoneNumberId = account.phone_number;

    const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: params.to,
        type: 'template',
        template: {
          name: params.templateName,
          language: { code: params.language },
          components: params.components ?? [],
        },
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.warn('[WhatsApp] Template send failed:', result.error);
      return null;
    }

    const messageId = result.messages?.[0]?.id;

    // Open conversation window (24h from first user reply)
    await upsertConversation(account.org_id, params.accountId, params.to, null);

    return { messageId };
  } catch (err) {
    console.warn('[WhatsApp] Send template error:', err);
    return null;
  }
}

/**
 * Send a free-form text message (only within 24h window).
 */
export async function sendTextMessage(params: SendTextParams): Promise<{ messageId: string } | null> {
  try {
    // Check 24h window
    const windowOpen = await isConversationWindowOpen(params.accountId, params.to);
    if (!windowOpen) {
      console.warn('[WhatsApp] 24h window expired — use template message instead');
      return null;
    }

    const account = await getAccount(params.accountId);
    if (!account) return null;

    const token = decrypt(account.access_token);
    const phoneNumberId = account.phone_number;

    const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: params.to,
        type: 'text',
        text: { body: params.text.slice(0, 4096) },
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.warn('[WhatsApp] Text send failed:', result.error);
      return null;
    }

    return { messageId: result.messages?.[0]?.id };
  } catch (err) {
    console.warn('[WhatsApp] Send text error:', err);
    return null;
  }
}

/**
 * Substitute template variables: {{1}}, {{2}}, etc.
 */
export function substituteTemplateVariables(
  body: string,
  variables: Record<string, string>
): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, index: string) => {
    return variables[index] ?? `{{${index}}}`;
  });
}

// ── Internal helpers ────────────────��────────────────────────

async function getAccount(accountId: string) {
  try {
    const { data } = await supabase
      .from('whatsapp_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('status', 'active')
      .single();
    return data;
  } catch { return null; }
}

async function isConversationWindowOpen(accountId: string, phone: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('whatsapp_conversations')
      .select('window_expires')
      .eq('account_id', accountId)
      .eq('contact_phone', phone)
      .eq('status', 'active')
      .single();

    if (!data?.window_expires) return false;
    return new Date(data.window_expires) > new Date();
  } catch { return false; }
}

async function upsertConversation(
  orgId: string, accountId: string, phone: string, contactId: string | null
): Promise<void> {
  try {
    await supabase
      .from('whatsapp_conversations')
      .upsert({
        org_id: orgId,
        account_id: accountId,
        contact_phone: phone,
        contact_id: contactId,
        status: 'active',
        last_message_at: new Date().toISOString(),
      }, { onConflict: 'account_id,contact_phone' });
  } catch { /* non-critical */ }
}

/**
 * Process an incoming message — called by the webhook handler.
 * Opens 24h window, matches to contact, logs communication.
 */
export async function processIncomingMessage(payload: {
  orgId: string;
  accountId: string;
  from: string;
  messageBody: string;
  messageId: string;
  timestamp: string;
}): Promise<void> {
  try {
    // Open/extend 24h window
    const windowExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Find contact by phone number
    const { data: contact } = await supabase
      .from('crm_contacts')
      .select('id, assigned_to')
      .eq('org_id', payload.orgId)
      .eq('phone', payload.from)
      .single();

    // Upsert conversation with window
    await supabase
      .from('whatsapp_conversations')
      .upsert({
        org_id: payload.orgId,
        account_id: payload.accountId,
        contact_phone: payload.from,
        contact_id: contact?.id ?? null,
        assigned_to: contact?.assigned_to ?? null,
        status: 'active',
        window_expires: windowExpires,
        last_message_at: payload.timestamp,
      }, { onConflict: 'account_id,contact_phone' });

    // Log as CRM communication
    await supabase.from('crm_communications').insert({
      org_id: payload.orgId,
      contact_id: contact?.id ?? null,
      type: 'whatsapp',
      direction: 'inbound',
      body: payload.messageBody.slice(0, 4096),
      metadata: {
        waMessageId: payload.messageId,
        waAccountId: payload.accountId,
        phone: payload.from,
      },
    });

    // If no matching contact, notify rep to create one
    if (!contact) {
      // Get org admins
      const { data: admins } = await supabase
        .from('org_members')
        .select('user_id')
        .eq('org_id', payload.orgId)
        .in('role', ['owner', 'admin'])
        .limit(3);

      for (const admin of admins ?? []) {
        await supabase.from('crm_notifications').insert({
          org_id: payload.orgId,
          user_id: admin.user_id,
          title: `New WhatsApp message from ${payload.from}`,
          body: `Received a message from an unknown number: ${payload.from}. Create a contact to track this conversation.`,
          type: 'whatsapp',
          entity_type: 'whatsapp_conversation',
        });
      }
    } else if (contact.assigned_to) {
      // Notify assigned rep
      await supabase.from('crm_notifications').insert({
        org_id: payload.orgId,
        user_id: contact.assigned_to,
        title: `WhatsApp message from ${payload.from}`,
        body: payload.messageBody.slice(0, 200),
        type: 'whatsapp',
        entity_type: 'contact',
        entity_id: contact.id,
      });
    }
  } catch (err) {
    console.warn('[WhatsApp] Process incoming error:', err);
  }
}

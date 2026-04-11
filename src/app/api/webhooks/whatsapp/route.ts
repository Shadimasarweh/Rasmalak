/**
 * WhatsApp Business Webhook Handler
 * ==================================
 * GET: Meta webhook verification challenge.
 * POST: Parse incoming messages, match contacts, auto-log, notify reps.
 * Verify signature, respond 200 immediately, process async.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { processIncomingMessage } from '@/integrations/adapters/whatsappBusiness';
import crypto from 'crypto';

/** Meta sends GET with hub.verify_token challenge during setup */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (mode === 'subscribe' && expectedToken && token &&
      token.length === expectedToken.length &&
      crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))) {
    return new Response(challenge || '', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/** Incoming WhatsApp messages */
export async function POST(request: Request) {
  // Respond 200 immediately per webhook best practice
  const rawBody = await request.text();

  // Verify signature
  const signature = request.headers.get('x-hub-signature-256');
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Process asynchronously
  try {
    const body = JSON.parse(rawBody);
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) return NextResponse.json({ received: true });

    // Handle incoming messages
    const messages = value.messages;
    if (messages && Array.isArray(messages)) {
      const phoneNumberId = value.metadata?.phone_number_id;

      // Find the WhatsApp account for this phone number
      // Meta sends phone_number_id (numeric ID), not the E.164 number.
      // Match against waba_id or use a fallback phone number lookup.
      const { data: account } = await supabase
        .from('whatsapp_accounts')
        .select('id, org_id')
        .eq('waba_id', phoneNumberId)
        .eq('status', 'active')
        .single();

      if (account) {
        for (const msg of messages) {
          const from = msg.from;
          const messageBody = msg.text?.body ?? msg.caption ?? '[Media message]';
          const messageId = msg.id;
          const timestamp = msg.timestamp
            ? new Date(Number(msg.timestamp) * 1000).toISOString()
            : new Date().toISOString();

          await processIncomingMessage({
            orgId: account.org_id,
            accountId: account.id,
            from,
            messageBody,
            messageId,
            timestamp,
          });
        }
      }
    }

    // Handle status updates (sent, delivered, read)
    const statuses = value.statuses;
    if (statuses && Array.isArray(statuses)) {
      for (const status of statuses) {
        try {
          await supabase
            .from('crm_communications')
            .update({ metadata: { waStatus: status.status, waTimestamp: status.timestamp } })
            .contains('metadata', { waMessageId: status.id });
        } catch { /* non-critical */ }
      }
    }
  } catch (err) {
    // Log error to health_events but still return 200
    console.warn('[WhatsApp Webhook] Processing error:', err);
    try {
      await supabase.from('health_events').insert({
        org_id: '00000000-0000-0000-0000-000000000000', // System-level
        event_type: 'webhook_error',
        severity: 'error',
        message: 'WhatsApp webhook processing failed',
        details: { error: err instanceof Error ? err.message : 'Unknown' },
      });
    } catch { /* fallback */ }
  }

  return NextResponse.json({ received: true });
}

function verifySignature(body: string, signature: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) {
    // Fail closed — missing secret is a misconfiguration, not a dev convenience
    console.error('[WhatsApp Webhook] META_APP_SECRET not configured — rejecting request');
    return false;
  }
  if (!signature) return false;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

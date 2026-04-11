/**
 * Slack Webhook Handler
 * =====================
 * Handles Slack Events API, URL verification, and interaction payloads.
 * Verifies signing secret via HMAC-SHA256.
 */

import { NextResponse } from 'next/server';
import { verifySlackSignature } from '@/integrations/core/webhookRouter';
import { logHealthEvent } from '@/integrations/core/connectionManager';

export async function POST(request: Request) {
  const body = await request.text();
  const timestamp = request.headers.get('x-slack-request-timestamp') || '';
  const signature = request.headers.get('x-slack-signature') || '';

  // Verify Slack signing secret
  if (!verifySlackSignature(body, timestamp, signature)) {
    console.warn('[Slack Webhook] Signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    // Slack sends either JSON or URL-encoded form data
    if (request.headers.get('content-type')?.includes('application/json')) {
      payload = JSON.parse(body);
    } else {
      const params = new URLSearchParams(body);
      const payloadStr = params.get('payload');
      payload = payloadStr ? JSON.parse(payloadStr) : {};
    }
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // URL verification challenge (Slack setup requirement)
  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge });
  }

  // Process events async
  try {
    if (payload.type === 'event_callback') {
      const event = payload.event as Record<string, unknown>;
      // Handle message shortcuts, interactions, etc.
      // Full implementation depends on Slack app configuration
      console.info('[Slack Webhook] Event received:', event?.type);
    }

    if (payload.type === 'block_actions' || payload.type === 'view_submission') {
      // Handle interactive components (modals, buttons)
      console.info('[Slack Webhook] Interaction received:', payload.type);
    }
  } catch (err) {
    console.warn('[Slack Webhook] Processing error:', err);
  }

  return NextResponse.json({ ok: true });
}

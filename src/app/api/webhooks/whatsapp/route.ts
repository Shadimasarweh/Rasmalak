/**
 * WhatsApp Business Webhook Handler (Stub)
 * =========================================
 * GET: Meta webhook verification challenge.
 * POST: Stub that logs payload and returns 200. Full implementation in Wave 2.
 */

import { NextResponse } from 'next/server';

/** Meta sends GET with hub.verify_token challenge during setup */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge || '', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/** Incoming messages — stub for Wave 2 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.info('[WhatsApp Webhook] Received:', JSON.stringify(body).substring(0, 200));
  } catch {
    // Log but don't fail
  }

  return NextResponse.json({ received: true });
}

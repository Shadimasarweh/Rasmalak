/**
 * Webhook Router
 * ==============
 * Routes and verifies incoming webhooks from external services.
 * Each provider has its own signature verification method.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type { ParsedWebhookEvent } from './types';

/**
 * Verify Slack webhook signature (HMAC-SHA256).
 */
export function verifySlackSignature(
  body: string,
  timestamp: string,
  signature: string
): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) return false;

  // Reject requests older than 5 minutes (replay protection)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;

  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature = 'v0=' + createHmac('sha256', secret).update(sigBasestring).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Verify Zoom webhook using the secret token.
 */
export function verifyZoomSignature(body: string, timestamp: string, signature: string): boolean {
  const secret = process.env.ZOOM_WEBHOOK_SECRET;
  if (!secret) return false;

  const message = `v0:${timestamp}:${body}`;
  const hash = createHmac('sha256', secret).update(message).digest('hex');
  const expected = `v0=${hash}`;

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Verify Meta/WhatsApp webhook signature (HMAC-SHA256 on raw body).
 */
export function verifyMetaSignature(body: string, signature: string): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !signature) return false;

  const expectedSignature = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Verify Google Calendar push notification.
 * Google uses channel tokens set during watch registration.
 */
export function verifyGoogleChannel(channelToken: string, storedToken: string): boolean {
  if (!channelToken || !storedToken) return false;
  try {
    return timingSafeEqual(Buffer.from(channelToken), Buffer.from(storedToken));
  } catch {
    return false;
  }
}

/**
 * Verify Microsoft Graph subscription.
 * Microsoft uses clientState set during subscription creation.
 */
export function verifyMicrosoftClientState(clientState: string, storedState: string): boolean {
  if (!clientState || !storedState) return false;
  try {
    return timingSafeEqual(Buffer.from(clientState), Buffer.from(storedState));
  } catch {
    return false;
  }
}

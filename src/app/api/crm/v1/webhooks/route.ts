/**
 * Public API: Webhook Subscriptions — GET, POST, DELETE
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import crypto from 'crypto';
import { authenticateApiRequest, withRateLimitHeaders, hasPermission, apiError, apiList, apiSingle } from '@/middleware/apiAuth';

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if ('error' in auth) return auth.error;
  const { context, rateLimit } = auth;

  try {
    const { data, error } = await supabase.from('api_webhook_subscriptions').select('id, url, event_types, status, failure_count, last_success, last_failure, created_at')
      .eq('org_id', context.orgId).eq('api_key_id', context.apiKeyId).order('created_at', { ascending: false }).limit(100);

    if (error) throw error;
    return withRateLimitHeaders(apiList(data ?? [], 1, 100, data?.length ?? 0), rateLimit);
  } catch (err) {
    console.warn('[API webhooks GET]', err);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if ('error' in auth) return auth.error;
  const { context, rateLimit } = auth;

  try {
    const body = await request.json();
    if (!body.url || !body.event_types || !Array.isArray(body.event_types)) {
      return apiError('VALIDATION_ERROR', 'url and event_types (array) are required', 400);
    }

    const validEvents = [
      'contact.created', 'contact.updated', 'contact.deleted',
      'deal.created', 'deal.updated', 'deal.stage_changed', 'deal.closed',
      'task.created', 'task.completed',
      'communication.logged',
    ];

    const invalidEvents = body.event_types.filter((e: string) => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return apiError('VALIDATION_ERROR', `Invalid event types: ${invalidEvents.join(', ')}`, 400, { valid_events: validEvents });
    }

    // Generate signing secret for this subscription
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const { data, error } = await supabase.from('api_webhook_subscriptions').insert({
      org_id: context.orgId, api_key_id: context.apiKeyId,
      url: body.url, event_types: body.event_types, secret,
    }).select().single();

    if (error) throw error;

    // Return the secret ONCE — it won't be shown again
    const res = withRateLimitHeaders(
      NextResponse.json({ data: { ...data, secret } }),
      rateLimit
    );
    return new NextResponse(res.body, { status: 201, headers: res.headers });
  } catch (err) {
    console.warn('[API webhooks]', err);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function DELETE(request: Request) {
  const auth = await authenticateApiRequest(request);
  if ('error' in auth) return auth.error;
  const { context, rateLimit } = auth;

  const url = new URL(request.url);
  const subId = url.searchParams.get('id');
  if (!subId) return apiError('VALIDATION_ERROR', 'id query parameter is required', 400);

  try {
    const { error } = await supabase.from('api_webhook_subscriptions').delete()
      .eq('id', subId).eq('org_id', context.orgId).eq('api_key_id', context.apiKeyId);

    if (error) throw error;
    return withRateLimitHeaders(NextResponse.json({ data: { deleted: true } }), rateLimit);
  } catch (err) {
    console.warn('[API webhooks]', err);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

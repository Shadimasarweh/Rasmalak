/**
 * Public API: Communications — GET (list by contact) + POST (create/log)
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { authenticateApiRequest, withRateLimitHeaders, hasPermission, apiError, apiList, apiSingle } from '@/middleware/apiAuth';

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if ('error' in auth) return auth.error;
  const { context, rateLimit } = auth;
  if (!hasPermission(context, 'communications.read')) return apiError('FORBIDDEN', 'Missing permission', 403);

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 20)));
  const contactId = url.searchParams.get('contact_id');
  const type = url.searchParams.get('type');
  const offset = (page - 1) * limit;

  try {
    let query = supabase.from('crm_communications').select('*', { count: 'exact' })
      .eq('org_id', context.orgId).order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    if (contactId) query = query.eq('contact_id', contactId);
    if (type) query = query.eq('type', type);

    const { data, count, error } = await query;
    if (error) throw error;
    return withRateLimitHeaders(apiList(data ?? [], page, limit, count ?? 0), rateLimit);
  } catch (err) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Error', 500);
  }
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if ('error' in auth) return auth.error;
  const { context, rateLimit } = auth;
  if (!hasPermission(context, 'communications.write')) return apiError('FORBIDDEN', 'Missing permission', 403);

  try {
    const body = await request.json();
    if (!body.type || !body.direction) return apiError('VALIDATION_ERROR', 'type and direction are required', 400);

    const { data, error } = await supabase.from('crm_communications').insert({
      org_id: context.orgId, contact_id: body.contact_id ?? null,
      type: body.type, direction: body.direction,
      subject: body.subject ?? null, body: body.body ?? null,
      source: 'api', metadata: body.metadata ?? {},
    }).select().single();

    if (error) throw error;
    const res = withRateLimitHeaders(apiSingle(data), rateLimit);
    return new NextResponse(res.body, { status: 201, headers: res.headers });
  } catch (err) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Error', 500);
  }
}

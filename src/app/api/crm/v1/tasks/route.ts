/**
 * Public API: Tasks — GET (list) + POST (create)
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { authenticateApiRequest, withRateLimitHeaders, hasPermission, apiError, apiList, apiSingle } from '@/middleware/apiAuth';

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if ('error' in auth) return auth.error;
  const { context, rateLimit } = auth;
  if (!hasPermission(context, 'tasks.read')) return apiError('FORBIDDEN', 'Missing permission', 403);

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 20)));
  const status = url.searchParams.get('status');
  const assignedTo = url.searchParams.get('assigned_to');
  const offset = (page - 1) * limit;

  try {
    let query = supabase.from('crm_tasks').select('*', { count: 'exact' })
      .eq('org_id', context.orgId).order('due_date', { ascending: true }).range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (assignedTo) query = query.eq('assigned_to', assignedTo);

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
  if (!hasPermission(context, 'tasks.write')) return apiError('FORBIDDEN', 'Missing permission', 403);

  try {
    const body = await request.json();
    if (!body.title) return apiError('VALIDATION_ERROR', 'title is required', 400);

    const { data, error } = await supabase.from('crm_tasks').insert({
      org_id: context.orgId, title: body.title, title_ar: body.title_ar ?? null,
      description: body.description ?? null, status: body.status ?? 'pending',
      priority: body.priority ?? 'medium', type: body.type ?? 'task',
      due_date: body.due_date ?? null, assigned_to: body.assigned_to ?? null,
      deal_id: body.deal_id ?? null, contact_id: body.contact_id ?? null,
      related_entity_type: body.related_entity_type ?? null,
      related_entity_id: body.related_entity_id ?? null,
    }).select().single();

    if (error) throw error;
    const res = withRateLimitHeaders(apiSingle(data), rateLimit);
    return new NextResponse(res.body, { status: 201, headers: res.headers });
  } catch (err) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Error', 500);
  }
}

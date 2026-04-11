/**
 * Public API: Deals — GET (list) + POST (create)
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { authenticateApiRequest, withRateLimitHeaders, hasPermission, apiError, apiList, apiSingle } from '@/middleware/apiAuth';

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if ('error' in auth) return auth.error;
  const { context, rateLimit } = auth;
  if (!hasPermission(context, 'deals.read')) return apiError('FORBIDDEN', 'Missing permission', 403);

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 20)));
  const pipelineId = url.searchParams.get('pipeline_id');
  const stageId = url.searchParams.get('stage_id');
  const offset = (page - 1) * limit;

  try {
    let query = supabase.from('crm_deals').select('*', { count: 'exact' })
      .eq('org_id', context.orgId).order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    if (pipelineId) query = query.eq('pipeline_id', pipelineId);
    if (stageId) query = query.eq('stage_id', stageId);

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
  if (!hasPermission(context, 'deals.write')) return apiError('FORBIDDEN', 'Missing permission', 403);

  try {
    const body = await request.json();
    if (!body.title || !body.pipeline_id || !body.stage_id) {
      return apiError('VALIDATION_ERROR', 'title, pipeline_id, and stage_id are required', 400);
    }

    const { data, error } = await supabase.from('crm_deals').insert({
      org_id: context.orgId, pipeline_id: body.pipeline_id, stage_id: body.stage_id,
      title: body.title, title_ar: body.title_ar ?? null,
      contact_id: body.contact_id ?? null, company_id: body.company_id ?? null,
      value: body.value ?? null, currency: body.currency ?? 'USD',
      probability: body.probability ?? 50, expected_close: body.expected_close ?? null,
      assigned_to: body.assigned_to ?? null, source: body.source ?? 'api',
      custom_fields: body.custom_fields ?? {}, created_by: context.apiKeyId,
    }).select().single();

    if (error) throw error;
    const res = withRateLimitHeaders(apiSingle(data), rateLimit);
    return new NextResponse(res.body, { status: 201, headers: res.headers });
  } catch (err) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Error', 500);
  }
}

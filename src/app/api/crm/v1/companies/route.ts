/**
 * Public API: Companies
 * GET /api/crm/v1/companies — List
 * POST /api/crm/v1/companies — Create
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import {
  authenticateApiRequest, logApiRequest, withRateLimitHeaders,
  hasPermission, apiError, apiList, apiSingle,
} from '@/middleware/apiAuth';

export async function GET(request: Request) {
  const start = performance.now();
  const auth = await authenticateApiRequest(request);
  if ('error' in auth) return auth.error;
  const { context, rateLimit } = auth;
  if (!hasPermission(context, 'companies.read')) return apiError('FORBIDDEN', 'Missing permission', 403);

  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 20)));
    const search = url.searchParams.get('search') ?? '';
    const offset = (page - 1) * limit;

    let query = supabase.from('crm_companies').select('*', { count: 'exact' })
      .eq('org_id', context.orgId).order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    if (search) {
      const safe = search.replace(/[,.()"\\]/g, '').slice(0, 100);
      if (safe) query = query.or(`name.ilike.%${safe}%,domain.ilike.%${safe}%`);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const res = apiList(data ?? [], page, limit, count ?? 0);
    await logApiRequest(context, 'GET', '/api/crm/v1/companies', 200, Math.round(performance.now() - start), getIp(request));
    return withRateLimitHeaders(res, rateLimit);
  } catch (err) {
    console.warn('[API companies GET]', err);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function POST(request: Request) {
  const start = performance.now();
  const auth = await authenticateApiRequest(request);
  if ('error' in auth) return auth.error;
  const { context, rateLimit } = auth;
  if (!hasPermission(context, 'companies.write')) return apiError('FORBIDDEN', 'Missing permission', 403);

  try {
    const body = await request.json();
    if (!body.name) return apiError('VALIDATION_ERROR', 'name is required', 400);

    const { data, error } = await supabase.from('crm_companies').insert({
      org_id: context.orgId, name: body.name, name_ar: body.name_ar ?? null,
      domain: body.domain ?? null, industry: body.industry ?? null,
      country: body.country ?? null, city: body.city ?? null,
      size_range: body.size_range ?? null, custom_fields: body.custom_fields ?? {},
    }).select().single();

    if (error) throw error;
    const res = withRateLimitHeaders(apiSingle(data), rateLimit);
    await logApiRequest(context, 'POST', '/api/crm/v1/companies', 201, Math.round(performance.now() - start), getIp(request));
    return new NextResponse(res.body, { status: 201, headers: res.headers });
  } catch (err) {
    console.warn('[API companies POST]', err);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

function getIp(req: Request): string { return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'; }

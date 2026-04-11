/**
 * Public API: Contacts
 * GET /api/crm/v1/contacts — List contacts (paginated, searchable)
 * POST /api/crm/v1/contacts — Create contact
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import {
  authenticateApiRequest, logApiRequest, withRateLimitHeaders,
  hasPermission, apiError, apiList, apiSingle,
  type ApiContext,
} from '@/middleware/apiAuth';

export async function GET(request: Request) {
  const start = performance.now();
  const auth = await authenticateApiRequest(request);
  if ('error' in auth) return auth.error;

  const { context, rateLimit } = auth;
  if (!hasPermission(context, 'contacts.read')) {
    return apiError('FORBIDDEN', 'Missing contacts.read permission', 403);
  }

  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 20)));
    const search = url.searchParams.get('search') ?? '';
    const tag = url.searchParams.get('tag') ?? '';
    const offset = (page - 1) * limit;

    let query = supabase
      .from('crm_contacts')
      .select('*', { count: 'exact' })
      .eq('org_id', context.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      // Sanitize: strip PostgREST filter-significant chars to prevent filter injection
      const safe = search.replace(/[,.()"\\]/g, '').slice(0, 100);
      if (safe) {
        query = query.or(`name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`);
      }
    }
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const res = apiList(data ?? [], page, limit, count ?? 0);
    await logApiRequest(context, 'GET', '/api/crm/v1/contacts', 200, Math.round(performance.now() - start), getIp(request));
    return withRateLimitHeaders(res, rateLimit);
  } catch (err) {
    console.warn('[API contacts GET]', err);
    await logApiRequest(context, 'GET', '/api/crm/v1/contacts', 500, Math.round(performance.now() - start), getIp(request));
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function POST(request: Request) {
  const start = performance.now();
  const auth = await authenticateApiRequest(request);
  if ('error' in auth) return auth.error;

  const { context, rateLimit } = auth;
  if (!hasPermission(context, 'contacts.write')) {
    return apiError('FORBIDDEN', 'Missing contacts.write permission', 403);
  }

  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== 'string') {
      return apiError('VALIDATION_ERROR', 'name is required and must be a string', 400);
    }

    // Validate tags and custom_fields types
    const tags = Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === 'string').slice(0, 50) : [];
    const customFields = (body.custom_fields && typeof body.custom_fields === 'object' && !Array.isArray(body.custom_fields))
      ? body.custom_fields : {};

    const { data, error } = await supabase
      .from('crm_contacts')
      .insert({
        org_id: context.orgId,
        name: String(body.name).slice(0, 255),
        name_ar: body.name_ar ? String(body.name_ar).slice(0, 255) : null,
        email: body.email ? String(body.email).slice(0, 255) : null,
        phone: body.phone ? String(body.phone).slice(0, 50) : null,
        company: body.company ? String(body.company).slice(0, 255) : null,
        title: body.title ? String(body.title).slice(0, 255) : null,
        source: body.source ?? 'api',
        tags,
        custom_fields: customFields,
      })
      .select()
      .single();

    if (error) throw error;

    const res = withRateLimitHeaders(apiSingle(data), rateLimit);
    await logApiRequest(context, 'POST', '/api/crm/v1/contacts', 201, Math.round(performance.now() - start), getIp(request));
    return new NextResponse(res.body, { status: 201, headers: res.headers });
  } catch (err) {
    console.warn('[API contacts POST]', err);
    await logApiRequest(context, 'POST', '/api/crm/v1/contacts', 500, Math.round(performance.now() - start), getIp(request));
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

function getIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

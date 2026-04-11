/**
 * Public API: Company Detail — GET, PATCH, DELETE
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { authenticateApiRequest, logApiRequest, withRateLimitHeaders, hasPermission, apiError, apiSingle } from '@/middleware/apiAuth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authenticateApiRequest(request);
  if ('error' in auth) return auth.error;
  const { context, rateLimit } = auth;
  if (!hasPermission(context, 'companies.read')) return apiError('FORBIDDEN', 'Missing permission', 403);

  const { data, error } = await supabase.from('crm_companies').select('*').eq('id', id).eq('org_id', context.orgId).single();
  if (error || !data) return apiError('NOT_FOUND', 'Company not found', 404);
  return withRateLimitHeaders(apiSingle(data), rateLimit);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authenticateApiRequest(request);
  if ('error' in auth) return auth.error;
  const { context, rateLimit } = auth;
  if (!hasPermission(context, 'companies.write')) return apiError('FORBIDDEN', 'Missing permission', 403);

  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of ['name', 'name_ar', 'domain', 'industry', 'country', 'city', 'size_range', 'custom_fields']) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const { data, error } = await supabase.from('crm_companies').update(updates).eq('id', id).eq('org_id', context.orgId).select().single();
  if (error || !data) return apiError('NOT_FOUND', 'Company not found', 404);
  return withRateLimitHeaders(apiSingle(data), rateLimit);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authenticateApiRequest(request);
  if ('error' in auth) return auth.error;
  const { context, rateLimit } = auth;
  if (!hasPermission(context, 'companies.delete')) return apiError('FORBIDDEN', 'Missing permission', 403);

  const { error } = await supabase.from('crm_companies').delete().eq('id', id).eq('org_id', context.orgId);
  if (error) return apiError('INTERNAL_ERROR', error.message, 500);
  return withRateLimitHeaders(NextResponse.json({ data: { deleted: true } }), rateLimit);
}

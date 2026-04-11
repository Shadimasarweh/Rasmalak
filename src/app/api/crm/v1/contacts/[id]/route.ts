/**
 * Public API: Contact Detail
 * GET /api/crm/v1/contacts/:id
 * PATCH /api/crm/v1/contacts/:id
 * DELETE /api/crm/v1/contacts/:id
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import {
  authenticateApiRequest, logApiRequest, withRateLimitHeaders,
  hasPermission, apiError, apiSingle,
} from '@/middleware/apiAuth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const start = performance.now();
  const auth = await authenticateApiRequest(request);
  if ('error' in auth) return auth.error;

  const { context, rateLimit } = auth;
  if (!hasPermission(context, 'contacts.read')) return apiError('FORBIDDEN', 'Missing permission', 403);

  try {
    const { data, error } = await supabase
      .from('crm_contacts')
      .select('*')
      .eq('id', id)
      .eq('org_id', context.orgId)
      .single();

    if (error || !data) return apiError('NOT_FOUND', 'Contact not found', 404);

    const res = withRateLimitHeaders(apiSingle(data), rateLimit);
    await logApiRequest(context, 'GET', `/api/crm/v1/contacts/${id}`, 200, Math.round(performance.now() - start), getIp(request));
    return res;
  } catch (err) {
    console.warn('[API contacts GET]', err);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const start = performance.now();
  const auth = await authenticateApiRequest(request);
  if ('error' in auth) return auth.error;

  const { context, rateLimit } = auth;
  if (!hasPermission(context, 'contacts.write')) return apiError('FORBIDDEN', 'Missing permission', 403);

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    const allowed = ['name', 'name_ar', 'email', 'phone', 'company', 'title', 'source', 'tags', 'custom_fields', 'assigned_to'];
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    // Reject no-op updates (only updated_at, no real fields)
    if (Object.keys(updates).length <= 1) {
      return apiError('VALIDATION_ERROR', 'No valid fields provided for update', 400);
    }

    const { data, error } = await supabase
      .from('crm_contacts')
      .update(updates)
      .eq('id', id)
      .eq('org_id', context.orgId)
      .select()
      .single();

    if (error || !data) return apiError('NOT_FOUND', 'Contact not found', 404);

    const res = withRateLimitHeaders(apiSingle(data), rateLimit);
    await logApiRequest(context, 'PATCH', `/api/crm/v1/contacts/${id}`, 200, Math.round(performance.now() - start), getIp(request));
    return res;
  } catch (err) {
    console.warn('[API contacts PATCH]', err);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const start = performance.now();
  const auth = await authenticateApiRequest(request);
  if ('error' in auth) return auth.error;

  const { context, rateLimit } = auth;
  if (!hasPermission(context, 'contacts.delete')) return apiError('FORBIDDEN', 'Missing permission', 403);

  try {
    const { data, error } = await supabase
      .from('crm_contacts')
      .delete()
      .eq('id', id)
      .eq('org_id', context.orgId)
      .select('id')
      .single();

    if (error || !data) return apiError('NOT_FOUND', 'Contact not found', 404);

    const res = withRateLimitHeaders(NextResponse.json({ data: { deleted: true } }), rateLimit);
    await logApiRequest(context, 'DELETE', `/api/crm/v1/contacts/${id}`, 200, Math.round(performance.now() - start), getIp(request));
    return res;
  } catch (err) {
    console.warn('[API contacts DELETE]', err);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

function getIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

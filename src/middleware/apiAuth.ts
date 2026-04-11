/**
 * Public API Authentication Middleware
 * ====================================
 * Validates API key from Bearer token, checks rate limits,
 * sets rate limit headers, logs requests.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import crypto from 'crypto';

export interface ApiContext {
  orgId: string;
  apiKeyId: string;
  permissions: Record<string, boolean>;
  rateLimit: number;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Authenticate an API request. Returns context or error response.
 */
export async function authenticateApiRequest(
  request: Request
): Promise<{ context: ApiContext; rateLimit: RateLimitInfo } | { error: NextResponse }> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return {
      error: NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header. Use: Bearer <api_key>' } },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.slice(7);
  if (!token) {
    return {
      error: NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'API key is empty' } },
        { status: 401 }
      ),
    };
  }

  // Hash the token and use prefix for fast index lookup
  const keyHash = crypto.createHash('sha256').update(token).digest('hex');
  const keyPrefix = token.slice(0, 8);

  try {
    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .select('id, org_id, permissions, rate_limit, is_active, expires_at')
      .eq('key_prefix', keyPrefix)
      .eq('key_hash', keyHash)
      .single();

    if (error || !apiKey) {
      return {
        error: NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } },
          { status: 401 }
        ),
      };
    }

    if (!apiKey.is_active) {
      return {
        error: NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'API key is deactivated' } },
          { status: 401 }
        ),
      };
    }

    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
      return {
        error: NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'API key has expired' } },
          { status: 401 }
        ),
      };
    }

    // Rate limiting — count requests in current hour window
    const hourStart = new Date();
    hourStart.setMinutes(0, 0, 0);
    const hourEnd = new Date(hourStart.getTime() + 3600000);

    const { count } = await supabase
      .from('api_request_log')
      .select('*', { count: 'exact', head: true })
      .eq('api_key_id', apiKey.id)
      .gte('created_at', hourStart.toISOString())
      .lt('created_at', hourEnd.toISOString());

    const used = count ?? 0;
    const limit = apiKey.rate_limit ?? 100;
    const remaining = Math.max(0, limit - used);
    const reset = Math.floor(hourEnd.getTime() / 1000);

    if (remaining <= 0) {
      const res = NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded. Try again later.' } },
        { status: 429 }
      );
      res.headers.set('X-RateLimit-Limit', String(limit));
      res.headers.set('X-RateLimit-Remaining', '0');
      res.headers.set('X-RateLimit-Reset', String(reset));
      return { error: res };
    }

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKey.id);

    return {
      context: {
        orgId: apiKey.org_id,
        apiKeyId: apiKey.id,
        permissions: (apiKey.permissions as Record<string, boolean>) ?? {},
        rateLimit: limit,
      },
      rateLimit: { limit, remaining: remaining - 1, reset },
    };
  } catch {
    return {
      error: NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Authentication service error' } },
        { status: 500 }
      ),
    };
  }
}

/**
 * Log an API request to the audit log.
 */
export async function logApiRequest(
  ctx: ApiContext,
  method: string,
  path: string,
  statusCode: number,
  responseMs: number,
  ipAddress: string
): Promise<void> {
  try {
    await supabase.from('api_request_log').insert({
      org_id: ctx.orgId,
      api_key_id: ctx.apiKeyId,
      method,
      path,
      status_code: statusCode,
      response_ms: responseMs,
      ip_address: ipAddress,
    });
  } catch { /* non-critical */ }
}

/**
 * Set rate limit headers on a response.
 */
export function withRateLimitHeaders(
  response: NextResponse,
  rateLimit: RateLimitInfo
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(rateLimit.limit));
  response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
  response.headers.set('X-RateLimit-Reset', String(rateLimit.reset));
  return response;
}

/**
 * Check if the API key has a specific permission.
 */
export function hasPermission(ctx: ApiContext, permission: string): boolean {
  // Empty permissions = full access (for backward compat)
  if (Object.keys(ctx.permissions).length === 0) return true;
  return ctx.permissions[permission] === true;
}

/**
 * Standard API error response.
 */
export function apiError(code: string, message: string, status: number, details?: unknown): NextResponse {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status }
  );
}

/**
 * Standard API list response.
 */
export function apiList<T>(data: T[], page: number, limit: number, total: number): NextResponse {
  return NextResponse.json({
    data,
    meta: { page, limit, total, has_more: page * limit < total },
  });
}

/**
 * Standard API single response.
 */
export function apiSingle<T>(data: T): NextResponse {
  return NextResponse.json({ data });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_REDIRECT_PREFIXES = ['/', '/reset-password', '/onboarding', '/settings'];

function sanitizeRedirectUrl(url: string): string {
  if (!url || typeof url !== 'string') return '/';
  const trimmed = url.trim();
  if (!trimmed.startsWith('/')) return '/';
  if (trimmed.startsWith('//')) return '/';
  if (trimmed.includes('://')) return '/';
  if (!ALLOWED_REDIRECT_PREFIXES.some(prefix => trimmed === prefix || trimmed.startsWith(prefix + '/'))) {
    return '/';
  }
  return trimmed;
}

/**
 * Handles the Supabase auth callback for email-based flows
 * (password reset, email confirmation, magic links).
 *
 * Supabase redirects here with a `code` query param.
 * We exchange it for a session, then redirect to the
 * destination specified by the `next` query param.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizeRedirectUrl(searchParams.get('next') || '/');

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, request.url));
}

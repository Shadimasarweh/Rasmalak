/**
 * POST /api/fx/refresh
 *
 * Daily refresh job. Iterates the distinct base currencies in
 * `profiles` and refreshes the fx_rates cache from the relevant
 * provider (central bank → aggregator fallback).
 *
 * Wired to Vercel Cron via `vercel.json`. The cron secret is
 * verified by checking the `Authorization` header against
 * `CRON_SECRET`. When unset (local development), the route accepts
 * any caller — DO NOT deploy without setting CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { refreshAllRates } from '@/lib/fx';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret) {
    const auth = request.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('base_currency');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const distinct = Array.from(
    new Set([...(data ?? []).map((r) => r.base_currency).filter(Boolean), 'SAR']),
  );

  const result = await refreshAllRates(distinct);
  return NextResponse.json(result);
}

// Vercel Cron sends GET — alias to POST.
export async function GET(request: NextRequest) {
  return POST(request);
}

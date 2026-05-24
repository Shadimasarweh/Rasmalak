/**
 * GET /api/fx/quote?from=USD&to=SAR&date=2026-05-20
 *
 * Returns a single resolved FX rate for the (from, to, date) tuple,
 * including the resolverPath so the entry form can label the
 * auto-populated rate (e.g. "from Saudi Central Bank" vs "from
 * cached rate from 3 days ago").
 *
 * The transaction entry form calls this when the user picks a
 * non-base currency, and again whenever the date or currency
 * selection changes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRate } from '@/lib/fx';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const date = url.searchParams.get('date') ?? undefined;
  const country = url.searchParams.get('country');

  if (!from || !to) {
    return NextResponse.json(
      { error: 'Missing `from` or `to` query parameters' },
      { status: 400 },
    );
  }

  try {
    const rate = await getRate({
      fromCurrency: from,
      toCurrency: to,
      date,
      countryCode: country,
    });
    return NextResponse.json(rate);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Quote failed' },
      { status: 502 },
    );
  }
}

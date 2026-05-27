/**
 * GET /api/geo
 *
 * Returns `{ country }` (ISO-3166 alpha-2) inferred from Vercel's
 * edge geo headers. Used by the onboarding wizard's Step 3 to
 * pre-fill the country dropdown so most users don't have to scroll.
 *
 * Returns `{ country: null }` outside Vercel (local dev, other
 * hosts) — the onboarding UI falls back to 'SA' (the app's
 * MENA-default) in that case.
 *
 * Edge runtime: small route, no DB access, low latency.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const country = request.headers.get('x-vercel-ip-country');
  return NextResponse.json({ country: country ?? null });
}

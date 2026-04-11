/**
 * GET Current Subscription Status
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { mapFromDb } from '@/types/crm';
import type { Subscription } from '@/types/crm';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get('orgId');
  if (!orgId) return NextResponse.json({ error: { code: 'MISSING_ORG', message: 'orgId required' } }, { status: 400 });

  try {
    const { data, error } = await supabase.from('subscriptions').select('*').eq('org_id', orgId).single();
    if (error || !data) return NextResponse.json({ data: null });
    return NextResponse.json({ data: mapFromDb<Subscription>(data) });
  } catch {
    return NextResponse.json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch subscription' } }, { status: 500 });
  }
}

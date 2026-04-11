/**
 * GET Invoice List
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { mapFromDb } from '@/types/crm';
import type { Invoice } from '@/types/crm';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get('orgId');
  if (!orgId) return NextResponse.json({ error: { code: 'MISSING_ORG', message: 'orgId required' } }, { status: 400 });

  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: { code: 'FETCH_FAILED', message: error.message } }, { status: 500 });
    return NextResponse.json({ data: (data || []).map(r => mapFromDb<Invoice>(r)) });
  } catch {
    return NextResponse.json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch invoices' } }, { status: 500 });
  }
}

/**
 * POST /api/fx/recalc
 *
 * Triggered when a user changes their base currency in Settings.
 *
 * Workflow:
 *   1. Validate the user is authenticated and the new base differs
 *      from the stored profile value.
 *   2. Insert a row in fx_recalculation_jobs with status='running'.
 *   3. Stream every transaction belonging to the user, batched. For
 *      each row look up the (currency_native -> new_base) rate on
 *      the transaction's `date` via the FX resolver.
 *   4. UPDATE amount_base and base_currency_at_entry for the row.
 *      Note: exchange_rate_applied and amount_native are never
 *      touched — those are LOCKED at entry time per the doc.
 *   5. On completion, update the job row with processed_count and
 *      status='completed' (or 'failed' on uncaught error).
 *
 * The recalc rate_source is intentionally NOT 'manual'; it is the
 * same source that resolveRate returns (central_bank / aggregator /
 * cached) so audit traceability is preserved row-by-row.
 *
 * Body: { newBaseCurrency: string }
 *
 * Returns: { jobId, status, processed, total }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getRate } from '@/lib/fx';
import { isSupportedBaseCurrency } from '@/lib/countries';

export const dynamic = 'force-dynamic';

const BATCH_SIZE = 200;

interface Body {
  newBaseCurrency: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || typeof body.newBaseCurrency !== 'string') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { newBaseCurrency } = body;
  if (!isSupportedBaseCurrency(newBaseCurrency)) {
    return NextResponse.json(
      { error: `Unsupported base currency: ${newBaseCurrency}` },
      { status: 400 },
    );
  }

  // The client passes the user's bearer token via the `authorization`
  // header so the server can identify the user via Supabase JWT.
  const authHeader = request.headers.get('authorization') ?? '';
  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser(accessToken);
  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Read current profile to learn the old base + country.
  const { data: profile } = await supabase
    .from('profiles')
    .select('country, base_currency')
    .eq('id', user.id)
    .maybeSingle();

  const oldBase = profile?.base_currency ?? 'SAR';
  const country = profile?.country ?? null;

  if (oldBase === newBaseCurrency) {
    return NextResponse.json({ status: 'noop', message: 'New base equals old base' });
  }

  // Count transactions for status reporting.
  const { count: total = 0 } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { data: jobRow, error: jobErr } = await supabase
    .from('fx_recalculation_jobs')
    .insert({
      user_id: user.id,
      from_base: oldBase,
      to_base: newBaseCurrency,
      status: 'running',
      total_count: total ?? 0,
    })
    .select()
    .single();
  if (jobErr || !jobRow) {
    return NextResponse.json({ error: jobErr?.message ?? 'Could not create job' }, { status: 500 });
  }
  const jobId = jobRow.id;

  let processed = 0;
  // Cache resolved rates within this run by (currency_native, date)
  // so we don't hit the resolver repeatedly for transactions on the
  // same day in the same currency.
  const localRateCache = new Map<string, number>();

  try {
    let from = 0;
    while (true) {
      const { data: rows, error: txErr } = await supabase
        .from('transactions')
        .select('id, date, currency_native, amount_native')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .range(from, from + BATCH_SIZE - 1);
      if (txErr) throw new Error(txErr.message);
      if (!rows || rows.length === 0) break;

      for (const row of rows) {
        const cacheKey = `${row.currency_native}|${row.date}`;
        let rate = localRateCache.get(cacheKey);
        if (rate === undefined) {
          const resolved = await getRate({
            fromCurrency: row.currency_native,
            toCurrency: newBaseCurrency,
            date: row.date,
            countryCode: country,
          });
          rate = resolved.rate;
          localRateCache.set(cacheKey, rate);
        }
        const amountBase = Number(row.amount_native) * rate;
        const { error: updErr } = await supabase
          .from('transactions')
          .update({
            amount_base: amountBase,
            base_currency_at_entry: newBaseCurrency,
          })
          .eq('id', row.id);
        if (updErr) throw new Error(updErr.message);
        processed += 1;
      }

      // Heartbeat the job row after every batch.
      await supabase
        .from('fx_recalculation_jobs')
        .update({ processed_count: processed })
        .eq('id', jobId);

      if (rows.length < BATCH_SIZE) break;
      from += BATCH_SIZE;
    }

    // Persist the new base currency on the user's profile only after
    // the recalc completes successfully — that way the UI never
    // shows a half-converted state.
    await supabase
      .from('profiles')
      .update({ base_currency: newBaseCurrency, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    await supabase
      .from('fx_recalculation_jobs')
      .update({
        status: 'completed',
        processed_count: processed,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    return NextResponse.json({ jobId, status: 'completed', processed, total });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Recalc failed';
    await supabase
      .from('fx_recalculation_jobs')
      .update({
        status: 'failed',
        processed_count: processed,
        error: message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    return NextResponse.json({ jobId, status: 'failed', error: message, processed }, { status: 500 });
  }
}

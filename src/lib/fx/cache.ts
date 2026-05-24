import { getSupabaseServerClient } from '@/lib/supabaseServer';
import type { FxRate } from './types';

/**
 * fx_rates cache.
 *
 * Used by the resolver as the third tier (central bank → aggregator
 * → cache) and by the daily refresh route to persist rates that
 * other layers can later look up by date.
 */

export async function readCachedRate(
  date: string,
  fromCurrency: string,
  toCurrency: string,
): Promise<FxRate | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('fx_rates')
    .select('*')
    .eq('date', date)
    .eq('from_currency', fromCurrency)
    .eq('to_currency', toCurrency)
    .maybeSingle();

  if (error || !data) return null;
  return {
    date: data.date,
    fromCurrency: data.from_currency,
    toCurrency: data.to_currency,
    rate: Number(data.rate),
    source: data.source,
    fetchedAt: data.fetched_at,
  };
}

/** Look up the most recent cached rate for a pair, on or before `date`. */
export async function readCachedRateOnOrBefore(
  date: string,
  fromCurrency: string,
  toCurrency: string,
): Promise<FxRate | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('fx_rates')
    .select('*')
    .eq('from_currency', fromCurrency)
    .eq('to_currency', toCurrency)
    .lte('date', date)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    date: data.date,
    fromCurrency: data.from_currency,
    toCurrency: data.to_currency,
    rate: Number(data.rate),
    source: data.source,
    fetchedAt: data.fetched_at,
  };
}

export async function writeCachedRates(rates: FxRate[]): Promise<void> {
  if (rates.length === 0) return;
  const supabase = getSupabaseServerClient();
  const rows = rates.map((r) => ({
    date: r.date,
    from_currency: r.fromCurrency,
    to_currency: r.toCurrency,
    rate: r.rate,
    source: r.source,
    fetched_at: new Date().toISOString(),
  }));
  // Upsert on (date, from_currency, to_currency) — the primary key.
  const { error } = await supabase
    .from('fx_rates')
    .upsert(rows, { onConflict: 'date,from_currency,to_currency' });
  if (error) {
    console.error('[fx/cache] write failed:', error.message);
  }
}

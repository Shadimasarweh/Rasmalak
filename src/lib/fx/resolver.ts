import type { FxProvider, FxRate, ResolvedRate } from './types';
import { CENTRAL_BANK_PROVIDERS, aggregatorProvider } from './providers';
import { getCentralBankForCountry } from '@/lib/countries';
import { readCachedRate, readCachedRateOnOrBefore, writeCachedRates } from './cache';

/**
 * Rate resolver — the central piece of the FX engine.
 *
 * Order of resolution per the architecture document:
 *   1. Try the country-specific central bank provider for the user's
 *      base currency.
 *   2. If unavailable / errors / has no data for the date → fall to
 *      the aggregator.
 *   3. If the aggregator also fails → return the most recent cached
 *      rate on or before the requested date.
 *   4. If even that misses → throw.
 *
 * Successful resolutions write through to fx_rates so the next
 * lookup is a single DB read.
 *
 * Identity short-circuit: when from === to, returns rate=1 without
 * any network call.
 */

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ResolveParams {
  fromCurrency: string;
  toCurrency: string;
  /** Defaults to today. */
  date?: string;
  /**
   * When provided, the resolver picks the central-bank provider for
   * this country instead of inferring one from `fromCurrency`. Used
   * by the recalc job, which knows the user's onboarded country
   * even when the FROM currency is not the country's currency.
   */
  countryCode?: string | null;
}

export async function resolveRate(params: ResolveParams): Promise<ResolvedRate> {
  const { fromCurrency, toCurrency } = params;
  const date = params.date ?? todayIso();

  if (fromCurrency === toCurrency) {
    return {
      date,
      fromCurrency,
      toCurrency,
      rate: 1,
      source: 'cached',
      resolverPath: 'identity',
    };
  }

  // 0. Cache hit on the exact (date, from, to)?
  const exact = await readCachedRate(date, fromCurrency, toCurrency);
  if (exact) {
    return { ...exact, resolverPath: 'cache' };
  }

  // 1. Central bank — only when the FROM currency matches a CB's
  //    base, or when an explicit country was passed.
  const cbProvider = pickCentralBank(fromCurrency, params.countryCode);
  if (cbProvider) {
    try {
      const result = await cbProvider.fetchRates({
        baseCurrency: fromCurrency,
        targetCurrency: toCurrency,
        date,
      });
      const match = result.rates.find((r) => r.toCurrency === toCurrency);
      if (match) {
        const resolved: FxRate = { ...match, source: 'central_bank' };
        await writeCachedRates([resolved]);
        return { ...resolved, resolverPath: cbProvider.id };
      }
    } catch (err) {
      console.warn(`[fx/resolver] central bank ${cbProvider.id} failed:`, (err as Error).message);
    }
  }

  // 2. Aggregator fallback.
  try {
    const result = await aggregatorProvider.fetchRates({
      baseCurrency: fromCurrency,
      targetCurrency: toCurrency,
      date,
    });
    const match = result.rates.find((r) => r.toCurrency === toCurrency);
    if (match) {
      await writeCachedRates([match]);
      return { ...match, resolverPath: 'aggregator' };
    }
  } catch (err) {
    console.warn('[fx/resolver] aggregator failed:', (err as Error).message);
  }

  // 3. Most recent cached rate on or before the requested date.
  const recent = await readCachedRateOnOrBefore(date, fromCurrency, toCurrency);
  if (recent) {
    return { ...recent, resolverPath: 'cached_recent' };
  }

  throw new Error(
    `fx/resolver: no rate available for ${fromCurrency}→${toCurrency} on ${date}`,
  );
}

function pickCentralBank(
  fromCurrency: string,
  countryCode?: string | null,
): FxProvider | null {
  if (countryCode) {
    const slug = getCentralBankForCountry(countryCode);
    if (slug) return CENTRAL_BANK_PROVIDERS[slug];
  }
  // Inverse lookup: which CB has `fromCurrency` as its base?
  for (const provider of Object.values(CENTRAL_BANK_PROVIDERS)) {
    if (provider.baseCurrency === fromCurrency) return provider;
  }
  return null;
}

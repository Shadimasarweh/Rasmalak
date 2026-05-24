import { resolveRate } from './resolver';
import { aggregatorProvider } from './providers';
import { CENTRAL_BANK_PROVIDERS } from './providers';
import { writeCachedRates } from './cache';
import { isSupportedBaseCurrency } from '@/lib/countries';
import type { ResolvedRate } from './types';

/**
 * Public API for the FX engine. Other layers (transaction entry,
 * recalc job, daily refresh route, display-time conversions for
 * budgets/goals) consume this module and never reach into the
 * resolver / providers / cache directly.
 */

/** Single rate lookup. Used by the entry form and recalc. */
export async function getRate(args: {
  fromCurrency: string;
  toCurrency: string;
  date?: string;
  countryCode?: string | null;
}): Promise<ResolvedRate> {
  return resolveRate(args);
}

/**
 * Daily refresh — called by the cron route.
 *
 * For every base currency in `bases` we fetch the full rate set
 * from the country-specific central bank where available, falling
 * back to the aggregator otherwise. Results are upserted to
 * fx_rates so subsequent reads are local.
 */
export async function refreshAllRates(bases: string[]): Promise<{
  refreshedBases: string[];
  errors: Array<{ base: string; message: string }>;
}> {
  const errors: Array<{ base: string; message: string }> = [];
  const refreshedBases: string[] = [];

  for (const base of bases) {
    if (!isSupportedBaseCurrency(base)) {
      errors.push({ base, message: 'unsupported base' });
      continue;
    }

    let ok = false;
    // Try a central bank if one matches.
    for (const provider of Object.values(CENTRAL_BANK_PROVIDERS)) {
      if (provider.baseCurrency !== base) continue;
      try {
        const res = await provider.fetchRates({
          baseCurrency: base,
          targetCurrency: 'ALL',
        });
        const rates = res.rates.map((r) => ({ ...r, source: 'central_bank' as const }));
        await writeCachedRates(rates);
        ok = true;
        break;
      } catch (err) {
        errors.push({ base, message: `central bank: ${(err as Error).message}` });
      }
    }

    if (!ok) {
      try {
        const res = await aggregatorProvider.fetchRates({
          baseCurrency: base,
          targetCurrency: 'ALL',
        });
        await writeCachedRates(res.rates);
        ok = true;
      } catch (err) {
        errors.push({ base, message: `aggregator: ${(err as Error).message}` });
      }
    }

    if (ok) refreshedBases.push(base);
  }

  return { refreshedBases, errors };
}

import type { FetchParams, FxFetchResult, FxProvider, FxRate } from '../types';

/**
 * Aggregator fallback.
 *
 * Uses open.er-api.com which is free, requires no API key, and
 * exposes both current and historical (`/v6/historical/{date}`).
 * The provider returns rates expressed against any supplied base,
 * so it can serve as the catch-all when a central bank adapter is
 * unavailable, missing, or returns nothing for the requested date.
 *
 * If you need richer SLAs, swap this implementation for a paid
 * provider (e.g. openexchangerates) — the FxProvider contract is
 * stable.
 */

const ENDPOINT = 'https://open.er-api.com/v6/latest';
const HISTORICAL_ENDPOINT = 'https://open.er-api.com/v6/historical';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface OpenErApiResponse {
  result?: 'success' | 'error';
  base_code?: string;
  rates?: Record<string, number>;
  time_last_update_utc?: string;
  'error-type'?: string;
}

export const aggregatorProvider: FxProvider = {
  id: 'aggregator',
  label: 'open.er-api.com',
  baseCurrency: '*',

  async fetchRates(params: FetchParams): Promise<FxFetchResult> {
    const date = params.date ?? todayIso();
    const isToday = date === todayIso();

    const url = isToday
      ? `${ENDPOINT}/${encodeURIComponent(params.baseCurrency)}`
      : `${HISTORICAL_ENDPOINT}/${encodeURIComponent(params.baseCurrency)}/${date}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'rasmalak-fx/1.0' },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`aggregator: HTTP ${res.status}`);
    }

    const json = (await res.json()) as OpenErApiResponse;
    if (json.result !== 'success' || !json.rates) {
      throw new Error(`aggregator: ${json['error-type'] ?? 'unknown'} response`);
    }

    const rates: FxRate[] = [];
    if (params.targetCurrency === 'ALL') {
      for (const [to, rate] of Object.entries(json.rates)) {
        if (typeof rate === 'number' && Number.isFinite(rate)) {
          rates.push({
            date,
            fromCurrency: params.baseCurrency,
            toCurrency: to,
            rate,
            source: 'aggregator',
          });
        }
      }
    } else {
      const r = json.rates[params.targetCurrency];
      if (typeof r !== 'number' || !Number.isFinite(r)) {
        throw new Error(`aggregator: missing rate for ${params.targetCurrency}`);
      }
      rates.push({
        date,
        fromCurrency: params.baseCurrency,
        toCurrency: params.targetCurrency,
        rate: r,
        source: 'aggregator',
      });
    }

    return { rates, source: 'aggregator' };
  },
};

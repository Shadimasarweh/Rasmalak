/**
 * Shared types for the FX engine.
 *
 * The FX engine is a strict layer between user input and the
 * dual-layer transaction model. Every conversion that ends up locked
 * into amount_base goes through this module so the source of the
 * rate is always traceable via `rate_source`.
 */

export type FxRateSource = 'central_bank' | 'aggregator' | 'manual' | 'cached';

/** A single FX rate sample. `rate` always means: 1 unit of `from` = `rate` units of `to`. */
export interface FxRate {
  date: string;          // ISO date, e.g. '2026-05-20'
  fromCurrency: string;  // ISO 4217
  toCurrency: string;    // ISO 4217
  rate: number;
  source: FxRateSource;
  fetchedAt?: string;    // ISO timestamp, server-side only
}

/** Result returned by an FxProvider's fetch call. */
export interface FxFetchResult {
  rates: FxRate[];
  source: FxRateSource;
}

/**
 * Provider contract.
 *
 * Each central-bank adapter (SAMA, CBE, CBJ, CBUAE) implements this
 * interface and returns rates expressed against its native currency.
 * The aggregator implements it too and can return rates against any
 * supported base.
 *
 * Implementations are responsible for parsing whatever upstream
 * format the provider speaks (HTML scrape, XML feed, JSON API, etc.)
 * and for sane error handling — they should THROW on failure rather
 * than return partial results, so the resolver can fall back.
 */
export interface FxProvider {
  /** Stable identifier used as the `source` value when caching. */
  id: string;
  /** Human-readable label, mostly for logs and admin UI. */
  label: string;
  /**
   * Base currency this provider speaks against. The aggregator
   * provider sets this to '*' to indicate it can serve any base.
   */
  baseCurrency: string | '*';
  /** Fetch the rate(s) for a given date. */
  fetchRates(params: FetchParams): Promise<FxFetchResult>;
}

export interface FetchParams {
  /** Anchor currency (e.g. 'SAR' for SAMA). */
  baseCurrency: string;
  /** Target currency, or 'ALL' to fetch every rate the provider publishes. */
  targetCurrency: string | 'ALL';
  /** Optional historical date; defaults to today. */
  date?: string;
}

/** Result of resolving a rate via the central-bank-first chain. */
export interface ResolvedRate extends FxRate {
  /** Resolution path the resolver took ("sama", "aggregator", "cached", ...). */
  resolverPath: string;
}

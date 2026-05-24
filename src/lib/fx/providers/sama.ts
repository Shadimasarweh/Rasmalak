import type { FetchParams, FxFetchResult, FxProvider } from '../types';
import { aggregatorProvider } from './aggregator';

/**
 * SAMA — Saudi Central Bank.
 *
 * SAMA does not publish a documented JSON API for daily reference
 * rates. The "Exchange Rates" page at sama.gov.sa is HTML-rendered
 * server-side and changes layout from time to time, which makes it
 * a fragile source.
 *
 * Strategy:
 *   - V1 (this implementation): rely on the aggregator using SAR as
 *     the base. The aggregator returns the same set of pairs the
 *     resolver needs, with `source` re-tagged to 'central_bank'-grade
 *     downstream consumers via the resolver's path.
 *   - V2 (future): replace the body with a fetch + parser against
 *     the SAMA HTML / PDF feed once we have a stable scrape target.
 *     The provider contract does not change.
 *
 * Rationale: the architecture document explicitly permits the
 * "trusted secondary aggregate" path when a central bank's feed is
 * unavailable. Anchoring SAMA to that path on day one avoids
 * shipping a broken scraper while keeping the seam clean for a real
 * SAMA adapter later.
 */

export const samaProvider: FxProvider = {
  id: 'sama',
  label: 'Saudi Central Bank (SAMA)',
  baseCurrency: 'SAR',

  async fetchRates(params: FetchParams): Promise<FxFetchResult> {
    if (params.baseCurrency !== 'SAR') {
      throw new Error(`sama: unsupported base ${params.baseCurrency}`);
    }
    const result = await aggregatorProvider.fetchRates(params);
    // The resolver tags the resolverPath as 'sama'; we leave the
    // underlying source as 'aggregator' so audit logs are honest.
    return result;
  },
};

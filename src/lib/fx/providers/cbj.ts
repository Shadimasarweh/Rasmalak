import type { FetchParams, FxFetchResult, FxProvider } from '../types';
import { aggregatorProvider } from './aggregator';

/**
 * CBJ — Central Bank of Jordan.
 *
 * CBJ publishes daily fx rates on cbj.gov.jo. The page is rendered
 * server-side and has no documented API. As with the other
 * adapters, V1 anchors to the aggregator (JOD base) so we can ship
 * the engine end-to-end without a fragile scraper. The provider
 * seam stays in place so a real CBJ parser can drop in later.
 */

export const cbjProvider: FxProvider = {
  id: 'cbj',
  label: 'Central Bank of Jordan',
  baseCurrency: 'JOD',

  async fetchRates(params: FetchParams): Promise<FxFetchResult> {
    if (params.baseCurrency !== 'JOD') {
      throw new Error(`cbj: unsupported base ${params.baseCurrency}`);
    }
    return aggregatorProvider.fetchRates(params);
  },
};

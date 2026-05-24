import type { FetchParams, FxFetchResult, FxProvider } from '../types';
import { aggregatorProvider } from './aggregator';

/**
 * CBUAE — Central Bank of the UAE.
 *
 * CBUAE publishes daily exchange rates on centralbank.ae and has a
 * REST endpoint behind the public dashboard. The endpoint requires
 * an undocumented bearer token rotated daily by the page itself,
 * which is fragile to depend on directly. V1 anchors to the
 * aggregator on AED. V2 can swap to the real endpoint once we lock
 * down a stable auth path.
 */

export const cbuaeProvider: FxProvider = {
  id: 'cbuae',
  label: 'Central Bank of UAE',
  baseCurrency: 'AED',

  async fetchRates(params: FetchParams): Promise<FxFetchResult> {
    if (params.baseCurrency !== 'AED') {
      throw new Error(`cbuae: unsupported base ${params.baseCurrency}`);
    }
    return aggregatorProvider.fetchRates(params);
  },
};

import type { FetchParams, FxFetchResult, FxProvider } from '../types';
import { aggregatorProvider } from './aggregator';

/**
 * CBE — Central Bank of Egypt.
 *
 * CBE publishes daily exchange rates on cbe.org.eg (Arabic + English
 * pages). They expose a JSON-ish endpoint behind the public widget
 * but it requires CSRF tokens and changes shape. As with SAMA, the
 * stable path for V1 is the aggregator anchored on EGP, and V2 can
 * swap in a real CBE parser.
 */

export const cbeProvider: FxProvider = {
  id: 'cbe',
  label: 'Central Bank of Egypt',
  baseCurrency: 'EGP',

  async fetchRates(params: FetchParams): Promise<FxFetchResult> {
    if (params.baseCurrency !== 'EGP') {
      throw new Error(`cbe: unsupported base ${params.baseCurrency}`);
    }
    return aggregatorProvider.fetchRates(params);
  },
};

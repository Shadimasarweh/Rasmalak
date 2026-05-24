import type { FxProvider } from '../types';
import type { CentralBankProvider } from '@/lib/countries';
import { samaProvider } from './sama';
import { cbeProvider } from './cbe';
import { cbjProvider } from './cbj';
import { cbuaeProvider } from './cbuae';
import { aggregatorProvider } from './aggregator';

/**
 * Central bank provider registry, keyed by the country metadata's
 * `centralBank` slug. The resolver consults this map first; on miss
 * (country with `centralBank: null`) it goes straight to the
 * aggregator.
 */
export const CENTRAL_BANK_PROVIDERS: Record<CentralBankProvider, FxProvider> = {
  sama: samaProvider,
  cbe: cbeProvider,
  cbj: cbjProvider,
  cbuae: cbuaeProvider,
};

export { aggregatorProvider };

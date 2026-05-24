'use client';

import { useEffect, useMemo, useState } from 'react';

/**
 * Client-side hook that fetches an FX rate via /api/fx/quote.
 *
 * Mirrors the resolver's behaviour: the auto-populated value reflects
 * central-bank → aggregator → cache fallback. When `from === to` the
 * hook short-circuits to rate=1 and never hits the network.
 */

export interface FxQuote {
  rate: number;
  source: 'central_bank' | 'aggregator' | 'manual' | 'cached';
  resolverPath: string;
  date: string;
}

interface UseFxQuoteResult {
  quote: FxQuote | null;
  loading: boolean;
  error: string | null;
}

export function useFxQuote(args: {
  from: string;
  to: string;
  date?: string;
  country?: string | null;
}): UseFxQuoteResult {
  const { from, to, date, country } = args;
  // Identity rates are derived synchronously to avoid setState-in-effect
  // cascades when the user picks the same currency as their base.
  const identityQuote = useMemo<FxQuote | null>(() => {
    if (!from || !to) return null;
    if (from === to) return { rate: 1, source: 'cached', resolverPath: 'identity', date: date ?? '' };
    return null;
  }, [from, to, date]);

  const [fetchedQuote, setFetchedQuote] = useState<FxQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!from || !to || from === to) {
      // Identity case is already covered by the memo above.
      return;
    }

    const params = new URLSearchParams({ from, to });
    if (date) params.set('date', date);
    if (country) params.set('country', country);

    let cancelled = false;
    // Schedule the loading flag via a microtask so the effect body
    // doesn't trigger a synchronous re-render of consumers.
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
    });
    fetch(`/api/fx/quote?${params.toString()}`)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? `HTTP ${res.status}`);
          setFetchedQuote(null);
        } else {
          setFetchedQuote({
            rate: Number(json.rate),
            source: json.source,
            resolverPath: json.resolverPath ?? json.source,
            date: json.date,
          });
        }
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setFetchedQuote(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [from, to, date, country]);

  return {
    quote: identityQuote ?? fetchedQuote,
    loading,
    error,
  };
}

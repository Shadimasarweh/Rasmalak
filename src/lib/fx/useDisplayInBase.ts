'use client';

import { useEffect, useMemo, useState } from 'react';

/**
 * Hook for display-time conversion of "native" amounts (budget caps,
 * goal targets, emergency fund targets) into the user's current base
 * currency.
 *
 * All transaction aggregations are already in base currency (locked
 * at entry per the architecture document). When a budget or goal was
 * set in a different currency than the current base — typically
 * because the user changed their base in Settings — this hook fetches
 * the current FX rate and applies it. Same currency means rate=1 and
 * no network call.
 *
 * The hook returns the converted amount, the effective rate, and a
 * short status flag so callers can render a "≈" prefix for converted
 * values. It batches by (from, to, date) using window-level memo via
 * fetch caching; for high-volume lists, prefer building a map at the
 * page level and reusing the rates.
 */

export interface DisplayInBase {
  amount: number;
  rate: number;
  converted: boolean;
  loading: boolean;
}

export function useDisplayInBase(args: {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  date?: string;
}): DisplayInBase {
  const { amount, fromCurrency, toCurrency, date } = args;
  const isIdentity = fromCurrency === toCurrency || amount === 0;
  const [fetchedRate, setFetchedRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isIdentity) {
      // Same currency or zero amount — no network call needed.
      return;
    }
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });
    const params = new URLSearchParams({ from: fromCurrency, to: toCurrency });
    if (date) params.set('date', date);
    fetch(`/api/fx/quote?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (Number.isFinite(Number(json.rate)) && Number(json.rate) > 0) {
          setFetchedRate(Number(json.rate));
        } else {
          // Unable to resolve — fall back to identity so the UI still
          // shows something. The native amount is then displayed
          // unconverted.
          setFetchedRate(1);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setFetchedRate(1);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromCurrency, toCurrency, date, isIdentity]);

  return useMemo(() => {
    const effectiveRate = isIdentity ? 1 : fetchedRate ?? 1;
    return {
      amount: amount * effectiveRate,
      rate: effectiveRate,
      converted: !isIdentity && fetchedRate !== null && fetchedRate !== 1,
      loading: !isIdentity && loading,
    };
  }, [amount, fetchedRate, loading, isIdentity]);
}

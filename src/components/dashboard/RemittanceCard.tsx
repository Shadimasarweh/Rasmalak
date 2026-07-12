'use client';

/**
 * Remittance awareness — individual roadmap C1 (surface). "You usually
 * send ~X around day N" + rate context vs the 30-day average, shown
 * ONLY when the corridor is knowable from the user's own entries and
 * the move is ≥1%. Information, never execution. Ships dark behind
 * remittanceInsight.
 */

import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { Send } from 'lucide-react';
import { AI_FEATURES } from '@/ai/config';
import { detectRemittanceSeries } from '@/ai/deterministic/remittance';
import { usePredictiveState } from '@/lib/predictive/PredictiveProvider';
import { useTransactions } from '@/store/transactionStore';
import { useBaseCurrency } from '@/store/useStore';
import { supabase } from '@/lib/supabaseClient';
import { styledNum } from '@/components/StyledNumber';

interface RateContext {
  pair: string;
  pctVsAverage: number; // + = today buys more corridor currency
}

export default function RemittanceCard() {
  const intl = useIntl();
  const currency = useBaseCurrency();
  const { transactions } = useTransactions();
  const { state } = usePredictiveState();
  const [rateContext, setRateContext] = useState<RateContext | null>(null);

  const insight = useMemo(() => {
    if (!state) return null;
    const lite = transactions.map((t) => ({
      description: t.description,
      currency: t.currency,
      date: t.date,
    }));
    return detectRemittanceSeries(state.series, lite, currency)[0] ?? null;
  }, [state, transactions, currency]);

  useEffect(() => {
    if (!AI_FEATURES.remittanceInsight || !insight?.corridorCurrency) return;
    let cancelled = false;
    (async () => {
      try {
        const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
        const { data } = await supabase
          .from('fx_rates')
          .select('date, rate')
          .eq('from_currency', currency)
          .eq('to_currency', insight.corridorCurrency)
          .gte('date', since)
          .order('date', { ascending: true });
        if (cancelled || !data || data.length < 5) return;
        const rates = data.map((r) => Number(r.rate)).filter((r) => Number.isFinite(r) && r > 0);
        if (rates.length < 5) return;
        const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
        const latest = rates[rates.length - 1];
        const pct = ((latest - avg) / avg) * 100;
        if (Math.abs(pct) < 1) return;
        setRateContext({ pair: `${currency}→${insight.corridorCurrency}`, pctVsAverage: Math.round(pct * 10) / 10 });
      } catch {
        // rate context is a bonus — never block the card on it
      }
    })();
    return () => { cancelled = true; };
  }, [insight, currency]);

  if (!AI_FEATURES.remittanceInsight || !insight) return null;

  const fmt = (v: number) =>
    styledNum(intl.formatNumber(v, { style: 'currency', currency, maximumFractionDigits: 0 }));

  return (
    <div className="ds-card" style={{ marginBottom: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Send size={20} style={{ color: 'var(--color-primary)' }} />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
          {intl.formatMessage({ id: 'dashboard.remit_title', defaultMessage: 'Your regular transfer' })}
        </h3>
      </div>
      <p style={{ margin: 0, fontSize: '0.875rem' }}>
        {insight.typicalDay
          ? intl.formatMessage(
              { id: 'dashboard.remit_pattern_day', defaultMessage: 'You usually send about {amount}/month around day {day} — it’s already counted in your Safe to Spend.' },
              { amount: fmt(insight.monthlyAmount), day: styledNum(intl.formatNumber(insight.typicalDay)) },
            )
          : intl.formatMessage(
              { id: 'dashboard.remit_pattern', defaultMessage: 'You usually send about {amount}/month — it’s already counted in your Safe to Spend.' },
              { amount: fmt(insight.monthlyAmount) },
            )}
      </p>
      {rateContext && (
        <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: rateContext.pctVsAverage > 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
          {rateContext.pctVsAverage > 0
            ? intl.formatMessage(
                { id: 'dashboard.remit_rate_better', defaultMessage: '{pair}: today’s rate is {pct}% better than the 30-day average.' },
                { pair: rateContext.pair, pct: styledNum(intl.formatNumber(Math.abs(rateContext.pctVsAverage))) },
              )
            : intl.formatMessage(
                { id: 'dashboard.remit_rate_worse', defaultMessage: '{pair}: today’s rate is {pct}% below the 30-day average.' },
                { pair: rateContext.pair, pct: styledNum(intl.formatNumber(Math.abs(rateContext.pctVsAverage))) },
              )}
        </p>
      )}
    </div>
  );
}

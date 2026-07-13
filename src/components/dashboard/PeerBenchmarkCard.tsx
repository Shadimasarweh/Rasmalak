'use client';

/**
 * Peer benchmark — Phase 3, item 12 surfaced (volume-gated).
 *
 * "You save more than ~X% of Rasmalak users in {country}" — the
 * strongest engagement line in consumer finance, shown ONLY when it's
 * true and safe: the RPC returns nothing below a 25-user cohort
 * (k-anonymity, see migration 016), and the ~ is honest — three
 * percentiles support an approximation, not a ranking.
 *
 * Ships dark behind AI_FEATURES.peerBenchmark.
 */

import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { Users } from 'lucide-react';
import { AI_FEATURES } from '@/ai/config';
import {
  PeerStats,
  approximatePercentile,
  ownSavingsRate,
} from '@/ai/deterministic/peerBenchmark';
import { mapToEngineTransactions } from '@/lib/predictive/inputs';
import { usePredictiveState } from '@/lib/predictive/PredictiveProvider';
import { useTransactions } from '@/store/transactionStore';
import { useLanguage } from '@/store/useStore';
import { getCountryDisplayName } from '@/lib/countries';
import { supabase } from '@/lib/supabaseClient';
import { styledNum } from '@/components/StyledNumber';

export default function PeerBenchmarkCard() {
  const intl = useIntl();
  const language = useLanguage();
  const { transactions } = useTransactions();
  const { coldStart } = usePredictiveState();
  const [stats, setStats] = useState<PeerStats | null>(null);

  const countryCode = coldStart.countryCode;

  useEffect(() => {
    if (!AI_FEATURES.peerBenchmark || !countryCode) return;
    let cancelled = false;
    supabase
      .rpc('get_peer_savings_stats', { p_country: countryCode })
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row || row.cohort_size == null) return;
        setStats({
          cohortSize: Number(row.cohort_size),
          p25: Number(row.p25),
          p50: Number(row.p50),
          p75: Number(row.p75),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  const rate = useMemo(
    () => ownSavingsRate(mapToEngineTransactions(transactions)),
    [transactions],
  );

  if (!AI_FEATURES.peerBenchmark || !stats || rate === null || !countryCode) return null;

  const percentile = approximatePercentile(rate, stats);
  const countryName = getCountryDisplayName(countryCode, language === 'ar' ? 'ar' : 'en');

  return (
    <div className="ds-card" style={{ marginBottom: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Users size={20} style={{ color: 'var(--color-primary)' }} />
        <div style={{ fontSize: '0.9rem' }}>
          <div style={{ fontWeight: 700 }}>
            {intl.formatMessage(
              {
                id: 'dashboard.peer_headline',
                defaultMessage: 'You save more than ~{percent}% of Rasmalak users in {country}.',
              },
              {
                percent: styledNum(intl.formatNumber(percentile)),
                country: countryName,
              },
            )}
          </div>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem', marginTop: 2 }}>
            {intl.formatMessage(
              {
                id: 'dashboard.peer_footnote',
                defaultMessage:
                  'Anonymous comparison of savings rates across {count} users — amounts never leave anyone’s account.',
              },
              { count: styledNum(intl.formatNumber(stats.cohortSize)) },
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

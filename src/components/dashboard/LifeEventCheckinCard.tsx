'use client';

/**
 * Life-event check-in — Pillar E. A respectful question, never a
 * conclusion: the engine noticed the category mix changed (new
 * sustained category / housing jump); the user decides whether it
 * means anything. "Review my plan" goes to the Plan tab where the
 * auto-budget re-runs on the new reality; declining dismisses this
 * event permanently. No memory writes, no re-profiling from here.
 * Ships dark behind lifeEventCheckin.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { Sparkles, X } from 'lucide-react';
import { AI_FEATURES } from '@/ai/config';
import { detectLifeEvents } from '@/ai/deterministic/lifeEvents';
import { mapToEngineTransactions } from '@/lib/predictive/inputs';
import { useTransactions } from '@/store/transactionStore';
import { useBaseCurrency, useLanguage } from '@/store/useStore';
import { DEFAULT_EXPENSE_CATEGORIES } from '@/lib/constants';
import { styledNum } from '@/components/StyledNumber';

const dismissKey = (eventKey: string) => `rasmalak:life-event-dismissed:${eventKey}`;

export default function LifeEventCheckinCard() {
  const intl = useIntl();
  const language = useLanguage();
  const currency = useBaseCurrency();
  const { transactions } = useTransactions();
  const [dismissed, setDismissed] = useState(false);

  const event = useMemo(() => {
    if (!AI_FEATURES.lifeEventCheckin) return null;
    const events = detectLifeEvents(mapToEngineTransactions(transactions));
    return (
      events.find(
        (e) =>
          typeof window === 'undefined' ||
          window.localStorage.getItem(dismissKey(e.key)) !== '1',
      ) ?? null
    );
  }, [transactions]);

  if (!AI_FEATURES.lifeEventCheckin || !event || dismissed) return null;

  const isRTL = language === 'ar';
  const meta = DEFAULT_EXPENSE_CATEGORIES.find((c) => c.id === event.categoryId);
  const catLabel = meta ? (isRTL ? meta.nameAr : meta.name) : event.categoryId;
  const fmt = (v: number) =>
    styledNum(intl.formatNumber(v, { style: 'currency', currency, maximumFractionDigits: 0 }));
  const dismiss = () => {
    window.localStorage.setItem(dismissKey(event.key), '1');
    setDismissed(true);
  };

  return (
    <div className="ds-card" style={{ marginBottom: 'var(--space-lg)', position: 'relative' }}>
      <button
        onClick={dismiss}
        aria-label={intl.formatMessage({ id: 'dashboard.life_dismiss', defaultMessage: 'Dismiss' })}
        style={{ position: 'absolute', insetInlineEnd: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
      >
        <X size={16} />
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
          {intl.formatMessage({ id: 'dashboard.life_title', defaultMessage: 'Looks like something changed' })}
        </h3>
      </div>
      <p style={{ margin: '0 0 10px', fontSize: '0.875rem' }}>
        {event.kind === 'housing_jump'
          ? intl.formatMessage(
              { id: 'dashboard.life_housing', defaultMessage: 'Housing has been running {recent}/month lately, up from {prior}. New place?' },
              { recent: fmt(event.evidence.recentMonthlyAvg), prior: fmt(event.evidence.priorMonthlyAvg) },
            )
          : intl.formatMessage(
              { id: 'dashboard.life_new_category', defaultMessage: '“{category}” is new in your spending — around {recent}/month for two months now.' },
              { category: catLabel, recent: fmt(event.evidence.recentMonthlyAvg) },
            )}
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link href="/money/plan" className="ds-btn ds-btn-primary" style={{ fontSize: '0.8rem' }} onClick={dismiss}>
          {intl.formatMessage({ id: 'dashboard.life_review', defaultMessage: 'Review my plan' })}
        </Link>
        <button className="ds-btn ds-btn-ghost" onClick={dismiss} style={{ fontSize: '0.8rem' }}>
          {intl.formatMessage({ id: 'dashboard.life_keep', defaultMessage: 'All good — keep as is' })}
        </button>
      </div>
    </div>
  );
}

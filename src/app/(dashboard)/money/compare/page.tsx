'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { GitCompare } from 'lucide-react';
import { useLanguage } from '@/store/useStore';
import CategoryComparisonTable from '@/components/money/CategoryComparisonTable';
import RealityCheckCard from '@/components/money/RealityCheckCard';

/**
 * Compare — the bridge between Plan and Track.
 *
 * Two views:
 *   - "This month" (default): live view of how the current month is
 *     tracking against the plan.
 *   - "Last month": closed-book view that pairs with the Reality Check
 *     banner and is the primary surface for the "improve next month's
 *     plan" loop.
 */
export default function ComparePage() {
  const intl = useIntl();
  const language = useLanguage();
  const isRTL = language === 'ar';

  const [period, setPeriod] = useState<'this' | 'last'>('this');
  const monthOffset = period === 'this' ? 0 : -1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* HEADER */}
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--ds-text-heading)', marginBottom: '4px' }}>
          <GitCompare size={18} />
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {intl.formatMessage({ id: 'money.timeline_compare' })}
          </span>
        </div>
        <h1 className="ds-title-page" style={{ marginBottom: '4px' }}>
          {intl.formatMessage({ id: 'money.compare_title' })}
        </h1>
        <p className="ds-body" style={{ marginTop: 0 }}>
          {intl.formatMessage({ id: 'money.compare_subtitle' })}
        </p>
      </div>

      {/* REALITY CHECK — only shows when last month had data */}
      <RealityCheckCard variant="card" />

      {/* PERIOD SWITCHER */}
      <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {([
            { id: 'this', label: intl.formatMessage({ id: 'transactions.this_month', defaultMessage: 'This month' }) },
            { id: 'last', label: intl.formatMessage({ id: 'transactions.last_month', defaultMessage: 'Last month' }) },
          ] as const).map((p) => {
            const active = period === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: active ? 'var(--ds-text-heading)' : 'transparent',
                  color: active ? '#FFFFFF' : 'var(--ds-text-body)',
                  border: active ? 'none' : '0.5px solid var(--ds-border)',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <CategoryComparisonTable monthOffset={monthOffset} hideEmptyRows />
      </div>

      {/* CTAs to the related tabs */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <Link
          href="/money/plan"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            background: 'var(--ds-plan)',
            color: '#FFFFFF',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          {intl.formatMessage({ id: 'money.compare_cta_set_plan' })}
        </Link>
        <Link
          href="/money/track/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            background: 'var(--ds-actual)',
            color: '#FFFFFF',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          {intl.formatMessage({ id: 'money.compare_cta_track' })}
        </Link>
      </div>
    </div>
  );
}

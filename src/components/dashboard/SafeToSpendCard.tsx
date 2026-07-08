'use client';

/**
 * Safe-to-Spend hero (A3 — المتاح للصرف).
 *
 * Full-width strip between the greeting and the monthly summary. The
 * flagship personal number: what's actually left to spend today after
 * committed bills, planned goal funding, and a safety buffer.
 *
 * States: hidden (flag off / no history / no salary signal), full
 * (detected salary → payday window), estimate (onboarding income fallback
 * → calendar window, "تقديري" badge), negative (honest red, never clamped).
 * "لماذا هذا الرقم؟" expands an inline itemized ledger — no modal.
 */

import { useState } from 'react';
import { useIntl } from 'react-intl';
import { AI_FEATURES } from '@/ai/config';
import { usePredictiveState } from '@/lib/predictive/PredictiveProvider';
import { useBaseCurrency, useLanguage } from '@/store/useStore';
import { styledNum } from '@/components/StyledNumber';

export default function SafeToSpendCard() {
  const intl = useIntl();
  const language = useLanguage();
  const currency = useBaseCurrency();
  const { state } = usePredictiveState();
  const [expanded, setExpanded] = useState(false);

  if (!AI_FEATURES.safeToSpendCard || !state || !state.meta.hasMinimumHistory) return null;
  const { salary, safeToSpend } = state;
  if (salary.source === 'none') return null;

  const isRTL = language === 'ar';
  const isEstimate = salary.source === 'profile_fallback';
  const negative = safeToSpend.isNegative;

  const fmtCurrency = (value: number) =>
    styledNum(intl.formatNumber(value, { style: 'currency', currency }));

  const breakdownRows: Array<{ label: string; amount: number; sign: '+' | '−' | '=' }> = [
    {
      label: intl.formatMessage({ id: 'dashboard.sts_breakdown_balance', defaultMessage: 'Current balance' }),
      amount: safeToSpend.breakdown.currentBalance,
      sign: '+',
    },
    {
      label: intl.formatMessage(
        { id: 'dashboard.sts_breakdown_committed', defaultMessage: 'Upcoming bills this cycle ({count})' },
        { count: state.forecast.committed.items.length },
      ),
      amount: -safeToSpend.breakdown.committedRemaining,
      sign: '−',
    },
    {
      label: intl.formatMessage({ id: 'dashboard.sts_breakdown_goals', defaultMessage: 'Goal contributions this cycle' }),
      amount: -safeToSpend.breakdown.goalContributionsRemaining,
      sign: '−',
    },
    {
      label: intl.formatMessage({ id: 'dashboard.sts_breakdown_buffer', defaultMessage: 'Safety buffer' }),
      amount: -safeToSpend.breakdown.reserveBuffer,
      sign: '−',
    },
    {
      label: intl.formatMessage({ id: 'dashboard.sts_breakdown_total', defaultMessage: 'Safe to spend' }),
      amount: safeToSpend.total,
      sign: '=',
    },
  ];

  return (
    <div
      className={negative ? '' : 'ds-card-hero'}
      style={{
        marginBottom: 'var(--spacing-4)',
        animation: 'fadeIn 300ms ease-out',
        direction: isRTL ? 'rtl' : 'ltr',
        ...(negative
          ? {
              background: 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 50%, #DC2626 100%)',
              border: 'none',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--spacing-5)',
              boxShadow: '0 4px 24px rgba(220, 38, 38, 0.25)',
              color: '#FFFFFF',
            }
          : {}),
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--spacing-5)' }}>
        {/* Primary: available today */}
        <div style={{ minWidth: '160px' }}>
          <p className="ds-label" style={{ color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', marginBottom: 'var(--spacing-1)' }}>
            {intl.formatMessage({ id: 'dashboard.sts_today_label', defaultMessage: 'Available today' })}
            {isEstimate && (
              <span
                className="ds-badge"
                style={{ marginInlineStart: 'var(--spacing-2)', background: 'rgba(255,255,255,0.18)', color: '#FFFFFF' }}
              >
                {intl.formatMessage({ id: 'dashboard.sts_estimate_badge', defaultMessage: 'Estimate' })}
              </span>
            )}
          </p>
          <div className="ds-metric" style={{ color: '#FFFFFF', fontSize: 'clamp(1.5rem, 4vw, 2.1rem)' }}>
            {fmtCurrency(negative ? safeToSpend.total : safeToSpend.perDay)}
          </div>
          {!negative && (
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', marginTop: 'var(--spacing-1)' }}>
              {intl.formatMessage({ id: 'dashboard.sts_per_day_hint', defaultMessage: 'per day' })}
            </p>
          )}
        </div>

        {/* Secondary: cycle total + horizon */}
        <div style={{ borderInlineStart: '1px solid rgba(255,255,255,0.25)', paddingInlineStart: 'var(--spacing-5)' }}>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px' }}>
            {intl.formatMessage({ id: 'dashboard.sts_cycle_total_label', defaultMessage: 'Left this cycle' })}
          </p>
          <div className="ds-metric-sm" style={{ color: '#FFFFFF' }}>{fmtCurrency(safeToSpend.total)}</div>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', marginTop: 'var(--spacing-1)' }}>
            {salary.source === 'detected'
              ? intl.formatMessage(
                  { id: 'dashboard.sts_days_to_payday', defaultMessage: '{days, plural, one {# day} other {# days}} until payday' },
                  { days: safeToSpend.daysToPayday },
                )
              : intl.formatMessage(
                  { id: 'dashboard.sts_until_cycle_end', defaultMessage: '{days, plural, one {# day} other {# days}} until month end' },
                  { days: safeToSpend.daysToPayday },
                )}
          </p>
        </div>

        {/* Trailing: explainer toggle */}
        <div style={{ marginInlineStart: 'auto' }}>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            style={{
              background: 'rgba(255,255,255,0.14)',
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {intl.formatMessage({ id: 'dashboard.sts_why_button', defaultMessage: 'Why this number?' })}
          </button>
        </div>
      </div>

      {negative && (
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', marginTop: 'var(--spacing-3)' }}>
          {intl.formatMessage({
            id: 'dashboard.sts_negative_hint',
            defaultMessage: "Committed bills and goals exceed your balance this cycle. Review what's due.",
          })}
        </p>
      )}

      {isEstimate && !negative && (
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginTop: 'var(--spacing-2)' }}>
          {intl.formatMessage({
            id: 'dashboard.sts_estimate_hint',
            defaultMessage: 'Based on the income you shared during onboarding.',
          })}
        </p>
      )}

      {expanded && (
        <div
          style={{
            marginTop: 'var(--spacing-4)',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: 'var(--spacing-4)',
          }}
        >
          {breakdownRows.map((row, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 'var(--spacing-4)',
                padding: '6px 0',
                color: '#FFFFFF',
                fontSize: '13.5px',
                borderTop: row.sign === '=' ? '1px solid rgba(255,255,255,0.3)' : 'none',
                fontWeight: row.sign === '=' ? 600 : 400,
              }}
            >
              <span>{row.sign !== '+' ? `${row.sign} ` : ''}{row.label}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(row.amount)}</span>
            </div>
          ))}
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginTop: 'var(--spacing-2)' }}>
            {intl.formatMessage(
              { id: 'dashboard.sts_per_day_formula', defaultMessage: '÷ {days} days to payday → {perDay} / day' },
              {
                days: intl.formatNumber(safeToSpend.daysToPayday),
                perDay: intl.formatNumber(safeToSpend.perDay, { style: 'currency', currency }),
              },
            )}
          </p>
        </div>
      )}
    </div>
  );
}

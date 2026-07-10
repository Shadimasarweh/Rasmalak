'use client';

/**
 * Ramadan mode — وضع رمضان (individual roadmap C2, engine Phase 2 item 8).
 *
 * Appears in the pre-Ramadan lead window (and through Eid al-Fitr):
 * proposes per-category budget adjustments from the user's OWN prior
 * Ramadan when we have it, or clearly-labelled general regional
 * guidance when we don't, plus an Eid envelope suggestion from last
 * year's Eid spend. One tap re-scales the affected category budgets;
 * dismissal is per-hijri-year, so next year it earns another chance.
 *
 * Ships dark behind AI_FEATURES.ramadanMode.
 */

import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { MoonStar, X } from 'lucide-react';
import { AI_FEATURES } from '@/ai/config';
import { buildRamadanPlan, RamadanPlan } from '@/ai/deterministic/ramadanSeasonality';
import { eidAlFitrWindow, utcNoon } from '@/ai/deterministic/hijri';
import { mapToEngineTransactions } from '@/lib/predictive/inputs';
import { useTransactions } from '@/store/transactionStore';
import { useBudget } from '@/store/budgetStore';
import { useBaseCurrency, useLanguage } from '@/store/useStore';
import { DEFAULT_EXPENSE_CATEGORIES } from '@/lib/constants';
import { styledNum } from '@/components/StyledNumber';

/** Days before Ramadan at which the card starts appearing. */
export const RAMADAN_MODE_LEAD_DAYS = 45;

/** Show at most this many category rows — the biggest shifts. */
const MAX_ROWS = 4;

const dismissKey = (hijriYear: number) => `rasmalak:ramadan-mode-dismissed:${hijriYear}`;

export function shouldShowRamadanCard(plan: RamadanPlan, now: Date): boolean {
  if (plan.daysUntilStart > RAMADAN_MODE_LEAD_DAYS) return false;
  // Stay useful through the Eid days, then disappear until next year.
  const eid = eidAlFitrWindow(plan.hijriYear);
  return utcNoon(now).getTime() < eid.endExclusive.getTime();
}

const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

export default function RamadanModeCard() {
  const intl = useIntl();
  const language = useLanguage();
  const currency = useBaseCurrency();
  const { transactions } = useTransactions();
  const { categoryBudgets, setCategoryBudget } = useBudget();
  const [dismissed, setDismissed] = useState(false);
  const [applied, setApplied] = useState(false);

  const now = useMemo(() => new Date(), []);
  const plan = useMemo(
    () =>
      AI_FEATURES.ramadanMode
        ? buildRamadanPlan({ transactions: mapToEngineTransactions(transactions), now })
        : null,
    [transactions, now],
  );

  if (!AI_FEATURES.ramadanMode || !plan) return null;
  if (!shouldShowRamadanCard(plan, now)) return null;
  if (dismissed) return null;
  if (typeof window !== 'undefined' && window.localStorage.getItem(dismissKey(plan.hijriYear)) === '1') {
    return null;
  }

  const isRTL = language === 'ar';
  const personal = plan.source === 'personal';

  const rows = plan.adjustments.slice(0, MAX_ROWS).map((adj) => {
    const meta = DEFAULT_EXPENSE_CATEGORIES.find((c) => c.id === adj.categoryId);
    const current = categoryBudgets[adj.categoryId];
    return {
      ...adj,
      label: meta ? (isRTL ? meta.nameAr : meta.name) : adj.categoryId,
      currentBudget: current && current > 0 ? current : null,
      suggestedBudget: current && current > 0 ? round5(current * adj.factor) : null,
    };
  });
  const applicable = rows.filter((r) => r.suggestedBudget !== null && r.suggestedBudget !== r.currentBudget);

  const fmtCurrency = (value: number) =>
    styledNum(intl.formatNumber(value, { style: 'currency', currency, maximumFractionDigits: 0 }));
  const fmtShift = (factor: number) => {
    const pct = Math.round(Math.abs(factor - 1) * 100) / 100;
    const sign = factor >= 1 ? '+' : '−';
    return `${sign}${styledNum(intl.formatNumber(pct, { style: 'percent' }))}`;
  };

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(dismissKey(plan.hijriYear), '1');
    }
    setDismissed(true);
  };

  const apply = () => {
    for (const row of applicable) {
      setCategoryBudget(row.categoryId, row.suggestedBudget as number);
    }
    setApplied(true);
  };

  return (
    <div
      className="ds-card"
      style={{
        marginBottom: 'var(--space-lg)',
        borderInlineStart: '4px solid var(--color-accent-gold)',
        position: 'relative',
      }}
    >
      <button
        onClick={dismiss}
        aria-label={intl.formatMessage({ id: 'dashboard.ramadan_dismiss', defaultMessage: 'Dismiss' })}
        style={{
          position: 'absolute', insetInlineEnd: 12, top: 12,
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)',
        }}
      >
        <X size={16} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <MoonStar size={20} style={{ color: 'var(--color-accent-gold)' }} />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
          {intl.formatMessage({ id: 'dashboard.ramadan_title', defaultMessage: 'Ramadan mode' })}
        </h3>
        <span
          style={{
            fontSize: '0.75rem', fontWeight: 600, padding: '2px 10px', borderRadius: 999,
            background: 'var(--color-primary-light)', color: 'var(--color-primary)',
          }}
        >
          {plan.daysUntilStart > 0
            ? intl.formatMessage(
                { id: 'dashboard.ramadan_countdown', defaultMessage: '{days, plural, one {# day to go} other {# days to go}}' },
                { days: plan.daysUntilStart },
              )
            : intl.formatMessage({ id: 'dashboard.ramadan_ongoing', defaultMessage: 'Ramadan Kareem' })}
        </span>
      </div>

      <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
        {personal
          ? intl.formatMessage({
              id: 'dashboard.ramadan_source_personal',
              defaultMessage: 'Based on how your spending actually changed last Ramadan.',
            })
          : intl.formatMessage({
              id: 'dashboard.ramadan_source_general',
              defaultMessage: 'General guidance for your region — your first Ramadan with us will make this personal.',
            })}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((row) => (
          <div
            key={row.categoryId}
            style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: '0.875rem' }}
          >
            <span style={{ fontWeight: 600 }}>{row.label}</span>
            <span style={{ color: row.factor >= 1 ? 'var(--color-accent-gold)' : 'var(--color-primary)' }}>
              {fmtShift(row.factor)}
            </span>
            {row.suggestedBudget !== null && (
              <span style={{ marginInlineStart: 'auto', color: 'var(--color-text-secondary)' }}>
                {intl.formatMessage(
                  { id: 'dashboard.ramadan_budget_shift', defaultMessage: '{from} → {to}' },
                  { from: fmtCurrency(row.currentBudget as number), to: fmtCurrency(row.suggestedBudget) },
                )}
              </span>
            )}
          </div>
        ))}
      </div>

      {plan.eidEnvelope && (
        <p style={{ margin: '10px 0 0', fontSize: '0.85rem' }}>
          {intl.formatMessage(
            {
              id: 'dashboard.ramadan_eid_envelope',
              defaultMessage: 'Eid envelope: set aside {amount} — that’s what last Eid cost you.',
            },
            { amount: fmtCurrency(plan.eidEnvelope.suggestedAmount) },
          )}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        {applied ? (
          <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 600 }}>
            {intl.formatMessage({ id: 'dashboard.ramadan_applied', defaultMessage: 'Budgets adjusted for Ramadan.' })}
          </span>
        ) : (
          <>
            <button className="ds-btn ds-btn-primary" onClick={apply} disabled={applicable.length === 0}>
              {intl.formatMessage({ id: 'dashboard.ramadan_apply', defaultMessage: 'Adjust my budgets' })}
            </button>
            <button className="ds-btn ds-btn-ghost" onClick={dismiss}>
              {intl.formatMessage({ id: 'dashboard.ramadan_not_now', defaultMessage: 'Not this year' })}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

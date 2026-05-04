'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useLanguage, useCurrency } from '@/store/useStore';
import { useTransactions, getMonthRange, aggregateExpensesByCategory } from '@/store/transactionStore';
import { useBudget } from '@/store/budgetStore';
import { CURRENCIES } from '@/lib/constants';
import { styledNum } from '@/components/StyledNumber';
import { ArrowRight, X } from 'lucide-react';

/**
 * Reality check — the moment last month's plan meets last month's reality.
 *
 * Surface rules:
 *   - Only renders if the previous month had at least one expense AND a
 *     monthly plan was set (otherwise there's nothing to compare).
 *   - Auto-dismisses if a banner-level dismiss is set for that specific
 *     month-key in localStorage. We use month-key (not session) so it
 *     reappears next month even after dismissal.
 *   - The "show within first N days" gating is enforced by the parent
 *     so this component stays display-pure and easy to test.
 */

interface Props {
  /** Variant: dashboard banner (compact) or page card (full). */
  variant?: 'banner' | 'card';
  /** Override "today" for testing/storybook. */
  now?: Date;
}

function lastMonthKey(now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const DISMISS_PREFIX = 'rasmalak.realityCheckDismissed.';

function isDismissed(monthKey: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DISMISS_PREFIX + monthKey) === '1';
  } catch {
    return false;
  }
}
function dismiss(monthKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DISMISS_PREFIX + monthKey, '1');
  } catch {
    // Ignore storage errors.
  }
}

export default function RealityCheckCard({ variant = 'card', now }: Props) {
  const intl = useIntl();
  const language = useLanguage();
  const currency = useCurrency();
  const isRTL = language === 'ar';
  const { transactions } = useTransactions();
  const { monthlyBudget, categoryBudgets } = useBudget();

  const today = useMemo(() => now ?? new Date(), [now]);
  const mKey = lastMonthKey(today);

  const [dismissedTick, setDismissedTick] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  // dismissedTick is intentionally included to re-evaluate after dismissal
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dismissed = useMemo(() => hydrated && isDismissed(mKey), [hydrated, mKey, dismissedTick]);

  const { planned, actual, hasData } = useMemo(() => {
    const range = getMonthRange(-1, today);
    const cats = aggregateExpensesByCategory(transactions, range);
    const actualSum = Object.values(cats).reduce((s, v) => s + v, 0);

    // Use monthlyBudget when set, otherwise sum of category budgets.
    const categorySum = Object.values(categoryBudgets).reduce((s, v) => s + (Number(v) || 0), 0);
    const plannedSum = monthlyBudget > 0 ? monthlyBudget : categorySum;

    return { planned: plannedSum, actual: actualSum, hasData: actualSum > 0 && plannedSum > 0 };
  }, [transactions, monthlyBudget, categoryBudgets, today]);

  if (!hasData || dismissed) return null;

  const currencyInfo = CURRENCIES.find((c) => c.code === currency);
  const symbol = isRTL
    ? currencyInfo?.symbolAr || currencyInfo?.symbol || currency
    : currencyInfo?.symbol || currency;

  const diff = actual - planned;
  const fmt = (n: number) => styledNum(intl.formatNumber(Math.round(n)));
  const plannedStr = `${symbol} ${intl.formatNumber(Math.round(planned))}`;
  const actualStr = `${symbol} ${intl.formatNumber(Math.round(actual))}`;

  const verdict = diff > 0
    ? intl.formatMessage({ id: 'money.reality_check_over_by' }, { amount: <>{symbol} {fmt(Math.abs(diff))}</> })
    : diff < 0
      ? intl.formatMessage({ id: 'money.reality_check_under_by' }, { amount: <>{symbol} {fmt(Math.abs(diff))}</> })
      : intl.formatMessage({ id: 'money.reality_check_on_track' });

  const verdictColor = diff > 0 ? 'var(--ds-over)' : diff < 0 ? 'var(--ds-actual)' : 'var(--ds-text-muted)';

  const isBanner = variant === 'banner';

  return (
    <div
      style={{
        background: 'var(--ds-bg-card)',
        border: '0.5px solid var(--ds-border)',
        borderRadius: isBanner ? '12px' : '16px',
        padding: isBanner ? '14px 18px' : '20px 24px',
        boxShadow: 'var(--ds-shadow-card)',
        direction: isRTL ? 'rtl' : 'ltr',
        position: 'relative',
      }}
    >
      <button
        type="button"
        aria-label={intl.formatMessage({ id: 'money.reality_check_dismiss' })}
        onClick={() => { dismiss(mKey); setDismissedTick((t) => t + 1); }}
        style={{
          position: 'absolute',
          top: '10px',
          insetInlineEnd: '10px',
          background: 'transparent',
          border: 'none',
          padding: '4px',
          borderRadius: '6px',
          cursor: 'pointer',
          color: 'var(--ds-text-muted)',
          display: 'inline-flex',
        }}
      >
        <X size={14} />
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: isBanner ? '13px' : '14px',
              fontWeight: 600,
              color: 'var(--ds-text-heading)',
              margin: 0,
              fontFeatureSettings: '"kern" 1',
            }}
          >
            {intl.formatMessage({ id: 'money.reality_check_title' })}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--ds-text-body)', margin: '6px 0 0 0', lineHeight: 1.55 }}>
            {intl.formatMessage(
              { id: 'money.reality_check_summary' },
              {
                planned: <span style={{ color: 'var(--ds-plan)', fontWeight: 600 }}>{plannedStr}</span>,
                actual: <span style={{ color: 'var(--ds-actual)', fontWeight: 600 }}>{actualStr}</span>,
              },
            )}
          </p>
          <p style={{ fontSize: '13px', color: verdictColor, margin: '4px 0 0 0', fontWeight: 600 }}>
            {verdict}
          </p>
        </div>

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
            flexShrink: 0,
          }}
        >
          {intl.formatMessage({ id: 'money.reality_check_cta' })}
          <ArrowRight size={14} style={{ transform: isRTL ? 'scaleX(-1)' : undefined }} />
        </Link>
      </div>
    </div>
  );
}

/** Helper: should the banner show today? Used by parents to gate rendering. */
export function shouldShowRealityCheck(now: Date = new Date(), windowDays: number = 5): boolean {
  // Show within the first N days of a new month.
  return now.getDate() <= windowDays;
}

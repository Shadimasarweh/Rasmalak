'use client';

/**
 * School-fees sinking fund — individual roadmap C5. When the detected
 * annual education pulse is 2 weeks to 4 months out, propose the clean
 * monthly amount that has it covered by the due date — one tap creates
 * the goal with fixed monthly funding. Ships dark behind
 * schoolFeesPlanner.
 */

import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { GraduationCap, X } from 'lucide-react';
import { AI_FEATURES } from '@/ai/config';
import { detectSchoolFeesPulse } from '@/ai/deterministic/schoolFees';
import { usePredictiveState } from '@/lib/predictive/PredictiveProvider';
import { useGoals } from '@/store/goalsStore';
import { useBaseCurrency, useLanguage } from '@/store/useStore';
import { styledNum } from '@/components/StyledNumber';

const dismissKey = (seriesKey: string, due: string) => `rasmalak:school-fees-dismissed:${seriesKey}:${due}`;

export default function SchoolFeesCard() {
  const intl = useIntl();
  const language = useLanguage();
  const currency = useBaseCurrency();
  const { state } = usePredictiveState();
  const { savingsGoals, addSavingsGoal } = useGoals();
  const [dismissed, setDismissed] = useState(false);

  const suggestion = useMemo(
    () => (state ? detectSchoolFeesPulse(state.series)[0] ?? null : null),
    [state],
  );

  if (!AI_FEATURES.schoolFeesPlanner || !suggestion || dismissed) return null;
  if (
    typeof window !== 'undefined' &&
    window.localStorage.getItem(dismissKey(suggestion.seriesKey, suggestion.dueDateIso)) === '1'
  ) {
    return null;
  }

  const isRTL = language === 'ar';
  const fmt = (v: number) =>
    styledNum(intl.formatNumber(v, { style: 'currency', currency, maximumFractionDigits: 0 }));
  const year = suggestion.dueDateIso.slice(0, 4);
  const goalName = `School fees ${year}`;
  const goalExists = savingsGoals.some((g) => g.name === goalName);

  const dismiss = () => {
    window.localStorage.setItem(dismissKey(suggestion.seriesKey, suggestion.dueDateIso), '1');
    setDismissed(true);
  };
  const createGoal = () => {
    if (goalExists) return;
    addSavingsGoal({
      name: goalName,
      nameAr: `رسوم المدرسة ${year}`,
      targetAmount: suggestion.amount,
      currentAmount: 0,
      deadline: suggestion.dueDateIso,
      color: '#6366F1'.replace('#6366F1', '#3B82F6'), // stay in-palette (no indigo)
      fundingType: 'fixed',
      fundingValue: suggestion.monthlySetAside,
    });
  };

  return (
    <div className="ds-card" style={{ marginBottom: 'var(--space-lg)', position: 'relative' }}>
      <button
        onClick={dismiss}
        aria-label={intl.formatMessage({ id: 'dashboard.fees_dismiss', defaultMessage: 'Dismiss' })}
        style={{ position: 'absolute', insetInlineEnd: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
      >
        <X size={16} />
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <GraduationCap size={20} style={{ color: 'var(--color-primary)' }} />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
          {intl.formatMessage(
            { id: 'dashboard.fees_title', defaultMessage: 'School fees in {days, plural, one {# day} other {# days}}' },
            { days: suggestion.daysUntil },
          )}
        </h3>
      </div>
      <p style={{ margin: '0 0 10px', fontSize: '0.875rem' }}>
        {intl.formatMessage(
          {
            id: 'dashboard.fees_body',
            defaultMessage: '“{label}” usually costs {amount}. Set aside {monthly}/month and it’s covered before it lands.',
          },
          {
            label: suggestion.label,
            amount: fmt(suggestion.amount),
            monthly: fmt(suggestion.monthlySetAside),
          },
        )}
      </p>
      <button className="ds-btn ds-btn-primary" onClick={createGoal} disabled={goalExists}>
        {goalExists
          ? intl.formatMessage({ id: 'dashboard.fees_goal_exists', defaultMessage: 'Sinking fund created' })
          : intl.formatMessage({ id: 'dashboard.fees_create_goal', defaultMessage: 'Start the sinking fund' })}
      </button>
    </div>
  );
}

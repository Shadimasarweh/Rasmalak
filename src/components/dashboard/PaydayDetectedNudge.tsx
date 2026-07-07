'use client';

/**
 * One-time payday-detected nudge (A1 surfacing).
 *
 * When the engine confidently detects a monthly salary and the user still
 * budgets by calendar month, offer the payday cycle once. Accepting applies
 * the setting immediately; declining dismisses permanently (localStorage,
 * same guarded pattern as RealityCheckCard).
 */

import { useState } from 'react';
import { useIntl } from 'react-intl';
import { AI_FEATURES } from '@/ai/config';
import { usePredictiveState } from '@/lib/predictive/PredictiveProvider';
import { useStore, useBudgetCycleMode, useLanguage } from '@/store/useStore';
import { useUser as useAuthUser } from '@/store/authStore';
import { updateCyclePrefs } from '@/lib/profile';
import { showSuccess } from '@/store/toastStore';

const DISMISS_KEY = 'rasmalak.paydayNudgeDismissed.v1';
const MIN_CONFIDENCE = 0.6;

function isDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function persistDismiss(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // Ignore storage errors.
  }
}

export function shouldShowPaydayNudge(
  salarySource: string | undefined,
  paydayDay: number | null | undefined,
  confidence: number | undefined,
  cycleMode: 'calendar' | 'payday',
): boolean {
  return (
    AI_FEATURES.salaryDetectionUI &&
    AI_FEATURES.paydayCycleBudgeting &&
    salarySource === 'detected' &&
    paydayDay != null &&
    (confidence ?? 0) >= MIN_CONFIDENCE &&
    cycleMode === 'calendar' &&
    !isDismissed()
  );
}

export default function PaydayDetectedNudge() {
  const intl = useIntl();
  const language = useLanguage();
  const { state } = usePredictiveState();
  const cycleMode = useBudgetCycleMode();
  const setBudgetCycleMode = useStore((s) => s.setBudgetCycleMode);
  const setPayday = useStore((s) => s.setPayday);
  const userId = useAuthUser()?.id;
  const [hidden, setHidden] = useState(false);

  const salary = state?.salary;
  if (
    hidden ||
    !salary ||
    !shouldShowPaydayNudge(salary.source, salary.paydayDayOfMonth, salary.confidence, cycleMode)
  ) {
    return null;
  }

  const day = salary.paydayDayOfMonth!;
  const isRTL = language === 'ar';

  const accept = () => {
    setBudgetCycleMode('payday');
    setPayday(day, 'detected');
    if (userId) {
      void updateCyclePrefs(userId, { mode: 'payday', day, source: 'detected' });
    }
    persistDismiss();
    setHidden(true);
    showSuccess(
      intl.formatMessage({
        id: 'dashboard.payday_applied_toast',
        defaultMessage: 'Your budget now runs payday to payday.',
      }),
    );
  };

  const decline = () => {
    persistDismiss();
    setHidden(true);
  };

  return (
    <div
      className="ds-card"
      style={{
        marginBottom: 'var(--spacing-4)',
        animation: 'fadeIn 300ms ease-out',
        direction: isRTL ? 'rtl' : 'ltr',
        borderInlineStart: '3px solid var(--ds-primary)',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--spacing-4)' }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <h3 className="ds-title-card" style={{ marginBottom: 'var(--spacing-1)' }}>
            {intl.formatMessage({ id: 'dashboard.payday_detected_title', defaultMessage: 'We spotted your salary pattern' })}
          </h3>
          <p className="ds-supporting">
            {intl.formatMessage(
              { id: 'dashboard.payday_detected_body', defaultMessage: 'Your salary usually arrives on day {day}. Start your budget month on payday?' },
              { day: intl.formatNumber(day) },
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
          <button type="button" className="ds-btn ds-btn-primary" onClick={accept}>
            {intl.formatMessage({ id: 'dashboard.payday_detected_cta', defaultMessage: 'Switch to payday cycle' })}
          </button>
          <button
            type="button"
            onClick={decline}
            style={{
              background: 'transparent',
              border: '1px solid var(--ds-border)',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
            }}
          >
            {intl.formatMessage({ id: 'dashboard.payday_detected_dismiss', defaultMessage: 'Keep calendar month' })}
          </button>
        </div>
      </div>
    </div>
  );
}

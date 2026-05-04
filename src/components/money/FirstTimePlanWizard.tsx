'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIntl } from 'react-intl';
import { useLanguage } from '@/store/useStore';
import { Calendar, Receipt, GitCompare, X } from 'lucide-react';

/**
 * 3-step forced flow that runs the first time a user lands on /money:
 *   1) Plan your next month   (intention)
 *   2) Track what you spend   (reality)
 *   3) Compare the two        (the gap is where you grow)
 *
 * Persistence is localStorage-only on purpose: this is a UX onramp, not
 * a financial fact, so it doesn't need Supabase round-trips. The key is
 * scoped per user via the auth user id when available, otherwise global.
 */

const STORAGE_KEY = 'rasmalak.firstPlanWizardDone';

function storageKey(userId?: string | null): string {
  return userId ? `${STORAGE_KEY}.${userId}` : STORAGE_KEY;
}

export function hasCompletedPlanWizard(userId?: string | null): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(storageKey(userId)) === '1';
  } catch {
    return true;
  }
}

export function markPlanWizardComplete(userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(userId), '1');
  } catch {
    // Quota exceeded or disabled storage — silently ignore. Worst case
    // the user sees the wizard again, which is harmless.
  }
}

interface Props {
  /** Optional user id for per-user gating. */
  userId?: string | null;
  /** Force-open from outside (debug or "show me again"). */
  forceOpen?: boolean;
  /** Called after the user finishes or skips. */
  onClose?: () => void;
}

export default function FirstTimePlanWizard({ userId, forceOpen = false, onClose }: Props) {
  const intl = useIntl();
  const language = useLanguage();
  const router = useRouter();
  const isRTL = language === 'ar';

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
      return;
    }
    if (!hasCompletedPlanWizard(userId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
    }
  }, [userId, forceOpen]);

  if (!open) return null;

  const close = (markDone: boolean) => {
    if (markDone) markPlanWizardComplete(userId);
    setOpen(false);
    onClose?.();
  };

  const steps = [
    {
      icon: Calendar,
      accent: 'var(--ds-plan)',
      title: intl.formatMessage({ id: 'money.wizard_step1_title' }),
      body: intl.formatMessage({ id: 'money.wizard_step1_body' }),
      cta: intl.formatMessage({ id: 'money.wizard_step1_cta' }),
      action: () => router.push('/money/plan'),
    },
    {
      icon: Receipt,
      accent: 'var(--ds-actual)',
      title: intl.formatMessage({ id: 'money.wizard_step2_title' }),
      body: intl.formatMessage({ id: 'money.wizard_step2_body' }),
      cta: intl.formatMessage({ id: 'money.wizard_step2_cta' }),
      action: () => router.push('/money/track/new'),
    },
    {
      icon: GitCompare,
      accent: 'var(--ds-text-heading)',
      title: intl.formatMessage({ id: 'money.wizard_step3_title' }),
      body: intl.formatMessage({ id: 'money.wizard_step3_body' }),
      cta: intl.formatMessage({ id: 'money.wizard_step3_cta' }),
      action: () => router.push('/money/compare'),
    },
  ];

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={intl.formatMessage({ id: 'money.section_title' })}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9000,
        padding: '16px',
        direction: isRTL ? 'rtl' : 'ltr',
      }}
      onClick={() => close(true)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'var(--ds-bg-card)',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          border: '0.5px solid var(--ds-border)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--ds-text-muted)' }}>
            {intl.formatMessage({ id: 'money.wizard_step_label' }, { current: step + 1, total: steps.length })}
          </span>
          <button
            type="button"
            aria-label={intl.formatMessage({ id: 'money.wizard_skip' })}
            onClick={() => close(true)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'var(--ds-text-muted)',
              display: 'inline-flex',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Step indicator dots */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
          {steps.map((s, i) => (
            <span
              key={i}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: i <= step ? s.accent : 'var(--ds-border)',
                transition: 'background 200ms ease',
              }}
            />
          ))}
        </div>

        {/* Body */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: current.accent,
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '14px',
          }}
        >
          <Icon size={26} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ds-text-heading)', margin: '0 0 8px 0', lineHeight: 1.3 }}>
          {current.title}
        </h2>
        <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--ds-text-body)', margin: '0 0 20px 0' }}>
          {current.body}
        </p>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <button
            type="button"
            onClick={() => (step > 0 ? setStep(step - 1) : close(true))}
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--ds-text-muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 4px',
            }}
          >
            {step > 0
              ? intl.formatMessage({ id: 'money.wizard_back' })
              : intl.formatMessage({ id: 'money.wizard_skip' })}
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                current.action();
                if (isLast) close(true);
                else setStep(step + 1);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#FFFFFF',
                background: current.accent,
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            >
              {current.cta}
            </button>
            {!isLast && (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--ds-text-body)',
                  background: 'transparent',
                  border: '0.5px solid var(--ds-border)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                }}
              >
                {intl.formatMessage({ id: 'money.wizard_next' })}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

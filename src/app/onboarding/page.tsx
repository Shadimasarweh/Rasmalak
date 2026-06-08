'use client';

import { useState, useEffect, useMemo, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useIntl } from 'react-intl';
import { useCompleteOnboarding, useSkipOnboarding, OnboardingData } from '@/store/useStore';
import { useStore } from '@/store/useStore';
import { COUNTRIES, getCurrencyForCountry } from '@/lib/countries';
import { saveOnboarding } from '@/lib/profile';
import { useAuthStore } from '@/store/authStore';
import { seedEmergencyFund, seedCurrentBudgetCycle } from '@/lib/onboardingSeed';
import { showError } from '@/store/toastStore';
import { MoneyInput } from '@/components/MoneyInput';
import { CURRENCIES } from '@/lib/constants';
import { styledNum } from '@/components/StyledNumber';

/**
 * Onboarding wizard — 5 steps per "The onboarding process.docx".
 *
 * Step 1: Primary focus (multi-select)
 * Step 2: Persona (salaried | variable | student)
 * Step 3: Country + monthly income (country pre-filled from Vercel geo)
 * Step 4: Expense preset (lean 40% | average 55% | heavy 70%)
 * Step 5: "Aha!" — preview the calculated 3-month emergency fund and
 *         either inject it into the budget or skip.
 *
 * The four onboarding fields are persisted to `profiles` via
 * `saveOnboarding`. When the user picks "inject" on Step 5 we
 * additionally create an EF row and seed the current `budget_cycles`
 * row with `monthly_budget = monthlyIncome` so the dashboard is
 * non-empty on first hit.
 */

/* ============================================================
   Step 1: Primary focus options
   ============================================================ */
type PrimaryFocusId = 'emergency_fund' | 'debt' | 'monthly_budget' | 'learn_invest';

interface FocusOption {
  id: PrimaryFocusId;
  labelKey: string;
  defaultLabel: string;
  icon: ReactNode;
}

const PRIMARY_FOCUSES: FocusOption[] = [
  {
    id: 'emergency_fund',
    labelKey: 'onboarding.focus_emergency_fund',
    defaultLabel: 'Building an emergency fund',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    id: 'debt',
    labelKey: 'onboarding.focus_debt',
    defaultLabel: 'Getting out of debt',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    id: 'monthly_budget',
    labelKey: 'onboarding.focus_monthly_budget',
    defaultLabel: 'Creating a monthly predictive budget',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'learn_invest',
    labelKey: 'onboarding.focus_learn_invest',
    defaultLabel: 'Learning how to invest / save',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
];

/* ============================================================
   Step 2: Persona options
   ============================================================ */
type PersonaId = 'salaried' | 'variable' | 'student';

interface PersonaOption {
  id: PersonaId;
  labelKey: string;
  defaultLabel: string;
  descKey: string;
  defaultDesc: string;
  icon: ReactNode;
}

const PERSONAS: PersonaOption[] = [
  {
    id: 'salaried',
    labelKey: 'onboarding.persona_salaried',
    defaultLabel: 'Fixed monthly salary',
    descKey: 'onboarding.persona_salaried_desc',
    defaultDesc: 'Salaried employee with predictable income',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'variable',
    labelKey: 'onboarding.persona_variable',
    defaultLabel: 'Fluctuating / variable income',
    descKey: 'onboarding.persona_variable_desc',
    defaultDesc: 'Freelancer, SME owner, or contractor',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    id: 'student',
    labelKey: 'onboarding.persona_student',
    defaultLabel: 'Student / no steady income yet',
    descKey: 'onboarding.persona_student_desc',
    defaultDesc: 'Allowance, part-time work, or in school',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
  },
];

/* ============================================================
   Step 4: Expense presets (per the doc)
   ============================================================ */
type PresetId = 'lean' | 'average' | 'heavy';

interface PresetOption {
  id: PresetId;
  labelKey: string;
  defaultLabel: string;
  descKey: string;
  defaultDesc: string;
  pct: number;
}

const EXPENSE_PRESETS: PresetOption[] = [
  {
    id: 'lean',
    labelKey: 'onboarding.expense_preset_lean',
    defaultLabel: 'Lean',
    descKey: 'onboarding.expense_preset_lean_desc',
    defaultDesc: 'Essentials use about 40% of my income',
    pct: 0.40,
  },
  {
    id: 'average',
    labelKey: 'onboarding.expense_preset_average',
    defaultLabel: 'Average',
    descKey: 'onboarding.expense_preset_average_desc',
    defaultDesc: 'Essentials use about 55% of my income',
    pct: 0.55,
  },
  {
    id: 'heavy',
    labelKey: 'onboarding.expense_preset_heavy',
    defaultLabel: 'Heavy',
    descKey: 'onboarding.expense_preset_heavy_desc',
    defaultDesc: 'Essentials use about 70% of my income',
    pct: 0.70,
  },
];

const TOTAL_STEPS = 5;

/* ============================================================
   Form state
   ============================================================ */
interface OnboardingForm {
  primaryFocuses: PrimaryFocusId[];
  persona: PersonaId | null;
  country: string;
  monthlyIncome: string;
  preset: PresetId | null;
}

/**
 * Map a persona id to the legacy `UserSegment` for any consumer
 * that still reads `OnboardingData.segment`. Variable income maps
 * to self_employed; everyone else collapses to individual.
 */
function personaToSegment(persona: PersonaId): OnboardingData['segment'] {
  if (persona === 'variable') return 'self_employed';
  return 'individual';
}

export default function OnboardingPage() {
  const router = useRouter();
  const completeOnboarding = useCompleteOnboarding();
  const skipOnboarding = useSkipOnboarding();
  const intl = useIntl();
  const language = useStore((s) => s.language);
  const isRtl = language === 'ar';

  const setCountryStore = useStore((s) => s.setCountry);
  const setBaseCurrencyStore = useStore((s) => s.setBaseCurrency);
  const authUser = useAuthStore((s) => s.user);
  // NOTE: we deliberately don't call useEmergencyFund() / useBudgetCycles()
  // here. Onboarding lives at /onboarding (root level), outside the
  // dashboard layout that mounts those providers — calling the hooks
  // from this tree throws and trips the global error boundary on
  // fresh signups. The seed helpers write directly via Supabase
  // instead and the dashboard refetches when the user lands there.

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<OnboardingForm>({
    primaryFocuses: [],
    persona: null,
    country: 'SA',
    monthlyIncome: '',
    preset: null,
  });
  const [submitting, setSubmitting] = useState(false);

  // Geo prefill: ask Vercel which country the user is in. Falls back
  // to the existing default ('SA') if the header isn't set, which is
  // always the case in local dev.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/geo')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const cc = (data?.country as string | null | undefined) ?? null;
        if (cc && COUNTRIES.some((c) => c.code === cc)) {
          setForm((prev) => ({ ...prev, country: cc }));
        }
      })
      .catch(() => {
        /* ignore — fallback already set */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const monthlyIncomeNum = useMemo(() => {
    const n = parseFloat(form.monthlyIncome);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [form.monthlyIncome]);

  const presetPct = useMemo(() => {
    return EXPENSE_PRESETS.find((p) => p.id === form.preset)?.pct ?? 0;
  }, [form.preset]);

  const monthlyEssentials = monthlyIncomeNum * presetPct;
  const efTarget = 3 * monthlyEssentials;

  const currency = useMemo(() => getCurrencyForCountry(form.country), [form.country]);
  const currencyInfo = CURRENCIES.find((c) => c.code === currency);
  const currencySymbol = isRtl
    ? currencyInfo?.symbolAr || currencyInfo?.symbol || currency
    : currencyInfo?.symbol || currency;

  /* ===== Step navigation ===== */

  const canAdvance = (): boolean => {
    if (currentStep === 1) return form.primaryFocuses.length > 0;
    if (currentStep === 2) return form.persona !== null;
    if (currentStep === 3) return !!form.country && monthlyIncomeNum > 0;
    if (currentStep === 4) return form.preset !== null;
    return true;
  };

  const handleContinue = () => {
    if (!canAdvance()) return;
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
    // Step 5 has its own buttons (inject vs skip), no Continue here.
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSkip = () => {
    skipOnboarding();
    router.push('/');
  };

  /* ===== Aha! moment — finish the wizard ===== */

  const finishOnboarding = async (injectBudget: boolean) => {
    if (submitting) return;
    if (!form.persona || !form.preset) return;
    setSubmitting(true);
    try {
      // Mirror the answers into Zustand so other components see the
      // user's currency/country immediately, before the network round
      // trips finish.
      setCountryStore(form.country);
      setBaseCurrencyStore(currency);

      // Persist all four onboarding fields + country + base_currency.
      if (authUser?.id) {
        await saveOnboarding(authUser.id, {
          country: form.country,
          primaryFocuses: form.primaryFocuses,
          persona: form.persona,
          monthlyIncome: monthlyIncomeNum > 0 ? monthlyIncomeNum : null,
          expensePreset: form.preset,
        });
      }

      if (injectBudget && monthlyIncomeNum > 0) {
        // EF target = 3 months of essentials. Don't block onboarding
        // if a write fails — the user can redo it from the EF /
        // Plan pages later. Both seed helpers are best-effort.
        if (authUser?.id) {
          await seedEmergencyFund({
            userId: authUser.id,
            targetAmount: efTarget,
            baseCurrency: currency,
          });
          await seedCurrentBudgetCycle({
            userId: authUser.id,
            monthly: monthlyIncomeNum,
            baseCurrency: currency,
          });
        }
      }

      // Local Zustand snapshot — keep `segment` derived from persona
      // so any legacy consumer of OnboardingData.segment still works.
      const data: OnboardingData = {
        segment: personaToSegment(form.persona),
        // Topics is no longer a wizard step. Keep an empty array so
        // legacy code that reads it doesn't crash.
        topics: [],
        preferredInsights: [],
      };
      completeOnboarding(data);
      router.push('/');
    } catch (err) {
      console.error('[onboarding] finishOnboarding failed:', err);
      showError("Couldn't save your onboarding. Please try again.");
      setSubmitting(false);
    }
  };

  /* ===== Step content ===== */

  const stepConfig: Record<number, { title: string; subtitle: string; question: string }> = {
    1: {
      title: intl.formatMessage({ id: 'onboarding.step_focus_title', defaultMessage: 'Welcome to Rasmalak' }),
      subtitle: intl.formatMessage({ id: 'onboarding.step_focus_subtitle', defaultMessage: 'Pick everything that matters to you. We use this to highlight the right tools first.' }),
      question: intl.formatMessage({ id: 'onboarding.step_focus_question', defaultMessage: 'What is your primary focus with Rasmalak right now?' }),
    },
    2: {
      title: intl.formatMessage({ id: 'onboarding.step_persona_title', defaultMessage: 'Tell us a bit about your financial setup' }),
      subtitle: intl.formatMessage({ id: 'onboarding.step_persona_subtitle', defaultMessage: 'Budgets look very different for salaried vs. variable income. We tune the engine to your situation.' }),
      question: intl.formatMessage({ id: 'onboarding.step_persona_question', defaultMessage: 'Which best describes your income?' }),
    },
    3: {
      title: intl.formatMessage({ id: 'onboarding.step_income_title', defaultMessage: 'Your income baseline' }),
      subtitle: intl.formatMessage({ id: 'onboarding.step_income_subtitle', defaultMessage: 'This is the ceiling for your monthly budget. You can change it any time.' }),
      question: intl.formatMessage({ id: 'onboarding.step_income_question', defaultMessage: 'What is your average monthly take-home income?' }),
    },
    4: {
      title: intl.formatMessage({ id: 'onboarding.step_expense_title', defaultMessage: 'Quick estimate of your essentials' }),
      subtitle: intl.formatMessage({ id: 'onboarding.step_expense_subtitle', defaultMessage: 'No need to list rent, electricity, groceries — just pick the closest match. You will fine-tune later.' }),
      question: intl.formatMessage({ id: 'onboarding.step_expense_question', defaultMessage: 'Roughly, how much of your income goes to essentials?' }),
    },
    5: {
      title: intl.formatMessage({ id: 'onboarding.step_aha_title', defaultMessage: "Let's kick-start your safety net" }),
      subtitle: intl.formatMessage({ id: 'onboarding.step_aha_subtitle', defaultMessage: 'A 3-month emergency fund is the single best protection against unexpected expenses.' }),
      question: '',
    },
  };

  const current = stepConfig[currentStep];
  const progressPercentage = Math.round((currentStep / TOTAL_STEPS) * 100);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--ds-bg-page)', direction: isRtl ? 'rtl' : 'ltr' }}
    >
      {/* Header */}
      <header style={{ padding: '16px 24px' }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--ds-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#FFFFFF' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span style={{ fontWeight: 500, fontSize: '15px', color: 'var(--ds-text-heading)' }}>Rasmalak AI</span>
          </div>

          <button
            onClick={handleSkip}
            style={{ fontSize: '13px', color: 'var(--ds-text-muted)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 150ms ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ds-text-body)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ds-text-muted)'; }}
          >
            {intl.formatMessage({ id: 'onboarding.skip_for_now', defaultMessage: 'Skip for now' })}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-xl">
          <div
            style={{
              background: 'var(--ds-bg-card)',
              border: '0.5px solid var(--ds-border)',
              borderRadius: '16px',
              padding: 'clamp(16px, 4vw, 32px)',
              boxShadow: 'var(--ds-shadow-card)',
              textAlign: isRtl ? 'right' : 'left',
            }}
          >
            {/* Step indicator */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ds-text-heading)' }}>
                  {intl.formatMessage({ id: 'onboarding.step_of', defaultMessage: 'Step {current} of {total}' }, { current: currentStep, total: TOTAL_STEPS })}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-primary)' }}>
                  {intl.formatMessage({ id: 'onboarding.completed', defaultMessage: '{percent}% Completed' }, { percent: progressPercentage })}
                </span>
              </div>
              <div style={{ height: '4px', background: 'var(--ds-bg-tinted)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    background: 'var(--ds-primary-glow)',
                    borderRadius: '4px',
                    width: `${progressPercentage}%`,
                    transition: 'width 300ms ease-out',
                  }}
                />
              </div>
            </div>

            {/* Title & subtitle */}
            <div style={{ marginBottom: '32px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ds-text-heading)', lineHeight: 1.3, marginBottom: '8px', fontFeatureSettings: '"kern" 1' }}>
                {current.title}
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--ds-text-body)', lineHeight: 1.6, margin: 0 }}>
                {current.subtitle}
              </p>
            </div>

            {/* Question + step body */}
            <div style={{ marginBottom: '24px' }}>
              {current.question && (
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', marginBottom: '16px', lineHeight: 1.3, fontFeatureSettings: '"kern" 1' }}>
                  {current.question}
                </h2>
              )}

              {/* Step 1: Primary focuses */}
              {currentStep === 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  {PRIMARY_FOCUSES.map((focus) => {
                    const isSelected = form.primaryFocuses.includes(focus.id);
                    return (
                      <button
                        key={focus.id}
                        onClick={() => setForm((prev) => ({
                          ...prev,
                          primaryFocuses: isSelected
                            ? prev.primaryFocuses.filter((f) => f !== focus.id)
                            : [...prev.primaryFocuses, focus.id],
                        }))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '16px',
                          background: isSelected ? 'var(--ds-bg-tinted)' : 'var(--ds-bg-card)',
                          border: isSelected ? '0.5px solid var(--ds-primary)' : '0.5px solid var(--ds-border)',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                          textAlign: isRtl ? 'right' : 'left',
                        }}
                      >
                        <span style={{ color: isSelected ? 'var(--ds-primary)' : 'var(--ds-text-muted)' }}>
                          {focus.icon}
                        </span>
                        <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
                          {intl.formatMessage({ id: focus.labelKey, defaultMessage: focus.defaultLabel })}
                        </span>
                        {isSelected && (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--ds-primary)', flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Step 2: Persona */}
              {currentStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {PERSONAS.map((persona) => {
                    const isSelected = form.persona === persona.id;
                    return (
                      <button
                        key={persona.id}
                        onClick={() => setForm((prev) => ({ ...prev, persona: persona.id }))}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          padding: '16px',
                          background: isSelected ? 'var(--ds-bg-tinted)' : 'var(--ds-bg-card)',
                          border: isSelected ? '0.5px solid var(--ds-primary)' : '0.5px solid var(--ds-border)',
                          borderRadius: '16px',
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                          textAlign: isRtl ? 'right' : 'left',
                        }}
                      >
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isSelected ? 'var(--ds-primary)' : 'var(--ds-bg-tinted)',
                            color: isSelected ? '#FFFFFF' : 'var(--ds-text-muted)',
                            flexShrink: 0,
                          }}
                        >
                          {persona.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', margin: 0 }}>
                            {intl.formatMessage({ id: persona.labelKey, defaultMessage: persona.defaultLabel })}
                          </p>
                          <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', margin: 0, marginTop: '2px' }}>
                            {intl.formatMessage({ id: persona.descKey, defaultMessage: persona.defaultDesc })}
                          </p>
                        </div>
                        {isSelected && (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--ds-primary)', flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Step 3: Country + Income */}
              {currentStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--ds-text-heading)',
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {intl.formatMessage({ id: 'onboarding.step_income_country_label', defaultMessage: 'Country' })}
                    </label>
                    <select
                      value={form.country}
                      onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        fontSize: '14px',
                        background: 'var(--ds-bg-input)',
                        border: '0.5px solid var(--ds-border)',
                        borderRadius: '8px',
                        color: 'var(--ds-text-heading)',
                        cursor: 'pointer',
                      }}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {isRtl ? c.nameAr : c.name} ({c.currency})
                        </option>
                      ))}
                    </select>
                    <p style={{ fontSize: '11px', color: 'var(--ds-text-muted)', marginTop: '4px', margin: '4px 0 0 0' }}>
                      {intl.formatMessage(
                        { id: 'onboarding.step_income_currency_hint', defaultMessage: 'Currency: {currency}' },
                        { currency },
                      )}
                    </p>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--ds-text-heading)',
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {intl.formatMessage({ id: 'onboarding.step_income_amount_label', defaultMessage: 'Average monthly take-home income' })}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-muted)', flexShrink: 0 }}>
                        {currencySymbol}
                      </span>
                      <MoneyInput
                        value={form.monthlyIncome}
                        onChange={(next) => setForm((prev) => ({ ...prev, monthlyIncome: next }))}
                        placeholder="0"
                        style={{
                          flex: 1,
                          padding: '12px 14px',
                          fontSize: '20px',
                          fontWeight: 600,
                          background: 'var(--ds-bg-input)',
                          border: '0.5px solid var(--ds-border)',
                          borderRadius: '8px',
                          color: 'var(--ds-text-heading)',
                          outline: 'none',
                          textAlign: isRtl ? 'right' : 'left',
                          direction: 'ltr',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Expense preset */}
              {currentStep === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {EXPENSE_PRESETS.map((preset) => {
                    const isSelected = form.preset === preset.id;
                    const estimate = monthlyIncomeNum * preset.pct;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => setForm((prev) => ({ ...prev, preset: preset.id }))}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          padding: '16px',
                          background: isSelected ? 'var(--ds-bg-tinted)' : 'var(--ds-bg-card)',
                          border: isSelected ? '0.5px solid var(--ds-primary)' : '0.5px solid var(--ds-border)',
                          borderRadius: '16px',
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                          textAlign: isRtl ? 'right' : 'left',
                        }}
                      >
                        <div
                          style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isSelected ? 'var(--ds-primary)' : 'var(--ds-bg-tinted)',
                            color: isSelected ? '#FFFFFF' : 'var(--ds-text-muted)',
                            fontWeight: 700,
                            fontSize: '15px',
                            flexShrink: 0,
                          }}
                        >
                          {Math.round(preset.pct * 100)}%
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ds-text-heading)', margin: 0 }}>
                            {intl.formatMessage({ id: preset.labelKey, defaultMessage: preset.defaultLabel })}
                          </p>
                          <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', margin: 0, marginTop: '2px' }}>
                            {intl.formatMessage({ id: preset.descKey, defaultMessage: preset.defaultDesc })}
                          </p>
                          {monthlyIncomeNum > 0 && (
                            <p style={{ fontSize: '12px', color: 'var(--ds-primary)', margin: 0, marginTop: '4px', fontWeight: 500 }}>
                              {intl.formatMessage(
                                { id: 'onboarding.step_expense_estimate', defaultMessage: '\u2248 {amount} / month' },
                                { amount: `${currencySymbol} ${styledNum(intl.formatNumber(Math.round(estimate)))}` },
                              )}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--ds-primary)', flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Step 5: Aha! moment */}
              {currentStep === 5 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'stretch' }}>
                  <div
                    style={{
                      background: 'var(--ds-plan-bg)',
                      border: '0.5px solid var(--ds-plan-border)',
                      borderRadius: '14px',
                      padding: '24px',
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, marginBottom: '8px' }}>
                      {intl.formatMessage({ id: 'onboarding.aha_recommendation_label', defaultMessage: 'Recommended emergency fund' })}
                    </p>
                    <p style={{ fontSize: '32px', fontWeight: 700, color: 'var(--ds-plan)', margin: 0, lineHeight: 1.2 }}>
                      {currencySymbol} {styledNum(intl.formatNumber(Math.round(efTarget)))}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', margin: 0, marginTop: '6px' }}>
                      {intl.formatMessage(
                        { id: 'onboarding.aha_recommendation_basis', defaultMessage: '3 months of essentials \u00b7 about {amount} / month' },
                        { amount: `${currencySymbol} ${styledNum(intl.formatNumber(Math.round(monthlyEssentials)))}` },
                      )}
                    </p>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--ds-text-body)', textAlign: 'center', margin: 0 }}>
                    {intl.formatMessage({
                      id: 'onboarding.aha_question',
                      defaultMessage: 'Would you like to add this to your budget?',
                    })}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      onClick={() => finishOnboarding(true)}
                      disabled={submitting || monthlyIncomeNum <= 0 || !form.preset}
                      style={{
                        width: '100%',
                        padding: '14px',
                        background: 'var(--ds-primary)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: submitting ? 'wait' : 'pointer',
                        opacity: submitting || monthlyIncomeNum <= 0 ? 0.6 : 1,
                        transition: 'background-color 150ms ease',
                      }}
                    >
                      {submitting
                        ? intl.formatMessage({ id: 'onboarding.aha_saving', defaultMessage: 'Setting up your dashboard...' })
                        : intl.formatMessage({ id: 'onboarding.aha_inject_cta', defaultMessage: 'Yes, inject into my budget' })}
                    </button>
                    <button
                      onClick={() => finishOnboarding(false)}
                      disabled={submitting}
                      style={{
                        width: '100%',
                        padding: '14px',
                        background: 'transparent',
                        color: 'var(--ds-text-body)',
                        border: '0.5px solid var(--ds-border)',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: submitting ? 'wait' : 'pointer',
                        opacity: submitting ? 0.6 : 1,
                      }}
                    >
                      {intl.formatMessage({ id: 'onboarding.aha_skip_cta', defaultMessage: "I'll set my own goal later" })}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer navigation: hidden on Step 5 because it has its own CTAs */}
            {currentStep < TOTAL_STEPS && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '16px' }}>
                <button
                  onClick={handleBack}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--ds-text-muted)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    opacity: currentStep === 1 ? 0.5 : 1,
                    pointerEvents: currentStep === 1 ? 'none' : 'auto',
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRtl ? 'M14 5l7 7m0 0l-7 7m7-7H3' : 'M10 19l-7-7m0 0l7-7m-7 7h18'} />
                  </svg>
                  {intl.formatMessage({ id: 'onboarding.back', defaultMessage: 'Back' })}
                </button>

                <button
                  onClick={handleContinue}
                  disabled={!canAdvance()}
                  style={{
                    background: canAdvance() ? 'var(--ds-primary)' : 'var(--ds-bg-tinted)',
                    color: canAdvance() ? '#FFFFFF' : 'var(--ds-text-muted)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 18px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: canAdvance() ? 'pointer' : 'not-allowed',
                    transition: 'background-color 150ms ease',
                  }}
                  onMouseEnter={(e) => { if (canAdvance()) e.currentTarget.style.background = 'var(--ds-primary-hover)'; }}
                  onMouseLeave={(e) => { if (canAdvance()) e.currentTarget.style.background = 'var(--ds-primary)'; }}
                >
                  {intl.formatMessage({ id: 'onboarding.continue', defaultMessage: 'Continue' })}
                </button>
              </div>
            )}

            {/* Footer back button on Step 5 (no Continue, only the Aha! buttons) */}
            {currentStep === TOTAL_STEPS && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: '8px' }}>
                <button
                  onClick={handleBack}
                  disabled={submitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--ds-text-muted)',
                    background: 'none',
                    border: 'none',
                    cursor: submitting ? 'wait' : 'pointer',
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRtl ? 'M14 5l7 7m0 0l-7 7m7-7H3' : 'M10 19l-7-7m0 0l7-7m-7 7h18'} />
                  </svg>
                  {intl.formatMessage({ id: 'onboarding.back', defaultMessage: 'Back' })}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

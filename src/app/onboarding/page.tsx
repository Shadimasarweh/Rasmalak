'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, Check, Globe, Wallet, Target, DollarSign } from 'lucide-react';
import { useIsAuthenticated, useHasCompletedOnboarding, useCompleteOnboarding, useLanguage } from '@/store/useStore';
import { useTranslation } from '@/hooks/useTranslation';
import { CURRENCIES } from '@/lib/constants';
import { OnboardingData } from '@/store/useStore';

const INCOME_RANGES = [
  'under-5k',
  '5k-10k',
  '10k-20k',
  '20k-50k',
  'over-50k',
  'prefer-not',
] as const;

const GOALS = [
  'save',
  'payoff-debt',
  'emergency-fund',
  'invest',
  'budget',
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const hasCompletedOnboarding = useHasCompletedOnboarding();
  const completeOnboarding = useCompleteOnboarding();
  const currentLanguage = useLanguage();
  const { t, language, isRTL } = useTranslation();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingData>({
    preferredLanguage: currentLanguage,
    currency: 'SAR',
    monthlyIncomeRange: '',
    primaryGoal: '',
  });

  const totalSteps = 4;
  const ArrowNext = isRTL ? ArrowLeft : ArrowRight;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  // Redirect if not authenticated or already onboarded
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (hasCompletedOnboarding) {
      router.push('/');
    }
  }, [isAuthenticated, hasCompletedOnboarding, router]);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      completeOnboarding(formData);
      router.push('/');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    // Complete with defaults
    completeOnboarding({
      ...formData,
      monthlyIncomeRange: formData.monthlyIncomeRange || 'prefer-not',
      primaryGoal: formData.primaryGoal || 'budget',
    });
    router.push('/');
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!formData.preferredLanguage;
      case 1: return !!formData.currency;
      case 2: return true; // Income is optional
      case 3: return !!formData.primaryGoal;
      default: return false;
    }
  };

  // Don't render until we verify auth status
  if (!isAuthenticated || hasCompletedOnboarding) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col">
      {/* Header */}
      <div className="bg-[var(--color-bg-card)] border-b border-[var(--color-border)]">
        <div className="max-w-lg mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">ر</span>
              </div>
              <span className="font-semibold text-[var(--color-text-primary)]">Rasmalak</span>
            </div>

            {/* Skip Button */}
            <button
              onClick={handleSkip}
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              {t.onboarding.skip}
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-[var(--color-bg-card)] border-b border-[var(--color-border)]">
        <div className="max-w-lg mx-auto px-6 py-3">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mb-2">
            <span>{t.onboarding.step} {currentStep + 1} {t.onboarding.of} {totalSteps}</span>
            <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-[var(--color-bg-inset)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full px-6 py-8">
        {/* Step 0: Language */}
        {currentStep === 0 && (
          <div className="animate-fadeIn">
            <div className="w-14 h-14 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center mb-6">
              <Globe className="w-7 h-7 text-[var(--color-primary)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              {t.onboarding.language}
            </h1>
            <p className="text-[var(--color-text-muted)] mb-8">
              {t.onboarding.languageDesc}
            </p>

            <div className="space-y-3">
              {[
                { code: 'ar' as const, name: 'العربية', nameEn: 'Arabic' },
                { code: 'en' as const, name: 'English', nameEn: 'English' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setFormData({ ...formData, preferredLanguage: lang.code })}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    formData.preferredLanguage === lang.code
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                      : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    formData.preferredLanguage === lang.code
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
                  }`}>
                    <span className="font-semibold text-sm">{lang.code === 'ar' ? 'ع' : 'En'}</span>
                  </div>
                  <div className="flex-1 text-start">
                    <p className="font-medium text-[var(--color-text-primary)]">{lang.name}</p>
                    {lang.code === 'ar' && <p className="text-sm text-[var(--color-text-muted)]">Arabic</p>}
                  </div>
                  {formData.preferredLanguage === lang.code && (
                    <Check className="w-5 h-5 text-[var(--color-primary)]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Currency */}
        {currentStep === 1 && (
          <div className="animate-fadeIn">
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center mb-6">
              <DollarSign className="w-7 h-7 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              {t.onboarding.currency}
            </h1>
            <p className="text-[var(--color-text-muted)] mb-8">
              {t.onboarding.currencyDesc}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {CURRENCIES.slice(0, 8).map((curr) => (
                <button
                  key={curr.code}
                  onClick={() => setFormData({ ...formData, currency: curr.code })}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    formData.currency === curr.code
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                      : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                    formData.currency === curr.code
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
                  }`}>
                    {language === 'ar' ? curr.symbolAr : curr.symbol}
                  </div>
                  <div className="flex-1 text-start min-w-0">
                    <p className="font-medium text-[var(--color-text-primary)] truncate">{curr.code}</p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate">
                      {language === 'ar' ? curr.nameAr : curr.name}
                    </p>
                  </div>
                  {formData.currency === curr.code && (
                    <Check className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Income Range */}
        {currentStep === 2 && (
          <div className="animate-fadeIn">
            <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6">
              <Wallet className="w-7 h-7 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              {t.onboarding.income}
            </h1>
            <p className="text-[var(--color-text-muted)] mb-8">
              {t.onboarding.incomeDesc}
            </p>

            <div className="space-y-3">
              {INCOME_RANGES.map((range) => (
                <button
                  key={range}
                  onClick={() => setFormData({ ...formData, monthlyIncomeRange: range })}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    formData.monthlyIncomeRange === range
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                      : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                  }`}
                >
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {t.onboarding.incomeRanges[range]}
                  </span>
                  {formData.monthlyIncomeRange === range && (
                    <Check className="w-5 h-5 text-[var(--color-primary)]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Goal */}
        {currentStep === 3 && (
          <div className="animate-fadeIn">
            <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6">
              <Target className="w-7 h-7 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              {t.onboarding.goal}
            </h1>
            <p className="text-[var(--color-text-muted)] mb-8">
              {t.onboarding.goalDesc}
            </p>

            <div className="space-y-3">
              {GOALS.map((goal) => (
                <button
                  key={goal}
                  onClick={() => setFormData({ ...formData, primaryGoal: goal })}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    formData.primaryGoal === goal
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                      : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                  }`}
                >
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {t.onboarding.goals[goal]}
                  </span>
                  {formData.primaryGoal === goal && (
                    <Check className="w-5 h-5 text-[var(--color-primary)]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="bg-[var(--color-bg-card)] border-t border-[var(--color-border)]">
        <div className="max-w-lg mx-auto px-6 py-4">
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="flex-1 btn btn-secondary flex items-center justify-center gap-2"
              >
                <ArrowBack className="w-4 h-4" />
                {t.onboarding.back}
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`flex-1 btn btn-primary flex items-center justify-center gap-2 ${
                !canProceed() ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {currentStep === totalSteps - 1 ? t.onboarding.finish : t.onboarding.next}
              {currentStep < totalSteps - 1 && <ArrowNext className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

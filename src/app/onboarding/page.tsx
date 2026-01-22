'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, Check, User, Briefcase, Building2, BookOpen, Lightbulb } from 'lucide-react';
import { useIsAuthenticated, useHasCompletedOnboarding, useCompleteOnboarding, useSkipOnboarding, useStore, OnboardingData, UserSegment } from '@/store/useStore';
import { useTranslation } from '@/hooks/useTranslation';

// Topic and Insight IDs
const TOPICS = [
  'budgeting',
  'saving',
  'debt',
  'investing',
  'islamic_finance',
  'business_cashflow',
] as const;

const INSIGHTS = [
  'spending_patterns',
  'cashflow',
  'debt_payoff',
  'savings_plan',
  'investment_learning',
] as const;

const SEGMENTS: { id: UserSegment; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'individual', icon: User },
  { id: 'self_employed', icon: Briefcase },
  { id: 'sme', icon: Building2 },
];

export default function OnboardingPage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const hasCompletedOnboarding = useHasCompletedOnboarding();
  const completeOnboarding = useCompleteOnboarding();
  const skipOnboarding = useSkipOnboarding();
  const setLanguage = useStore((state) => state.setLanguage);
  const { t, language, isRTL } = useTranslation();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<{
    segment: UserSegment | null;
    topics: string[];
    preferredInsights: string[];
  }>({
    segment: null,
    topics: [],
    preferredInsights: [],
  });

  const totalSteps = 3;
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
      if (formData.segment) {
        const data: OnboardingData = {
          segment: formData.segment,
          topics: formData.topics,
          preferredInsights: formData.preferredInsights,
        };
        completeOnboarding(data);
      }
      router.push('/');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    skipOnboarding();
    router.push('/');
  };

  const toggleTopic = (topicId: string) => {
    setFormData((prev) => ({
      ...prev,
      topics: prev.topics.includes(topicId)
        ? prev.topics.filter((t) => t !== topicId)
        : [...prev.topics, topicId],
    }));
  };

  const toggleInsight = (insightId: string) => {
    setFormData((prev) => ({
      ...prev,
      preferredInsights: prev.preferredInsights.includes(insightId)
        ? prev.preferredInsights.filter((i) => i !== insightId)
        : [...prev.preferredInsights, insightId],
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!formData.segment;
      case 1: return true; // Topics optional
      case 2: return true; // Insights optional
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
              <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
                <span className="text-white font-bold text-sm">ر</span>
              </div>
              <span className="font-semibold text-[var(--color-text-primary)]">Rasmalak</span>
            </div>

            {/* Language Toggle + Skip */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                className="px-3 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-inset)] rounded-lg transition-colors border border-[var(--color-border)]"
              >
                {language === 'ar' ? t.onboarding.switchToEnglish : t.onboarding.switchToArabic}
              </button>
              <button
                onClick={handleSkip}
                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                {t.onboarding.skip}
              </button>
            </div>
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
        {/* Step 0: Segment */}
        {currentStep === 0 && (
          <div className="animate-fadeIn">
            <div className="w-12 h-12 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center mb-6">
              <User className="w-6 h-6 text-[var(--color-text-secondary)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              {t.onboarding.segmentTitle}
            </h1>
            <p className="text-[var(--color-text-muted)] mb-8">
              {t.onboarding.segmentDesc}
            </p>

            <div className="space-y-3">
              {SEGMENTS.map((seg) => {
                const Icon = seg.icon;
                const isSelected = formData.segment === seg.id;
                return (
                  <button
                    key={seg.id}
                    onClick={() => setFormData({ ...formData, segment: seg.id })}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                        : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)] bg-[var(--color-bg-card)]'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-start">
                      <p className="font-semibold text-[var(--color-text-primary)]">
                        {t.onboarding.segments[seg.id]}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {t.onboarding.segments[`${seg.id}Desc` as keyof typeof t.onboarding.segments]}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-[var(--color-primary)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 1: Topics */}
        {currentStep === 1 && (
          <div className="animate-fadeIn">
            <div className="w-12 h-12 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center mb-6">
              <BookOpen className="w-6 h-6 text-[var(--color-text-secondary)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              {t.onboarding.topicsTitle}
            </h1>
            <p className="text-[var(--color-text-muted)] mb-8">
              {t.onboarding.topicsDesc}
            </p>

            <div className="flex flex-wrap gap-3">
              {TOPICS.map((topicId) => {
                const isSelected = formData.topics.includes(topicId);
                return (
                  <button
                    key={topicId}
                    onClick={() => toggleTopic(topicId)}
                    className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4" />}
                    <span className="font-medium">
                      {t.onboarding.topics[topicId as keyof typeof t.onboarding.topics]}
                    </span>
                  </button>
                );
              })}
            </div>

            {formData.topics.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)] mt-6">
                {language === 'ar' ? 'يمكنك تخطي هذه الخطوة' : 'You can skip this step'}
              </p>
            )}
          </div>
        )}

        {/* Step 2: Insights */}
        {currentStep === 2 && (
          <div className="animate-fadeIn">
            <div className="w-12 h-12 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center mb-6">
              <Lightbulb className="w-6 h-6 text-[var(--color-text-secondary)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              {t.onboarding.insightsTitle}
            </h1>
            <p className="text-[var(--color-text-muted)] mb-8">
              {t.onboarding.insightsDesc}
            </p>

            <div className="space-y-3">
              {INSIGHTS.map((insightId) => {
                const isSelected = formData.preferredInsights.includes(insightId);
                return (
                  <button
                    key={insightId}
                    onClick={() => toggleInsight(insightId)}
                    className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                        : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)] bg-[var(--color-bg-card)]'
                    }`}
                  >
                    <span className={`font-medium ${
                      isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
                    }`}>
                      {t.onboarding.insights[insightId as keyof typeof t.onboarding.insights]}
                    </span>
                    {isSelected && (
                      <Check className="w-5 h-5 text-[var(--color-primary)]" />
                    )}
                  </button>
                );
              })}
            </div>

            {formData.preferredInsights.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)] mt-6">
                {language === 'ar' ? 'يمكنك تخطي هذه الخطوة' : 'You can skip this step'}
              </p>
            )}
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

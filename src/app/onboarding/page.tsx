'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useIsAuthenticated, useHasCompletedOnboarding, useCompleteOnboarding, useSkipOnboarding, OnboardingData, UserSegment } from '@/store/useStore';
import { useIntl } from 'react-intl';
import { Button, Card } from '@/components/ui';

// Step 1: Financial Goals (labelKey used for i18n)
const GOALS = [
  {
    id: 'buy_home',
    labelKey: 'onboarding.goal_buy_home',
    defaultLabel: 'Buy a home',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 'start_investing',
    labelKey: 'onboarding.goal_start_investing',
    defaultLabel: 'Start investing',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    id: 'plan_retirement',
    labelKey: 'onboarding.goal_plan_retirement',
    defaultLabel: 'Plan retirement',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    ),
  },
  {
    id: 'clear_debt',
    labelKey: 'onboarding.goal_clear_debt',
    defaultLabel: 'Clear debt',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    id: 'emergency_fund',
    labelKey: 'onboarding.goal_emergency_fund',
    defaultLabel: 'Emergency fund',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    id: 'something_else',
    labelKey: 'onboarding.goal_something_else',
    defaultLabel: 'Something else',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
  },
];

// Step 2: User Segment
const SEGMENTS: { id: UserSegment; labelKey: string; defaultLabel: string; descKey: string; defaultDesc: string; icon: ReactNode }[] = [
  {
    id: 'individual',
    labelKey: 'onboarding.segment_individual',
    defaultLabel: 'Individual',
    descKey: 'onboarding.segment_individual_desc',
    defaultDesc: 'Managing personal finances',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: 'self_employed',
    labelKey: 'onboarding.segment_self_employed',
    defaultLabel: 'Self-Employed',
    descKey: 'onboarding.segment_self_employed_desc',
    defaultDesc: 'Freelancer or contractor',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'sme',
    labelKey: 'onboarding.segment_sme',
    defaultLabel: 'Small Business',
    descKey: 'onboarding.segment_sme_desc',
    defaultDesc: 'Running a small or medium business',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
];

// Step 3: Topics of Interest
const TOPICS = [
  { id: 'budgeting', labelKey: 'onboarding.topic_budgeting', defaultLabel: 'Budgeting' },
  { id: 'saving', labelKey: 'onboarding.topic_saving', defaultLabel: 'Saving' },
  { id: 'debt', labelKey: 'onboarding.topic_debt', defaultLabel: 'Debt Management' },
  { id: 'investing', labelKey: 'onboarding.topic_investing', defaultLabel: 'Investing' },
  { id: 'islamic_finance', labelKey: 'onboarding.topic_islamic_finance', defaultLabel: 'Islamic Finance' },
  { id: 'business_cashflow', labelKey: 'onboarding.topic_business_cashflow', defaultLabel: 'Business Cash Flow' },
];

// Step 4: Monthly Income Range
const INCOME_RANGES = [
  { id: 'under_1000', labelKey: 'onboarding.income_under_1000', defaultLabel: 'Under $1,000' },
  { id: '1000_3000', labelKey: 'onboarding.income_1000_3000', defaultLabel: '$1,000 - $3,000' },
  { id: '3000_5000', labelKey: 'onboarding.income_3000_5000', defaultLabel: '$3,000 - $5,000' },
  { id: '5000_10000', labelKey: 'onboarding.income_5000_10000', defaultLabel: '$5,000 - $10,000' },
  { id: 'over_10000', labelKey: 'onboarding.income_over_10000', defaultLabel: 'Over $10,000' },
  { id: 'prefer_not', labelKey: 'onboarding.income_prefer_not', defaultLabel: 'Prefer not to say' },
];

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const hasCompletedOnboarding = useHasCompletedOnboarding();
  const completeOnboarding = useCompleteOnboarding();
  const skipOnboarding = useSkipOnboarding();
  const intl = useIntl();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [customGoal, setCustomGoal] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<UserSegment | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedIncome, setSelectedIncome] = useState<string | null>(null);

  // Redirect if not authenticated or already onboarded
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (hasCompletedOnboarding) {
      router.push('/');
    }
  }, [isAuthenticated, hasCompletedOnboarding, router]);

  const handleContinue = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      const data: OnboardingData = {
        segment: selectedSegment || 'individual',
        topics: selectedTopics,
        preferredInsights: [],
      };
      completeOnboarding(data);
      router.push('/');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    skipOnboarding();
    router.push('/');
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter((t) => t !== topicId)
        : [...prev, topicId]
    );
  };

  const progressPercentage = Math.round((currentStep / TOTAL_STEPS) * 100);

  // Don't render until we verify auth status
  if (!isAuthenticated || hasCompletedOnboarding) {
    return null;
  }

  // Step content configuration
  const stepConfig = {
    1: {
      title: intl.formatMessage({ id: 'onboarding.step1_title', defaultMessage: "Let's personalize your experience" }),
      subtitle: intl.formatMessage({ id: 'onboarding.step1_subtitle', defaultMessage: "To give you the best advice, we need to know what you're aiming for." }),
      question: intl.formatMessage({ id: 'onboarding.step1_question', defaultMessage: "What is your primary financial goal?" }),
    },
    2: {
      title: intl.formatMessage({ id: 'onboarding.step2_title', defaultMessage: "Tell us about yourself" }),
      subtitle: intl.formatMessage({ id: 'onboarding.step2_subtitle', defaultMessage: "This helps us tailor recommendations to your situation." }),
      question: intl.formatMessage({ id: 'onboarding.step2_question', defaultMessage: "Which best describes you?" }),
    },
    3: {
      title: intl.formatMessage({ id: 'onboarding.step3_title', defaultMessage: "What would you like to learn?" }),
      subtitle: intl.formatMessage({ id: 'onboarding.step3_subtitle', defaultMessage: "Select topics you're interested in. You can change these later." }),
      question: intl.formatMessage({ id: 'onboarding.step3_question', defaultMessage: "Choose your topics of interest" }),
    },
    4: {
      title: intl.formatMessage({ id: 'onboarding.step4_title', defaultMessage: "Almost done!" }),
      subtitle: intl.formatMessage({ id: 'onboarding.step4_subtitle', defaultMessage: "This helps us provide relevant budgeting suggestions." }),
      question: intl.formatMessage({ id: 'onboarding.step4_question', defaultMessage: "What is your monthly income range?" }),
    },
  };

  const current = stepConfig[currentStep as keyof typeof stepConfig];

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      {/* Header */}
      <header className="py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[var(--radius-input)] bg-brand-emerald flex items-center justify-center">
              <svg className="w-5 h-5 text-[#FFFFFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-brand-navy font-semibold">Rasmalak AI</span>
          </div>

          {/* Skip */}
          <button
            onClick={handleSkip}
            className="text-sm text-brand-navy/50 hover:text-brand-navy transition-colors"
          >
            {intl.formatMessage({ id: 'onboarding.skip_for_now', defaultMessage: 'Skip for now' })}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-xl">
          <Card className="p-8">
            {/* Step Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  {intl.formatMessage({ id: 'onboarding.step_of', defaultMessage: 'Step {current} of {total}' }, { current: currentStep, total: TOTAL_STEPS })}
                </span>
                <span className="text-sm text-brand-emerald font-medium">
                  {intl.formatMessage({ id: 'onboarding.completed', defaultMessage: '{percent}% Completed' }, { percent: progressPercentage })}
                </span>
              </div>
              <div className="h-1.5 bg-brand-navy/10 rounded-[var(--radius-pill)] overflow-hidden">
                <div
                  className="h-full bg-brand-emerald rounded-[var(--radius-pill)] transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-brand-navy mb-2">
                {current.title}
              </h1>
              <p className="text-brand-navy/60">
                {current.subtitle}
              </p>
            </div>

            {/* Question */}
            <div className="mb-6">
              <h2 className="text-base font-semibold text-brand-navy mb-4">
                {current.question}
              </h2>

              {/* Step 1: Goal Selection */}
              {currentStep === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {GOALS.map((goal) => {
                      const isSelected = selectedGoal === goal.id;
                      return (
                        <button
                          key={goal.id}
                          onClick={() => setSelectedGoal(goal.id)}
                          className={`
                            flex items-center gap-3 p-4
                            border rounded-[var(--radius-input)]
                            transition-colors duration-150
                            text-left
                            ${isSelected
                              ? 'border-brand-emerald bg-brand-accent/30'
                              : 'border-brand-navy/10 bg-[#FFFFFF] hover:border-brand-navy/20'
                            }
                          `}
                        >
                          <span className={`${isSelected ? 'text-brand-emerald' : 'text-brand-navy/60'}`}>
                            {goal.icon}
                          </span>
                          <span className={`text-sm font-medium ${isSelected ? 'text-brand-navy' : 'text-brand-navy/80'}`}>
                            {intl.formatMessage({ id: goal.labelKey, defaultMessage: goal.defaultLabel })}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Goal Input */}
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-navy/40 pointer-events-none">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={customGoal}
                      onChange={(e) => {
                        setCustomGoal(e.target.value);
                        if (e.target.value) {
                          setSelectedGoal('custom');
                        }
                      }}
                      placeholder={intl.formatMessage({ id: 'onboarding.custom_goal_placeholder', defaultMessage: 'Or type your specific goal here...' })}
                      className="
                        w-full
                        pl-10 pr-4 py-3
                        text-sm
                        bg-[#FFFFFF]
                        border border-brand-navy/10
                        rounded-[var(--radius-input)]
                        placeholder:text-brand-navy/40
                        focus:outline-none focus:border-brand-emerald focus:ring-2 focus:ring-brand-accent
                      "
                    />
                  </div>
                </>
              )}

              {/* Step 2: Segment Selection */}
              {currentStep === 2 && (
                <div className="space-y-3">
                  {SEGMENTS.map((segment) => {
                    const isSelected = selectedSegment === segment.id;
                    return (
                      <button
                        key={segment.id}
                        onClick={() => setSelectedSegment(segment.id)}
                        className={`
                          w-full flex items-center gap-4 p-4
                          border rounded-[var(--radius-input)]
                          transition-colors duration-150
                          text-left
                          ${isSelected
                            ? 'border-brand-emerald bg-brand-accent/30'
                            : 'border-brand-navy/10 bg-[#FFFFFF] hover:border-brand-navy/20'
                          }
                        `}
                      >
                        <div className={`
                          w-10 h-10 rounded-[var(--radius-input)] flex items-center justify-center
                          ${isSelected ? 'bg-brand-emerald text-[#FFFFFF]' : 'bg-brand-navy/5 text-brand-navy/60'}
                        `}>
                          {segment.icon}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isSelected ? 'text-brand-navy' : 'text-brand-navy/80'}`}>
                            {intl.formatMessage({ id: segment.labelKey, defaultMessage: segment.defaultLabel })}
                          </p>
                          <p className="text-xs text-brand-navy/50">
                            {intl.formatMessage({ id: segment.descKey, defaultMessage: segment.defaultDesc })}
                          </p>
                        </div>
                        {isSelected && (
                          <svg className="w-5 h-5 text-brand-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Step 3: Topics Selection */}
              {currentStep === 3 && (
                <div className="grid grid-cols-2 gap-3">
                  {TOPICS.map((topic) => {
                    const isSelected = selectedTopics.includes(topic.id);
                    return (
                      <button
                        key={topic.id}
                        onClick={() => toggleTopic(topic.id)}
                        className={`
                          flex items-center justify-center gap-2 p-4
                          border rounded-[var(--radius-input)]
                          transition-colors duration-150
                          ${isSelected
                            ? 'border-brand-emerald bg-brand-accent/30'
                            : 'border-brand-navy/10 bg-[#FFFFFF] hover:border-brand-navy/20'
                          }
                        `}
                      >
                        {isSelected && (
                          <svg className="w-4 h-4 text-brand-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        <span className={`text-sm font-medium ${isSelected ? 'text-brand-navy' : 'text-brand-navy/80'}`}>
                          {intl.formatMessage({ id: topic.labelKey, defaultMessage: topic.defaultLabel })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Step 4: Income Range Selection */}
              {currentStep === 4 && (
                <div className="grid grid-cols-2 gap-3">
                  {INCOME_RANGES.map((range) => {
                    const isSelected = selectedIncome === range.id;
                    return (
                      <button
                        key={range.id}
                        onClick={() => setSelectedIncome(range.id)}
                        className={`
                          flex items-center justify-center p-4
                          border rounded-[var(--radius-input)]
                          transition-colors duration-150
                          ${isSelected
                            ? 'border-brand-emerald bg-brand-accent/30'
                            : 'border-brand-navy/10 bg-[#FFFFFF] hover:border-brand-navy/20'
                          }
                        `}
                      >
                        <span className={`text-sm font-medium ${isSelected ? 'text-brand-navy' : 'text-brand-navy/80'}`}>
                          {intl.formatMessage({ id: range.labelKey, defaultMessage: range.defaultLabel })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={handleBack}
                className={`
                  flex items-center gap-2 text-sm font-medium text-brand-navy/70 hover:text-brand-navy
                  ${currentStep === 1 ? 'opacity-50 pointer-events-none' : ''}
                `}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {intl.formatMessage({ id: 'onboarding.back', defaultMessage: 'Back' })}
              </button>

              <Button
                variant="primary"
                size="md"
                onClick={handleContinue}
              >
                {currentStep === TOTAL_STEPS 
                  ? intl.formatMessage({ id: 'onboarding.get_started', defaultMessage: 'Get Started' }) 
                  : intl.formatMessage({ id: 'onboarding.continue', defaultMessage: 'Continue' })}
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}


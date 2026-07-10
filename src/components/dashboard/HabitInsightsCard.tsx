'use client';

/**
 * Habit insights — B2 of the individual roadmap, the personal behaviour
 * mirror made visible. Each row = one earned observation (thresholds in
 * the engine keep filler out) + one nudge + one course from the library
 * (Pillar D: live behavioural data prescribing curriculum — the pairing
 * no competitor has).
 *
 * Ships dark behind AI_FEATURES.habitInsights.
 */

import { ReactNode, useMemo } from 'react';
import { useIntl } from 'react-intl';
import Link from 'next/link';
import { Lightbulb, BookOpen } from 'lucide-react';
import { AI_FEATURES } from '@/ai/config';
import { usePredictiveState } from '@/lib/predictive/PredictiveProvider';
import { deriveHabitInsights, HabitInsight } from '@/ai/deterministic/habitInsights';
import { getCourse } from '@/data/courses';
import { useBaseCurrency, useLanguage } from '@/store/useStore';
import { styledNum } from '@/components/StyledNumber';

const MAX_INSIGHTS = 3;

export default function HabitInsightsCard() {
  const intl = useIntl();
  const language = useLanguage();
  const currency = useBaseCurrency();
  const { state } = usePredictiveState();

  const insights = useMemo(
    () =>
      state
        ? deriveHabitInsights({ behavior: state.behavior, series: state.series }).slice(
            0,
            MAX_INSIGHTS,
          )
        : [],
    [state],
  );

  if (!AI_FEATURES.habitInsights || !state || !state.meta.hasMinimumHistory) return null;
  if (insights.length === 0) return null;

  const fmtCurrency = (value: number) =>
    styledNum(intl.formatNumber(value, { style: 'currency', currency, maximumFractionDigits: 0 }));

  // text carries styledNum() spans, so it's a ReactNode, not a string.
  const messageFor = (insight: HabitInsight): { text: ReactNode; nudge: string } => {
    switch (insight.id) {
      case 'impulse_after_payday':
        return {
          text: intl.formatMessage(
            { id: 'dashboard.habit_impulse', defaultMessage: '{percent}% of your flexible spending happens within 72 hours of payday.' },
            { percent: styledNum(intl.formatNumber(insight.params.percent)) },
          ),
          nudge: intl.formatMessage({ id: 'dashboard.habit_impulse_nudge', defaultMessage: 'Give big purchases a 3-day pause — payday money feels lighter than it is.' }),
        };
      case 'weekend_heavy':
        return {
          text: intl.formatMessage(
            { id: 'dashboard.habit_weekend', defaultMessage: 'Your weekend days cost {ratio}× your weekdays.' },
            { ratio: styledNum(intl.formatNumber(insight.params.ratio)) },
          ),
          nudge: intl.formatMessage({ id: 'dashboard.habit_weekend_nudge', defaultMessage: 'Decide a weekend envelope before Thursday evening arrives.' }),
        };
      case 'front_loaded_cycle':
        return {
          text: intl.formatMessage(
            { id: 'dashboard.habit_front_loaded', defaultMessage: '{percent}% of your spending lands in the first third of the cycle.' },
            { percent: styledNum(intl.formatNumber(insight.params.percent)) },
          ),
          nudge: intl.formatMessage({ id: 'dashboard.habit_front_loaded_nudge', defaultMessage: 'Split the flexible budget into weekly pots so the last week isn’t a squeeze.' }),
        };
      case 'subscription_load':
        return {
          text: intl.formatMessage(
            { id: 'dashboard.habit_subscriptions', defaultMessage: '{count} subscriptions cost you {amount} every month.' },
            { count: styledNum(intl.formatNumber(insight.params.count)), amount: fmtCurrency(insight.params.amount) },
          ),
          nudge: intl.formatMessage({ id: 'dashboard.habit_subscriptions_nudge', defaultMessage: 'Cancel one you didn’t open this month — an instant raise.' }),
        };
      case 'adherence_streak':
        return {
          text: intl.formatMessage(
            { id: 'dashboard.habit_streak', defaultMessage: '{months, plural, one {# month} other {# months}} in a row inside budget. That’s discipline.' },
            { months: insight.params.months },
          ),
          nudge: intl.formatMessage({ id: 'dashboard.habit_streak_nudge', defaultMessage: 'Your consistency is investment-ready — put the surplus to work.' }),
        };
    }
  };

  return (
    <div className="ds-card" style={{ marginBottom: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Lightbulb size={20} style={{ color: 'var(--color-accent-gold)' }} />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
          {intl.formatMessage({ id: 'dashboard.habit_title', defaultMessage: 'Your money habits' })}
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {insights.map((insight) => {
          const { text, nudge } = messageFor(insight);
          const courseId = `${insight.courseSubject}_${insight.courseLevel}_${language}`;
          const course = getCourse(courseId);
          return (
            <div key={insight.id} style={{ fontSize: '0.875rem' }}>
              <div style={{ fontWeight: 600 }}>{text}</div>
              <div style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>{nudge}</div>
              {course && (
                <Link
                  href={`/learn/courses/${courseId}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4,
                    color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none',
                    fontSize: '0.8125rem',
                  }}
                >
                  <BookOpen size={14} />
                  {intl.formatMessage(
                    { id: 'dashboard.habit_course_cta', defaultMessage: 'Lesson for this: {title}' },
                    { title: course.title },
                  )}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

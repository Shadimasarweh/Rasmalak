'use client';

import { useIntl } from 'react-intl';

/* ============================================
   LEARN PAGE
   Structure-Locked: Visual layout matching Stitch design
   Full learning ecosystem with placeholder data
   ============================================ */

/* ===== ICONS ===== */
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
);

const CircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
  </svg>
);

const BookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const CoinIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const TrendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const LightbulbIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zM9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z" />
  </svg>
);

const LiteracyCheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

/* ===== REUSABLE COMPONENTS ===== */

/* ----- Topic Card ----- */
function TopicCard({
  icon,
  iconBg,
  iconColor,
  title,
  lessons,
  duration,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  lessons: number;
  duration: string;
}) {
  return (
    <div className="card-standard" style={{ cursor: 'pointer' }}>
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-sm)',
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--spacing-2)',
          color: iconColor,
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontSize: '0.9375rem',
          fontWeight: 600,
          color: 'var(--color-brand-navy)',
          marginBottom: '4px',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: '0.75rem',
          color: 'rgba(10, 25, 47, 0.5)',
        }}
      >
        {lessons} Lessons • {duration}
      </p>
    </div>
  );
}

/* ----- Learning Path Card ----- */
function LearningPathCard({
  badge,
  badgeColor,
  moduleInfo,
  title,
  progress,
  lessons,
  completedLabel,
  currentDescription,
  startLabel,
}: {
  badge: string;
  badgeColor: string;
  moduleInfo: string;
  title: string;
  progress: number;
  lessons: { title: string; duration: string; completed: boolean; current?: boolean }[];
  completedLabel: string;
  currentDescription: string;
  startLabel: string;
}) {
  return (
    <div className="card-standard">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 'var(--spacing-2)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '0.625rem',
                fontWeight: 600,
                color: badgeColor,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {badge}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'rgba(10, 25, 47, 0.5)' }}>
              {moduleInfo}
            </span>
          </div>
          <h3
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: 'var(--color-brand-navy)',
            }}
          >
            {title}
          </h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--color-brand-navy)',
            }}
          >
            {progress}%
          </p>
          <p style={{ fontSize: '0.75rem', color: 'rgba(10, 25, 47, 0.5)' }}>{completedLabel}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          height: '6px',
          background: 'rgba(10, 25, 47, 0.1)',
          borderRadius: 'var(--radius-pill)',
          marginBottom: 'var(--spacing-2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'var(--color-brand-emerald)',
            borderRadius: 'var(--radius-pill)',
          }}
        />
      </div>

      {/* Lesson List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {lessons.map((lesson, index) => (
          <LessonRow
            key={index}
            title={lesson.title}
            duration={lesson.duration}
            completed={lesson.completed}
            current={lesson.current}
            currentDescription={lesson.current ? currentDescription : undefined}
            startLabel={lesson.current ? startLabel : undefined}
          />
        ))}
      </div>
    </div>
  );
}

/* ----- Lesson Row ----- */
function LessonRow({
  title,
  duration,
  completed,
  current = false,
  currentDescription,
  startLabel,
}: {
  title: string;
  duration: string;
  completed: boolean;
  current?: boolean;
  currentDescription?: string;
  startLabel?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid rgba(10, 25, 47, 0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span
          style={{
            color: completed ? 'var(--color-brand-emerald)' : 'rgba(10, 25, 47, 0.25)',
          }}
        >
          {completed ? <CheckCircleIcon /> : <CircleIcon />}
        </span>
        <div>
          <p
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: completed ? 'rgba(10, 25, 47, 0.5)' : 'var(--color-brand-navy)',
              textDecoration: completed ? 'line-through' : 'none',
            }}
          >
            {title}
          </p>
          {current && currentDescription && (
            <p style={{ fontSize: '0.75rem', color: 'rgba(10, 25, 47, 0.5)' }}>
              {currentDescription}
            </p>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '0.75rem', color: 'rgba(10, 25, 47, 0.4)' }}>{duration}</span>
        {current && startLabel && (
          <button
            style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              color: '#FFFFFF',
              background: 'var(--color-info)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              cursor: 'pointer',
            }}
          >
            {startLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/* ----- Recommendation Card ----- */
function RecommendationCard({
  icon,
  iconColor,
  title,
  description,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.15)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--spacing-2)',
      }}
    >
      <div style={{ display: 'flex', gap: '12px' }}>
        <span style={{ color: iconColor, flexShrink: 0 }}>{icon}</span>
        <div>
          <p
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--color-warning)',
              marginBottom: '4px',
            }}
          >
            {title}
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-warning)', lineHeight: 1.5 }}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ----- Article Card ----- */
function ArticleCard({
  image,
  badge,
  title,
  description,
}: {
  image: string;
  badge: string;
  title: string;
  description: string;
}) {
  return (
    <div
      className="card-standard"
      style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
    >
      {/* Image */}
      <div
        style={{
          height: '120px',
          background: image,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            fontSize: '0.625rem',
            fontWeight: 600,
            color: '#FFFFFF',
            background: 'rgba(10, 25, 47, 0.7)',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            textTransform: 'uppercase',
          }}
        >
          {badge}
        </span>
      </div>
      {/* Content */}
      <div style={{ padding: 'var(--spacing-2)' }}>
        <h4
          style={{
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'var(--color-brand-navy)',
            marginBottom: '6px',
          }}
        >
          {title}
        </h4>
        <p
          style={{
            fontSize: '0.8125rem',
            color: 'rgba(10, 25, 47, 0.6)',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

/* ===== MAIN PAGE ===== */
export default function LearnPage() {
  const intl = useIntl();
  
  return (
    <div className="page-container">
      {/* ===== HERO ROW ===== */}
      <div className="dashboard-grid">
        {/* Welcome Hero Card */}
        <div
          style={{
            gridColumn: 'span 8',
            background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 50%, #A5B4FC 100%)',
            borderRadius: 'var(--radius-card)',
            padding: 'var(--spacing-3)',
            color: '#FFFFFF',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative gradient overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '50%',
              height: '100%',
              background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.1) 100%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                marginBottom: '8px',
                lineHeight: 1.3,
              }}
            >
              {intl.formatMessage({ id: 'learn.welcome_back', defaultMessage: 'Welcome back to your learning journey, {name}!' }, { name: 'Shadi' })}
            </h1>
            <p
              style={{
                fontSize: '0.9375rem',
                opacity: 0.9,
                marginBottom: 'var(--spacing-3)',
                maxWidth: '400px',
              }}
            >
              {intl.formatMessage({ id: 'learn.progress_message', defaultMessage: "You're making great progress. Continue your lessons to unlock more financial insights tailored for you." })}
            </p>
            <button
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#6366F1',
                background: '#FFFFFF',
                border: 'none',
                borderRadius: 'var(--radius-input)',
                padding: '12px 20px',
                cursor: 'pointer',
              }}
            >
              {intl.formatMessage({ id: 'learn.continue_learning', defaultMessage: 'Continue Learning' })}
              <ArrowRightIcon />
            </button>
          </div>
        </div>

        {/* Financial Literacy Score Card */}
        <div
          className="card-standard"
          style={{
            gridColumn: 'span 4',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            <span style={{ color: 'var(--color-brand-emerald)' }}>
              <LiteracyCheckIcon />
            </span>
            <span
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-brand-navy)',
              }}
            >
              {intl.formatMessage({ id: 'learn.financial_literacy_score', defaultMessage: 'Financial Literacy Score' })}
            </span>
          </div>

          {/* Score Display */}
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.2) 100%)',
              border: '8px solid #6366F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--spacing-1)',
            }}
          >
            <p
              style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                color: 'var(--color-brand-navy)',
                lineHeight: 1,
              }}
            >
              750
            </p>
          </div>

          <span
            style={{
              display: 'inline-block',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-brand-emerald)',
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '4px 12px',
              borderRadius: 'var(--radius-pill)',
              marginBottom: '8px',
            }}
          >
            {intl.formatMessage({ id: 'learn.good_standing', defaultMessage: 'Good Standing' })}
          </span>
          <p style={{ fontSize: '0.75rem', color: 'rgba(10, 25, 47, 0.5)' }}>
            {intl.formatMessage({ id: 'learn.top_users_mena', defaultMessage: 'Top {percent}% of users in MENA' }, { percent: 15 })}
          </p>
        </div>
      </div>

      {/* ===== EXPLORE TOPICS SECTION ===== */}
      <div>
        <div className="section-header">
          <h2 className="heading-3">{intl.formatMessage({ id: 'learn.explore_topics', defaultMessage: 'Explore Topics' })}</h2>
          <a href="#" className="link-action">
            {intl.formatMessage({ id: 'learn.view_all', defaultMessage: 'View all' })}
          </a>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 'var(--spacing-2)',
          }}
        >
          <TopicCard
            icon={<BookIcon />}
            iconBg="rgba(99, 102, 241, 0.1)"
            iconColor="#6366F1"
            title={intl.formatMessage({ id: 'learn.money_basics', defaultMessage: 'Money Basics' })}
            lessons={12}
            duration="2h 15m"
          />
          <TopicCard
            icon={<CoinIcon />}
            iconBg="rgba(16, 185, 129, 0.1)"
            iconColor="#10B981"
            title={intl.formatMessage({ id: 'learn.budgeting_101', defaultMessage: 'Budgeting 101' })}
            lessons={8}
            duration="1h 45m"
          />
          <TopicCard
            icon={<TrendIcon />}
            iconBg="rgba(245, 158, 11, 0.1)"
            iconColor="#F59E0B"
            title={intl.formatMessage({ id: 'learn.investing', defaultMessage: 'Investing' })}
            lessons={15}
            duration="3h 10m"
          />
          <TopicCard
            icon={<ShieldIcon />}
            iconBg="rgba(239, 68, 68, 0.1)"
            iconColor="#EF4444"
            title={intl.formatMessage({ id: 'learn.debt_management', defaultMessage: 'Debt Management' })}
            lessons={6}
            duration="1h 20m"
          />
        </div>
      </div>

      {/* ===== LEARNING PATH + RECOMMENDATIONS ROW ===== */}
      <div className="dashboard-grid">
        {/* Current Learning Path */}
        <div style={{ gridColumn: 'span 8' }}>
          <h2 className="heading-3" style={{ marginBottom: 'var(--spacing-2)' }}>
            {intl.formatMessage({ id: 'learn.current_learning_path', defaultMessage: 'Current Learning Path' })}
          </h2>
          <LearningPathCard
            badge={intl.formatMessage({ id: 'learn.beginner_path', defaultMessage: 'Beginner Path' })}
            badgeColor="#6366F1"
            moduleInfo={intl.formatMessage({ id: 'learn.module_of', defaultMessage: 'Module {current} of {total}' }, { current: 1, total: 4 })}
            title={intl.formatMessage({ id: 'learn.financial_foundations', defaultMessage: 'Financial Foundations' })}
            progress={40}
            completedLabel={intl.formatMessage({ id: 'learn.completed', defaultMessage: 'Completed' })}
            currentDescription={intl.formatMessage({ id: 'learn.needs_vs_wants_desc', defaultMessage: 'Learn how to prioritize spending efficiently.' })}
            startLabel={intl.formatMessage({ id: 'learn.start', defaultMessage: 'Start' })}
            lessons={[
              { title: intl.formatMessage({ id: 'learn.intro_personal_finance', defaultMessage: 'Introduction to Personal Finance' }), duration: '5m', completed: true },
              { title: intl.formatMessage({ id: 'learn.setting_smart_goals', defaultMessage: 'Setting SMART Goals' }), duration: '8m', completed: true },
              {
                title: intl.formatMessage({ id: 'learn.needs_vs_wants', defaultMessage: 'Understanding Needs vs. Wants' }),
                duration: '',
                completed: false,
                current: true,
              },
              { title: intl.formatMessage({ id: 'learn.creating_first_budget', defaultMessage: 'Creating Your First Budget' }), duration: '12m', completed: false },
            ]}
          />
        </div>

        {/* Recommended for You */}
        <div style={{ gridColumn: 'span 4' }}>
          <h2 className="heading-3" style={{ marginBottom: 'var(--spacing-2)' }}>
            {intl.formatMessage({ id: 'learn.recommended_for_you', defaultMessage: 'Recommended for You' })}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
            <RecommendationCard
              icon={<LightbulbIcon />}
              iconColor="#F59E0B"
              title={intl.formatMessage({ id: 'learn.based_on_spending', defaultMessage: 'Based on your spending' })}
              description={intl.formatMessage({ id: 'learn.spending_recommendation', defaultMessage: 'We noticed higher dining out expenses this month. Check out this quick guide on meal prep savings.' })}
            />
            <ArticleCard
              image="linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.4) 100%)"
              badge={intl.formatMessage({ id: 'learn.article', defaultMessage: 'Article' })}
              title={intl.formatMessage({ id: 'learn.save_groceries_title', defaultMessage: '5 Ways to Save on Groceries' })}
              description={intl.formatMessage({ id: 'learn.save_groceries_desc', defaultMessage: 'Learn practical tips to reduce your monthly food bill without sacrificing nutrition.' })}
            />
          </div>
        </div>
      </div>

      {/* ===== ADDITIONAL LEARNING PATHS ===== */}
      <div>
        <div className="section-header">
          <h2 className="heading-3">{intl.formatMessage({ id: 'learn.more_learning_paths', defaultMessage: 'More Learning Paths' })}</h2>
          <a href="#" className="link-action">
            {intl.formatMessage({ id: 'learn.view_all_paths', defaultMessage: 'View all paths' })}
          </a>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--spacing-2)',
          }}
        >
          {/* Intermediate Path */}
          <div className="card-standard">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--spacing-2)' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(59, 130, 246, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#3B82F6',
                }}
              >
                <TrendIcon />
              </div>
              <div>
                <p style={{ fontSize: '0.625rem', fontWeight: 600, color: '#3B82F6', textTransform: 'uppercase' }}>
                  {intl.formatMessage({ id: 'learn.intermediate', defaultMessage: 'Intermediate' })}
                </p>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-brand-navy)' }}>
                  {intl.formatMessage({ id: 'learn.investment_basics', defaultMessage: 'Investment Basics' })}
                </h3>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(10, 25, 47, 0.5)' }}>6 Modules • 4h 30m</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-brand-navy)' }}>0%</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(10, 25, 47, 0.1)', borderRadius: 'var(--radius-pill)' }}>
              <div style={{ height: '100%', width: '0%', background: '#3B82F6', borderRadius: 'var(--radius-pill)' }} />
            </div>
          </div>

          {/* Advanced Path */}
          <div className="card-standard">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--spacing-2)' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(139, 92, 246, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#8B5CF6',
                }}
              >
                <ShieldIcon />
              </div>
              <div>
                <p style={{ fontSize: '0.625rem', fontWeight: 600, color: '#8B5CF6', textTransform: 'uppercase' }}>
                  {intl.formatMessage({ id: 'learn.advanced', defaultMessage: 'Advanced' })}
                </p>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-brand-navy)' }}>
                  {intl.formatMessage({ id: 'learn.wealth_building', defaultMessage: 'Wealth Building' })}
                </h3>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(10, 25, 47, 0.5)' }}>8 Modules • 6h 15m</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-brand-navy)' }}>0%</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(10, 25, 47, 0.1)', borderRadius: 'var(--radius-pill)' }}>
              <div style={{ height: '100%', width: '0%', background: '#8B5CF6', borderRadius: 'var(--radius-pill)' }} />
            </div>
          </div>

          {/* Islamic Finance Path */}
          <div className="card-standard">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--spacing-2)' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(6, 182, 212, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#06B6D4',
                }}
              >
                <BookIcon />
              </div>
              <div>
                <p style={{ fontSize: '0.625rem', fontWeight: 600, color: '#06B6D4', textTransform: 'uppercase' }}>
                  {intl.formatMessage({ id: 'learn.specialized', defaultMessage: 'Specialized' })}
                </p>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-brand-navy)' }}>
                  {intl.formatMessage({ id: 'learn.islamic_finance', defaultMessage: 'Islamic Finance' })}
                </h3>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(10, 25, 47, 0.5)' }}>5 Modules • 3h 45m</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-brand-navy)' }}>0%</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(10, 25, 47, 0.1)', borderRadius: 'var(--radius-pill)' }}>
              <div style={{ height: '100%', width: '0%', background: '#06B6D4', borderRadius: 'var(--radius-pill)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ===== ARTICLES & VIDEOS SECTION ===== */}
      <div className="dashboard-grid">
        {/* Latest Articles */}
        <div style={{ gridColumn: 'span 6' }}>
          <div className="section-header">
            <h2 className="heading-3">{intl.formatMessage({ id: 'learn.latest_articles', defaultMessage: 'Latest Articles' })}</h2>
            <a href="#" className="link-action">
              {intl.formatMessage({ id: 'learn.view_all', defaultMessage: 'View all' })}
            </a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
            {[
              { title: intl.formatMessage({ id: 'learn.budget_rule_title', defaultMessage: 'The 50/30/20 Budget Rule Explained' }), category: intl.formatMessage({ id: 'learn.budgeting', defaultMessage: 'Budgeting' }), time: intl.formatMessage({ id: 'learn.min_read', defaultMessage: '{min} min read' }, { min: 5 }) },
              { title: intl.formatMessage({ id: 'learn.emergency_funds_title', defaultMessage: 'Emergency Funds: How Much is Enough?' }), category: intl.formatMessage({ id: 'learn.saving', defaultMessage: 'Saving' }), time: intl.formatMessage({ id: 'learn.min_read', defaultMessage: '{min} min read' }, { min: 7 }) },
              { title: intl.formatMessage({ id: 'learn.compound_interest_title', defaultMessage: 'Understanding Compound Interest' }), category: intl.formatMessage({ id: 'learn.investing', defaultMessage: 'Investing' }), time: intl.formatMessage({ id: 'learn.min_read', defaultMessage: '{min} min read' }, { min: 6 }) },
            ].map((article, index) => (
              <div
                key={index}
                className="card-standard"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--color-info)', fontWeight: 500, marginBottom: '4px' }}>
                    {article.category}
                  </p>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-brand-navy)' }}>
                    {article.title}
                  </h4>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'rgba(10, 25, 47, 0.4)' }}>{article.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Featured Videos */}
        <div style={{ gridColumn: 'span 6' }}>
          <div className="section-header">
            <h2 className="heading-3">{intl.formatMessage({ id: 'learn.featured_videos', defaultMessage: 'Featured Videos' })}</h2>
            <a href="#" className="link-action">
              {intl.formatMessage({ id: 'learn.view_all', defaultMessage: 'View all' })}
            </a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-2)' }}>
            {[
              { title: intl.formatMessage({ id: 'learn.budgeting_for_beginners', defaultMessage: 'Budgeting for Beginners' }), duration: '8:24', color: '#10B981' },
              { title: intl.formatMessage({ id: 'learn.investing_101', defaultMessage: 'Investing 101' }), duration: '12:05', color: '#6366F1' },
            ].map((video, index) => (
              <div
                key={index}
                className="card-standard"
                style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
              >
                <div
                  style={{
                    height: '100px',
                    background: `linear-gradient(135deg, ${video.color}20 0%, ${video.color}40 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={video.color}>
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      fontSize: '0.6875rem',
                      fontWeight: 500,
                      color: '#FFFFFF',
                      background: 'rgba(0,0,0,0.6)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {video.duration}
                  </span>
                </div>
                <div style={{ padding: '12px' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-brand-navy)' }}>
                    {video.title}
                  </h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== ACHIEVEMENTS / BADGES SECTION ===== */}
      <div>
        <div className="section-header">
          <h2 className="heading-3">{intl.formatMessage({ id: 'learn.your_achievements', defaultMessage: 'Your Achievements' })}</h2>
          <a href="#" className="link-action">
            {intl.formatMessage({ id: 'learn.view_all', defaultMessage: 'View all' })}
          </a>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 'var(--spacing-2)',
          }}
        >
          {[
            { name: intl.formatMessage({ id: 'learn.first_steps', defaultMessage: 'First Steps' }), desc: intl.formatMessage({ id: 'learn.first_steps_desc', defaultMessage: 'Completed your first lesson' }), earned: true, color: '#10B981' },
            { name: intl.formatMessage({ id: 'learn.budget_master', defaultMessage: 'Budget Master' }), desc: intl.formatMessage({ id: 'learn.budget_master_desc', defaultMessage: 'Complete Budgeting 101' }), earned: true, color: '#6366F1' },
            { name: intl.formatMessage({ id: 'learn.saver', defaultMessage: 'Saver' }), desc: intl.formatMessage({ id: 'learn.saver_desc', defaultMessage: 'Complete Saving module' }), earned: false, color: '#F59E0B' },
            { name: intl.formatMessage({ id: 'learn.investor', defaultMessage: 'Investor' }), desc: intl.formatMessage({ id: 'learn.investor_desc', defaultMessage: 'Complete Investing path' }), earned: false, color: '#8B5CF6' },
          ].map((badge, index) => (
            <div
              key={index}
              className="card-standard"
              style={{
                textAlign: 'center',
                opacity: badge.earned ? 1 : 0.5,
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: badge.earned ? `${badge.color}20` : 'rgba(10, 25, 47, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--spacing-1)',
                }}
              >
                {badge.earned ? (
                  <span style={{ color: badge.color }}>
                    <CheckIcon />
                  </span>
                ) : (
                  <span style={{ color: 'rgba(10, 25, 47, 0.3)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                )}
              </div>
              <h4
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--color-brand-navy)',
                  marginBottom: '4px',
                }}
              >
                {badge.name}
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'rgba(10, 25, 47, 0.5)' }}>{badge.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

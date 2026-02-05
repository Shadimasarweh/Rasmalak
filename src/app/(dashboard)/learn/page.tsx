'use client';

import { useState } from 'react';
import { useIntl } from 'react-intl';

/* ============================================
   LEARN PAGE
   State-driven architecture with mode selectors
   ============================================ */

/* ===== TYPES ===== */
type LearningMode = 'home' | 'paths' | 'articles' | 'videos' | 'topics' | 'achievements';
type PageState = 'default' | 'mode-selected' | 'resume';

/* ===== PLACEHOLDER/MOCK: User Progress State ===== */
// In production, this would come from user data/API
// Set to true to simulate a first-time user with zero progress
const USER_HAS_ZERO_PROGRESS = true;

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

const PathIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18" />
    <path d="M8 6h10v10" />
  </svg>
);

const ArticleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const VideoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const TopicsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const TrophyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

const StarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

/* ===== MODE SELECTOR DATA ===== */
const LEARNING_MODES: { id: LearningMode; labelKey: string; labelDefault: string; icon: React.ReactNode }[] = [
  { id: 'home', labelKey: 'learn.mode.home', labelDefault: 'Home', icon: <HomeIcon /> },
  { id: 'paths', labelKey: 'learn.mode.paths', labelDefault: 'Learning Paths', icon: <PathIcon /> },
  { id: 'articles', labelKey: 'learn.mode.articles', labelDefault: 'Articles', icon: <ArticleIcon /> },
  { id: 'videos', labelKey: 'learn.mode.videos', labelDefault: 'Videos', icon: <VideoIcon /> },
  { id: 'topics', labelKey: 'learn.mode.topics', labelDefault: 'Topics & Skills', icon: <TopicsIcon /> },
  { id: 'achievements', labelKey: 'learn.mode.achievements', labelDefault: 'Achievements', icon: <TrophyIcon /> },
];

/* ===== REUSABLE COMPONENTS ===== */

/* ----- Mode Selector Button ----- */
function ModeSelector({
  mode,
  isActive,
  onClick,
  intl,
}: {
  mode: typeof LEARNING_MODES[0];
  isActive: boolean;
  onClick: () => void;
  intl: ReturnType<typeof useIntl>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px 16px',
        minWidth: '100px',
        flex: '0 0 auto',
        background: isActive ? 'var(--color-brand-emerald)' : 'rgba(16, 185, 129, 0.1)',
        border: isActive ? 'none' : '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: 'var(--radius-card)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        color: isActive ? '#FFFFFF' : 'var(--color-brand-emerald)',
      }}
    >
      <span style={{ opacity: isActive ? 1 : 0.8 }}>{mode.icon}</span>
      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
        {intl.formatMessage({ id: mode.labelKey, defaultMessage: mode.labelDefault })}
      </span>
    </button>
  );
}

/* ----- Hero Section (Top Box) ----- */
function HeroSection({ intl, hasStartedCourses }: { intl: ReturnType<typeof useIntl>; hasStartedCourses: boolean }) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--spacing-3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--spacing-3)',
        flexWrap: 'wrap' as const,
      }}
    >
      <div style={{ flex: 1 }}>
        {/* Greeting */}
        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--color-brand-navy)',
            marginBottom: '8px',
          }}
        >
          {hasStartedCourses
            ? intl.formatMessage({ id: 'learn.welcome_back', defaultMessage: 'Welcome back to your learning journey!' })
            : intl.formatMessage({ id: 'learn.featured_title', defaultMessage: 'Start Your Financial Journey' })
          }
        </h3>
        
        {/* Description - only show for new users */}
        {!hasStartedCourses && (
          <p
            style={{
              fontSize: '0.875rem',
              color: 'rgba(10, 25, 47, 0.6)',
              lineHeight: 1.6,
              maxWidth: '400px',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            {intl.formatMessage({ id: 'learn.featured_desc', defaultMessage: 'Begin with our beginner-friendly Financial Foundations path and build your knowledge step by step.' })}
          </p>
        )}
        
        {/* Get Started / Continue Button */}
        <button
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: '#6366F1',
            color: '#FFFFFF',
            fontSize: '0.875rem',
            fontWeight: 600,
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
        >
          {intl.formatMessage({ id: 'learn.get_started', defaultMessage: 'Get Started' })}
          <ArrowRightIcon />
        </button>
      </div>

      {/* Financial Literacy Score */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 'var(--spacing-2)',
          minWidth: '140px',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.2) 100%)',
            border: '4px solid #6366F1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '8px',
          }}
        >
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-brand-navy)' }}>
            {hasStartedCourses ? '750' : '--'}
          </span>
        </div>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-brand-navy)', textAlign: 'center' }}>
          {intl.formatMessage({ id: 'learn.literacy_score', defaultMessage: 'Financial Literacy Score' })}
        </p>
        {!hasStartedCourses && (
          <p style={{ fontSize: '0.6875rem', color: 'rgba(10, 25, 47, 0.5)', textAlign: 'center' }}>
            {intl.formatMessage({ id: 'learn.score_placeholder', defaultMessage: 'Complete lessons to unlock' })}
          </p>
        )}
      </div>
    </div>
  );
}

/* ----- Featured Content Section (Home Only) ----- */
function FeaturedContent({ intl }: { intl: ReturnType<typeof useIntl> }) {
  return (
    <div style={{ marginTop: 'var(--spacing-3)' }}>
      {/* Featured Label */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.6875rem',
          fontWeight: 600,
          color: '#6366F1',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 'var(--spacing-2)',
        }}
      >
        <StarIcon />
        {intl.formatMessage({ id: 'learn.featured', defaultMessage: 'Featured' })}
      </div>
      
      {/* Featured placeholder cards */}
      <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 'var(--radius-card)',
              padding: 'var(--spacing-2)',
              height: '100px',
            }}
          >
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.04)', marginBottom: '8px' }} />
            <div style={{ width: '70%', height: '12px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.04)', marginBottom: '6px' }} />
            <div style={{ width: '50%', height: '8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.03)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----- Recommended Content Section (Home Only) ----- */
function RecommendedContent({ intl }: { intl: ReturnType<typeof useIntl> }) {
  return (
    <div style={{ marginTop: 'var(--spacing-3)' }}>
      {/* Recommended Label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: 'var(--spacing-2)',
        }}
      >
        <span style={{ color: '#F59E0B', flexShrink: 0 }}>
          <LightbulbIcon />
        </span>
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: '#F59E0B',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {intl.formatMessage({ id: 'learn.recommended', defaultMessage: 'Recommended for you' })}
        </span>
      </div>
      
      {/* Recommendation card */}
      <div
        style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.15)',
          borderRadius: 'var(--radius-card)',
          padding: 'var(--spacing-2)',
          maxWidth: '400px',
        }}
      >
        <p style={{ fontSize: '0.875rem', color: 'rgba(10, 25, 47, 0.7)', lineHeight: 1.5 }}>
          {intl.formatMessage({ id: 'learn.recommendation_text', defaultMessage: 'Based on your profile, start with Budgeting 101.' })}
        </p>
      </div>
    </div>
  );
}

/* ----- Financial Literacy Score (Placeholder) ----- */
function LiteracyScorePlaceholder({ intl }: { intl: ReturnType<typeof useIntl> }) {
  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--spacing-2)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-2)',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.1)',
          border: '3px solid rgba(99, 102, 241, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.6)' }}>--</span>
      </div>
      <div>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '2px' }}>
          {intl.formatMessage({ id: 'learn.literacy_score', defaultMessage: 'Financial Literacy Score' })}
        </p>
        <p style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.3)' }}>
          {intl.formatMessage({ id: 'learn.score_placeholder', defaultMessage: 'Complete lessons to unlock' })}
        </p>
      </div>
    </div>
  );
}

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

/* ----- Path Preview Card ----- */
function PathPreviewCard({
  icon,
  iconBg,
  iconColor,
  badge,
  badgeColor,
  title,
  modules,
  duration,
  progress,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  badge: string;
  badgeColor: string;
  title: string;
  modules: number;
  duration: string;
  progress: number;
}) {
  return (
    <div className="card-standard">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--spacing-2)' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-sm)',
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: iconColor,
          }}
        >
          {icon}
        </div>
        <div>
          <p style={{ fontSize: '0.625rem', fontWeight: 600, color: badgeColor, textTransform: 'uppercase' }}>
            {badge}
          </p>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-brand-navy)' }}>
            {title}
          </h3>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.75rem', color: 'rgba(10, 25, 47, 0.5)' }}>{modules} Modules • {duration}</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-brand-navy)' }}>{progress}%</span>
      </div>
      <div style={{ height: '4px', background: 'rgba(10, 25, 47, 0.1)', borderRadius: 'var(--radius-pill)' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: badgeColor, borderRadius: 'var(--radius-pill)' }} />
      </div>
    </div>
  );
}

/* ----- Article Row ----- */
function ArticleRow({
  category,
  categoryColor,
  title,
  readTime,
}: {
  category: string;
  categoryColor: string;
  title: string;
  readTime: string;
}) {
  return (
    <div
      className="card-standard"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
      }}
    >
      <div>
        <p style={{ fontSize: '0.6875rem', color: categoryColor, fontWeight: 500, marginBottom: '4px' }}>
          {category}
        </p>
        <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-brand-navy)' }}>
          {title}
        </h4>
      </div>
      <span style={{ fontSize: '0.75rem', color: 'rgba(10, 25, 47, 0.4)' }}>{readTime}</span>
    </div>
  );
}

/* ----- Video Card ----- */
function VideoCard({
  title,
  duration,
  color,
}: {
  title: string;
  duration: string;
  color: string;
}) {
  return (
    <div className="card-standard" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
      <div
        style={{
          height: '120px',
          background: `linear-gradient(135deg, ${color}20 0%, ${color}40 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={color}>
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
          {duration}
        </span>
      </div>
      <div style={{ padding: 'var(--spacing-2)' }}>
        <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-brand-navy)' }}>
          {title}
        </h4>
      </div>
    </div>
  );
}

/* ----- Achievement Badge ----- */
function AchievementBadge({
  name,
  description,
  earned,
  color,
}: {
  name: string;
  description: string;
  earned: boolean;
  color: string;
}) {
  return (
    <div
      className="card-standard"
      style={{
        textAlign: 'center',
        opacity: earned ? 1 : 0.5,
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: earned ? `${color}20` : 'rgba(10, 25, 47, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--spacing-1)',
        }}
      >
        {earned ? (
          <span style={{ color: color }}>
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
        {name}
      </h4>
      <p style={{ fontSize: '0.75rem', color: 'rgba(10, 25, 47, 0.5)' }}>{description}</p>
    </div>
  );
}

/* ===== MODE CONTENT COMPONENTS ===== */

/* ----- Learning Paths Content ----- */
function LearningPathsContent({ intl }: { intl: ReturnType<typeof useIntl> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
      {/* Current Path (In Progress) */}
      <div>
        <h2 className="heading-3" style={{ marginBottom: 'var(--spacing-2)' }}>
          {intl.formatMessage({ id: 'learn.current_path', defaultMessage: 'Continue Your Path' })}
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
            { title: intl.formatMessage({ id: 'learn.needs_vs_wants', defaultMessage: 'Understanding Needs vs. Wants' }), duration: '', completed: false, current: true },
            { title: intl.formatMessage({ id: 'learn.creating_first_budget', defaultMessage: 'Creating Your First Budget' }), duration: '12m', completed: false },
          ]}
        />
      </div>

      {/* Available Paths */}
      <div>
        <h2 className="heading-3" style={{ marginBottom: 'var(--spacing-2)' }}>
          {intl.formatMessage({ id: 'learn.available_paths', defaultMessage: 'Available Paths' })}
        </h2>
        <div className="responsive-grid-3">
          <PathPreviewCard
            icon={<TrendIcon />}
            iconBg="rgba(59, 130, 246, 0.1)"
            iconColor="#3B82F6"
            badge={intl.formatMessage({ id: 'learn.intermediate', defaultMessage: 'Intermediate' })}
            badgeColor="#3B82F6"
            title={intl.formatMessage({ id: 'learn.investment_basics', defaultMessage: 'Investment Basics' })}
            modules={6}
            duration="4h 30m"
            progress={0}
          />
          <PathPreviewCard
            icon={<ShieldIcon />}
            iconBg="rgba(139, 92, 246, 0.1)"
            iconColor="#8B5CF6"
            badge={intl.formatMessage({ id: 'learn.advanced', defaultMessage: 'Advanced' })}
            badgeColor="#8B5CF6"
            title={intl.formatMessage({ id: 'learn.wealth_building', defaultMessage: 'Wealth Building' })}
            modules={8}
            duration="6h 15m"
            progress={0}
          />
          <PathPreviewCard
            icon={<BookIcon />}
            iconBg="rgba(6, 182, 212, 0.1)"
            iconColor="#06B6D4"
            badge={intl.formatMessage({ id: 'learn.specialized', defaultMessage: 'Specialized' })}
            badgeColor="#06B6D4"
            title={intl.formatMessage({ id: 'learn.islamic_finance', defaultMessage: 'Islamic Finance' })}
            modules={5}
            duration="3h 45m"
            progress={0}
          />
        </div>
      </div>
    </div>
  );
}

/* ----- Articles Content ----- */
function ArticlesContent({ intl }: { intl: ReturnType<typeof useIntl> }) {
  const articles = [
    { category: intl.formatMessage({ id: 'learn.budgeting', defaultMessage: 'Budgeting' }), categoryColor: '#10B981', title: intl.formatMessage({ id: 'learn.budget_rule_title', defaultMessage: 'The 50/30/20 Budget Rule Explained' }), readTime: intl.formatMessage({ id: 'learn.min_read', defaultMessage: '{min} min read' }, { min: 5 }) },
    { category: intl.formatMessage({ id: 'learn.saving', defaultMessage: 'Saving' }), categoryColor: '#6366F1', title: intl.formatMessage({ id: 'learn.emergency_funds_title', defaultMessage: 'Emergency Funds: How Much is Enough?' }), readTime: intl.formatMessage({ id: 'learn.min_read', defaultMessage: '{min} min read' }, { min: 7 }) },
    { category: intl.formatMessage({ id: 'learn.investing', defaultMessage: 'Investing' }), categoryColor: '#F59E0B', title: intl.formatMessage({ id: 'learn.compound_interest_title', defaultMessage: 'Understanding Compound Interest' }), readTime: intl.formatMessage({ id: 'learn.min_read', defaultMessage: '{min} min read' }, { min: 6 }) },
    { category: intl.formatMessage({ id: 'learn.debt', defaultMessage: 'Debt' }), categoryColor: '#EF4444', title: intl.formatMessage({ id: 'learn.debt_snowball_title', defaultMessage: 'Debt Snowball vs Avalanche Method' }), readTime: intl.formatMessage({ id: 'learn.min_read', defaultMessage: '{min} min read' }, { min: 8 }) },
    { category: intl.formatMessage({ id: 'learn.budgeting', defaultMessage: 'Budgeting' }), categoryColor: '#10B981', title: intl.formatMessage({ id: 'learn.save_groceries_title', defaultMessage: '5 Ways to Save on Groceries' }), readTime: intl.formatMessage({ id: 'learn.min_read', defaultMessage: '{min} min read' }, { min: 4 }) },
  ];

  return (
    <div>
      <h2 className="heading-3" style={{ marginBottom: 'var(--spacing-2)' }}>
        {intl.formatMessage({ id: 'learn.all_articles', defaultMessage: 'All Articles' })}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
        {articles.map((article, index) => (
          <ArticleRow
            key={index}
            category={article.category}
            categoryColor={article.categoryColor}
            title={article.title}
            readTime={article.readTime}
          />
        ))}
      </div>
    </div>
  );
}

/* ----- Videos Content ----- */
function VideosContent({ intl }: { intl: ReturnType<typeof useIntl> }) {
  const videos = [
    { title: intl.formatMessage({ id: 'learn.budgeting_for_beginners', defaultMessage: 'Budgeting for Beginners' }), duration: '8:24', color: '#10B981' },
    { title: intl.formatMessage({ id: 'learn.investing_101', defaultMessage: 'Investing 101' }), duration: '12:05', color: '#6366F1' },
    { title: intl.formatMessage({ id: 'learn.understanding_credit', defaultMessage: 'Understanding Credit Scores' }), duration: '6:45', color: '#F59E0B' },
    { title: intl.formatMessage({ id: 'learn.retirement_planning', defaultMessage: 'Retirement Planning Basics' }), duration: '15:30', color: '#8B5CF6' },
  ];

  return (
    <div>
      <h2 className="heading-3" style={{ marginBottom: 'var(--spacing-2)' }}>
        {intl.formatMessage({ id: 'learn.all_videos', defaultMessage: 'All Videos' })}
      </h2>
      <div className="responsive-grid-4">
        {videos.map((video, index) => (
          <VideoCard key={index} title={video.title} duration={video.duration} color={video.color} />
        ))}
      </div>
    </div>
  );
}

/* ----- Topics Content ----- */
function TopicsContent({ intl }: { intl: ReturnType<typeof useIntl> }) {
  return (
    <div>
      <h2 className="heading-3" style={{ marginBottom: 'var(--spacing-2)' }}>
        {intl.formatMessage({ id: 'learn.explore_topics', defaultMessage: 'Explore Topics' })}
      </h2>
      <div className="responsive-grid-4">
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
  );
}

/* ----- Achievements Content ----- */
function AchievementsContent({ intl }: { intl: ReturnType<typeof useIntl> }) {
  const badges = [
    { name: intl.formatMessage({ id: 'learn.first_steps', defaultMessage: 'First Steps' }), desc: intl.formatMessage({ id: 'learn.first_steps_desc', defaultMessage: 'Completed your first lesson' }), earned: true, color: '#10B981' },
    { name: intl.formatMessage({ id: 'learn.budget_master', defaultMessage: 'Budget Master' }), desc: intl.formatMessage({ id: 'learn.budget_master_desc', defaultMessage: 'Complete Budgeting 101' }), earned: true, color: '#6366F1' },
    { name: intl.formatMessage({ id: 'learn.saver', defaultMessage: 'Saver' }), desc: intl.formatMessage({ id: 'learn.saver_desc', defaultMessage: 'Complete Saving module' }), earned: false, color: '#F59E0B' },
    { name: intl.formatMessage({ id: 'learn.investor', defaultMessage: 'Investor' }), desc: intl.formatMessage({ id: 'learn.investor_desc', defaultMessage: 'Complete Investing path' }), earned: false, color: '#8B5CF6' },
  ];

  return (
    <div>
      <h2 className="heading-3" style={{ marginBottom: 'var(--spacing-2)' }}>
        {intl.formatMessage({ id: 'learn.your_achievements', defaultMessage: 'Your Achievements' })}
      </h2>
      <div className="responsive-grid-4">
        {badges.map((badge, index) => (
          <AchievementBadge
            key={index}
            name={badge.name}
            description={badge.desc}
            earned={badge.earned}
            color={badge.color}
          />
        ))}
      </div>
    </div>
  );
}

/* ===== ZERO-PROGRESS STATE COMPONENTS ===== */

/* ----- Skeleton Card (Generic Placeholder) ----- */
function SkeletonCard({ height = '100px' }: { height?: string }) {
  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: 'var(--radius-card)',
        height,
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--spacing-2)',
        gap: '8px',
      }}
    >
      {/* Skeleton icon */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(255, 255, 255, 0.04)',
        }}
      />
      {/* Skeleton title line */}
      <div
        style={{
          width: '70%',
          height: '12px',
          borderRadius: '4px',
          background: 'rgba(255, 255, 255, 0.04)',
        }}
      />
      {/* Skeleton subtitle line */}
      <div
        style={{
          width: '50%',
          height: '8px',
          borderRadius: '4px',
          background: 'rgba(255, 255, 255, 0.03)',
        }}
      />
    </div>
  );
}

/* ----- Recently Added Section (Zero-Progress Only) ----- */
function RecentlyAddedPlaceholder({ intl }: { intl: ReturnType<typeof useIntl> }) {
  return (
    <div style={{ marginTop: 'var(--spacing-3)' }}>
      <p
        style={{
          fontSize: '0.75rem',
          fontWeight: 500,
          color: 'rgba(255, 255, 255, 0.3)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 'var(--spacing-1)',
        }}
      >
        {intl.formatMessage({ id: 'learn.recently_added', defaultMessage: 'Recently added' })}
      </p>
      <div
        style={{
          display: 'flex',
          gap: 'var(--spacing-2)',
          overflowX: 'hidden',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ flex: '0 0 200px' }}>
            <SkeletonCard height="90px" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----- Featured Row Placeholder (Single Card) ----- */
function FeaturedRowPlaceholder({
  label,
}: {
  label: string;
}) {
  return (
    <div style={{ marginTop: 'var(--spacing-2)' }}>
      <p
        style={{
          fontSize: '0.6875rem',
          fontWeight: 500,
          color: 'rgba(255, 255, 255, 0.25)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: '8px',
        }}
      >
        {label}
      </p>
      <div style={{ maxWidth: '280px' }}>
        <SkeletonCard height="72px" />
      </div>
    </div>
  );
}

/* ----- Zero Progress Content Section ----- */
function ZeroProgressContent({ intl }: { intl: ReturnType<typeof useIntl> }) {
  return (
    <>
      {/* Recently Added - Horizontal Row */}
      <RecentlyAddedPlaceholder intl={intl} />

      {/* Featured Placeholder Rows */}
      <div style={{ marginTop: 'var(--spacing-3)' }}>
        <FeaturedRowPlaceholder
          label={intl.formatMessage({ id: 'learn.featured_articles', defaultMessage: 'Featured Articles' })}
        />
        <FeaturedRowPlaceholder
          label={intl.formatMessage({ id: 'learn.featured_videos', defaultMessage: 'Featured Videos' })}
        />
        <FeaturedRowPlaceholder
          label={intl.formatMessage({ id: 'learn.featured_courses', defaultMessage: 'Featured Courses' })}
        />
      </div>
    </>
  );
}

/* ===== MAIN PAGE ===== */
export default function LearnPage() {
  const intl = useIntl();
  // Home is selected by default
  const [selectedMode, setSelectedMode] = useState<LearningMode>('home');

  // User progress state (would come from API in production)
  const hasStartedCourses = !USER_HAS_ZERO_PROGRESS;

  // Check if Home is the active mode
  const isHomeMode = selectedMode === 'home';

  // Handle mode selection
  const handleModeSelect = (mode: LearningMode) => {
    setSelectedMode(mode);
  };

  // Render content based on selected mode
  const renderModeContent = () => {
    switch (selectedMode) {
      case 'paths':
        return <LearningPathsContent intl={intl} />;
      case 'articles':
        return <ArticlesContent intl={intl} />;
      case 'videos':
        return <VideosContent intl={intl} />;
      case 'topics':
        return <TopicsContent intl={intl} />;
      case 'achievements':
        return <AchievementsContent intl={intl} />;
      default:
        return null;
    }
  };

  return (
    <div className="page-container">
      {/* ===== HERO SECTION (Always visible) ===== */}
      <HeroSection intl={intl} hasStartedCourses={hasStartedCourses} />

      {/* ===== MODE SELECTORS ===== */}
      <div style={{ marginTop: 'var(--spacing-3)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
          }}
        >
          {/* Mode Selector Buttons */}
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', flex: 1, overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {LEARNING_MODES.map((mode) => (
              <ModeSelector
                key={mode.id}
                mode={mode}
                isActive={selectedMode === mode.id}
                onClick={() => handleModeSelect(mode.id)}
                intl={intl}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ===== HOME MODE CONTENT: Featured & Recommended ===== */}
      {isHomeMode && (
        <>
          <FeaturedContent intl={intl} />
          <RecommendedContent intl={intl} />
        </>
      )}

      {/* ===== CATEGORY MODE CONTENT ===== */}
      {!isHomeMode && (
        <div style={{ marginTop: 'var(--spacing-3)' }}>
          {renderModeContent()}
        </div>
      )}
    </div>
  );
}

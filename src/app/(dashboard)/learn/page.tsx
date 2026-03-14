'use client';

import { useState, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useRouter } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';
import { FilterPanel, useFilterStore } from '@/components/filters';
import type { FilterConfig } from '@/components/filters';
import { getAllCourses } from '@/data/courses';
import { getTotalSections } from '@/types/course';
import type { CourseData, CourseLevel } from '@/types/course';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { useStore } from '@/store/useStore';
import { getAllLocalProgress } from '@/store/courseProgressStore';

/* ===== TYPES ===== */
type LearningMode = 'home' | 'paths' | 'articles' | 'videos' | 'topics' | 'achievements';

/* ===== LEVEL BADGE CONFIG ===== */
const LEVEL_COLORS: Record<CourseLevel, { color: string; bg: string }> = {
  beginner: { color: 'var(--color-accent-growth)', bg: 'var(--color-accent-growth-subtle)' },
  intermediate: { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
  advanced: { color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
};

const LEVEL_LABELS: Record<CourseLevel, { en: string; ar: string }> = {
  beginner: { en: 'Beginner', ar: 'مبتدئ' },
  intermediate: { en: 'Intermediate', ar: 'متوسط' },
  advanced: { en: 'Advanced', ar: 'متقدم' },
};

/* ===== ICONS ===== */
const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
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

/* ===== LEARN FILTER CONFIG (level only -- contentType removed, duplicated by mode tabs) ===== */
const LEARN_FILTER_CONFIG: FilterConfig = {
  pageId: 'learn',
  sections: [
    {
      key: 'level',
      titleKey: 'learn.filter.level',
      titleDefault: 'Level',
      type: 'multi',
      options: [
        { value: 'beginner', labelKey: 'learn.level.beginner', labelDefault: 'Beginner' },
        { value: 'intermediate', labelKey: 'learn.level.intermediate', labelDefault: 'Intermediate' },
        { value: 'advanced', labelKey: 'learn.level.advanced', labelDefault: 'Advanced' },
      ],
    },
  ],
};

/* ===== SHARED PROGRESS HOOK ===== */
function useCourseProgress(courses: CourseData[]) {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const language = useStore((s) => s.language);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const map: Record<string, number> = {};
    const localProgress = getAllLocalProgress();
    for (const course of courses) {
      const localData = localProgress[course.courseId];
      if (localData) {
        const total = getTotalSections(course);
        const done = localData.completedSectionIds?.length ?? 0;
        map[course.courseId] = total > 0 ? Math.round((done / total) * 100) : 0;
      }
    }
    if (Object.keys(map).length > 0) {
      setProgressMap((prev) => {
        const hasChanges = Object.entries(map).some(([k, v]) => prev[k] !== v);
        return hasChanges ? { ...prev, ...map } : prev;
      });
    }

    if (!initialized || !user) return;

    const fetchProgress = async () => {
      try {
        const { data } = await supabase
          .from('course_progress')
          .select('course_id, completed_section_ids, locale')
          .eq('user_id', user.id)
          .eq('locale', language);

        if (!data || data.length === 0) return;

        const supaMap: Record<string, number> = {};
        for (const row of data) {
          const course = courses.find((c) => c.courseId === row.course_id);
          if (course) {
            const total = getTotalSections(course);
            const done = (row.completed_section_ids as string[])?.length ?? 0;
            supaMap[row.course_id] = total > 0 ? Math.round((done / total) * 100) : 0;
          }
        }
        if (Object.keys(supaMap).length === 0) return;
        setProgressMap((prev) => {
          let changed = false;
          const merged = { ...prev };
          for (const [k, v] of Object.entries(supaMap)) {
            const best = Math.max(merged[k] ?? 0, v);
            if (merged[k] !== best) {
              merged[k] = best;
              changed = true;
            }
          }
          return changed ? merged : prev;
        });
      } catch {
        // Supabase unavailable; localStorage data already loaded
      }
    };

    fetchProgress();
  }, [initialized, user, language, courses]);

  return progressMap;
}

/* ===== REUSABLE COMPONENTS ===== */

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
        background: isActive ? 'var(--color-accent-growth)' : 'var(--color-accent-growth-subtle)',
        border: isActive ? 'none' : '1px solid rgba(var(--accent-color-rgb), 0.3)',
        borderRadius: 'var(--radius-xl)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        color: isActive ? '#FFFFFF' : 'var(--color-accent-growth)',
      }}
    >
      <span style={{ opacity: isActive ? 1 : 0.8 }}>{mode.icon}</span>
      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
        {intl.formatMessage({ id: mode.labelKey, defaultMessage: mode.labelDefault })}
      </span>
    </button>
  );
}

function HeroSection({ intl, hasStartedCourses }: { intl: ReturnType<typeof useIntl>; hasStartedCourses: boolean }) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--spacing-3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--spacing-3)',
        flexWrap: 'wrap' as const,
      }}
    >
      <div style={{ flex: 1 }}>
        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: '8px',
          }}
        >
          {hasStartedCourses
            ? intl.formatMessage({ id: 'learn.welcome_back', defaultMessage: 'Welcome back to your learning journey!' })
            : intl.formatMessage({ id: 'learn.featured_title', defaultMessage: 'Start Your Financial Journey' })
          }
        </h3>
        {!hasStartedCourses && (
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              maxWidth: '400px',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            {intl.formatMessage({ id: 'learn.featured_desc', defaultMessage: 'Begin with our beginner-friendly Financial Foundations path and build your knowledge step by step.' })}
          </p>
        )}
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
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {hasStartedCourses ? '750' : '--'}
          </span>
        </div>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', textAlign: 'center' }}>
          {intl.formatMessage({ id: 'learn.literacy_score', defaultMessage: 'Financial Literacy Score' })}
        </p>
        {!hasStartedCourses && (
          <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            {intl.formatMessage({ id: 'learn.score_placeholder', defaultMessage: 'Complete lessons to unlock' })}
          </p>
        )}
      </div>
    </div>
  );
}

/* ===== LEVEL BADGE ===== */
function LevelBadge({ level, locale }: { level: CourseLevel; locale: string }) {
  const colors = LEVEL_COLORS[level];
  const label = LEVEL_LABELS[level][locale === 'ar' ? 'ar' : 'en'];
  return (
    <span
      style={{
        fontSize: '0.75rem',
        fontWeight: 700,
        color: colors.color,
        background: colors.bg,
        padding: '4px 10px',
        borderRadius: 'var(--radius-pill)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        flexShrink: 0,
        lineHeight: 1.4,
        border: `1px solid ${colors.color}40`,
      }}
    >
      {label}
    </span>
  );
}

/* ===== COURSE CARD ===== */
function CourseCard({
  course,
  progress,
  intl,
  onClick,
}: {
  course: CourseData;
  progress: number;
  intl: ReturnType<typeof useIntl>;
  onClick: () => void;
}) {
  const total = getTotalSections(course);
  const completedCount = Math.round((progress / 100) * total);
  const isRtl = course.locale === 'ar';
  const level = course.level || 'beginner';
  const levelColors = LEVEL_COLORS[level];

  return (
    <button
      type="button"
      onClick={onClick}
      className="ds-card"
      style={{
        cursor: 'pointer',
        textAlign: isRtl ? 'right' : 'left',
        width: '100%',
        border: '1px solid var(--color-border-subtle)',
        borderInlineStartWidth: '4px',
        borderInlineStartColor: levelColors.color,
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--spacing-2)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--color-accent-growth)', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </span>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {course.title}
            </h3>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <LevelBadge level={level} locale={course.locale} />
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 'var(--spacing-2)' }}>
            {course.description}
          </p>
        </div>
        {progress === 100 && (
          <span style={{ color: 'var(--color-success)', flexShrink: 0, marginInlineStart: '8px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
        <div style={{ flex: 1, height: '4px', background: 'var(--color-border-subtle)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'var(--color-success)' : 'var(--color-accent-growth)', borderRadius: 'var(--radius-pill)', transition: 'width 0.3s ease' }} />
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
          {progress > 0
            ? `${completedCount}/${total}`
            : intl.formatMessage({ id: 'learn.course.sections_count', defaultMessage: '{count} sections' }, { count: total })
          }
        </span>
      </div>

      <div style={{ marginTop: 'var(--spacing-2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-accent-growth)' }}>
          {progress === 100
            ? intl.formatMessage({ id: 'learn.course.course_complete', defaultMessage: 'Course Complete!' })
            : progress > 0
            ? intl.formatMessage({ id: 'learn.course.continue', defaultMessage: 'Continue' })
            : intl.formatMessage({ id: 'learn.course.start_course', defaultMessage: 'Start Course' })
          }
        </span>
        {progress < 100 && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-growth)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        )}
      </div>
    </button>
  );
}

/* ===== RECOMMENDED COURSE SECTION (Home Mode) ===== */
function RecommendedCourseSection({ intl }: { intl: ReturnType<typeof useIntl> }) {
  const router = useRouter();
  const language = useStore((s) => s.language);
  const courses = useMemo(() => getAllCourses(language), [language]);
  const progressMap = useCourseProgress(courses);

  const hasStartedAnyCourse = Object.values(progressMap).some((p) => p > 0);
  const firstCourse = courses[0];

  const recommendedCourse = hasStartedAnyCourse
    ? courses.find((c) => {
        const p = progressMap[c.courseId] ?? 0;
        return p > 0 && p < 100;
      }) || firstCourse
    : firstCourse;

  if (!recommendedCourse) return null;

  const progress = progressMap[recommendedCourse.courseId] ?? 0;

  return (
    <div style={{ marginTop: 'var(--spacing-3)' }}>
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

      <CourseCard
        course={recommendedCourse}
        progress={progress}
        intl={intl}
        onClick={() => router.push(`/learn/courses/${recommendedCourse.courseId}`)}
      />
    </div>
  );
}

/* ===== AVAILABLE COURSES SECTION (with level filtering) ===== */
function AvailableCoursesSection({ intl }: { intl: ReturnType<typeof useIntl> }) {
  const router = useRouter();
  const language = useStore((s) => s.language);

  const courses = useMemo(() => getAllCourses(language), [language]);
  const progressMap = useCourseProgress(courses);

  const levelFilters = useFilterStore(
    useShallow((s) => s.filters['learn']?.level ?? [])
  );

  const filteredCourses = useMemo(() => {
    if (levelFilters.length === 0) return courses;
    return courses.filter((c) => levelFilters.includes(c.level || 'beginner'));
  }, [courses, levelFilters]);

  const groupedCourses = useMemo(() => {
    const groups: Record<CourseLevel, CourseData[]> = { beginner: [], intermediate: [], advanced: [] };
    for (const c of filteredCourses) {
      const lvl = c.level || 'beginner';
      groups[lvl].push(c);
    }
    return groups;
  }, [filteredCourses]);

  const clearFilters = useFilterStore((s) => s.clearAll);

  if (filteredCourses.length === 0) {
    const hasFilters = levelFilters.length > 0;
    return (
      <div style={{ marginTop: 'var(--spacing-3)', textAlign: 'center', padding: 'var(--spacing-4)' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: hasFilters ? 'var(--spacing-2)' : 0 }}>
          {intl.formatMessage({ id: 'learn.course.no_courses', defaultMessage: 'No courses match the selected filters.' })}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={() => clearFilters('learn')}
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--color-accent-growth)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 16px',
              textDecoration: 'underline',
            }}
          >
            {intl.formatMessage({ id: 'filters.clear_all', defaultMessage: 'Clear All' })}
          </button>
        )}
      </div>
    );
  }

  const levelOrder: CourseLevel[] = ['beginner', 'intermediate', 'advanced'];

  return (
    <div style={{ marginTop: 'var(--spacing-3)' }}>
      <h2 className="ds-title-section" style={{ marginBottom: 'var(--spacing-2)' }}>
        {intl.formatMessage({ id: 'learn.course.available_courses', defaultMessage: 'Available Courses' })}
      </h2>

      {levelOrder.map((level) => {
        const group = groupedCourses[level];
        if (group.length === 0) return null;
        const colors = LEVEL_COLORS[level];
        const label = LEVEL_LABELS[level][language === 'ar' ? 'ar' : 'en'];

        return (
          <div key={level} style={{ marginBottom: 'var(--spacing-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-2)' }}>
              <div style={{ width: '3px', height: '16px', borderRadius: '2px', background: colors.color }} />
              <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: colors.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {label}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                ({group.length})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              {group.map((course) => (
                <CourseCard
                  key={course.courseId}
                  course={course}
                  progress={progressMap[course.courseId] ?? 0}
                  intl={intl}
                  onClick={() => router.push(`/learn/courses/${course.courseId}`)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ===== MODE CONTENT COMPONENTS ===== */

function LearningPathsContent({ intl }: { intl: ReturnType<typeof useIntl> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
      <AvailableCoursesSection intl={intl} />
    </div>
  );
}

function TopicCard({
  icon,
  iconBg,
  iconColor,
  title,
  lessons,
  duration,
  intl,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  lessons: number;
  duration: string;
  intl: ReturnType<typeof useIntl>;
}) {
  return (
    <div className="ds-card" style={{ cursor: 'pointer' }}>
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
          color: 'var(--color-text-primary)',
          marginBottom: '4px',
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
        {intl.formatMessage({ id: 'learn.lessons_count', defaultMessage: '{count} Lessons' }, { count: lessons })} • {duration}
      </p>
    </div>
  );
}

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
      className="ds-card"
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
        <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {title}
        </h4>
      </div>
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{readTime}</span>
    </div>
  );
}

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
    <div className="ds-card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
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
        <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {title}
        </h4>
      </div>
    </div>
  );
}

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
      className="ds-card"
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
          background: earned ? `${color}20` : 'var(--color-divider)',
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
          <span style={{ color: 'var(--color-text-muted)' }}>
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
          color: 'var(--color-text-primary)',
          marginBottom: '4px',
        }}
      >
        {name}
      </h4>
      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{description}</p>
    </div>
  );
}

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
      <h2 className="ds-title-section" style={{ marginBottom: 'var(--spacing-2)' }}>
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

function VideosContent({ intl }: { intl: ReturnType<typeof useIntl> }) {
  const videos = [
    { title: intl.formatMessage({ id: 'learn.budgeting_for_beginners', defaultMessage: 'Budgeting for Beginners' }), duration: '8:24', color: '#10B981' },
    { title: intl.formatMessage({ id: 'learn.investing_101', defaultMessage: 'Investing 101' }), duration: '12:05', color: '#6366F1' },
    { title: intl.formatMessage({ id: 'learn.understanding_credit', defaultMessage: 'Understanding Credit Scores' }), duration: '6:45', color: '#F59E0B' },
    { title: intl.formatMessage({ id: 'learn.retirement_planning', defaultMessage: 'Retirement Planning Basics' }), duration: '15:30', color: '#8B5CF6' },
  ];

  return (
    <div>
      <h2 className="ds-title-section" style={{ marginBottom: 'var(--spacing-2)' }}>
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

function TopicsContent({ intl }: { intl: ReturnType<typeof useIntl> }) {
  return (
    <div>
      <h2 className="ds-title-section" style={{ marginBottom: 'var(--spacing-2)' }}>
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
          intl={intl}
        />
        <TopicCard
          icon={<CoinIcon />}
          iconBg="var(--color-accent-growth-subtle)"
          iconColor="var(--color-accent-growth)"
          title={intl.formatMessage({ id: 'learn.budgeting_101', defaultMessage: 'Budgeting 101' })}
          lessons={8}
          duration="1h 45m"
          intl={intl}
        />
        <TopicCard
          icon={<TrendIcon />}
          iconBg="rgba(245, 158, 11, 0.1)"
          iconColor="#F59E0B"
          title={intl.formatMessage({ id: 'learn.investing', defaultMessage: 'Investing' })}
          lessons={15}
          duration="3h 10m"
          intl={intl}
        />
        <TopicCard
          icon={<ShieldIcon />}
          iconBg="rgba(239, 68, 68, 0.1)"
          iconColor="#EF4444"
          title={intl.formatMessage({ id: 'learn.debt_management', defaultMessage: 'Debt Management' })}
          lessons={6}
          duration="1h 20m"
          intl={intl}
        />
      </div>
    </div>
  );
}

function AchievementsContent({ intl }: { intl: ReturnType<typeof useIntl> }) {
  const badges = [
    { name: intl.formatMessage({ id: 'learn.first_steps', defaultMessage: 'First Steps' }), desc: intl.formatMessage({ id: 'learn.first_steps_desc', defaultMessage: 'Completed your first lesson' }), earned: true, color: '#10B981' },
    { name: intl.formatMessage({ id: 'learn.budget_master', defaultMessage: 'Budget Master' }), desc: intl.formatMessage({ id: 'learn.budget_master_desc', defaultMessage: 'Complete Budgeting 101' }), earned: true, color: '#6366F1' },
    { name: intl.formatMessage({ id: 'learn.saver', defaultMessage: 'Saver' }), desc: intl.formatMessage({ id: 'learn.saver_desc', defaultMessage: 'Complete Saving module' }), earned: false, color: '#F59E0B' },
    { name: intl.formatMessage({ id: 'learn.investor', defaultMessage: 'Investor' }), desc: intl.formatMessage({ id: 'learn.investor_desc', defaultMessage: 'Complete Investing path' }), earned: false, color: '#8B5CF6' },
  ];

  return (
    <div>
      <h2 className="ds-title-section" style={{ marginBottom: 'var(--spacing-2)' }}>
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

/* ===== MAIN PAGE ===== */
export default function LearnPage() {
  const intl = useIntl();
  const [selectedMode, setSelectedMode] = useState<LearningMode>('home');
  const language = useStore((s) => s.language);
  const courses = useMemo(() => getAllCourses(language), [language]);
  const progressMap = useCourseProgress(courses);
  const hasStartedCourses = Object.values(progressMap).some((p) => p > 0);

  const isHomeMode = selectedMode === 'home';

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
    <div className="ds-page">
      <HeroSection intl={intl} hasStartedCourses={hasStartedCourses} />

      {/* Mode Selectors */}
      <div style={{ marginTop: 'var(--spacing-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-2)', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {LEARNING_MODES.map((mode) => (
            <ModeSelector
              key={mode.id}
              mode={mode}
              isActive={selectedMode === mode.id}
              onClick={() => setSelectedMode(mode.id)}
              intl={intl}
            />
          ))}
        </div>

        {/* Level Filter - open by default so users can filter courses */}
        <div style={{ marginTop: 'var(--spacing-2)' }}>
          <FilterPanel config={LEARN_FILTER_CONFIG} defaultOpen />
        </div>
      </div>

      {/* Home Mode: Recommended + All Courses */}
      {isHomeMode && (
        <>
          <RecommendedCourseSection intl={intl} />
          <AvailableCoursesSection intl={intl} />
        </>
      )}

      {/* Other Modes */}
      {!isHomeMode && (
        <div style={{ marginTop: 'var(--spacing-3)' }}>
          {renderModeContent()}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getAllCourses } from '@/data/courses';
import { getCategory } from '@/data/courses/categories';
import { getAllArticles } from '@/data/articles';
import { getTotalSections } from '@/types/course';
import type { CourseData, CourseLevel } from '@/types/course';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { useStore } from '@/store/useStore';
import { getAllLocalProgress } from '@/store/courseProgressStore';
import {
  ChevronDown,
  BookOpen,
  Play,
  Lock,
  Bell,
  Wallet,
  TrendingUp,
  PiggyBank,
  CreditCard,
  Home as HomeIcon,
  BarChart2,
  Zap,
  Shield,
  Clock,
  FileText,
  Briefcase,
  Target,
  Award,
  Flame,
  Trophy,
  Star,
} from 'lucide-react';
import { Toast } from '@/components/ui/Toast';

/* ============================================
   LEARN PAGE – Course grid + filters + tabs
   ============================================ */

type LearnTab = 'home' | 'articles' | 'videos' | 'topics' | 'achievements';

const ARABIC_INDIC = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'] as const;
function toArabicNumerals(str: string): string {
  return str.replace(/[0-9]/g, (d) => ARABIC_INDIC[+d]);
}

const PAGE_BG = 'var(--ds-bg-page)';
const LEARN_GREEN = 'var(--ds-primary)';

const LEVEL_CONFIG: Record<
  CourseLevel,
  { dotColor: string; expandedBg: string; labelEn: string; labelAr: string }
> = {
  beginner: { dotColor: 'var(--ds-primary)', expandedBg: 'var(--ds-bg-tinted)', labelEn: 'Beginner', labelAr: 'مبتدئ' },
  intermediate: { dotColor: 'var(--ds-accent-gold)', expandedBg: 'var(--ds-warning-bg)', labelEn: 'Intermediate', labelAr: 'متوسط' },
  advanced: { dotColor: 'var(--ds-error)', expandedBg: 'var(--ds-error-bg)', labelEn: 'Advanced', labelAr: 'متقدم' },
};

const BADGE_COLORS: Record<CourseLevel, { background: string; color: string; border: string }> = {
  beginner: { background: 'var(--ds-success-bg)', color: 'var(--ds-success-text)', border: '0.5px solid var(--ds-success-border)' },
  intermediate: { background: 'var(--ds-warning-bg)', color: 'var(--ds-warning-text)', border: '0.5px solid var(--ds-warning-border)' },
  advanced: { background: 'var(--ds-error-bg)', color: 'var(--ds-error-text)', border: '0.5px solid var(--ds-error-border)' },
};

/* ----- Data hook ----- */
function baseCourseIdOf(courseId: string): string {
  return courseId.replace(/_(en|ar)$/, '');
}

function useLearnPageData() {
  const language = useStore((s) => s.language);
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const courses = useMemo(() => getAllCourses(language), [language]);
  // Completed section ids are tracked per base course (locales share section
  // ids), so progress, the resume strip, and the next-lesson line all derive
  // from one merged local + Supabase source.
  const [completedByBase, setCompletedByBase] = useState<Record<string, string[]>>({});
  const [lastActivityByBase, setLastActivityByBase] = useState<Record<string, string>>({});

  useEffect(() => {
    const mergeIn = (incoming: Record<string, Set<string>>) => {
      setCompletedByBase((prev) => {
        const merged: Record<string, string[]> = { ...prev };
        for (const [base, ids] of Object.entries(incoming)) {
          merged[base] = Array.from(new Set([...(merged[base] ?? []), ...ids]));
        }
        return merged;
      });
    };

    const localByBase: Record<string, Set<string>> = {};
    for (const [courseId, data] of Object.entries(getAllLocalProgress())) {
      const base = baseCourseIdOf(courseId);
      if (!localByBase[base]) localByBase[base] = new Set();
      for (const id of data.completedSectionIds ?? []) localByBase[base].add(id);
    }
    mergeIn(localByBase);

    if (!initialized || !user) return;
    const fetchProgress = async () => {
      try {
        const { data } = await supabase
          .from('course_progress')
          .select('course_id, completed_section_ids, locale, updated_at')
          .eq('user_id', user.id);
        if (!data) return;
        const supaByBase: Record<string, Set<string>> = {};
        const activity: Record<string, string> = {};
        for (const row of data) {
          const base = baseCourseIdOf(row.course_id as string);
          if (!supaByBase[base]) supaByBase[base] = new Set();
          for (const id of (row.completed_section_ids as string[]) ?? []) {
            supaByBase[base].add(id);
          }
          const ts = row.updated_at as string | null;
          if (ts && (!activity[base] || ts > activity[base])) activity[base] = ts;
        }
        mergeIn(supaByBase);
        setLastActivityByBase((prev) => ({ ...prev, ...activity }));
      } catch {
        // Supabase unavailable
      }
    };
    fetchProgress();
  }, [initialized, user]);

  const progressMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const course of courses) {
      const ids = completedByBase[baseCourseIdOf(course.courseId)];
      if (ids && ids.length > 0) {
        const total = getTotalSections(course);
        map[course.courseId] = total > 0 ? Math.min(100, Math.round((ids.length / total) * 100)) : 0;
      }
    }
    return map;
  }, [courses, completedByBase]);

  const resumeCourse = useMemo(() => {
    const inProgress = courses.filter((c) => {
      const p = progressMap[c.courseId] ?? 0;
      return p > 0 && p < 100;
    });
    if (inProgress.length === 0) return null;
    return [...inProgress].sort((a, b) => {
      const ta = lastActivityByBase[baseCourseIdOf(a.courseId)] ?? '';
      const tb = lastActivityByBase[baseCourseIdOf(b.courseId)] ?? '';
      return tb.localeCompare(ta);
    })[0];
  }, [courses, progressMap, lastActivityByBase]);

  return { courses, progressMap, completedByBase, resumeCourse };
}

function getNextLessonTitle(course: CourseData, completedIds: string[] | undefined): string | null {
  const done = new Set(completedIds ?? []);
  for (const lesson of course.lessons) {
    if (lesson.sections.some((s) => !done.has(s.id))) return lesson.title;
  }
  return null;
}

function parseEstimatedMinutes(estimatedTime: string | undefined): number | null {
  if (!estimatedTime) return null;
  const match = estimatedTime.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/* ----- Animated score ring ----- */
function ScoreRing({ score }: { score: number | string }) {
  const intl = useIntl();
  const numericScore = typeof score === 'number' ? score : 0;
  const radius = 27;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const timer = setTimeout(() => {
      const pct = Math.min(Math.max(numericScore, 0), 100);
      setOffset(circumference - (pct / 100) * circumference);
    }, 100);
    return () => clearTimeout(timer);
  }, [numericScore, circumference]);

  return (
    <div style={{ position: 'relative', width: 64, height: 64 }}>
      <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#F0F7F4" strokeWidth="3" />
        <circle
          cx="32" cy="32" r={radius} fill="none"
          stroke={LEARN_GREEN} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 800ms ease-out' }}
        />
      </svg>
      <span style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.25rem', fontWeight: 700, color: 'var(--ds-text-heading)',
      }}>
        {typeof score === 'number' ? intl.formatNumber(score) : score}
      </span>
    </div>
  );
}

/* ----- Slim hero with literacy milestone context ----- */
const SCORE_MILESTONES = [
  { threshold: 0, labelKey: 'learn.milestone.beginner', labelDefault: 'Beginner' },
  { threshold: 60, labelKey: 'learn.milestone.confident', labelDefault: 'Confident' },
  { threshold: 90, labelKey: 'learn.milestone.expert', labelDefault: 'Expert' },
];

function LearnHero({ intl, scoreDisplay, language }: { intl: ReturnType<typeof useIntl>; scoreDisplay: number | string; language: string }) {
  const isRtl = language === 'ar';
  const [showExplainer, setShowExplainer] = useState(false);
  const numericScore = typeof scoreDisplay === 'number' ? scoreDisplay : 0;
  const nextMilestone = SCORE_MILESTONES.find((m) => m.threshold > numericScore) ?? null;
  const currentMilestone =
    [...SCORE_MILESTONES].reverse().find((m) => m.threshold <= numericScore) ?? SCORE_MILESTONES[0];
  const milestoneProgress = nextMilestone
    ? Math.min(100, Math.round((numericScore / nextMilestone.threshold) * 100))
    : 100;

  const milestoneLabel = (m: (typeof SCORE_MILESTONES)[number]) =>
    intl.formatMessage({ id: m.labelKey, defaultMessage: m.labelDefault });

  return (
    <div
      style={{
        background: 'var(--ds-bg-card)',
        border: '0.5px solid var(--ds-border)',
        borderRadius: '16px',
        padding: '20px 24px',
        boxShadow: 'var(--ds-shadow-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
        direction: isRtl ? 'rtl' : 'ltr',
      }}
    >
      <div style={{ flex: 1, minWidth: '220px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ds-text-heading)', margin: 0, marginBottom: '4px', fontFeatureSettings: '"kern" 1' }}>
          {intl.formatMessage({ id: 'learn.title', defaultMessage: 'Learn' })}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--ds-text-body)', margin: 0 }}>
          {intl.formatMessage({ id: 'learn.subtitle', defaultMessage: 'Master your financial future' })}
        </p>
        {showExplainer && (
          <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', margin: '10px 0 0', lineHeight: 1.6, maxWidth: '420px' }}>
            {intl.formatMessage({
              id: 'learn.how_to_raise_explainer',
              defaultMessage: 'Your score is the average completion across all courses. Complete course sections to raise it.',
            })}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', minWidth: '176px' }}>
        <ScoreRing score={scoreDisplay} />
        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {intl.formatMessage({ id: 'learn.literacy_score', defaultMessage: 'Financial Literacy Score' })}
        </span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ds-text-body)' }}>
          {nextMilestone
            ? intl.formatMessage(
                { id: 'learn.milestone_path', defaultMessage: '{from} → {to} at {score}' },
                {
                  from: milestoneLabel(currentMilestone),
                  to: milestoneLabel(nextMilestone),
                  score: intl.formatNumber(nextMilestone.threshold),
                }
              )
            : intl.formatMessage({ id: 'learn.milestone_reached', defaultMessage: 'Top milestone reached' })}
        </span>
        <div style={{ width: '100%', maxWidth: '176px', height: '4px', background: 'var(--ds-bg-tinted)', borderRadius: '4px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${milestoneProgress}%`,
              height: '100%',
              background: 'var(--ds-primary)',
              borderRadius: '4px',
              transition: 'width 600ms ease-out',
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowExplainer((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--ds-primary)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '10px 8px',
            margin: '-6px 0',
          }}
        >
          {intl.formatMessage({ id: 'learn.how_to_raise', defaultMessage: 'How to raise it' })}
        </button>
      </div>
    </div>
  );
}

/* ----- Resume strip (Continue learning) ----- */
function ResumeStrip({
  course,
  progress,
  nextLessonTitle,
  intl,
  language,
  mounted,
}: {
  course: CourseData;
  progress: number;
  nextLessonTitle: string | null;
  intl: ReturnType<typeof useIntl>;
  language: string;
  mounted: boolean;
}) {
  const isRtl = language === 'ar';
  const category = getCategory(course.courseId);
  const Icon = category.icon;

  return (
    <Link href={`/learn/courses/${course.courseId}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          background: 'var(--color-bg-hero)',
          borderRadius: '20px',
          padding: '20px 24px',
          boxShadow: 'var(--shadow-hero)',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
          direction: isRtl ? 'rtl' : 'ltr',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={26} style={{ color: '#FFFFFF' }} />
        </div>

        <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {intl.formatMessage({ id: 'learn.continue_learning', defaultMessage: 'Continue Learning' })}
          </span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.3, fontFeatureSettings: '"kern" 1' }}>
            {course.title}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1, maxWidth: '260px', height: '5px', background: 'rgba(255,255,255,0.18)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: mounted ? `${progress}%` : '0%',
                  height: '100%',
                  background: 'var(--color-primary-glow)',
                  borderRadius: '4px',
                  transition: 'width 600ms ease-out',
                }}
              />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#FFFFFF' }}>
              {intl.formatNumber(progress)}%
            </span>
          </div>
          {nextLessonTitle && (
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>
              {intl.formatMessage(
                { id: 'learn.resume_next_lesson', defaultMessage: 'Next: {title}' },
                { title: nextLessonTitle }
              )}
            </span>
          )}
        </div>

        <span
          style={{
            background: '#FFFFFF',
            color: '#0F1E2E',
            borderRadius: '9999px',
            padding: '12px 24px',
            fontSize: '13px',
            fontWeight: 600,
            minHeight: '44px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {intl.formatMessage({ id: 'learn.continue', defaultMessage: 'Continue' })}
        </span>
      </div>
    </Link>
  );
}

/* ----- Course filter bar ----- */
type CourseFilter = 'all' | CourseLevel | 'in_progress';

const COURSE_FILTERS: CourseFilter[] = ['all', 'beginner', 'intermediate', 'advanced', 'in_progress'];

function FilterBar({
  filter,
  onChange,
  intl,
  language,
}: {
  filter: CourseFilter;
  onChange: (f: CourseFilter) => void;
  intl: ReturnType<typeof useIntl>;
  language: string;
}) {
  const isRtl = language === 'ar';
  const labelFor = (f: CourseFilter): string => {
    if (f === 'all') return intl.formatMessage({ id: 'learn.filter_all', defaultMessage: 'All courses' });
    if (f === 'in_progress') return intl.formatMessage({ id: 'learn.filter_in_progress', defaultMessage: 'In progress' });
    return isRtl ? LEVEL_CONFIG[f].labelAr : LEVEL_CONFIG[f].labelEn;
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', direction: isRtl ? 'rtl' : 'ltr' }}>
      {COURSE_FILTERS.map((f) => {
        const isActive = filter === f;
        return (
          <button
            key={f}
            type="button"
            onClick={() => onChange(f)}
            style={{
              padding: '8px 16px',
              borderRadius: '9999px',
              border: isActive ? '0.5px solid var(--ds-primary)' : '0.5px solid var(--ds-border)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              minHeight: '44px',
              background: isActive ? 'var(--ds-primary)' : 'transparent',
              color: isActive ? '#FFFFFF' : 'var(--ds-text-body)',
              transition: 'background 0.2s, color 0.2s, border-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = 'var(--ds-bg-tinted)';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = 'transparent';
            }}
          >
            {labelFor(f)}
          </button>
        );
      })}
    </div>
  );
}

/* ----- Course card (grid) ----- */
function CourseCardV2({
  course,
  progress,
  intl,
  language,
  mounted,
}: {
  course: CourseData;
  progress: number;
  intl: ReturnType<typeof useIntl>;
  language: string;
  mounted: boolean;
}) {
  const isRtl = language === 'ar';
  const level = course.level ?? 'beginner';
  const badgeColor = BADGE_COLORS[level];
  const category = getCategory(course.courseId);
  const Icon = category.icon;
  const lessonCount = course.lessons.length;
  const estMinutes = parseEstimatedMinutes(course.estimatedTime);
  const isCompleted = progress >= 100;
  const isInProgress = progress > 0 && progress < 100;

  const ctaBase: React.CSSProperties = {
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '13px',
    fontWeight: 500,
    minHeight: '44px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  };

  const metaParts = [
    intl.formatMessage(
      { id: 'learn.card_lessons', defaultMessage: '{count} lessons' },
      { count: intl.formatNumber(lessonCount) }
    ),
  ];
  if (estMinutes !== null) {
    metaParts.push(
      intl.formatMessage(
        { id: 'learn.card_minutes', defaultMessage: '{min} min' },
        { min: intl.formatNumber(estMinutes) }
      )
    );
  }

  return (
    <Link href={`/learn/courses/${course.courseId}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <div
        style={{
          background: 'var(--ds-bg-card)',
          border: '0.5px solid var(--ds-border)',
          borderRadius: '16px',
          boxShadow: 'var(--ds-shadow-card)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          height: '100%',
          transition: 'box-shadow 0.2s ease',
          direction: isRtl ? 'rtl' : 'ltr',
          textAlign: 'start',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--ds-shadow-card)'; }}
      >
        {/* Icon chip + level badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: category.color,
              boxShadow: `0 4px 10px ${category.color}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={24} style={{ color: '#FFFFFF' }} />
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', borderRadius: '4px',
            fontSize: '10px', fontWeight: 500, padding: '2px 8px', letterSpacing: '0.04em',
            background: badgeColor.background, color: badgeColor.color, border: badgeColor.border,
          }}>
            {isRtl ? LEVEL_CONFIG[level].labelAr : LEVEL_CONFIG[level].labelEn}
          </span>
        </div>

        {/* Category label */}
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: category.labelVar }}>
          {isRtl ? category.labelAr : category.labelEn}
        </span>

        {/* Title */}
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ds-text-heading)', margin: 0, lineHeight: 1.4, fontFeatureSettings: '"kern" 1' }}>
          {course.title}
        </h3>

        {/* Description — 2 line clamp */}
        <p style={{
          fontSize: '13px', fontWeight: 400, color: 'var(--ds-text-body)', margin: 0, lineHeight: 1.6,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
        }}>
          {course.description ?? ''}
        </p>

        {/* Meta row */}
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-text-muted)' }}>
          {metaParts.join(' · ')}
        </span>

        {/* State area, pinned to card bottom */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {isInProgress && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, height: '4px', background: 'var(--ds-bg-tinted)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: mounted ? `${progress}%` : '0%', height: '100%', background: 'var(--ds-primary-glow)', borderRadius: '4px', transition: 'width 600ms ease-out' }} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-primary)' }}>
                {intl.formatNumber(progress)}%
              </span>
            </div>
          )}

          {isCompleted && (
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ds-success-text)' }}>
              {intl.formatMessage({ id: 'learn.completed_check', defaultMessage: 'Completed ✓' })}
            </span>
          )}

          {isCompleted ? (
            <span style={{ ...ctaBase, background: 'transparent', color: 'var(--ds-primary)', border: '1.5px solid var(--ds-btn-secondary-border)' }}>
              {intl.formatMessage({ id: 'learn.review', defaultMessage: 'Review' })}
            </span>
          ) : (
            <span style={{ ...ctaBase, background: 'var(--ds-primary)', color: '#FFFFFF', border: 'none' }}>
              {isInProgress
                ? intl.formatMessage({ id: 'learn.continue', defaultMessage: 'Continue' })
                : intl.formatMessage({ id: 'learn.start_course', defaultMessage: 'Start Course' })}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ----- Tab switcher ----- */
const TABS: { id: LearnTab; labelKey: string; labelDefault: string }[] = [
  { id: 'home', labelKey: 'learn.tab.home', labelDefault: 'Home' },
  { id: 'articles', labelKey: 'learn.tab.articles', labelDefault: 'Insights' },
  { id: 'videos', labelKey: 'learn.tab.videos', labelDefault: 'Videos' },
  { id: 'topics', labelKey: 'learn.tab.topics', labelDefault: 'Topics & Skills' },
  { id: 'achievements', labelKey: 'learn.tab.achievements', labelDefault: 'Achievements' },
];

function TabSwitcher({
  activeTab,
  onTabChange,
  intl,
  language,
}: {
  activeTab: LearnTab;
  onTabChange: (tab: LearnTab) => void;
  intl: ReturnType<typeof useIntl>;
  language: string;
}) {
  const isRtl = language === 'ar';
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', direction: isRtl ? 'rtl' : 'ltr' }}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            style={{
              padding: '10px 20px',
              borderRadius: '9999px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              minHeight: '44px',
              background: isActive ? LEARN_GREEN : 'var(--ds-bg-card)',
              color: isActive ? '#FFFFFF' : 'var(--ds-text-heading)',
              boxShadow: isActive ? 'none' : 'var(--ds-shadow-card)',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = 'var(--ds-bg-tinted)';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = 'var(--ds-bg-card)';
            }}
          >
            {intl.formatMessage({ id: tab.labelKey, defaultMessage: tab.labelDefault })}
          </button>
        );
      })}
    </div>
  );
}

/* ----- Articles tab ----- */

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  return monday.toISOString().slice(0, 10);
}

function formatWeekLabel(weekStart: string, language: string, intl: ReturnType<typeof useIntl>): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  if (language === 'ar') {
    const startStr = intl.formatDate(start, { month: 'short', day: 'numeric' });
    const endStr = intl.formatDate(end, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} – ${endStr}`;
  }
  const startStr = intl.formatDate(start, { month: 'short', day: 'numeric' });
  const endStr = intl.formatDate(end, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

interface WeekGroup {
  weekKey: string;
  articles: ReturnType<typeof getAllArticles>;
}

function ArticlesTab({ language, minReadLabel, intl }: { language: string; minReadLabel: (min: number) => string; intl: ReturnType<typeof useIntl> }) {
  const isRtl = language === 'ar';
  const articles = useMemo(() => getAllArticles(language), [language]);

  const weekGroups = useMemo<WeekGroup[]>(() => {
    const grouped = new Map<string, typeof articles>();
    for (const article of articles) {
      const key = getWeekKey(article.publishedDate);
      const existing = grouped.get(key) || [];
      existing.push(article);
      grouped.set(key, existing);
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([weekKey, arts]) => ({ weekKey, articles: arts }));
  }, [articles]);

  const [openWeeks, setOpenWeeks] = useState<Set<string>>(() => {
    const first = weekGroups[0]?.weekKey;
    return first ? new Set([first]) : new Set();
  });

  const toggleWeek = (key: string) => {
    setOpenWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ marginBottom: '20px', direction: isRtl ? 'rtl' : 'ltr', textAlign: isRtl ? 'right' : 'left' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--ds-text-heading)', margin: 0 }}>
          {intl.formatMessage({ id: 'learn.articles.heading', defaultMessage: 'Practical Financial Insights' })}
        </h2>
        <p style={{ fontSize: '15px', color: 'var(--ds-text-body)', margin: '6px 0 0', lineHeight: 1.5 }}>
          {intl.formatMessage({ id: 'learn.articles.subheading', defaultMessage: 'Understand your options. Make better money decisions.' })}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {weekGroups.map(({ weekKey, articles: weekArticles }) => {
          const isOpen = openWeeks.has(weekKey);
          const weekLabel = formatWeekLabel(weekKey, language, intl);
          const articleCount = weekArticles.length;

          return (
            <div
              key={weekKey}
              style={{
                background: 'var(--ds-bg-card)',
                borderRadius: '16px',
                boxShadow: 'var(--ds-shadow-card)',
                border: '0.5px solid var(--ds-border)',
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                onClick={() => toggleWeek(weekKey)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  direction: isRtl ? 'rtl' : 'ltr',
                  textAlign: isRtl ? 'right' : 'left',
                  minHeight: '56px',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ds-text-heading)' }}>
                    {weekLabel}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--ds-text-body)' }}>
                    {language === 'ar'
                      ? `${intl.formatNumber(articleCount)} ${articleCount === 1 ? 'مقال' : 'مقالات'}`
                      : `${articleCount} ${articleCount === 1 ? 'article' : 'articles'}`}
                  </span>
                </div>
                <ChevronDown
                  size={18}
                  style={{
                    color: 'var(--ds-text-body)',
                    transition: 'transform 200ms ease',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    flexShrink: 0,
                  }}
                />
              </button>

              {isOpen && (
                <div
                  style={{
                    padding: '0 16px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    borderTop: '0.5px solid var(--ds-border)',
                    paddingTop: '16px',
                  }}
                >
                  {weekArticles.map((article) => (
                    <Link
                      key={article.articleId}
                      href={`/learn/articles/${article.articleId}`}
                      style={{ textDecoration: 'none', display: 'block' }}
                    >
                      <div
                        style={{
                          background: 'var(--ds-bg-page)',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          border: '0.5px solid var(--ds-border)',
                          cursor: 'pointer',
                          direction: isRtl ? 'rtl' : 'ltr',
                          textAlign: isRtl ? 'right' : 'left',
                          transition: 'box-shadow 0.2s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <div style={{ position: 'relative', height: '64px', background: 'linear-gradient(135deg, #2D6A4F 0%, #1B4332 100%)' }}>
                          <span
                            style={{
                              position: 'absolute',
                              top: '8px',
                              [isRtl ? 'left' : 'right']: '8px',
                              fontSize: '10px',
                              fontWeight: 500,
                              color: '#FFFFFF',
                              background: 'rgba(0,0,0,0.2)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            {minReadLabel(article.readMin)}
                          </span>
                        </div>
                        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ds-text-heading)', margin: 0, fontFeatureSettings: '"kern" 1' }}>
                            {article.title}
                          </h3>
                          <span style={{ fontSize: '10px', fontWeight: 500, color: LEARN_GREEN, letterSpacing: '0.04em' }}>
                            {isRtl ? article.tagAr : article.tagEn}
                          </span>
                          <p style={{
                            fontSize: '13px', color: 'var(--ds-text-body)', margin: 0, lineHeight: 1.5,
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                          }}>
                            {article.description}
                          </p>
                          <span
                            style={{
                              marginTop: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              background: 'var(--ds-primary)',
                              color: '#FFFFFF',
                              borderRadius: '8px',
                              padding: '8px 16px',
                              fontSize: '12px',
                              fontWeight: 500,
                              minHeight: '40px',
                              cursor: 'pointer',
                              alignSelf: isRtl ? 'flex-end' : 'flex-start',
                              transition: 'background-color 150ms ease',
                            }}
                          >
                            {language === 'ar' ? 'اقرأ المقال' : 'Read Article'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----- Coming-soon banner (Topics & Videos placeholders) ----- */
const NOTIFY_PREFS_KEY = 'rasmalak-learn-notify';

function getNotifyPrefs(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(NOTIFY_PREFS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function ComingSoonBanner({
  feature,
  titleKey,
  titleDefault,
  descKey,
  descDefault,
  intl,
  language,
}: {
  feature: string;
  titleKey: string;
  titleDefault: string;
  descKey: string;
  descDefault: string;
  intl: ReturnType<typeof useIntl>;
  language: string;
}) {
  const isRtl = language === 'ar';
  const [notified, setNotified] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!getNotifyPrefs()[feature];
  });
  const [toastVisible, setToastVisible] = useState(false);

  // The notification endpoint is not built yet — persist the opt-in locally
  // and confirm with a toast so the button stays a real interaction.
  const handleNotify = () => {
    try {
      const prefs = getNotifyPrefs();
      prefs[feature] = true;
      localStorage.setItem(NOTIFY_PREFS_KEY, JSON.stringify(prefs));
    } catch { /* storage unavailable */ }
    setNotified(true);
    setToastVisible(true);
  };

  return (
    <div
      style={{
        background: 'var(--ds-bg-card)',
        border: '0.5px solid var(--ds-border)',
        borderRadius: '16px',
        boxShadow: 'var(--ds-shadow-card)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
        direction: isRtl ? 'rtl' : 'ltr',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'var(--ds-plan-bg)',
          border: '0.5px solid var(--ds-plan-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Bell size={22} style={{ color: 'var(--ds-plan)' }} />
      </div>

      <div style={{ flex: 1, minWidth: '220px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ds-text-heading)', margin: 0 }}>
            {intl.formatMessage({ id: titleKey, defaultMessage: titleDefault })}
          </h2>
          <span style={{
            display: 'inline-flex', alignItems: 'center', borderRadius: '4px',
            fontSize: '10px', fontWeight: 500, padding: '2px 8px', letterSpacing: '0.04em',
            background: 'var(--ds-plan-bg)', color: 'var(--ds-plan)', border: '0.5px solid var(--ds-plan-border)',
          }}>
            {intl.formatMessage({ id: 'learn.coming_soon_tag', defaultMessage: 'Coming soon' })}
          </span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--ds-text-body)', margin: 0, lineHeight: 1.6, maxWidth: '520px' }}>
          {intl.formatMessage({ id: descKey, defaultMessage: descDefault })}
        </p>
      </div>

      {notified ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 18px',
            minHeight: '44px',
            borderRadius: '8px',
            border: '1.5px solid var(--ds-btn-secondary-border)',
            color: 'var(--ds-primary)',
            fontSize: '13px',
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          {intl.formatMessage({ id: 'learn.coming_soon_notified', defaultMessage: "You're on the list ✓" })}
        </span>
      ) : (
        <button
          type="button"
          onClick={handleNotify}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 18px',
            minHeight: '44px',
            background: 'var(--ds-primary)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background-color 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-primary-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ds-primary)'; }}
        >
          <Bell size={14} />
          {intl.formatMessage({ id: 'learn.coming_soon_notify', defaultMessage: 'Notify me' })}
        </button>
      )}

      <Toast
        message={intl.formatMessage({ id: 'learn.coming_soon_toast', defaultMessage: "We'll notify you when it launches." })}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />
    </div>
  );
}

/* ----- Videos tab (placeholder) ----- */
const VIDEO_CARDS: { titleEn: string; titleAr: string; duration: string; level: CourseLevel }[] = [
  { titleEn: 'Introduction to Stock Markets', titleAr: 'مقدمة إلى أسواق الأسهم', duration: '15:20', level: 'beginner' },
  { titleEn: 'How Central Banks Work', titleAr: 'كيف تعمل البنوك المركزية', duration: '22:45', level: 'intermediate' },
  { titleEn: 'Technical Analysis Basics', titleAr: 'أساسيات التحليل الفني', duration: '18:30', level: 'intermediate' },
  { titleEn: 'Crypto and Blockchain Explained', titleAr: 'العملات الرقمية والبلوكتشين', duration: '25:00', level: 'advanced' },
  { titleEn: 'Budgeting for Beginners', titleAr: 'وضع الميزانية للمبتدئين', duration: '12:10', level: 'beginner' },
  { titleEn: 'Options Trading: Risk and Reward', titleAr: 'تداول الخيارات: المخاطر والعوائد', duration: '30:15', level: 'advanced' },
];

function VideosTab({ language, intl }: { language: string; intl: ReturnType<typeof useIntl> }) {
  const isRtl = language === 'ar';
  return (
    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <ComingSoonBanner
        feature="videos"
        titleKey="learn.coming_soon_videos_title"
        titleDefault="Video lessons are coming"
        descKey="learn.coming_soon_videos_desc"
        descDefault="Short, practical videos that pair with the courses. Tell us to notify you and be first to watch."
        intl={intl}
        language={language}
      />

      <div className="learn-accordion-grid">
        {VIDEO_CARDS.map((card, i) => {
          const levelLabel = isRtl ? LEVEL_CONFIG[card.level].labelAr : LEVEL_CONFIG[card.level].labelEn;
          return (
            <div
              key={i}
              style={{
                background: 'var(--ds-bg-card)',
                borderRadius: '16px',
                boxShadow: 'var(--ds-shadow-card)',
                overflow: 'hidden',
                border: '1px dashed var(--ds-border)',
                direction: isRtl ? 'rtl' : 'ltr',
              }}
            >
              <div style={{ position: 'relative', height: '140px', background: 'linear-gradient(135deg, #1B4332 0%, #0d2818 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Lock size={24} style={{ color: '#FFFFFF' }} />
                </div>
                <span
                  style={{
                    position: 'absolute',
                    top: '8px',
                    insetInlineEnd: '8px',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#FFFFFF',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '4px 8px',
                    borderRadius: '8px',
                  }}
                >
                  {isRtl ? toArabicNumerals(card.duration) : card.duration}
                </span>
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'start' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)', margin: 0, fontFeatureSettings: '"kern" 1' }}>
                  {isRtl ? card.titleAr : card.titleEn}
                </h3>
                <span style={{ fontSize: '10px', fontWeight: 500, color: LEARN_GREEN, letterSpacing: '0.04em' }}>{levelLabel}</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '4px',
                  fontSize: '10px', fontWeight: 500, padding: '3px 8px', letterSpacing: '0.04em',
                  background: 'var(--ds-plan-bg)', color: 'var(--ds-plan)', border: '0.5px solid var(--ds-plan-border)',
                  alignSelf: 'flex-start', marginTop: '4px',
                }}>
                  {intl.formatMessage({ id: 'learn.coming_soon_tag', defaultMessage: 'Coming soon' })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----- Topics & Skills tab (placeholder) ----- */
const TOPIC_CARDS = [
  { titleEn: 'Budgeting', titleAr: 'الميزانية', icon: Wallet },
  { titleEn: 'Investing', titleAr: 'الاستثمار', icon: TrendingUp },
  { titleEn: 'Saving', titleAr: 'الادخار', icon: PiggyBank },
  { titleEn: 'Debt Management', titleAr: 'إدارة الديون', icon: CreditCard },
  { titleEn: 'Real Estate', titleAr: 'العقارات', icon: HomeIcon },
  { titleEn: 'Stock Market', titleAr: 'سوق الأسهم', icon: BarChart2 },
  { titleEn: 'Crypto', titleAr: 'العملات الرقمية', icon: Zap },
  { titleEn: 'Insurance', titleAr: 'التأمين', icon: Shield },
  { titleEn: 'Retirement', titleAr: 'التقاعد', icon: Clock },
  { titleEn: 'Tax Planning', titleAr: 'التخطيط الضريبي', icon: FileText },
  { titleEn: 'Business Finance', titleAr: 'تمويل الأعمال', icon: Briefcase },
  { titleEn: 'Financial Goals', titleAr: 'الأهداف المالية', icon: Target },
];

function TopicsTab({ language, intl }: { language: string; intl: ReturnType<typeof useIntl> }) {
  const isRtl = language === 'ar';
  return (
    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <ComingSoonBanner
        feature="topics"
        titleKey="learn.coming_soon_topics_title"
        titleDefault="Topics & Skills are on the way"
        descKey="learn.coming_soon_topics_desc"
        descDefault="Focused skill tracks that connect courses, tools, and practice. These are the tracks we're planning."
        intl={intl}
        language={language}
      />

      <div className="learn-topics-grid">
        {TOPIC_CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              style={{
                background: 'var(--ds-bg-card)',
                borderRadius: '16px',
                boxShadow: 'var(--ds-shadow-card)',
                padding: '20px 24px',
                border: '1px dashed var(--ds-border)',
                direction: isRtl ? 'rtl' : 'ltr',
                textAlign: 'start',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--ds-bg-tinted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={24} style={{ color: 'var(--ds-primary)' }} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)', margin: 0, fontFeatureSettings: '"kern" 1' }}>
                {isRtl ? card.titleAr : card.titleEn}
              </h3>
              <span style={{
                display: 'inline-flex', alignItems: 'center', borderRadius: '4px',
                fontSize: '10px', fontWeight: 500, padding: '3px 8px', letterSpacing: '0.04em',
                background: 'var(--ds-plan-bg)', color: 'var(--ds-plan)', border: '0.5px solid var(--ds-plan-border)',
              }}>
                {intl.formatMessage({ id: 'learn.coming_soon_planned', defaultMessage: 'Planned' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----- Achievements tab ----- */
const ACHIEVEMENT_BADGES = [
  {
    titleEn: 'First Steps', titleAr: 'الخطوات الأولى',
    conditionEn: 'Complete your first lesson', conditionAr: 'أكمل أول درس لك',
    icon: 'star',
    progressEn: '0 / 1 lessons', progressAr: '٠ / ١ دروس',
  },
  {
    titleEn: 'Quick Learner', titleAr: 'المتعلم السريع',
    conditionEn: 'Complete 5 lessons in a week', conditionAr: 'أكمل ٥ دروس في أسبوع',
    icon: 'flame',
    progressEn: '0 / 5 lessons this week', progressAr: '٠ / ٥ دروس هذا الأسبوع',
  },
  {
    titleEn: 'Consistent', titleAr: 'المثابر',
    conditionEn: '7-day learning streak', conditionAr: 'سلسلة تعلم ٧ أيام',
    icon: 'trending',
    progressEn: '0 / 7 day streak', progressAr: '٠ / ٧ أيام متتالية',
  },
  {
    titleEn: 'Money Basics', titleAr: 'أساسيات المال',
    conditionEn: 'Finish Beginner track', conditionAr: 'إنهاء مسار المبتدئين',
    icon: 'award',
    progressEn: '0 / 10 courses', progressAr: '٠ / ١٠ دورات',
  },
  {
    titleEn: 'Investor Mindset', titleAr: 'عقلية المستثمر',
    conditionEn: 'Finish Intermediate track', conditionAr: 'إنهاء مسار المتوسط',
    icon: 'trophy',
    progressEn: '0 / 8 courses', progressAr: '٠ / ٨ دورات',
  },
  {
    titleEn: 'Financial Expert', titleAr: 'الخبير المالي',
    conditionEn: 'Finish Advanced track', conditionAr: 'إنهاء مسار المتقدم',
    icon: 'target',
    progressEn: '0 / 10 courses', progressAr: '٠ / ١٠ دورات',
  },
  {
    titleEn: 'Scholar', titleAr: 'العالم',
    conditionEn: 'Read 10 articles', conditionAr: 'اقرأ ١٠ مقالات',
    icon: 'book',
    progressEn: '0 / 10 articles', progressAr: '٠ / ١٠ مقالات',
  },
  {
    titleEn: 'Video Student', titleAr: 'طالب الفيديو',
    conditionEn: 'Watch 5 videos', conditionAr: 'شاهد ٥ فيديوهات',
    icon: 'play',
    progressEn: '0 / 5 videos', progressAr: '٠ / ٥ فيديوهات',
  },
];

const ACHIEVEMENT_ICONS: Record<string, any> = {
  star: Star,
  flame: Flame,
  trending: TrendingUp,
  award: Award,
  trophy: Trophy,
  target: Target,
  book: BookOpen,
  play: Play,
};

function AchievementsTab({
  language,
  progressMap,
  courses,
}: {
  language: string;
  progressMap: Record<string, number>;
  courses: CourseData[];
}) {
  const isAr = language === 'ar';
  const isRtl = language === 'ar';

  const completedByLevel = useMemo(() => {
    const counts = { beginner: 0, intermediate: 0, advanced: 0 };
    for (const course of courses) {
      if ((progressMap[course.courseId] ?? 0) >= 100) {
        const level = (course.level ?? 'beginner') as CourseLevel;
        counts[level]++;
      }
    }
    return counts;
  }, [progressMap, courses]);

  const coursesByLevel = useMemo(() => {
    const counts = { beginner: 0, intermediate: 0, advanced: 0 };
    for (const course of courses) {
      const level = (course.level ?? 'beginner') as CourseLevel;
      counts[level]++;
    }
    return counts;
  }, [courses]);

  const hasAnyProgress = Object.values(progressMap).some((p) => p > 0);

  // [current, total] for each badge in ACHIEVEMENT_BADGES order
  const badgeProgress: [number, number][] = [
    [hasAnyProgress ? 1 : 0, 1],
    [0, 5],
    [0, 7],
    [completedByLevel.beginner, coursesByLevel.beginner || 10],
    [completedByLevel.intermediate, coursesByLevel.intermediate || 8],
    [completedByLevel.advanced, coursesByLevel.advanced || 10],
    [0, 10],
    [0, 5],
  ];

  const intl = useIntl();
  const unlockedCount = ACHIEVEMENT_BADGES.reduce((sum, _badge, i) => {
    const [current, total] = badgeProgress[i] ?? [0, 1];
    return sum + (current >= total ? 1 : 0);
  }, 0);
  const summaryPct = Math.round((unlockedCount / ACHIEVEMENT_BADGES.length) * 100);

  return (
    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Summary bar */}
      <div
        style={{
          background: 'var(--ds-bg-card)',
          border: '0.5px solid var(--ds-border)',
          borderRadius: '16px',
          boxShadow: 'var(--ds-shadow-card)',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          direction: isRtl ? 'rtl' : 'ltr',
        }}
      >
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px',
          background: 'rgba(217,119,6,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Trophy size={22} style={{ color: 'var(--ds-accent-gold)' }} />
        </div>
        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ds-text-heading)' }}>
          {intl.formatMessage(
            { id: 'learn.achievements_unlocked_of', defaultMessage: '{count} of {total} unlocked' },
            {
              count: intl.formatNumber(unlockedCount),
              total: intl.formatNumber(ACHIEVEMENT_BADGES.length),
            }
          )}
        </span>
        <div style={{ flex: 1, minWidth: '120px', maxWidth: '260px', height: '5px', background: 'var(--ds-bg-tinted)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${summaryPct}%`, height: '100%', background: 'var(--ds-accent-gold)', borderRadius: '4px', transition: 'width 600ms ease-out' }} />
        </div>
      </div>

      {/* Badge grid — three explicit states: earned / in-progress / locked */}
      <div className="learn-achievements-grid">
        {ACHIEVEMENT_BADGES.map((badge, i) => {
          const [current, total] = badgeProgress[i] ?? [0, 1];
          const earned = current >= total;
          const inProgress = !earned && current > 0;
          const locked = !earned && !inProgress;
          const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
          const IconComponent = ACHIEVEMENT_ICONS[badge.icon] || Lock;
          const remaining = Math.max(0, total - current);
          const progressLabel = isAr
            ? `${toArabicNumerals(String(current))} / ${toArabicNumerals(String(total))}`
            : `${current} / ${total}`;

          const ringRadius = 25;
          const ringCircumference = 2 * Math.PI * ringRadius;

          return (
            <div
              key={i}
              style={{
                background: 'var(--ds-bg-card)',
                border: earned
                  ? '1px solid var(--ds-accent-gold)'
                  : locked
                    ? '1px dashed var(--ds-border)'
                    : '0.5px solid var(--ds-border)',
                borderRadius: '16px',
                padding: '20px 24px',
                boxShadow: 'var(--ds-shadow-card)',
                textAlign: 'center',
                direction: isRtl ? 'rtl' : 'ltr',
                position: 'relative',
              }}
            >
              {/* State chip, pinned to the top corner */}
              <span
                style={{
                  position: 'absolute',
                  top: '12px',
                  insetInlineEnd: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  letterSpacing: '0.04em',
                  ...(earned
                    ? { background: 'rgba(217,119,6,0.1)', color: 'var(--ds-accent-gold)', border: '0.5px solid var(--ds-warning-border)' }
                    : locked
                      ? { background: 'var(--ds-bg-tinted)', color: 'var(--ds-text-muted)', border: '0.5px solid var(--ds-border)' }
                      : { background: 'var(--ds-success-bg)', color: 'var(--ds-success-text)', border: '0.5px solid var(--ds-success-border)' }),
                }}
              >
                {earned ? (
                  intl.formatMessage({ id: 'learn.achievements_earned', defaultMessage: 'Earned ✓' })
                ) : locked ? (
                  <>
                    <Lock size={10} />
                    {intl.formatMessage({ id: 'learn.achievements_locked', defaultMessage: 'Locked' })}
                  </>
                ) : (
                  progressLabel
                )}
              </span>

              {/* Icon — earned: gold disc; in-progress: emerald progress ring; locked: muted disc */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', marginTop: '8px' }}>
                {inProgress ? (
                  <div style={{ position: 'relative', width: 56, height: 56 }}>
                    <svg width="56" height="56" viewBox="0 0 56 56" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                      <circle cx="28" cy="28" r={ringRadius} fill="none" stroke="var(--ds-bg-tinted)" strokeWidth="3" />
                      <circle
                        cx="28" cy="28" r={ringRadius} fill="none"
                        stroke="var(--ds-primary)" strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringCircumference - (pct / 100) * ringCircumference}
                      />
                    </svg>
                    <div style={{ position: 'absolute', inset: '7px', borderRadius: '50%', background: 'var(--ds-bg-tinted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IconComponent size={22} style={{ color: 'var(--ds-primary)' }} />
                    </div>
                  </div>
                ) : (
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: earned ? 'rgba(217,119,6,0.1)' : 'var(--ds-bg-tinted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <IconComponent
                      size={28}
                      style={{ color: earned ? 'var(--ds-accent-gold)' : 'var(--ds-text-muted)' }}
                    />
                  </div>
                )}
              </div>

              <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)', margin: 0, marginBottom: '4px' }}>
                {isAr ? badge.titleAr : badge.titleEn}
              </h3>

              <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-text-muted)', margin: 0, marginBottom: '10px', lineHeight: 1.5 }}>
                {locked
                  ? intl.formatMessage(
                      { id: 'learn.achievements_unlock_by', defaultMessage: 'Unlock by: {condition}' },
                      { condition: isAr ? badge.conditionAr : badge.conditionEn }
                    )
                  : isAr ? badge.conditionAr : badge.conditionEn}
              </p>

              {inProgress && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 12px',
                  background: 'var(--ds-bg-tinted)',
                  color: 'var(--ds-primary)',
                }}>
                  {intl.formatMessage(
                    { id: 'learn.achievements_remaining', defaultMessage: '{count} to go' },
                    { count: intl.formatNumber(remaining) }
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===== PAGE ===== */
export default function LearnPage() {
  const intl = useIntl();
  const language = useStore((s) => s.language);
  const isRtl = language === 'ar';
  const { courses, progressMap, completedByBase, resumeCourse } = useLearnPageData();
  const searchParams = useSearchParams();

  const VALID_TABS: LearnTab[] = ['home', 'articles', 'videos', 'topics', 'achievements'];
  const tabParam = searchParams.get('tab') as LearnTab | null;
  const initialTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'home';

  const [activeTab, setActiveTab] = useState<LearnTab>(initialTab);
  const [courseFilter, setCourseFilter] = useState<CourseFilter>('all');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const literacyScore = useMemo(() => {
    const vals = Object.values(progressMap);
    if (vals.length === 0 || vals.every((p) => p === 0)) return '--';
    return Math.min(100, Math.round(vals.reduce((a, b) => a + b, 0) / vals.length));
  }, [progressMap]);

  const visibleCourses = useMemo(() => {
    if (courseFilter === 'all') return courses;
    if (courseFilter === 'in_progress') {
      return courses.filter((c) => {
        const p = progressMap[c.courseId] ?? 0;
        return p > 0 && p < 100;
      });
    }
    return courses.filter((c) => (c.level ?? 'beginner') === courseFilter);
  }, [courses, courseFilter, progressMap]);

  return (
    <div className="ds-page" style={{ background: PAGE_BG, direction: isRtl ? 'rtl' : 'ltr' }}>
      <LearnHero intl={intl} scoreDisplay={literacyScore} language={language} />

      <div style={{ marginTop: '16px' }}>
        <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} intl={intl} language={language} />
      </div>

      <div key={activeTab} style={{ animation: 'fadeIn 200ms ease-out' }}>
        {activeTab === 'home' && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {resumeCourse && (
              <ResumeStrip
                course={resumeCourse}
                progress={progressMap[resumeCourse.courseId] ?? 0}
                nextLessonTitle={getNextLessonTitle(
                  resumeCourse,
                  completedByBase[baseCourseIdOf(resumeCourse.courseId)]
                )}
                intl={intl}
                language={language}
                mounted={mounted}
              />
            )}

            <FilterBar filter={courseFilter} onChange={setCourseFilter} intl={intl} language={language} />

            {visibleCourses.length > 0 ? (
              <div className="learn-grid">
                {visibleCourses.map((course) => (
                  <CourseCardV2
                    key={course.courseId}
                    course={course}
                    progress={progressMap[course.courseId] ?? 0}
                    intl={intl}
                    language={language}
                    mounted={mounted}
                  />
                ))}
              </div>
            ) : (
              <div className="ds-empty-state">
                <p style={{ fontSize: '14px', color: 'var(--ds-text-body)', margin: 0 }}>
                  {intl.formatMessage({
                    id: 'learn.filter_in_progress_empty',
                    defaultMessage: "You haven't started any course yet — pick one to begin.",
                  })}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'articles' && (
          <ArticlesTab
            language={language}
            intl={intl}
            minReadLabel={(min) => (language === 'ar' ? `${intl.formatNumber(min)} دقيقة قراءة` : `${min} MIN READ`)}
          />
        )}
        {activeTab === 'videos' && (
          <VideosTab language={language} intl={intl} />
        )}
        {activeTab === 'topics' && (
          <TopicsTab language={language} intl={intl} />
        )}
        {activeTab === 'achievements' && <AchievementsTab language={language} progressMap={progressMap} courses={courses} />}
      </div>
    </div>
  );
}

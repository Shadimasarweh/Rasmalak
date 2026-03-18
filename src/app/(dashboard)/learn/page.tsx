'use client';

import { useState, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import Link from 'next/link';
import { getAllCourses } from '@/data/courses';
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
} from 'lucide-react';

/* ============================================
   LEARN PAGE – Accordion layout + tabs
   ============================================ */

type LearnTab = 'home' | 'articles' | 'videos' | 'topics' | 'achievements';

const PAGE_BG = '#F5F0EB';
const LEARN_GREEN = '#2D6A4F';
const COMING_SOON_AMBER = '#D97706';

const LEVEL_CONFIG: Record<
  CourseLevel,
  { dotColor: string; expandedBg: string; labelEn: string; labelAr: string }
> = {
  beginner: { dotColor: '#2D6A4F', expandedBg: '#F0F7F4', labelEn: 'Beginner', labelAr: 'مبتدئ' },
  intermediate: { dotColor: '#D97706', expandedBg: '#FFFBEB', labelEn: 'Intermediate', labelAr: 'متوسط' },
  advanced: { dotColor: '#DC2626', expandedBg: '#FEF2F2', labelEn: 'Advanced', labelAr: 'متقدم' },
};

/* ----- Data hook (unchanged) ----- */
function useLearnPageData() {
  const language = useStore((s) => s.language);
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const courses = useMemo(() => getAllCourses(language), [language]);
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
    setProgressMap((prev) => ({ ...prev, ...map }));

    if (!initialized || !user) return;
    const fetchProgress = async () => {
      try {
        const { data } = await supabase
          .from('course_progress')
          .select('course_id, completed_section_ids, locale')
          .eq('user_id', user.id)
          .eq('locale', language);
        if (!data) return;
        const supaMap: Record<string, number> = {};
        for (const row of data) {
          const course = courses.find((c) => c.courseId === row.course_id);
          if (course) {
            const total = getTotalSections(course);
            const done = (row.completed_section_ids as string[])?.length ?? 0;
            supaMap[row.course_id] = total > 0 ? Math.round((done / total) * 100) : 0;
          }
        }
        setProgressMap((prev) => {
          const merged = { ...prev };
          for (const [k, v] of Object.entries(supaMap)) {
            merged[k] = Math.max(merged[k] ?? 0, v);
          }
          return merged;
        });
      } catch {
        // Supabase unavailable
      }
    };
    fetchProgress();
  }, [initialized, user, language, courses]);

  const hasStartedAnyCourse = Object.values(progressMap).some((p) => p > 0);
  const firstCourse = courses[0];
  const recommendedCourse = hasStartedAnyCourse
    ? courses.find((c) => {
        const p = progressMap[c.courseId] ?? 0;
        return p > 0 && p < 100;
      }) || firstCourse
    : firstCourse;

  return { courses, progressMap, recommendedCourse: recommendedCourse ?? null };
}

/* ----- Slim hero ----- */
function LearnHero({ intl, scoreDisplay }: { intl: ReturnType<typeof useIntl>; scoreDisplay: number | string }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        padding: 'var(--spacing-4) var(--spacing-5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--spacing-4)',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a1a1a', margin: 0, marginBottom: '4px' }}>
          {intl.formatMessage({ id: 'learn.title', defaultMessage: 'Learn' })}
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#1a1a1a', opacity: 0.75, margin: 0 }}>
          {intl.formatMessage({ id: 'learn.subtitle', defaultMessage: 'Master your financial future' })}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            border: `3px solid ${LEARN_GREEN}`,
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1a1a1a' }}>{scoreDisplay}</span>
        </div>
        <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#1a1a1a', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>
          {intl.formatMessage({ id: 'learn.literacy_score', defaultMessage: 'Financial Literacy Score' })}
        </span>
      </div>
    </div>
  );
}

/* ----- Tab switcher ----- */
const TABS: { id: LearnTab; labelKey: string; labelDefault: string }[] = [
  { id: 'home', labelKey: 'learn.tab.home', labelDefault: 'Home' },
  { id: 'articles', labelKey: 'learn.tab.articles', labelDefault: 'Articles' },
  { id: 'videos', labelKey: 'learn.tab.videos', labelDefault: 'Videos' },
  { id: 'topics', labelKey: 'learn.tab.topics', labelDefault: 'Topics & Skills' },
  { id: 'achievements', labelKey: 'learn.tab.achievements', labelDefault: 'Achievements' },
];

function TabSwitcher({
  activeTab,
  onTabChange,
  intl,
}: {
  activeTab: LearnTab;
  onTabChange: (tab: LearnTab) => void;
  intl: ReturnType<typeof useIntl>;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: isActive ? LEARN_GREEN : '#FFFFFF',
              color: isActive ? '#FFFFFF' : '#1a1a1a',
              boxShadow: isActive ? 'none' : 'var(--shadow-sm)',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = 'rgba(45, 106, 79, 0.12)';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            {intl.formatMessage({ id: tab.labelKey, defaultMessage: tab.labelDefault })}
          </button>
        );
      })}
    </div>
  );
}

/* ----- Coming Soon badge (language-aware) ----- */
function ComingSoonBadge({ text }: { text: string }) {
  return (
    <span
      style={{
        position: 'absolute',
        top: 'var(--spacing-2)',
        left: 'var(--spacing-2)',
        fontSize: '0.625rem',
        fontWeight: 700,
        color: COMING_SOON_AMBER,
        background: 'rgba(217, 119, 6, 0.15)',
        padding: '4px 8px',
        borderRadius: 'var(--radius-pill)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        zIndex: 1,
      }}
    >
      {text}
    </span>
  );
}

/* ----- Articles tab (placeholder) ----- */
const ARTICLE_CARDS = [
  { titleEn: 'The Power of Compound Interest', titleAr: 'قوة الفائدة المركبة', tagEn: 'INVESTING · BEGINNER', tagAr: 'استثمار · مبتدئ', readMin: 8, descEn: 'Learn how your money grows exponentially over time.', descAr: 'تعلّم كيف ينمو مالك بشكل أُسّي مع مرور الوقت.' },
  { titleEn: 'How to Read a Balance Sheet', titleAr: 'كيف تقرأ الميزانية العمومية', tagEn: 'FINANCE · INTERMEDIATE', tagAr: 'مالية · متوسط', readMin: 12, descEn: 'Master the fundamentals of financial statements.', descAr: 'أتقن أساسيات القوائم المالية.' },
  { titleEn: 'Gold vs Real Estate: Where to Invest in 2025', titleAr: 'الذهب مقابل العقارات: أين تستثمر في 2025', tagEn: 'WEALTH · ADVANCED', tagAr: 'ثروة · متقدم', readMin: 10, descEn: 'Compare two major asset classes for the year ahead.', descAr: 'قارن بين فئتين رئيسيتين من الأصول للعام القادم.' },
  { titleEn: 'Understanding Inflation and Your Savings', titleAr: 'فهم التضخم وتأثيره على مدخراتك', tagEn: 'ECONOMICS · BEGINNER', tagAr: 'اقتصاد · مبتدئ', readMin: 6, descEn: 'How inflation erodes purchasing power and how to protect savings.', descAr: 'كيف يقلل التضخم القوة الشرائية وكيف تحمي مدخراتك.' },
  { titleEn: 'ETFs Explained Simply', titleAr: 'صناديق المؤشرات المتداولة بشكل مبسط', tagEn: 'INVESTING · INTERMEDIATE', tagAr: 'استثمار · متوسط', readMin: 9, descEn: 'A beginner-friendly guide to exchange-traded funds.', descAr: 'دليل مبسط لصناديق المؤشرات المتداولة.' },
  { titleEn: 'Building an Emergency Fund', titleAr: 'بناء صندوق الطوارئ', tagEn: 'PERSONAL FINANCE · BEGINNER', tagAr: 'مالية شخصية · مبتدئ', readMin: 5, descEn: 'Steps to build a safety net for unexpected expenses.', descAr: 'خطوات لبناء شبكة أمان للنفقات غير المتوقعة.' },
];

function ArticlesTab({ language, comingSoonText, minReadLabel }: { language: string; comingSoonText: string; minReadLabel: (min: number) => string }) {
  const isAr = language === 'ar';
  return (
    <div className="learn-accordion-grid" style={{ marginTop: 'var(--spacing-4)' }}>
      {ARTICLE_CARDS.map((card, i) => (
        <div
          key={i}
          style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
            border: '1px solid var(--color-border-subtle)',
            position: 'relative',
          }}
        >
          <div style={{ position: 'relative', height: '80px', background: 'linear-gradient(135deg, #2D6A4F 0%, #1B4332 100%)' }}>
            <ComingSoonBadge text={comingSoonText} />
            <span
              style={{
                position: 'absolute',
                top: 'var(--spacing-2)',
                right: 'var(--spacing-2)',
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: '#FFFFFF',
                background: 'rgba(0,0,0,0.2)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {minReadLabel(card.readMin)}
            </span>
          </div>
          <div style={{ padding: 'var(--spacing-3)' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1a1a1a', margin: 0, marginBottom: '8px' }}>
              {isAr ? card.titleAr : card.titleEn}
            </h3>
            <span style={{ fontSize: '0.625rem', fontWeight: 700, color: LEARN_GREEN, letterSpacing: '0.04em' }}>
              {isAr ? card.tagAr : card.tagEn}
            </span>
            <p style={{ fontSize: '0.8125rem', color: '#1a1a1a', opacity: 0.8, marginTop: '8px', marginBottom: 0, lineHeight: 1.4 }}>
              {isAr ? card.descAr : card.descEn}
            </p>
          </div>
        </div>
      ))}
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

function VideosTab({ language, comingSoonText }: { language: string; comingSoonText: string }) {
  const isAr = language === 'ar';
  return (
    <div className="learn-accordion-grid" style={{ marginTop: 'var(--spacing-4)' }}>
      {VIDEO_CARDS.map((card, i) => {
        const levelLabel = language === 'ar' ? LEVEL_CONFIG[card.level].labelAr : LEVEL_CONFIG[card.level].labelEn;
        return (
          <div
            key={i}
            style={{
              background: '#FFFFFF',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
              border: '1px solid var(--color-border-subtle)',
              position: 'relative',
            }}
          >
            <div style={{ position: 'relative', height: '140px', background: 'linear-gradient(135deg, #1B4332 0%, #0d2818 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ComingSoonBadge text={comingSoonText} />
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Play size={28} style={{ color: '#FFFFFF', marginLeft: '4px' }} fill="currentColor" />
              </div>
              <span
                style={{
                  position: 'absolute',
                  top: 'var(--spacing-2)',
                  right: 'var(--spacing-2)',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  background: 'rgba(0,0,0,0.4)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {card.duration}
              </span>
            </div>
            <div style={{ padding: 'var(--spacing-3)' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1a1a1a', margin: 0, marginBottom: '8px' }}>
                {isAr ? card.titleAr : card.titleEn}
              </h3>
              <span style={{ fontSize: '0.625rem', fontWeight: 700, color: LEARN_GREEN, letterSpacing: '0.04em' }}>{levelLabel}</span>
            </div>
          </div>
        );
      })}
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

function TopicsTab({ language, comingSoonText }: { language: string; comingSoonText: string }) {
  const isAr = language === 'ar';
  return (
    <div style={{ marginTop: 'var(--spacing-4)' }} className="learn-topics-grid">
      {TOPIC_CARDS.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            style={{
              background: '#FFFFFF',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-sm)',
              padding: 'var(--spacing-4)',
              border: '1px solid var(--color-border-subtle)',
              position: 'relative',
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: LEARN_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--spacing-2)' }}>
              <Icon size={24} style={{ color: '#FFFFFF' }} />
            </div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1a1a1a', margin: 0, marginBottom: 'var(--spacing-2)' }}>
              {isAr ? card.titleAr : card.titleEn}
            </h3>
            <span
              style={{
                position: 'absolute',
                bottom: 'var(--spacing-2)',
                right: 'var(--spacing-2)',
                fontSize: '0.5625rem',
                fontWeight: 700,
                color: COMING_SOON_AMBER,
                background: 'rgba(217, 119, 6, 0.15)',
                padding: '3px 6px',
                borderRadius: 'var(--radius-pill)',
              }}
            >
              {comingSoonText}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ----- Achievements tab (placeholder) ----- */
const ACHIEVEMENT_BADGES = [
  { titleEn: 'First Steps', titleAr: 'الخطوات الأولى', conditionEn: 'Complete your first lesson', conditionAr: 'أكمل أول درس لك' },
  { titleEn: 'Quick Learner', titleAr: 'المتعلم السريع', conditionEn: 'Complete 5 lessons in a week', conditionAr: 'أكمل 5 دروس في أسبوع' },
  { titleEn: 'Consistent', titleAr: 'المثابر', conditionEn: '7-day learning streak', conditionAr: 'سلسلة تعلم 7 أيام' },
  { titleEn: 'Money Basics', titleAr: 'أساسيات المال', conditionEn: 'Finish Beginner track', conditionAr: 'إنهاء مسار المبتدئين' },
  { titleEn: 'Investor Mindset', titleAr: 'عقلية المستثمر', conditionEn: 'Finish Intermediate track', conditionAr: 'إنهاء مسار المتوسط' },
  { titleEn: 'Financial Expert', titleAr: 'الخبير المالي', conditionEn: 'Finish Advanced track', conditionAr: 'إنهاء مسار المتقدم' },
  { titleEn: 'Scholar', titleAr: 'العالم', conditionEn: 'Read 10 articles', conditionAr: 'اقرأ 10 مقالات' },
  { titleEn: 'Video Student', titleAr: 'طالب الفيديو', conditionEn: 'Watch 5 videos', conditionAr: 'شاهد 5 فيديوهات' },
];

function AchievementsTab({ language }: { language: string }) {
  const isAr = language === 'ar';
  return (
    <div style={{ marginTop: 'var(--spacing-4)' }} className="learn-achievements-grid">
      {ACHIEVEMENT_BADGES.map((badge, i) => (
        <div
          key={i}
          style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-sm)',
            padding: 'var(--spacing-4)',
            border: '1px solid var(--color-border-subtle)',
            textAlign: 'center',
            position: 'relative',
            opacity: 0.85,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-2)' }}>
            <Lock size={64} style={{ color: '#9ca3af' }} />
          </div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1a1a1a', margin: 0, marginBottom: '8px' }}>
            {isAr ? badge.titleAr : badge.titleEn}
          </h3>
          <p style={{ fontSize: '0.6875rem', color: '#6b7280', margin: 0, marginBottom: 'var(--spacing-2)' }}>
            {isAr ? badge.conditionAr : badge.conditionEn}
          </p>
          <div style={{ height: '6px', background: '#E5E7EB', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
            <div style={{ width: '0%', height: '100%', background: LEARN_GREEN, borderRadius: 'var(--radius-pill)' }} />
          </div>
          <span style={{ fontSize: '0.625rem', color: '#6b7280', marginTop: '4px', display: 'block' }}>0%</span>
        </div>
      ))}
    </div>
  );
}

/* ----- Course card (inside accordion body) ----- */
function AccordionCourseCard({
  course,
  progress,
  intl,
}: {
  course: CourseData;
  progress: number;
  intl: ReturnType<typeof useIntl>;
}) {
  const total = getTotalSections(course);
  const isRtl = course.locale === 'ar';

  return (
    <Link
      href={`/learn/courses/${course.courseId}`}
      style={{
        textAlign: isRtl ? 'right' : 'left',
        background: '#FFFFFF',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        padding: 0,
        width: '100%',
        transition: 'box-shadow 0.2s ease',
        textDecoration: 'none',
        display: 'block',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      <div
        style={{
          height: '80px',
          background: 'linear-gradient(135deg, #2D6A4F 0%, #1B4332 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <BookOpen size={28} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.95)' }} />
      </div>
      <div style={{ padding: 'var(--spacing-3)' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1a1a1a', margin: 0, marginBottom: '6px', lineHeight: 1.25 }}>
          {course.title}
        </h3>
        <p
          style={{
            fontSize: '0.8125rem',
            color: '#1a1a1a',
            opacity: 0.75,
            margin: 0,
            marginBottom: 'var(--spacing-2)',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}
        >
          {course.description ?? ''}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-2)' }}>
          <span style={{ fontSize: '0.75rem', color: '#1a1a1a', opacity: 0.6 }}>
            {intl.formatMessage({ id: 'learn.sections_count', defaultMessage: '{count} sections' }, { count: total })}
          </span>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: LEARN_GREEN }}>
            {progress > 0
              ? intl.formatMessage({ id: 'learn.continue', defaultMessage: 'Continue' }) + ' →'
              : intl.formatMessage({ id: 'learn.start_course', defaultMessage: 'Start Course' }) + ' →'}
          </span>
        </div>
      </div>
      {progress > 0 && progress < 100 && (
        <div style={{ height: '4px', background: '#E0E0E0', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: LEARN_GREEN,
              transition: 'width 0.2s ease',
            }}
          />
        </div>
      )}
    </Link>
  );
}

/* ----- Single accordion section ----- */
function LevelAccordion({
  level,
  courses,
  progressMap,
  intl,
  isOpen,
  onToggle,
  language,
}: {
  level: CourseLevel;
  courses: CourseData[];
  progressMap: Record<string, number>;
  intl: ReturnType<typeof useIntl>;
  isOpen: boolean;
  onToggle: () => void;
  language: string;
}) {
  const config = LEVEL_CONFIG[level];
  const label = language === 'ar' ? config.labelAr : config.labelEn;

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--spacing-4)',
          background: isOpen ? config.expandedBg : '#FFFFFF',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: config.dotColor,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
          <span style={{ fontSize: '0.875rem', color: '#1a1a1a', opacity: 0.7 }}>
            {intl.formatMessage({ id: 'learn.courses_count', defaultMessage: '{count} courses' }, { count: courses.length })}
          </span>
          <ChevronDown
            size={20}
            style={{
              color: '#1a1a1a',
              flexShrink: 0,
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        </div>
      </button>
      {isOpen && (
        <div
          style={{
            padding: 'var(--spacing-4)',
            background: config.expandedBg,
            borderTop: '1px solid var(--color-border-subtle)',
            animation: 'learnAccordionIn 0.25s ease',
          }}
        >
          <div className="learn-accordion-grid">
            {courses.map((course) => (
              <AccordionCourseCard
                key={course.courseId}
                course={course}
                progress={progressMap[course.courseId] ?? 0}
                intl={intl}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== PAGE ===== */
export default function LearnPage() {
  const intl = useIntl();
  const language = useStore((s) => s.language);
  const { courses, progressMap } = useLearnPageData();

  const [activeTab, setActiveTab] = useState<LearnTab>('home');
  const [openAccordion, setOpenAccordion] = useState<CourseLevel | null>('beginner');

  const literacyScore = useMemo(() => {
    const vals = Object.values(progressMap);
    if (vals.length === 0 || vals.every((p) => p === 0)) return '--';
    return Math.min(100, Math.round(vals.reduce((a, b) => a + b, 0) / vals.length));
  }, [progressMap]);

  const grouped = useMemo(() => {
    const groups: Record<CourseLevel, CourseData[]> = { beginner: [], intermediate: [], advanced: [] };
    for (const c of courses) {
      const level = c.level ?? 'beginner';
      groups[level].push(c);
    }
    return groups;
  }, [courses]);

  const toggle = (level: CourseLevel) => {
    setOpenAccordion((prev) => (prev === level ? null : level));
  };

  return (
    <div className="ds-page" style={{ background: PAGE_BG }}>
      <LearnHero intl={intl} scoreDisplay={literacyScore} />

      <div style={{ marginTop: 'var(--spacing-4)' }}>
        <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} intl={intl} />
      </div>

      {activeTab === 'home' && (
        <div style={{ marginTop: 'var(--spacing-4)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          {(['beginner', 'intermediate', 'advanced'] as CourseLevel[]).map((level) => (
            <LevelAccordion
              key={level}
              level={level}
              courses={grouped[level]}
              progressMap={progressMap}
              intl={intl}
              isOpen={openAccordion === level}
              onToggle={() => toggle(level)}
              language={language}
            />
          ))}
        </div>
      )}

      {activeTab === 'articles' && (
        <ArticlesTab
          language={language}
          comingSoonText={language === 'ar' ? 'قريباً' : 'Coming Soon'}
          minReadLabel={(min) => (language === 'ar' ? `${min} دقيقة قراءة` : `${min} MIN READ`)}
        />
      )}
      {activeTab === 'videos' && (
        <VideosTab language={language} comingSoonText={language === 'ar' ? 'قريباً' : 'Coming Soon'} />
      )}
      {activeTab === 'topics' && (
        <TopicsTab language={language} comingSoonText={language === 'ar' ? 'قريباً' : 'Coming Soon'} />
      )}
      {activeTab === 'achievements' && <AchievementsTab language={language} />}
    </div>
  );
}

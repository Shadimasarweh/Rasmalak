'use client';

import { useState, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import Link from 'next/link';
import { getAllCourses, getCourseIdForLocale, getCourse } from '@/data/courses';
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
  Award,
  Flame,
  Trophy,
  Star,
} from 'lucide-react';

/* ============================================
   LEARN PAGE – Accordion layout + tabs
   ============================================ */

type LearnTab = 'home' | 'articles' | 'videos' | 'topics' | 'achievements';

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

const LEVEL_GRADIENTS: Record<CourseLevel, string> = {
  beginner: 'linear-gradient(90deg, #2D6A4F, #22c55e)',
  intermediate: 'linear-gradient(90deg, #D97706, #FBBF24)',
  advanced: 'linear-gradient(90deg, #DC2626, #F87171)',
};

const BADGE_COLORS: Record<CourseLevel, { background: string; color: string; border: string }> = {
  beginner: { background: 'var(--ds-success-bg)', color: 'var(--ds-success-text)', border: '0.5px solid var(--ds-success-border)' },
  intermediate: { background: 'var(--ds-warning-bg)', color: 'var(--ds-warning-text)', border: '0.5px solid var(--ds-warning-border)' },
  advanced: { background: 'var(--ds-error-bg)', color: 'var(--ds-error-text)', border: '0.5px solid var(--ds-error-border)' },
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

/* ----- Slim hero ----- */
function LearnHero({ intl, scoreDisplay, language }: { intl: ReturnType<typeof useIntl>; scoreDisplay: number | string; language: string }) {
  const isRtl = language === 'ar';
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
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ds-text-heading)', margin: 0, marginBottom: '4px', fontFeatureSettings: '"kern" 1' }}>
          {intl.formatMessage({ id: 'learn.title', defaultMessage: 'Learn' })}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--ds-text-body)', margin: 0 }}>
          {intl.formatMessage({ id: 'learn.subtitle', defaultMessage: 'Master your financial future' })}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <ScoreRing score={scoreDisplay} />
        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>
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

/* ----- Articles tab (placeholder) ----- */
const ARTICLE_CARDS = [
  { titleEn: 'The Power of Compound Interest', titleAr: 'قوة الفائدة المركبة', tagEn: 'INVESTING · BEGINNER', tagAr: 'استثمار · مبتدئ', readMin: 8, descEn: 'Learn how your money grows exponentially over time.', descAr: 'تعلّم كيف ينمو مالك بشكل أُسّي مع مرور الوقت.' },
  { titleEn: 'How to Read a Balance Sheet', titleAr: 'كيف تقرأ الميزانية العمومية', tagEn: 'FINANCE · INTERMEDIATE', tagAr: 'مالية · متوسط', readMin: 12, descEn: 'Master the fundamentals of financial statements.', descAr: 'أتقن أساسيات القوائم المالية.' },
  { titleEn: 'Gold vs Real Estate: Where to Invest in 2025', titleAr: 'الذهب مقابل العقارات: أين تستثمر في 2025', tagEn: 'WEALTH · ADVANCED', tagAr: 'ثروة · متقدم', readMin: 10, descEn: 'Compare two major asset classes for the year ahead.', descAr: 'قارن بين فئتين رئيسيتين من الأصول للعام القادم.' },
  { titleEn: 'Understanding Inflation and Your Savings', titleAr: 'فهم التضخم وتأثيره على مدخراتك', tagEn: 'ECONOMICS · BEGINNER', tagAr: 'اقتصاد · مبتدئ', readMin: 6, descEn: 'How inflation erodes purchasing power and how to protect savings.', descAr: 'كيف يقلل التضخم القوة الشرائية وكيف تحمي مدخراتك.' },
  { titleEn: 'ETFs Explained Simply', titleAr: 'صناديق المؤشرات المتداولة بشكل مبسط', tagEn: 'INVESTING · INTERMEDIATE', tagAr: 'استثمار · متوسط', readMin: 9, descEn: 'A beginner-friendly guide to exchange-traded funds.', descAr: 'دليل مبسط لصناديق المؤشرات المتداولة.' },
  { titleEn: 'Building an Emergency Fund', titleAr: 'بناء صندوق الطوارئ', tagEn: 'PERSONAL FINANCE · BEGINNER', tagAr: 'مالية شخصية · مبتدئ', readMin: 5, descEn: 'Steps to build a safety net for unexpected expenses.', descAr: 'خطوات لبناء شبكة أمان للنفقات غير المتوقعة.' },
];

function ArticlesTab({ language, minReadLabel }: { language: string; minReadLabel: (min: number) => string }) {
  const isRtl = language === 'ar';
  return (
    <div className="learn-accordion-grid" style={{ marginTop: '16px' }}>
      {ARTICLE_CARDS.map((card, i) => (
        <div
          key={i}
          style={{
            background: 'var(--ds-bg-card)',
            borderRadius: '16px',
            boxShadow: 'var(--ds-shadow-card)',
            overflow: 'hidden',
            border: '0.5px solid var(--ds-border)',
            opacity: 0.7,
            cursor: 'default',
            direction: isRtl ? 'rtl' : 'ltr',
            textAlign: isRtl ? 'right' : 'left',
          }}
        >
          <div style={{ position: 'relative', height: '80px', background: 'linear-gradient(135deg, #2D6A4F 0%, #1B4332 100%)' }}>
            <span
              style={{
                position: 'absolute',
                top: '8px',
                [isRtl ? 'left' : 'right']: '8px',
                fontSize: '11px',
                fontWeight: 500,
                color: '#FFFFFF',
                background: 'rgba(0,0,0,0.2)',
                padding: '4px 8px',
                borderRadius: '8px',
              }}
            >
              {minReadLabel(card.readMin)}
            </span>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)', margin: 0, fontFeatureSettings: '"kern" 1' }}>
              {isRtl ? card.titleAr : card.titleEn}
            </h3>
            <span style={{ fontSize: '10px', fontWeight: 500, color: LEARN_GREEN, letterSpacing: '0.04em' }}>
              {isRtl ? card.tagAr : card.tagEn}
            </span>
            <p style={{ fontSize: '14px', color: 'var(--ds-text-body)', margin: 0, lineHeight: 1.6 }}>
              {isRtl ? card.descAr : card.descEn}
            </p>
            <button
              style={{
                background: 'transparent',
                color: 'var(--ds-primary)',
                border: '1.5px solid var(--ds-btn-secondary-border)',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 500,
                minHeight: '44px',
                cursor: 'default',
                alignSelf: isRtl ? 'flex-end' : 'flex-start',
                marginTop: '8px',
              }}
            >
              {language === 'ar' ? 'قريباً' : 'Coming soon'}
            </button>
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

function VideosTab({ language }: { language: string }) {
  const isRtl = language === 'ar';
  return (
    <div className="learn-accordion-grid" style={{ marginTop: '16px' }}>
      {VIDEO_CARDS.map((card, i) => {
        const levelLabel = language === 'ar' ? LEVEL_CONFIG[card.level].labelAr : LEVEL_CONFIG[card.level].labelEn;
        return (
          <div
            key={i}
            style={{
              background: 'var(--ds-bg-card)',
              borderRadius: '16px',
              boxShadow: 'var(--ds-shadow-card)',
              overflow: 'hidden',
              border: '0.5px solid var(--ds-border)',
              opacity: 0.7,
              cursor: 'default',
              direction: isRtl ? 'rtl' : 'ltr',
            }}
          >
            <div style={{ position: 'relative', height: '140px', background: 'linear-gradient(135deg, #1B4332 0%, #0d2818 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Play size={28} style={{ color: '#FFFFFF', marginLeft: '4px' }} fill="currentColor" />
              </div>
              <span
                style={{
                  position: 'absolute',
                  top: '8px',
                  [isRtl ? 'left' : 'right']: '8px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#FFFFFF',
                  background: 'rgba(0,0,0,0.4)',
                  padding: '4px 8px',
                  borderRadius: '8px',
                }}
              >
                {card.duration}
              </span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: isRtl ? 'right' : 'left' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)', margin: 0, fontFeatureSettings: '"kern" 1' }}>
                {isRtl ? card.titleAr : card.titleEn}
              </h3>
              <span style={{ fontSize: '10px', fontWeight: 500, color: LEARN_GREEN, letterSpacing: '0.04em' }}>{levelLabel}</span>
              <button
                style={{
                  background: 'transparent',
                  color: 'var(--ds-primary)',
                  border: '1.5px solid var(--ds-btn-secondary-border)',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'default',
                  alignSelf: isRtl ? 'flex-end' : 'flex-start',
                  marginTop: '8px',
                }}
              >
                {language === 'ar' ? 'قريباً' : 'Coming soon'}
              </button>
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

function TopicsTab({ language }: { language: string }) {
  const isRtl = language === 'ar';
  return (
    <div style={{ marginTop: '16px' }} className="learn-topics-grid">
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
              border: '0.5px solid var(--ds-border)',
              opacity: 0.7,
              cursor: 'default',
              direction: isRtl ? 'rtl' : 'ltr',
              textAlign: isRtl ? 'right' : 'left',
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: LEARN_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
              <Icon size={24} style={{ color: '#FFFFFF' }} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)', margin: 0, marginBottom: '8px', fontFeatureSettings: '"kern" 1' }}>
              {isRtl ? card.titleAr : card.titleEn}
            </h3>
            <button
              style={{
                background: 'transparent',
                color: 'var(--ds-primary)',
                border: '1.5px solid var(--ds-btn-secondary-border)',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 500,
                minHeight: '44px',
                cursor: 'default',
              }}
            >
              {language === 'ar' ? 'قريباً' : 'Coming soon'}
            </button>
          </div>
        );
      })}
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
    conditionEn: 'Complete 5 lessons in a week', conditionAr: 'أكمل 5 دروس في أسبوع',
    icon: 'flame',
    progressEn: '0 / 5 lessons this week', progressAr: '٠ / ٥ دروس هذا الأسبوع',
  },
  {
    titleEn: 'Consistent', titleAr: 'المثابر',
    conditionEn: '7-day learning streak', conditionAr: 'سلسلة تعلم 7 أيام',
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
    conditionEn: 'Read 10 articles', conditionAr: 'اقرأ 10 مقالات',
    icon: 'book',
    progressEn: '0 / 10 articles', progressAr: '٠ / ١٠ مقالات',
  },
  {
    titleEn: 'Video Student', titleAr: 'طالب الفيديو',
    conditionEn: 'Watch 5 videos', conditionAr: 'شاهد 5 فيديوهات',
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

function AchievementsTab({ language }: { language: string }) {
  const isAr = language === 'ar';
  const isRtl = language === 'ar';
  return (
    <div style={{ marginTop: '16px' }} className="learn-achievements-grid">
      {ACHIEVEMENT_BADGES.map((badge, i) => {
        const IconComponent = ACHIEVEMENT_ICONS[badge.icon] || Lock;
        return (
          <div
            key={i}
            style={{
              opacity: 0.7,
              background: 'var(--ds-bg-card)',
              border: '0.5px solid var(--ds-border)',
              borderRadius: '16px',
              padding: '20px 24px',
              boxShadow: 'var(--ds-shadow-card)',
              textAlign: 'center',
              direction: isRtl ? 'rtl' : 'ltr',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '12px',
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--ds-bg-tinted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <IconComponent size={28} style={{ color: 'var(--ds-primary)', opacity: 0.5 }} />
              </div>
            </div>

            <h3 style={{
              fontSize: '15px',
              fontWeight: 500,
              color: 'var(--ds-text-heading)',
              margin: 0,
              marginBottom: '4px',
            }}>
              {isAr ? badge.titleAr : badge.titleEn}
            </h3>

            <p style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--ds-text-muted)',
              margin: 0,
              marginBottom: '12px',
            }}>
              {isAr ? badge.conditionAr : badge.conditionEn}
            </p>

            <div style={{
              height: '4px',
              background: 'var(--ds-bg-tinted)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: '0%',
                height: '100%',
                background: 'var(--ds-primary-glow)',
                borderRadius: '4px',
              }} />
            </div>

            <span style={{
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--ds-text-muted)',
              marginTop: '6px',
              display: 'block',
            }}>
              {isAr ? badge.progressAr : badge.progressEn}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ----- Course card (inside accordion body) ----- */
function AccordionCourseCard({
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
  mounted?: boolean;
}) {
  const total = getTotalSections(course);
  const isRtl = language === 'ar';
  const level = course.level ?? 'beginner';
  const badgeColor = BADGE_COLORS[level];

  const otherLocale = course.locale === 'ar' ? 'en' : 'ar';
  const otherCourseId = getCourseIdForLocale(course.courseId, otherLocale);
  const otherCourse = getCourse(otherCourseId);
  const subtitleText = otherCourse?.title ?? null;

  return (
    <Link
      href={`/learn/courses/${course.courseId}`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div
        style={{
          background: 'var(--ds-bg-card)',
          border: '0.5px solid var(--ds-border)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: 'var(--ds-shadow-card)',
          transition: 'box-shadow 0.2s ease',
          direction: isRtl ? 'rtl' : 'ltr',
          textAlign: isRtl ? 'right' : 'left',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
      >
        {/* Thin top strip — 6px */}
        <div style={{ height: '6px', background: LEVEL_GRADIENTS[level] }} />

        {/* Card body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

          {/* Row: level badge + section count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', borderRadius: '4px',
              fontSize: '10px', fontWeight: 500, padding: '2px 8px', letterSpacing: '0.04em',
              background: badgeColor.background, color: badgeColor.color, border: badgeColor.border,
            }}>
              {language === 'ar' ? LEVEL_CONFIG[level].labelAr : LEVEL_CONFIG[level].labelEn}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)' }}>
              {intl.formatMessage({ id: 'learn.sections_count', defaultMessage: '{count} sections' }, { count: intl.formatNumber(total) })}
            </span>
          </div>

          {/* Primary title (active locale) */}
          <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)', margin: 0, fontFeatureSettings: '"kern" 1' }}>
            {course.title}
          </h3>

          {/* Subtitle (other locale) */}
          {subtitleText && (
            <span style={{
              fontSize: '13px', fontWeight: 400, color: 'var(--ds-text-muted)',
              display: 'block', marginTop: '2px',
              direction: otherLocale === 'ar' ? 'rtl' : 'ltr',
              textAlign: otherLocale === 'ar' ? 'right' : 'left',
            }}>
              {subtitleText}
            </span>
          )}

          {/* Description — 2 line clamp */}
          <p style={{
            fontSize: '14px', fontWeight: 400, color: 'var(--ds-text-body)', margin: 0, lineHeight: 1.6,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}>
            {course.description ?? ''}
          </p>

          {/* Progress bar + label (only if progress > 0) */}
          {progress > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <div style={{ flex: 1, height: '4px', background: 'var(--ds-bg-tinted)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: mounted ? `${progress}%` : '0%', height: '100%', background: 'var(--ds-primary-glow)', borderRadius: '4px', transition: 'width 600ms ease-out' }} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-primary)', minWidth: '32px', textAlign: isRtl ? 'left' : 'right' }}>
                {intl.formatNumber(progress)}%
              </span>
            </div>
          )}

          {/* CTA button */}
          <button
            style={{
              marginTop: '4px',
              background: 'var(--ds-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 500,
              minHeight: '44px',
              cursor: 'pointer',
              alignSelf: isRtl ? 'flex-end' : 'flex-start',
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-primary-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ds-primary)'; }}
          >
            {progress > 0
              ? intl.formatMessage({ id: 'learn.continue', defaultMessage: 'Continue' })
              : intl.formatMessage({ id: 'learn.start_course', defaultMessage: 'Start Course' })}
          </button>
        </div>
      </div>
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
  mounted,
}: {
  level: CourseLevel;
  courses: CourseData[];
  progressMap: Record<string, number>;
  intl: ReturnType<typeof useIntl>;
  isOpen: boolean;
  onToggle: () => void;
  language: string;
  mounted?: boolean;
}) {
  const config = LEVEL_CONFIG[level];
  const label = language === 'ar' ? config.labelAr : config.labelEn;
  const isRtl = language === 'ar';

  return (
    <div
      style={{
        background: 'var(--ds-bg-card)',
        border: '0.5px solid var(--ds-border)',
        borderRadius: '16px',
        boxShadow: 'var(--ds-shadow-card)',
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
          padding: '16px 24px',
          background: isOpen ? config.expandedBg : 'var(--ds-bg-card)',
          border: 'none',
          cursor: 'pointer',
          direction: isRtl ? 'rtl' : 'ltr',
          textAlign: isRtl ? 'right' : 'left',
          transition: 'background 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: config.dotColor,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-text-muted)' }}>
            {intl.formatMessage({ id: 'learn.courses_count', defaultMessage: '{count} courses' }, { count: intl.formatNumber(courses.length) })}
          </span>
          <ChevronDown
            size={20}
            style={{
              color: '#0F1914',
              flexShrink: 0,
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms ease',
            }}
          />
        </div>
      </button>
      <div
        style={{
          maxHeight: isOpen ? '2000px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 300ms ease',
        }}
      >
        <div
          style={{
            padding: '16px 24px',
            background: config.expandedBg,
            borderTop: '0.5px solid var(--ds-border-tinted)',
          }}
        >
          <div className="learn-accordion-grid">
            {courses.map((course) => (
              <AccordionCourseCard
                key={course.courseId}
                course={course}
                progress={progressMap[course.courseId] ?? 0}
                intl={intl}
                language={language}
                mounted={mounted}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== PAGE ===== */
export default function LearnPage() {
  const intl = useIntl();
  const language = useStore((s) => s.language);
  const isRtl = language === 'ar';
  const { courses, progressMap } = useLearnPageData();

  const [activeTab, setActiveTab] = useState<LearnTab>('home');
  const [openAccordion, setOpenAccordion] = useState<CourseLevel | null>('beginner');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

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
    <div className="ds-page" style={{ background: PAGE_BG, direction: isRtl ? 'rtl' : 'ltr' }}>
      <LearnHero intl={intl} scoreDisplay={literacyScore} language={language} />

      <div style={{ marginTop: '16px' }}>
        <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} intl={intl} language={language} />
      </div>

      <div key={activeTab} style={{ animation: 'fadeIn 200ms ease-out' }}>
        {activeTab === 'home' && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                mounted={mounted}
              />
            ))}
          </div>
        )}

        {activeTab === 'articles' && (
          <ArticlesTab
            language={language}
            minReadLabel={(min) => (language === 'ar' ? `${intl.formatNumber(min)} دقيقة قراءة` : `${min} MIN READ`)}
          />
        )}
        {activeTab === 'videos' && (
          <VideosTab language={language} />
        )}
        {activeTab === 'topics' && (
          <TopicsTab language={language} />
        )}
        {activeTab === 'achievements' && <AchievementsTab language={language} />}
      </div>
    </div>
  );
}

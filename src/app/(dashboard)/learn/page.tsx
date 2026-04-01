'use client';

import { useState, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getAllCourses } from '@/data/courses';
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
                {isRtl ? toArabicNumerals(card.duration) : card.duration}
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

  return (
    <div style={{ marginTop: '16px' }} className="learn-achievements-grid">
      {ACHIEVEMENT_BADGES.map((badge, i) => {
        const [current, total] = badgeProgress[i] ?? [0, 1];
        const unlocked = current >= total;
        const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
        const IconComponent = ACHIEVEMENT_ICONS[badge.icon] || Lock;
        const progressLabel = isAr
          ? `${toArabicNumerals(String(current))} / ${toArabicNumerals(String(total))}`
          : `${current} / ${total}`;

        return (
          <div
            key={i}
            style={{
              opacity: unlocked ? 1 : 0.7,
              background: 'var(--ds-bg-card)',
              border: `0.5px solid ${unlocked ? 'var(--ds-accent-gold)' : 'var(--ds-border)'}`,
              borderRadius: '16px',
              padding: '20px 24px',
              boxShadow: 'var(--ds-shadow-card)',
              textAlign: 'center',
              direction: isRtl ? 'rtl' : 'ltr',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: unlocked ? 'rgba(217,119,6,0.1)' : 'var(--ds-bg-tinted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <IconComponent
                  size={28}
                  style={{ color: unlocked ? 'var(--ds-accent-gold)' : 'var(--ds-primary)', opacity: unlocked ? 1 : 0.5 }}
                />
              </div>
            </div>

            <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)', margin: 0, marginBottom: '4px' }}>
              {isAr ? badge.titleAr : badge.titleEn}
            </h3>

            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-text-muted)', margin: 0, marginBottom: '12px' }}>
              {isAr ? badge.conditionAr : badge.conditionEn}
            </p>

            <div style={{ height: '4px', background: 'var(--ds-bg-tinted)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`,
                height: '100%',
                background: unlocked ? 'var(--ds-accent-gold)' : 'var(--ds-primary-glow)',
                borderRadius: '4px',
              }} />
            </div>

            <span style={{
              fontSize: '11px',
              fontWeight: 500,
              color: unlocked ? 'var(--ds-accent-gold)' : 'var(--ds-text-muted)',
              marginTop: '6px',
              display: 'block',
            }}>
              {unlocked ? (isAr ? 'مكتمل ✓' : 'Completed ✓') : progressLabel}
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
  const searchParams = useSearchParams();

  const VALID_TABS: LearnTab[] = ['home', 'articles', 'videos', 'topics', 'achievements'];
  const tabParam = searchParams.get('tab') as LearnTab | null;
  const initialTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'home';

  const [activeTab, setActiveTab] = useState<LearnTab>(initialTab);
  const [openAccordion, setOpenAccordion] = useState<CourseLevel | null>(null);
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
            intl={intl}
            minReadLabel={(min) => (language === 'ar' ? `${intl.formatNumber(min)} دقيقة قراءة` : `${min} MIN READ`)}
          />
        )}
        {activeTab === 'videos' && (
          <VideosTab language={language} />
        )}
        {activeTab === 'topics' && (
          <TopicsTab language={language} />
        )}
        {activeTab === 'achievements' && <AchievementsTab language={language} progressMap={progressMap} courses={courses} />}
      </div>
    </div>
  );
}

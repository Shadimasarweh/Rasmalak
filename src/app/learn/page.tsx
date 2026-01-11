'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  PlayCircle,
  FileText,
  TrendingUp,
  PiggyBank,
  Wallet,
  Target,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Header, BottomNav } from '@/components';
import { useTranslation } from '@/hooks/useTranslation';

// Learning categories with icons
const categories = [
  { id: 'basics', icon: Wallet, color: '#059669' },
  { id: 'budgeting', icon: Target, color: '#3b82f6' },
  { id: 'saving', icon: PiggyBank, color: '#f59e0b' },
  { id: 'investing', icon: TrendingUp, color: '#8b5cf6' },
  { id: 'debt', icon: CreditCard, color: '#ef4444' },
  { id: 'planning', icon: BookOpen, color: '#06b6d4' },
];

// Placeholder articles
const featuredArticles = [
  {
    id: 1,
    titleAr: 'كيف تبدأ رحلتك في الادخار',
    titleEn: 'How to Start Your Savings Journey',
    descAr: 'دليلك الشامل لبناء عادة الادخار وتحقيق أهدافك المالية',
    descEn: 'Your comprehensive guide to building savings habits and achieving financial goals',
    category: 'saving',
    readTime: 5,
    image: '💰',
  },
  {
    id: 2,
    titleAr: 'أساسيات الميزانية الشخصية',
    titleEn: 'Personal Budget Basics',
    descAr: 'تعلم كيف تنظم ميزانيتك الشهرية بخطوات بسيطة',
    descEn: 'Learn how to organize your monthly budget with simple steps',
    category: 'budgeting',
    readTime: 7,
    image: '📊',
  },
  {
    id: 3,
    titleAr: 'مقدمة في الاستثمار للمبتدئين',
    titleEn: 'Introduction to Investing for Beginners',
    descAr: 'اكتشف عالم الاستثمار وابدأ في بناء ثروتك',
    descEn: 'Discover the world of investing and start building your wealth',
    category: 'investing',
    readTime: 10,
    image: '📈',
  },
];

// Placeholder videos
const videos = [
  {
    id: 1,
    titleAr: 'قاعدة 50/30/20 للميزانية',
    titleEn: 'The 50/30/20 Budget Rule',
    duration: '5:30',
    category: 'budgeting',
    thumbnail: '🎬',
  },
  {
    id: 2,
    titleAr: 'كيف تبني صندوق طوارئ',
    titleEn: 'How to Build an Emergency Fund',
    duration: '8:15',
    category: 'saving',
    thumbnail: '🎥',
  },
];

// Placeholder courses
const courses = [
  {
    id: 1,
    titleAr: 'دورة التثقيف المالي الشاملة',
    titleEn: 'Comprehensive Financial Literacy Course',
    descAr: 'من الصفر إلى الاحتراف في إدارة المال',
    descEn: 'From zero to pro in money management',
    lessons: 12,
    progress: 0,
    category: 'basics',
  },
  {
    id: 2,
    titleAr: 'إتقان الاستثمار في الأسهم',
    titleEn: 'Mastering Stock Investment',
    descAr: 'تعلم أساسيات سوق الأسهم والتحليل الفني',
    descEn: 'Learn stock market basics and technical analysis',
    lessons: 8,
    progress: 0,
    category: 'investing',
  },
];

export default function LearnPage() {
  const { t, language, isRTL } = useTranslation();
  const [activeTab, setActiveTab] = useState<'articles' | 'videos' | 'courses'>('articles');

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  const getCategoryName = (catId: string) => {
    const categoryNames: Record<string, { ar: string; en: string }> = {
      basics: { ar: 'أساسيات المال', en: 'Money Basics' },
      budgeting: { ar: 'الميزانية', en: 'Budgeting' },
      saving: { ar: 'الادخار', en: 'Saving' },
      investing: { ar: 'الاستثمار', en: 'Investing' },
      debt: { ar: 'إدارة الديون', en: 'Debt Management' },
      planning: { ar: 'التخطيط المالي', en: 'Financial Planning' },
    };
    return language === 'ar' ? categoryNames[catId]?.ar : categoryNames[catId]?.en;
  };

  return (
    <div className="min-h-screen pb-24 bg-[var(--color-bg-primary)]">
      <Header title={language === 'ar' ? 'تعلّم المالية' : 'Learn Finance'} showGreeting={false} />

      <main className="px-4 space-y-6 animate-fadeInUp">
        {/* Hero Section */}
        <div className="card-gradient p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-[var(--color-gold)]" />
              <span className="text-sm font-medium opacity-90">
                {language === 'ar' ? 'ابنِ ثقافتك المالية' : 'Build Your Financial Culture'}
              </span>
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {language === 'ar' ? 'تعلّم المالية' : 'Learn Finance'}
            </h1>
            <p className="text-sm opacity-80">
              {language === 'ar'
                ? 'محتوى تعليمي متميز لمساعدتك في رحلتك المالية'
                : 'Premium educational content to help you on your financial journey'}
            </p>
          </div>
        </div>

        {/* Categories */}
        <div>
          <h2 className="section-title mb-3">
            {language === 'ar' ? 'المواضيع' : 'Topics'}
          </h2>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  className="flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-light)] hover:border-[var(--color-primary)] transition-all min-w-[80px]"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${cat.color}15` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: cat.color }} />
                  </div>
                  <span className="text-xs font-medium text-[var(--color-text-primary)] text-center">
                    {getCategoryName(cat.id)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            onClick={() => setActiveTab('articles')}
            className={`tab ${activeTab === 'articles' ? 'tab-active' : ''}`}
          >
            <FileText className="w-4 h-4 inline-block ml-1" />
            {language === 'ar' ? 'المقالات' : 'Articles'}
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`tab ${activeTab === 'videos' ? 'tab-active' : ''}`}
          >
            <PlayCircle className="w-4 h-4 inline-block ml-1" />
            {language === 'ar' ? 'الفيديوهات' : 'Videos'}
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`tab ${activeTab === 'courses' ? 'tab-active' : ''}`}
          >
            <BookOpen className="w-4 h-4 inline-block ml-1" />
            {language === 'ar' ? 'الدورات' : 'Courses'}
          </button>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'articles' && (
          <div className="space-y-4">
            {featuredArticles.map((article, index) => (
              <div
                key={article.id}
                className="card card-interactive animate-fadeInUp"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl bg-[var(--color-bg-secondary)] flex items-center justify-center text-3xl flex-shrink-0">
                    {article.image}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="badge badge-primary text-xs mb-2">
                      {getCategoryName(article.category)}
                    </span>
                    <h3 className="font-bold text-[var(--color-text-primary)] mb-1 line-clamp-1">
                      {language === 'ar' ? article.titleAr : article.titleEn}
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-2">
                      {language === 'ar' ? article.descAr : article.descEn}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                      <Clock className="w-3 h-3" />
                      <span>{article.readTime} {language === 'ar' ? 'دقائق' : 'min read'}</span>
                    </div>
                  </div>
                  <ChevronIcon className="w-5 h-5 text-[var(--color-text-muted)] flex-shrink-0 self-center" />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="space-y-4">
            {videos.map((video, index) => (
              <div
                key={video.id}
                className="card card-interactive animate-fadeInUp"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex gap-4">
                  <div className="w-24 h-16 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center text-3xl flex-shrink-0 relative">
                    <PlayCircle className="w-8 h-8 text-white" />
                    <span className="absolute bottom-1 right-1 text-[10px] bg-black/50 text-white px-1 rounded">
                      {video.duration}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 self-center">
                    <span className="badge badge-primary text-xs mb-1">
                      {getCategoryName(video.category)}
                    </span>
                    <h3 className="font-bold text-[var(--color-text-primary)] line-clamp-2">
                      {language === 'ar' ? video.titleAr : video.titleEn}
                    </h3>
                  </div>
                </div>
              </div>
            ))}

            {/* Coming Soon */}
            <div className="card bg-[var(--color-bg-secondary)] border-dashed border-2 border-[var(--color-border)]">
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mx-auto mb-3">
                  <PlayCircle className="w-8 h-8 text-[var(--color-primary)]" />
                </div>
                <h3 className="font-bold text-[var(--color-text-primary)] mb-1">
                  {language === 'ar' ? 'المزيد قادم قريباً' : 'More Coming Soon'}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {language === 'ar'
                    ? 'نعمل على إضافة محتوى تعليمي جديد'
                    : 'We are working on adding new educational content'}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'courses' && (
          <div className="space-y-4">
            {courses.map((course, index) => (
              <div
                key={course.id}
                className="card card-interactive animate-fadeInUp"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="badge badge-primary text-xs">
                    {getCategoryName(course.category)}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {course.lessons} {language === 'ar' ? 'درس' : 'lessons'}
                  </span>
                </div>
                <h3 className="font-bold text-[var(--color-text-primary)] mb-1">
                  {language === 'ar' ? course.titleAr : course.titleEn}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                  {language === 'ar' ? course.descAr : course.descEn}
                </p>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1">
                    <span>{language === 'ar' ? 'التقدم' : 'Progress'}</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${course.progress}%` }} />
                  </div>
                </div>

                <button className="btn btn-primary w-full">
                  {language === 'ar' ? 'ابدأ الدورة' : 'Start Course'}
                  <ArrowIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

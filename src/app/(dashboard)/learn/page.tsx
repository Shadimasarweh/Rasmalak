'use client';

import { useState } from 'react';
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
import { PageHeader, PageContainer, SectionCard } from '@/components';
import { useTranslation } from '@/hooks/useTranslation';

const categories = [
  { id: 'basics', icon: Wallet, color: '#059669' },
  { id: 'budgeting', icon: Target, color: '#3b82f6' },
  { id: 'saving', icon: PiggyBank, color: '#f59e0b' },
  { id: 'investing', icon: TrendingUp, color: '#8b5cf6' },
  { id: 'debt', icon: CreditCard, color: '#ef4444' },
  { id: 'planning', icon: BookOpen, color: '#06b6d4' },
];

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

const videos = [
  {
    id: 1,
    titleAr: 'قاعدة 50/30/20 للميزانية',
    titleEn: 'The 50/30/20 Budget Rule',
    duration: '5:30',
    category: 'budgeting',
  },
  {
    id: 2,
    titleAr: 'كيف تبني صندوق طوارئ',
    titleEn: 'How to Build an Emergency Fund',
    duration: '8:15',
    category: 'saving',
  },
];

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
  const { language, isRTL } = useTranslation();
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
    <div>
      <PageHeader 
        title={language === 'ar' ? 'تعلّم المالية' : 'Learn Finance'}
        showBack
        backUrl="/"
      />

      <PageContainer>
        {/* Hero Section */}
        <div className="card-gradient p-6 relative overflow-hidden rounded-2xl">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-[var(--color-gold)]" />
              <span className="text-sm font-medium opacity-90">
                {language === 'ar' ? 'ابنِ ثقافتك المالية' : 'Build Your Financial Culture'}
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {language === 'ar' ? 'تعلّم المالية' : 'Learn Finance'}
            </h1>
            <p className="text-base opacity-80 max-w-xl">
              {language === 'ar'
                ? 'محتوى تعليمي متميز لمساعدتك في رحلتك المالية'
                : 'Premium educational content to help you on your financial journey'}
            </p>
          </div>
        </div>

        {/* Categories */}
        <div>
          <h2 className="section-title mb-4">
            {language === 'ar' ? 'المواضيع' : 'Topics'}
          </h2>
          <div className="grid grid-cols-6 gap-4">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-light)] hover:border-[var(--color-primary)] transition-all"
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${cat.color}15` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: cat.color }} />
                  </div>
                  <span className="text-sm font-medium text-[var(--color-text-primary)] text-center">
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

        {/* Articles Tab */}
        {activeTab === 'articles' && (
          <div className="grid grid-cols-1 gap-4">
            {featuredArticles.map((article, index) => (
              <SectionCard
                key={article.id}
                className="card-interactive"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex gap-5">
                  <div className="w-20 h-20 rounded-xl bg-[var(--color-bg-secondary)] flex items-center justify-center text-4xl flex-shrink-0">
                    {article.image}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="badge badge-primary text-xs mb-2">
                      {getCategoryName(article.category)}
                    </span>
                    <h3 className="font-bold text-lg text-[var(--color-text-primary)] mb-1">
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
              </SectionCard>
            ))}
          </div>
        )}

        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div className="grid grid-cols-2 gap-4">
            {videos.map((video, index) => (
              <SectionCard
                key={video.id}
                className="card-interactive"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex gap-4">
                  <div className="w-28 h-20 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center flex-shrink-0 relative">
                    <PlayCircle className="w-10 h-10 text-white" />
                    <span className="absolute bottom-2 right-2 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">
                      {video.duration}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 self-center">
                    <span className="badge badge-primary text-xs mb-2">
                      {getCategoryName(video.category)}
                    </span>
                    <h3 className="font-bold text-[var(--color-text-primary)]">
                      {language === 'ar' ? video.titleAr : video.titleEn}
                    </h3>
                  </div>
                </div>
              </SectionCard>
            ))}

            {/* Coming Soon */}
            <SectionCard className="bg-[var(--color-bg-secondary)] border-dashed border-2 border-[var(--color-border)] col-span-2">
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mx-auto mb-4">
                  <PlayCircle className="w-8 h-8 text-[var(--color-primary)]" />
                </div>
                <h3 className="font-bold text-lg text-[var(--color-text-primary)] mb-2">
                  {language === 'ar' ? 'المزيد قادم قريباً' : 'More Coming Soon'}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {language === 'ar'
                    ? 'نعمل على إضافة محتوى تعليمي جديد'
                    : 'We are working on adding new educational content'}
                </p>
              </div>
            </SectionCard>
          </div>
        )}

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div className="grid grid-cols-2 gap-4">
            {courses.map((course, index) => (
              <SectionCard
                key={course.id}
                className="card-interactive"
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
                <h3 className="font-bold text-lg text-[var(--color-text-primary)] mb-2">
                  {language === 'ar' ? course.titleAr : course.titleEn}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                  {language === 'ar' ? course.descAr : course.descEn}
                </p>

                <div className="mb-4">
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
              </SectionCard>
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}

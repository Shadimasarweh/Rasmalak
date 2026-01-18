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
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Lock,
  Star,
  GraduationCap,
  Award,
  Zap,
  ArrowRight,
  ArrowLeft,
  BarChart3,
} from 'lucide-react';
import { PageHeader, PageContainer } from '@/components';
import { useTranslation } from '@/hooks/useTranslation';

const categories = [
  { id: 'basics', icon: Wallet, color: '#059669', 
    nameAr: 'أساسيات المال', nameEn: 'Money Basics' },
  { id: 'budgeting', icon: Target, color: '#3b82f6',
    nameAr: 'الميزانية', nameEn: 'Budgeting' },
  { id: 'saving', icon: PiggyBank, color: '#f59e0b',
    nameAr: 'الادخار', nameEn: 'Saving' },
  { id: 'investing', icon: TrendingUp, color: '#8b5cf6',
    nameAr: 'الاستثمار', nameEn: 'Investing' },
  { id: 'debt', icon: CreditCard, color: '#ef4444',
    nameAr: 'إدارة الديون', nameEn: 'Debt Management' },
  { id: 'islamic', icon: Star, color: '#06b6d4',
    nameAr: 'التمويل الإسلامي', nameEn: 'Islamic Finance' },
];

// Learning paths (structured curriculum)
const learningPaths = [
  {
    id: 'beginner',
    titleAr: 'مسار المبتدئين',
    titleEn: 'Beginner Path',
    descAr: 'ابدأ رحلتك المالية من الصفر',
    descEn: 'Start your financial journey from scratch',
    color: '#10b981',
    icon: Zap,
    modules: [
      { id: 1, titleAr: 'فهم المال', titleEn: 'Understanding Money', completed: true, lessons: 4 },
      { id: 2, titleAr: 'أساسيات الميزانية', titleEn: 'Budgeting Basics', completed: true, lessons: 6 },
      { id: 3, titleAr: 'بناء عادة الادخار', titleEn: 'Building Savings Habits', completed: false, lessons: 5, current: true },
      { id: 4, titleAr: 'إدارة الديون', titleEn: 'Debt Management', completed: false, lessons: 4, locked: true },
      { id: 5, titleAr: 'صندوق الطوارئ', titleEn: 'Emergency Fund', completed: false, lessons: 3, locked: true },
    ],
    progress: 40,
  },
  {
    id: 'intermediate',
    titleAr: 'مسار المتوسطين',
    titleEn: 'Intermediate Path',
    descAr: 'طور مهاراتك المالية',
    descEn: 'Develop your financial skills',
    color: '#3b82f6',
    icon: BarChart3,
    modules: [
      { id: 1, titleAr: 'مقدمة في الاستثمار', titleEn: 'Introduction to Investing', completed: false, lessons: 8 },
      { id: 2, titleAr: 'فهم الأسواق المالية', titleEn: 'Understanding Financial Markets', completed: false, lessons: 6 },
      { id: 3, titleAr: 'بناء المحفظة الاستثمارية', titleEn: 'Building Your Portfolio', completed: false, lessons: 5 },
    ],
    progress: 0,
    locked: true,
  },
  {
    id: 'islamic',
    titleAr: 'مسار التمويل الإسلامي',
    titleEn: 'Islamic Finance Path',
    descAr: 'تعلم أساسيات التمويل المتوافق مع الشريعة',
    descEn: 'Learn Sharia-compliant finance principles',
    color: '#06b6d4',
    icon: Star,
    modules: [
      { id: 1, titleAr: 'مبادئ التمويل الإسلامي', titleEn: 'Islamic Finance Principles', completed: false, lessons: 5 },
      { id: 2, titleAr: 'المرابحة والإجارة', titleEn: 'Murabaha & Ijara', completed: false, lessons: 4 },
      { id: 3, titleAr: 'الصكوك والاستثمار الحلال', titleEn: 'Sukuk & Halal Investing', completed: false, lessons: 6 },
    ],
    progress: 0,
  },
];

// Featured articles
const articles = [
  {
    id: 1,
    titleAr: 'كيف تبدأ رحلتك في الادخار',
    titleEn: 'How to Start Your Savings Journey',
    descAr: 'دليلك الشامل لبناء عادة الادخار وتحقيق أهدافك المالية',
    descEn: 'Your comprehensive guide to building savings habits and achieving financial goals',
    category: 'saving',
    readTime: 5,
    featured: true,
  },
  {
    id: 2,
    titleAr: 'أساسيات الميزانية الشخصية',
    titleEn: 'Personal Budget Basics',
    descAr: 'تعلم كيف تنظم ميزانيتك الشهرية بخطوات بسيطة',
    descEn: 'Learn how to organize your monthly budget with simple steps',
    category: 'budgeting',
    readTime: 7,
  },
  {
    id: 3,
    titleAr: 'قاعدة 50/30/20 للميزانية',
    titleEn: 'The 50/30/20 Budget Rule',
    descAr: 'استراتيجية بسيطة وفعالة لتوزيع دخلك',
    descEn: 'A simple and effective strategy for allocating your income',
    category: 'budgeting',
    readTime: 4,
  },
  {
    id: 4,
    titleAr: 'مقدمة في الاستثمار للمبتدئين',
    titleEn: 'Introduction to Investing for Beginners',
    descAr: 'اكتشف عالم الاستثمار وابدأ في بناء ثروتك',
    descEn: 'Discover the world of investing and start building your wealth',
    category: 'investing',
    readTime: 10,
  },
  {
    id: 5,
    titleAr: 'التمويل الإسلامي: المفاهيم الأساسية',
    titleEn: 'Islamic Finance: Core Concepts',
    descAr: 'فهم مبادئ التمويل المتوافق مع الشريعة الإسلامية',
    descEn: 'Understanding Sharia-compliant finance principles',
    category: 'islamic',
    readTime: 8,
  },
];

export default function LearnPage() {
  const { language, isRTL } = useTranslation();
  const [activeTab, setActiveTab] = useState<'paths' | 'articles' | 'all'>('paths');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const getCategoryInfo = (catId: string) => {
    return categories.find(c => c.id === catId);
  };

  const filteredArticles = selectedCategory 
    ? articles.filter(a => a.category === selectedCategory)
    : articles;

  // Calculate overall progress
  const totalProgress = Math.round(
    learningPaths.reduce((sum, path) => sum + path.progress, 0) / learningPaths.length
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <PageHeader 
        title={language === 'ar' ? 'تعلّم المالية' : 'Learn Finance'}
      />

      <div className="page-container py-6 space-y-6">
        {/* Hero Card with Progress */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-emerald-500/10 -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-blue-500/10 translate-y-1/2 -translate-x-1/2 blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-medium text-slate-400">
                  {language === 'ar' ? 'مركز التعلم' : 'Learning Hub'}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                {language === 'ar' ? 'ابنِ ثقافتك المالية' : 'Build Your Financial Literacy'}
              </h1>
              <p className="text-slate-400 max-w-lg">
                {language === 'ar'
                  ? 'محتوى تعليمي مخصص لمساعدتك في رحلتك نحو الاستقلال المالي'
                  : 'Personalized educational content to help you on your journey to financial independence'}
              </p>
            </div>
            
            {/* Progress Ring */}
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    className="text-white/10"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${totalProgress * 2.26} 226`}
                    strokeLinecap="round"
                    className="text-emerald-400"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold">{totalProgress}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-400">
                  {language === 'ar' ? 'التقدم الإجمالي' : 'Overall Progress'}
                </p>
                <p className="text-lg font-semibold">
                  {language === 'ar' ? 'استمر!' : 'Keep going!'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <section>
          <h2 className="section-title mb-4">
            {language === 'ar' ? 'المواضيع' : 'Topics'}
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(isSelected ? null : cat.id);
                    setActiveTab('articles');
                  }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    isSelected 
                      ? 'bg-[var(--color-primary-muted)] border-[var(--color-primary)]' 
                      : 'bg-[var(--color-bg-card)] border-[var(--color-border-light)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${cat.color}15` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: cat.color }} />
                  </div>
                  <span className="text-xs font-medium text-[var(--color-text-primary)] text-center">
                    {language === 'ar' ? cat.nameAr : cat.nameEn}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Tabs */}
        <div className="tabs">
          <button
            onClick={() => { setActiveTab('paths'); setSelectedCategory(null); }}
            className={`tab ${activeTab === 'paths' ? 'tab-active' : ''}`}
          >
            <GraduationCap className="w-4 h-4" />
            {language === 'ar' ? 'مسارات التعلم' : 'Learning Paths'}
          </button>
          <button
            onClick={() => setActiveTab('articles')}
            className={`tab ${activeTab === 'articles' ? 'tab-active' : ''}`}
          >
            <FileText className="w-4 h-4" />
            {language === 'ar' ? 'المقالات' : 'Articles'}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`tab ${activeTab === 'all' ? 'tab-active' : ''}`}
          >
            <BookOpen className="w-4 h-4" />
            {language === 'ar' ? 'الكل' : 'All Content'}
          </button>
        </div>

        {/* Learning Paths Tab */}
        {activeTab === 'paths' && (
          <div className="space-y-4">
            {learningPaths.map((path, pathIndex) => {
              const PathIcon = path.icon;
              const isLocked = path.locked;
              
              return (
                <div 
                  key={path.id}
                  className={`card ${isLocked ? 'opacity-75' : ''}`}
                  style={{ animationDelay: `${pathIndex * 100}ms` }}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${path.color}15` }}
                    >
                      {isLocked ? (
                        <Lock className="w-6 h-6" style={{ color: path.color }} />
                      ) : (
                        <PathIcon className="w-6 h-6" style={{ color: path.color }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-[var(--color-text-primary)]">
                          {language === 'ar' ? path.titleAr : path.titleEn}
                        </h3>
                        {isLocked && (
                          <span className="badge badge-neutral text-xs">
                            {language === 'ar' ? 'مقفل' : 'Locked'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {language === 'ar' ? path.descAr : path.descEn}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-bold text-[var(--color-text-primary)]">{path.progress}%</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {language === 'ar' ? 'مكتمل' : 'Complete'}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="h-2 bg-[var(--color-bg-inset)] rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${path.progress}%`,
                          backgroundColor: path.color
                        }}
                      />
                    </div>
                  </div>

                  {/* Modules */}
                  <div className="space-y-2">
                    {path.modules.map((module, index) => (
                      <button
                        key={module.id}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                          module.locked 
                            ? 'bg-[var(--color-bg-inset)] opacity-60 cursor-not-allowed'
                            : module.current 
                              ? 'bg-[var(--color-primary-muted)] border border-[var(--color-primary)]'
                              : 'bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-inset)]'
                        }`}
                        disabled={module.locked}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          module.completed 
                            ? 'bg-emerald-500 text-white'
                            : module.current
                              ? 'bg-[var(--color-primary)] text-white'
                              : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                        }`}>
                          {module.completed ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : module.locked ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            <span className="text-sm font-semibold">{index + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 text-start">
                          <p className={`font-medium ${
                            module.completed 
                              ? 'text-[var(--color-text-secondary)]' 
                              : 'text-[var(--color-text-primary)]'
                          }`}>
                            {language === 'ar' ? module.titleAr : module.titleEn}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {module.lessons} {language === 'ar' ? 'دروس' : 'lessons'}
                          </p>
                        </div>
                        {!module.locked && (
                          <ChevronIcon className="w-5 h-5 text-[var(--color-text-muted)]" />
                        )}
                        {module.current && (
                          <span className="badge badge-primary text-xs">
                            {language === 'ar' ? 'الحالي' : 'Current'}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {!isLocked && path.progress < 100 && (
                    <button className="btn btn-primary w-full mt-4">
                      {path.progress > 0 
                        ? (language === 'ar' ? 'استمر في التعلم' : 'Continue Learning')
                        : (language === 'ar' ? 'ابدأ المسار' : 'Start Path')
                      }
                      <ArrowIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Articles Tab */}
        {activeTab === 'articles' && (
          <div className="space-y-3">
            {selectedCategory && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {language === 'ar' ? 'تصفية حسب:' : 'Filtering by:'}{' '}
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {language === 'ar' 
                      ? getCategoryInfo(selectedCategory)?.nameAr 
                      : getCategoryInfo(selectedCategory)?.nameEn
                    }
                  </span>
                </p>
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className="text-sm text-[var(--color-primary)] hover:underline"
                >
                  {language === 'ar' ? 'مسح الفلتر' : 'Clear filter'}
                </button>
              </div>
            )}
            
            {filteredArticles.map((article, index) => {
              const catInfo = getCategoryInfo(article.category);
              return (
                <button
                  key={article.id}
                  className={`w-full card card-interactive ${article.featured ? 'border-[var(--color-gold)]/30' : ''}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${catInfo?.color}15` }}
                    >
                      {catInfo && <catInfo.icon className="w-6 h-6" style={{ color: catInfo.color }} />}
                    </div>
                    <div className="flex-1 min-w-0 text-start">
                      <div className="flex items-center gap-2 mb-1">
                        {article.featured && (
                          <span className="badge badge-warning text-xs">
                            <Sparkles className="w-3 h-3" />
                            {language === 'ar' ? 'مميز' : 'Featured'}
                          </span>
                        )}
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {language === 'ar' ? catInfo?.nameAr : catInfo?.nameEn}
                        </span>
                      </div>
                      <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                        {language === 'ar' ? article.titleAr : article.titleEn}
                      </h3>
                      <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-2">
                        {language === 'ar' ? article.descAr : article.descEn}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                        <Clock className="w-3 h-3" />
                        <span>{article.readTime} {language === 'ar' ? 'دقائق قراءة' : 'min read'}</span>
                      </div>
                    </div>
                    <ChevronIcon className="w-5 h-5 text-[var(--color-text-muted)] flex-shrink-0 self-center" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* All Content Tab */}
        {activeTab === 'all' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="card text-center">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                  <BookOpen className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{articles.length}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {language === 'ar' ? 'مقالات' : 'Articles'}
                </p>
              </div>
              <div className="card text-center">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                  <GraduationCap className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{learningPaths.length}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {language === 'ar' ? 'مسارات' : 'Paths'}
                </p>
              </div>
              <div className="card text-center">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
                  <Award className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">2</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {language === 'ar' ? 'إنجازات' : 'Achievements'}
                </p>
              </div>
              <div className="card text-center">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
                  <PlayCircle className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">0</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {language === 'ar' ? 'فيديوهات' : 'Videos'}
                </p>
              </div>
            </div>

            {/* Coming Soon */}
            <div className="card card-gradient text-center py-8">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="font-bold text-xl mb-2">
                {language === 'ar' ? 'المزيد قادم قريباً' : 'More Content Coming Soon'}
              </h3>
              <p className="text-slate-400 max-w-md mx-auto">
                {language === 'ar'
                  ? 'نعمل على إضافة المزيد من المحتوى التعليمي والفيديوهات والدورات التفاعلية'
                  : 'We are working on adding more educational content, videos, and interactive courses'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

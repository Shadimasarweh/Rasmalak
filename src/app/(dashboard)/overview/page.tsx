'use client';

import Link from 'next/link';
import { 
  Plus, 
  ArrowLeft, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown,
  Wallet,
  Target,
  GraduationCap,
  MessageSquareText,
  Calculator,
  ChevronRight,
  ChevronLeft,
  Receipt,
} from 'lucide-react';
import { OverviewTransactionRow } from '@/components';
import { useTransactions, useCurrency } from '@/store/useStore';
import { formatCurrency, getCurrentMonthTransactions } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

export default function OverviewPage() {
  const { t, language, isRTL } = useTranslation();
  const transactions = useTransactions();
  const currency = useCurrency();

  const currentMonthTransactions = getCurrentMonthTransactions(transactions);

  const totalIncome = currentMonthTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpenses = currentMonthTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;
  const recentTransactions = transactions.slice(0, 5);
  
  const ViewAllArrow = isRTL ? ChevronLeft : ChevronRight;

  // Quick action cards
  const quickActions = [
    {
      id: 'transactions',
      href: '/transactions',
      icon: Receipt,
      label: language === 'ar' ? 'المعاملات' : 'Transactions',
      color: 'var(--color-primary)',
      bg: 'var(--color-primary-muted)',
    },
    {
      id: 'learn',
      href: '/learn',
      icon: GraduationCap,
      label: language === 'ar' ? 'تعلّم' : 'Learn',
      color: 'var(--color-info)',
      bg: 'var(--color-info-bg)',
    },
    {
      id: 'advisor',
      href: '/chat',
      icon: MessageSquareText,
      label: language === 'ar' ? 'المستشار' : 'Advisor',
      color: 'var(--color-gold)',
      bg: 'var(--color-gold-muted)',
    },
    {
      id: 'tools',
      href: '/calculators',
      icon: Calculator,
      label: language === 'ar' ? 'الأدوات' : 'Tools',
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.1)',
    },
  ];

  return (
    <div className="w-full min-h-screen bg-[var(--color-bg-primary)]">
      {/* Hero Section - Welcome Banner */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-white">
        <div className="page-container py-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">
                {language === 'ar' ? 'مرحباً بك في' : 'Welcome to'}
              </p>
              <h1 className="text-2xl font-bold mb-2">
                Rasmalak <span className="text-[var(--color-primary)]">AI</span>
              </h1>
              <p className="text-slate-400 text-sm max-w-md">
                {language === 'ar' 
                  ? 'منصتك الذكية للتثقيف المالي وإدارة الميزانية'
                  : 'Your intelligent platform for financial literacy and budgeting'
                }
              </p>
            </div>
            <Link 
              href="/transactions/new" 
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">
                {language === 'ar' ? 'معاملة جديدة' : 'New Transaction'}
              </span>
            </Link>
          </div>

          {/* Balance Card */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Main Balance */}
            <div className="md:col-span-2 bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-[var(--color-primary)]" />
                </div>
                <span className="text-slate-400 text-sm font-medium">
                  {language === 'ar' ? 'الرصيد الحالي' : 'Current Balance'}
                </span>
              </div>
              <p className={`text-3xl font-bold ltr-nums ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>
                {formatCurrency(balance, currency)}
              </p>
              
              {/* Income / Expenses */}
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">{language === 'ar' ? 'الدخل' : 'Income'}</p>
                    <p className="text-sm font-semibold text-emerald-400 ltr-nums">
                      {formatCurrency(totalIncome, currency)}
                    </p>
                  </div>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">{language === 'ar' ? 'المصاريف' : 'Expenses'}</p>
                    <p className="text-sm font-semibold text-red-400 ltr-nums">
                      {formatCurrency(totalExpenses, currency)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Savings Rate */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-gold)]/20 flex items-center justify-center">
                  <Target className="w-4 h-4 text-[var(--color-gold)]" />
                </div>
                <span className="text-slate-400 text-sm font-medium">
                  {language === 'ar' ? 'معدل الادخار' : 'Savings Rate'}
                </span>
              </div>
              <p className="text-3xl font-bold text-white ltr-nums">
                {savingsRate}%
              </p>
              <div className="mt-4">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(Math.max(savingsRate, 0), 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {language === 'ar' ? 'الهدف: 20%' : 'Target: 20%'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="page-container py-6 space-y-6">
        
        {/* Quick Actions */}
        <section>
          <div className="section-header">
            <h2 className="section-title">
              {language === 'ar' ? 'الوصول السريع' : 'Quick Access'}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.id}
                  href={action.href}
                  className="card card-interactive flex items-center gap-3 p-4"
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: action.bg }}
                  >
                    <Icon className="w-5 h-5" style={{ color: action.color }} />
                  </div>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {action.label}
                  </span>
                  <ViewAllArrow className="w-4 h-4 text-[var(--color-text-muted)] ml-auto" />
                </Link>
              );
            })}
          </div>
        </section>

        {/* Recent Transactions */}
        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">
              {language === 'ar' ? 'آخر المعاملات' : 'Recent Transactions'}
            </h2>
            {recentTransactions.length > 0 && (
              <Link 
                href="/transactions" 
                className="section-link"
              >
                {language === 'ar' ? 'عرض الكل' : 'View All'}
                <ViewAllArrow className="w-4 h-4" />
              </Link>
            )}
          </div>

          {recentTransactions.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon">
                <Wallet className="w-12 h-12" />
              </div>
              <p className="empty-state-title">
                {language === 'ar' ? 'لا توجد معاملات' : 'No transactions yet'}
              </p>
              <p className="empty-state-desc">
                {language === 'ar' 
                  ? 'ابدأ بإضافة أول معاملة لتتبع مصاريفك'
                  : 'Start by adding your first transaction to track your expenses'
                }
              </p>
              <Link href="/transactions/new" className="btn btn-primary">
                <Plus className="w-4 h-4" />
                {language === 'ar' ? 'إضافة معاملة' : 'Add Transaction'}
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {recentTransactions.map((transaction) => (
                <OverviewTransactionRow
                  key={transaction.id}
                  category={transaction.category}
                  description={transaction.description}
                  date={transaction.date}
                  amount={transaction.amount}
                  type={transaction.type}
                />
              ))}
            </div>
          )}
        </section>

        {/* Learning Progress Teaser */}
        <section className="card bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-secondary)]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-info-bg)] flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6 text-[var(--color-info)]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                {language === 'ar' ? 'ابدأ رحلة التعلم المالي' : 'Start Your Financial Learning Journey'}
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                {language === 'ar'
                  ? 'تعلم أساسيات إدارة المال والادخار والاستثمار'
                  : 'Learn the basics of money management, saving, and investing'
                }
              </p>
              <Link href="/learn" className="btn btn-sm btn-outline">
                {language === 'ar' ? 'استكشف الدورات' : 'Explore Courses'}
                <ViewAllArrow className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* AI Advisor Teaser */}
        <section className="card border-[var(--color-gold)]/20 bg-gradient-to-br from-[var(--color-gold-muted)] to-transparent">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-gold)]/20 flex items-center justify-center flex-shrink-0">
              <MessageSquareText className="w-6 h-6 text-[var(--color-gold)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-[var(--color-text-primary)]">
                  {language === 'ar' ? 'المستشار المالي الذكي' : 'AI Financial Advisor'}
                </h3>
                <span className="badge badge-warning text-xs">
                  {language === 'ar' ? 'قريباً' : 'Coming Soon'}
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                {language === 'ar'
                  ? 'احصل على نصائح مالية مخصصة باستخدام الذكاء الاصطناعي'
                  : 'Get personalized financial advice powered by AI'
                }
              </p>
              <Link href="/chat" className="btn btn-sm btn-gold">
                {language === 'ar' ? 'تعرف أكثر' : 'Learn More'}
                <ViewAllArrow className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

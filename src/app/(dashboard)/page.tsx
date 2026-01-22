'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Plus, ArrowUpRight, ArrowDownRight, Search, X, Edit2, Trash2, Wallet, TrendingUp, TrendingDown, Target, AlertTriangle, Settings2, PiggyBank, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransactions, useCurrency, useBaseCurrency, useStore, useMonthlyBudget } from '@/store/useStore';
import { Transaction } from '@/types';
import { calculateStats, getCurrentMonthTransactions, groupByCategory, getCategoryById, convertCurrency } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { CURRENCIES } from '@/lib/constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// Locale-aware currency formatting
function formatAmount(amount: number, currencyCode: string, language: string): string {
  const locale = language === 'ar' ? 'ar-SA' : 'en-US';
  const currencyInfo = CURRENCIES.find(c => c.code === currencyCode);
  
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  const symbol = language === 'ar' ? currencyInfo?.symbolAr : currencyInfo?.symbol;
  return `${formatted} ${symbol || currencyCode}`;
}

// Compact number formatter
function formatCompact(amount: number, language: string): string {
  const locale = language === 'ar' ? 'ar-SA' : 'en-US';
  if (Math.abs(amount) >= 1000000) {
    return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(amount);
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount);
}

// KPI Card component - Premium glass style with animations
function KPICard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color,
  currency,
  language,
  delay = 0,
}: { 
  title: string; 
  value: number; 
  change: number; 
  icon: React.ComponentType<{ className?: string }>; 
  color: 'primary' | 'success' | 'danger';
  currency: string;
  language: string;
  delay?: number;
}) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const iconColors = {
    primary: 'from-indigo-500 to-indigo-600',
    success: 'from-emerald-500 to-emerald-600',
    danger: 'from-rose-500 to-rose-600',
  };

  const glowColors = {
    primary: 'shadow-indigo-500/20',
    success: 'shadow-emerald-500/20',
    danger: 'shadow-rose-500/20',
  };
  
  return (
    <div 
      className={`
        relative overflow-hidden
        bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm
        rounded-2xl border border-white/50 dark:border-slate-700/50
        p-5 transition-all duration-300 ease-out
        hover:shadow-lg hover:-translate-y-1
        ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${iconColors[color]} flex items-center justify-center shadow-lg ${glowColors[color]}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          {change !== 0 && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
              change > 0 
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' 
                : 'bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
            }`}>
              {change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
        <p className="text-2xl font-bold text-[var(--color-text-primary)] ltr-nums mb-0.5 tracking-tight">
          {formatAmount(value, currency, language)}
        </p>
        <p className="text-sm text-[var(--color-text-muted)] font-medium">{title}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { t, language, isRTL } = useTranslation();
  const transactions = useTransactions();
  const currency = useCurrency();
  const baseCurrency = useBaseCurrency();
  const deleteTransaction = useStore((state) => state.deleteTransaction);
  const monthlyBudget = useMonthlyBudget();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const currentMonthTransactions = getCurrentMonthTransactions(transactions);
  const stats = calculateStats(currentMonthTransactions, currency, baseCurrency);
  const expensesByCategory = groupByCategory(currentMonthTransactions, 'expense', currency, baseCurrency);
  const topCategories = expensesByCategory.slice(0, 5);
  const recentTransactions = transactions.slice(0, 6);

  // Budget calculations
  const budgetProgress = monthlyBudget > 0 ? Math.min((stats.totalExpenses / monthlyBudget) * 100, 100) : 0;
  const budgetRemaining = monthlyBudget - stats.totalExpenses;
  const isOverBudget = stats.totalExpenses > monthlyBudget && monthlyBudget > 0;
  const isNearBudget = budgetProgress >= 80 && budgetProgress < 100;

  // Calculate previous month for comparison
  const previousMonthTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return date >= prevMonth && date <= prevMonthEnd;
  });
  const prevStats = calculateStats(previousMonthTransactions, currency, baseCurrency);

  // Calculate percentage changes
  const incomeChange = prevStats.totalIncome > 0 
    ? ((stats.totalIncome - prevStats.totalIncome) / prevStats.totalIncome) * 100 
    : 0;
  const expenseChange = prevStats.totalExpenses > 0 
    ? ((stats.totalExpenses - prevStats.totalExpenses) / prevStats.totalExpenses) * 100 
    : 0;
  const balanceChange = prevStats.balance !== 0 
    ? ((stats.balance - prevStats.balance) / Math.abs(prevStats.balance)) * 100 
    : 0;

  const ViewAllArrow = isRTL ? ArrowLeft : ArrowRight;

  // Locale-aware date formatting
  const formatDate = (dateStr: string) => {
    const locale = language === 'ar' ? 'ar-SA' : 'en-US';
    return new Date(dateStr).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
    });
  };

  // Get current month name
  const getMonthName = () => {
    const now = new Date();
    const locale = language === 'ar' ? 'ar-SA' : 'en-US';
    return now.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  };

  // Prepare chart data
  const chartData = expensesByCategory.slice(0, 5).map((cat, index) => {
    const category = getCategoryById(cat.name);
    const defaultColors = ['#14452F', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];
    return {
      name: language === 'ar' ? (category?.nameAr || cat.name) : (category?.name || cat.name),
      value: cat.value,
      color: cat.color || category?.color || defaultColors[index % defaultColors.length],
    };
  });

  const chartTotal = chartData.reduce((sum, c) => sum + c.value, 0);

  // Render tooltip content (not a component to avoid re-creation)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = (props: any) => {
    const { active, payload } = props;
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-lg text-sm">
          <p className="font-medium text-[var(--color-text-primary)]">{data.name}</p>
          <p className="font-bold text-[var(--color-text-secondary)]">{formatAmount(data.value, currency, language)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen">
      {/* Premium Hero Section */}
      <div className="relative overflow-hidden">
        {/* Gradient Background */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e293b 100%)',
          }}
        />
        
        {/* Mesh gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-30 blur-3xl animate-pulse"
            style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, transparent 70%)' }}
          />
          <div 
            className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, transparent 70%)' }}
          />
        </div>

        <div className="relative page-container">
          {/* Hero Content */}
          <div className="pt-8 pb-28">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
              {/* Greeting & Date */}
              <div className="animate-fade-in-up">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-400/90 text-sm font-medium">
                    {language === 'ar' ? 'مرحباً بك' : 'Welcome back'}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  {language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                </h1>
                <p className="text-slate-400 mt-2 text-base">{getMonthName()}</p>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-80 animate-fade-in" style={{ animationDelay: '100ms' }}>
                <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'ابحث...' : 'Search transactions...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ${isRTL ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3 bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-white/15 transition-all duration-200`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards - Floating on Hero */}
      <div className="page-container -mt-20 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <KPICard
            title={t.dashboard.balance}
            value={stats.balance}
            change={balanceChange}
            icon={Wallet}
            color="primary"
            currency={currency}
            language={language}
            delay={0}
          />
          <KPICard
            title={t.dashboard.income}
            value={stats.totalIncome}
            change={incomeChange}
            icon={TrendingUp}
            color="success"
            currency={currency}
            language={language}
            delay={100}
          />
          <KPICard
            title={t.dashboard.expenses}
            value={stats.totalExpenses}
            change={expenseChange}
            icon={TrendingDown}
            color="danger"
            currency={currency}
            language={language}
            delay={200}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="page-container pb-6">

        {/* Budget Progress Card */}
        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isOverBudget 
                    ? 'bg-red-500/10' 
                    : isNearBudget 
                      ? 'bg-amber-500/10' 
                      : 'bg-indigo-500/10'
                }`}>
                  {isOverBudget ? (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  ) : (
                    <Target className="w-5 h-5 text-indigo-500" />
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--color-text-primary)]">
                    {language === 'ar' ? 'ميزانية الشهر' : 'Monthly Budget'}
                  </h2>
                  {monthlyBudget > 0 && (
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {language === 'ar' 
                        ? `${budgetProgress.toFixed(0)}% مستخدم`
                        : `${budgetProgress.toFixed(0)}% used`
                      }
                    </p>
                  )}
                </div>
              </div>
              <button 
                onClick={() => router.push('/budget')}
                className="btn btn-sm btn-secondary"
              >
                <Settings2 className="w-4 h-4" />
                {monthlyBudget > 0 
                  ? (language === 'ar' ? 'تعديل' : 'Edit')
                  : (language === 'ar' ? 'تعيين ميزانية' : 'Set Budget')
                }
              </button>
            </div>

            {monthlyBudget > 0 ? (
              <>
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="h-3 bg-[var(--color-bg-inset)] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOverBudget 
                          ? 'bg-red-500' 
                          : isNearBudget 
                            ? 'bg-amber-500' 
                            : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.min(budgetProgress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Budget Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">
                      {language === 'ar' ? 'الميزانية' : 'Budget'}
                    </p>
                    <p className="text-lg font-bold text-[var(--color-text-primary)] ltr-nums">
                      {formatAmount(monthlyBudget, currency, language)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">
                      {language === 'ar' ? 'المصروف' : 'Spent'}
                    </p>
                    <p className="text-lg font-bold text-[var(--color-text-primary)] ltr-nums">
                      {formatAmount(stats.totalExpenses, currency, language)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">
                      {language === 'ar' ? 'المتبقي' : 'Remaining'}
                    </p>
                    <p className={`text-lg font-bold ltr-nums ${
                      budgetRemaining >= 0 ? 'text-emerald-500' : 'text-red-500'
                    }`}>
                      {formatAmount(Math.abs(budgetRemaining), currency, language)}
                      {budgetRemaining < 0 && ` (${language === 'ar' ? 'تجاوز' : 'over'})`}
                    </p>
                  </div>
                </div>

                {/* Alert Message */}
                {isOverBudget && (
                  <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 text-red-500">
                      <AlertTriangle className="w-4 h-4" />
                      <p className="text-sm font-medium">
                        {language === 'ar' 
                          ? 'تجاوزت ميزانيتك الشهرية!'
                          : 'You have exceeded your monthly budget!'
                        }
                      </p>
                    </div>
                  </div>
                )}
                {isNearBudget && !isOverBudget && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2 text-amber-500">
                      <AlertTriangle className="w-4 h-4" />
                      <p className="text-sm font-medium">
                        {language === 'ar' 
                          ? 'أنت قريب من حد ميزانيتك'
                          : 'You are approaching your budget limit'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <PiggyBank className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
                <p className="text-sm text-[var(--color-text-muted)] mb-1">
                  {language === 'ar' 
                    ? 'لم يتم تعيين ميزانية بعد'
                    : 'No budget set yet'
                  }
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {language === 'ar' 
                    ? 'حدد ميزانية شهرية لتتبع إنفاقك'
                    : 'Set a monthly budget to track your spending'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Main Grid: 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Recent Transactions */}
          <div className="lg:col-span-7 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
              {/* Card Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-light)]">
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                  {t.dashboard.recentTransactions}
                </h2>
                {recentTransactions.length > 0 && (
                  <Link
                    href="/transactions"
                    className="text-sm font-medium text-[var(--color-primary)] hover:underline flex items-center gap-1"
                  >
                    {t.dashboard.viewAll}
                    <ViewAllArrow className="w-4 h-4" />
                  </Link>
                )}
              </div>

              {/* Transactions List */}
              {recentTransactions.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-14 h-14 bg-[var(--color-bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet className="w-6 h-6 text-[var(--color-text-muted)]" />
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)] mb-4">{t.dashboard.noTransactions}</p>
                  <Link href="/transactions/new" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
                    <Plus className="w-4 h-4" />
                    {t.transactions.addTransaction}
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-border-light)]">
                  {recentTransactions.map((transaction) => {
                    const category = getCategoryById(transaction.category);
                    const categoryColor = category?.color || '#64748b';
                    return (
                      <button
                        key={transaction.id}
                        onClick={() => setSelectedTransaction(transaction)}
                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[var(--color-bg-secondary)] transition-colors text-start"
                      >
                        {/* Icon */}
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: categoryColor + '15' }}
                        >
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: categoryColor }}
                          />
                        </div>
                        
                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                            {language === 'ar' ? category?.nameAr : category?.name || transaction.category}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                            {formatDate(transaction.date)}
                          </p>
                        </div>
                        
                        {/* Amount */}
                        <p className={`text-sm font-semibold ltr-nums shrink-0 ${
                          transaction.type === 'income' 
                            ? 'text-[var(--color-success)]' 
                            : 'text-[var(--color-text-primary)]'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatAmount(
                            convertCurrency(transaction.amount, transaction.currency || baseCurrency, currency),
                            currency,
                            language
                          )}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Charts */}
          <div className="lg:col-span-5 space-y-6 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
            {/* Top Spending Bar Chart */}
            <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
                {language === 'ar' ? 'أعلى المصاريف' : 'Top Spending'}
              </h2>

              {topCategories.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {language === 'ar' ? 'لا توجد مصاريف هذا الشهر' : 'No expenses this month'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topCategories.map((cat, index) => {
                    const category = getCategoryById(cat.name);
                    const displayName = language === 'ar' 
                      ? (category?.nameAr || cat.name) 
                      : (category?.name || cat.name);
                    const categoryColor = cat.color || category?.color || '#14452F';
                    const percentage = chartTotal > 0 ? (cat.value / chartTotal) * 100 : 0;
                    
                    return (
                      <div key={index}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: categoryColor }}
                            />
                            <span className="font-medium text-[var(--color-text-secondary)] truncate">{displayName}</span>
                          </div>
                          <span className="font-semibold text-[var(--color-text-primary)] ltr-nums shrink-0">
                            {formatAmount(cat.value, currency, language)}
                          </span>
                        </div>
                        <div className="h-2 bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: categoryColor 
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Expense Breakdown Donut */}
            <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
                {language === 'ar' ? 'توزيع المصاريف' : 'Expense Breakdown'}
              </h2>

              {expensesByCategory.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-20 h-20 rounded-full border-4 border-[var(--color-border-light)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {language === 'ar' ? 'لا توجد مصاريف' : 'No expenses'}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  {/* Donut Chart */}
                  <div className="relative w-32 h-32 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={55}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={renderTooltip} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <span className="text-xs font-bold text-[var(--color-text-primary)] ltr-nums">
                          {formatCompact(chartTotal, language)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex-1 space-y-2 min-w-0">
                    {chartData.slice(0, 4).map((cat, index) => {
                      const percentage = chartTotal > 0 ? (cat.value / chartTotal) * 100 : 0;
                      return (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-[var(--color-text-secondary)] truncate flex-1">{cat.name}</span>
                          <span className="text-[var(--color-text-muted)] text-xs shrink-0">{percentage.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button - Premium style */}
      <Link
        href="/transactions/new"
        className="hidden lg:flex fixed bottom-8 end-8 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white items-center justify-center shadow-xl shadow-indigo-500/25 hover:shadow-2xl hover:shadow-indigo-500/30 transition-all duration-300 hover:scale-105 active:scale-95 z-50"
        aria-label={t.transactions.addTransaction}
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </Link>

      {/* Transaction Action Modal */}
      {selectedTransaction && !showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[var(--color-overlay)]" 
          onClick={() => setSelectedTransaction(null)}
        >
          <div
            className="w-full sm:max-w-md bg-[var(--color-bg-card)] rounded-t-lg sm:rounded-lg p-6 mx-0 sm:mx-4 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Transaction Details */}
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[var(--color-border-light)]">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: (getCategoryById(selectedTransaction.category)?.color || '#64748b') + '15' }}
              >
                <div 
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: getCategoryById(selectedTransaction.category)?.color || '#64748b' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {language === 'ar' 
                    ? getCategoryById(selectedTransaction.category)?.nameAr 
                    : getCategoryById(selectedTransaction.category)?.name || selectedTransaction.category}
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {new Date(selectedTransaction.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <p className={`text-xl font-bold ltr-nums ${
                selectedTransaction.type === 'income' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
              }`}>
                {selectedTransaction.type === 'income' ? '+' : '-'}{formatAmount(
                  convertCurrency(selectedTransaction.amount, selectedTransaction.currency || baseCurrency, currency),
                  currency,
                  language
                )}
              </p>
            </div>

            {selectedTransaction.description && (
              <p className="text-sm text-[var(--color-text-secondary)] mb-6">{selectedTransaction.description}</p>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <Link
                href={`/transactions/new?edit=${selectedTransaction.id}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] font-medium rounded-lg hover:bg-[var(--color-bg-primary)] transition-colors"
                onClick={() => setSelectedTransaction(null)}
              >
                <Edit2 className="w-4 h-4" />
                {language === 'ar' ? 'تعديل' : 'Edit'}
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-danger-bg)] text-[var(--color-danger)] font-medium rounded-lg hover:opacity-80 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
                {language === 'ar' ? 'حذف' : 'Delete'}
              </button>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="w-full px-4 py-3 text-[var(--color-text-muted)] font-medium hover:text-[var(--color-text-secondary)] transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {selectedTransaction && showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)]" 
          onClick={() => { setShowDeleteConfirm(false); setSelectedTransaction(null); }}
        >
          <div
            className="w-full max-w-sm bg-[var(--color-bg-card)] rounded-lg p-6 mx-4 animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-[var(--color-danger-bg)] flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-[var(--color-danger)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
                {language === 'ar' ? 'حذف المعاملة؟' : 'Delete Transaction?'}
              </h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                {language === 'ar' ? 'لا يمكن التراجع عن هذا الإجراء.' : 'This action cannot be undone.'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setSelectedTransaction(null); }}
                className="flex-1 px-4 py-2.5 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] font-medium rounded-lg hover:bg-[var(--color-bg-primary)] transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  deleteTransaction(selectedTransaction.id);
                  setShowDeleteConfirm(false);
                  setSelectedTransaction(null);
                }}
                className="flex-1 px-4 py-2.5 bg-[var(--color-danger)] text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                {language === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Plus, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Search, X } from 'lucide-react';
import { useTransactions, useCurrency } from '@/store/useStore';
import { calculateStats, getCurrentMonthTransactions, groupByCategory, getCategoryById } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { CURRENCIES } from '@/lib/constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// Locale-aware currency formatting
function formatAmount(amount: number, currencyCode: string, language: string): string {
  const locale = language === 'ar' ? 'ar-SA' : 'en-US';
  const currency = CURRENCIES.find(c => c.code === currencyCode);
  
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  const symbol = language === 'ar' ? currency?.symbolAr : currency?.symbol;
  return `${formatted} ${symbol || currencyCode}`;
}

export default function HomePage() {
  const { t, language, isRTL } = useTranslation();
  const transactions = useTransactions();
  const currency = useCurrency();
  const [searchQuery, setSearchQuery] = useState('');

  const currentMonthTransactions = getCurrentMonthTransactions(transactions);
  const stats = calculateStats(currentMonthTransactions);
  const expensesByCategory = groupByCategory(currentMonthTransactions, 'expense');
  const topCategories = expensesByCategory.slice(0, 3);
  const recentTransactions = transactions.slice(0, 5);

  // Calculate previous month for comparison
  const previousMonthTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return date >= prevMonth && date <= prevMonthEnd;
  });
  const prevStats = calculateStats(previousMonthTransactions);

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

  // Format current date elegantly
  const getCurrentDate = () => {
    const now = new Date();
    const locale = language === 'ar' ? 'ar-SA' : 'en-US';
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return now.toLocaleDateString(locale, options);
  };

  // Get current month name for summary
  const getMonthSummaryText = () => {
    const now = new Date();
    const locale = language === 'ar' ? 'ar-SA' : 'en-US';
    const monthName = now.toLocaleDateString(locale, { month: 'long' });
    if (language === 'ar') {
      return `ملخص ${monthName}`;
    }
    return `${monthName} Summary`;
  };

  // Prepare chart data with proper colors
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

  // Custom tooltip for recharts
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl px-4 py-3 shadow-lg">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{data.name}</p>
          <p className="text-sm font-bold" style={{ color: data.payload.color }}>
            {formatAmount(data.value, currency, language)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full pb-24">
      {/* Calm Fintech Header Banner (less busy) */}
      <div className="w-full relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-[#F0E2CA]" />

        {/* Subtle top gold accent */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-gold)]/80 to-transparent" />

        {/* Soft glass veil (reduced) */}
        <div className="absolute inset-0 bg-white/25 backdrop-blur-[1px]" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-10 pb-10 lg:pt-12 lg:pb-12">
          {/* Top row: Title + Search */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Dashboard Title & Date */}
            <div className="space-y-1">
              <h1 className="text-3xl lg:text-4xl font-bold text-[#2C1810] tracking-tight">
                {isRTL ? 'لوحة التحكم' : 'Dashboard'}
              </h1>
              <p className="text-sm text-[#6B5D47] font-medium">{getCurrentDate()}</p>
              <p className="text-sm text-[#6B5D47] font-semibold">{getMonthSummaryText()}</p>
            </div>

            {/* Right: Search Bar */}
            <div className="flex items-center flex-1 max-w-md lg:justify-end">
              <div className="relative w-full">
                <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B5D47] pointer-events-none`} />
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'ابحث...' : 'Search...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-2.5 bg-white/70 border border-[#D4C4A8]/60 rounded-xl text-sm text-[#2C1810] placeholder:text-[#8B6F47]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/30 focus:border-[var(--color-gold)] focus:bg-white/90 transition-all shadow-sm`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B5D47] hover:text-[#2C1810] transition-colors`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom decorative border */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--color-gold)]/25 to-transparent" />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 mt-10 space-y-10">
        
        {/* Row 1: Balance Card + Top Categories side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Balance Card - 5 columns */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary-dark)] to-[var(--color-primary)] rounded-2xl p-8 lg:p-10 relative overflow-hidden shadow-xl text-white">
            {/* Single controlled glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.07] rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            
            {/* Thin gold top accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent opacity-60" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-white/80 tracking-wide uppercase">{t.dashboard.balance}</p>
              </div>
              
              <p className="text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight mb-3 break-words">
                {formatAmount(stats.balance, currency, language)}
              </p>

              {/* Micro-trend row */}
              {balanceChange !== 0 && (
                <div className="flex items-center gap-2 mb-8">
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${balanceChange > 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                    {balanceChange > 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-300" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-300" />
                    )}
                    <span className="text-xs font-semibold text-white">
                      {balanceChange > 0 ? '+' : ''}{balanceChange.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-xs text-white/60">
                    {isRTL ? 'مقارنة بالشهر الماضي' : 'vs last month'}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-6 pt-6 border-t border-white/10">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">{t.dashboard.income}</p>
                  </div>
                  <p className="text-xl lg:text-2xl font-bold tracking-tight truncate">
                    {formatAmount(stats.totalIncome, currency, language)}
                  </p>
                </div>
                
                <div className="w-px h-14 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]" />
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">{t.dashboard.expenses}</p>
                  </div>
                  <p className="text-xl lg:text-2xl font-bold tracking-tight truncate">
                    {formatAmount(stats.totalExpenses, currency, language)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Spending Categories - 7 columns */}
          <div className="lg:col-span-7 flex flex-col">
            {/* Section Header */}
            <div className="section-header">
              <h2 className="section-title">
                {isRTL ? 'أعلى المصاريف' : 'Top Spending Categories'}
              </h2>
            </div>

            {topCategories.length === 0 ? (
              <div className="flex-1 bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-[var(--color-bg-secondary)] rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl opacity-40">📊</span>
                </div>
                <p className="text-sm font-medium text-[var(--color-text-muted)]">
                  {isRTL ? 'لا توجد مصاريف هذا الشهر' : 'No expenses this month'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                {topCategories.map((cat, index) => {
                  const category = getCategoryById(cat.name);
                  const displayName = language === 'ar' 
                    ? (category?.nameAr || cat.name) 
                    : (category?.name || cat.name);
                  const categoryColor = cat.color || category?.color || '#64748b';
                  const percentage = expensesByCategory.length > 0 
                    ? (cat.value / expensesByCategory.reduce((sum, c) => sum + c.value, 0)) * 100 
                    : 0;
                  
                  return (
                    <div
                      key={index}
                      className="group bg-[var(--color-bg-card)] border border-[var(--color-border-light)] hover:border-[var(--color-primary)]/20 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 rounded-2xl p-6 flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110"
                          style={{ backgroundColor: categoryColor + '15' }}
                        >
                          <div 
                            className="w-4 h-4 rounded-full shadow-sm" 
                            style={{ backgroundColor: categoryColor }} 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="block text-xs font-semibold text-[var(--color-text-muted)] truncate uppercase tracking-wider">
                          {displayName}
                        </span>
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight truncate">
                            {formatAmount(cat.value, currency, language)}
                          </p>
                          <span className="text-sm font-semibold text-[var(--color-text-muted)] tabular-nums flex-shrink-0">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: categoryColor 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Recent Transactions + Pie Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Recent Transactions - 7 columns */}
          <div className="lg:col-span-7 bg-[var(--color-bg-card)] border border-[var(--color-border-light)] shadow-sm rounded-2xl p-6 lg:p-8">
            {/* Section Header */}
            <div className="section-header">
              <h2 className="section-title">
                {t.dashboard.recentTransactions}
              </h2>
              {recentTransactions.length > 0 && (
                <Link
                  href="/transactions"
                  className="section-link"
                >
                  {t.dashboard.viewAll}
                  <ViewAllArrow className="w-4 h-4" />
                </Link>
              )}
            </div>

            {recentTransactions.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-20 h-20 bg-[var(--color-bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl opacity-30">🧾</span>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] mb-4">
                  {t.dashboard.noTransactions}
                </p>
                <Link href="/transactions/new" className="btn btn-primary btn-sm inline-flex">
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
                    <div
                      key={transaction.id}
                      className="group flex items-center justify-between py-4 hover:bg-[var(--color-bg-secondary)] transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform"
                          style={{ backgroundColor: categoryColor + '15' }}
                        >
                          <div 
                            className="w-3 h-3 rounded-full shadow-sm"
                            style={{ backgroundColor: categoryColor }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                            {language === 'ar' ? category?.nameAr : category?.name || transaction.category}
                          </p>
                          <p className="text-xs font-medium text-[var(--color-text-muted)] mt-0.5">
                            {formatDate(transaction.date)}
                          </p>
                        </div>
                      </div>
                      <p className={`text-base font-bold tracking-tight flex-shrink-0 ml-4 ltr-nums ${
                        transaction.type === 'income' 
                          ? 'text-[var(--color-success)]' 
                          : 'text-[var(--color-text-primary)]'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'} {formatAmount(transaction.amount, currency, language)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expenses Pie Chart - 5 columns */}
          <div className="lg:col-span-5 bg-[var(--color-bg-card)] border border-[var(--color-border-light)] shadow-sm rounded-2xl p-6 lg:p-8 flex flex-col">
            {/* Section Header */}
            <div className="section-header">
              <h2 className="section-title">
                {isRTL ? 'توزيع المصاريف' : 'Expense Breakdown'}
              </h2>
            </div>

            {expensesByCategory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <div className="w-32 h-32 rounded-full border-8 border-[var(--color-bg-secondary)] mb-4 opacity-30" />
                <p className="text-sm text-[var(--color-text-muted)]">
                  {isRTL ? 'لا توجد مصاريف لعرضها' : 'No expenses to display'}
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center">
                {/* Recharts Donut */}
                <div className="relative w-48 h-48 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Label for Donut */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest block">
                        {isRTL ? 'المجموع' : 'Total'}
                      </span>
                      <span className="text-sm font-bold text-[var(--color-text-primary)] ltr-nums">
                        {formatAmount(chartTotal, currency, language)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="w-full space-y-2">
                  {chartData.map((cat, index) => {
                    const percentage = chartTotal > 0 ? (cat.value / chartTotal) * 100 : 0;
                    
                    return (
                      <div 
                        key={index} 
                        className="flex items-center justify-between group p-2.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full shadow-sm ring-2 ring-white flex-shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-sm font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors truncate">
                            {cat.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums">
                            {percentage.toFixed(0)}%
                          </span>
                          <span className="text-sm font-bold text-[var(--color-text-primary)] tabular-nums ltr-nums">
                            {formatAmount(cat.value, currency, language)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button - Fintech Glass Style */}
      <Link
        href="/transactions/new"
        className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 w-14 h-14 rounded-full bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-dark)] flex items-center justify-center shadow-xl hover:shadow-2xl transition-all hover:scale-110 z-50 ring-4 ring-white/30"
        style={{ color: '#2C1810' }}
        aria-label={t.transactions.addTransaction}
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </Link>
    </div>
  );
}

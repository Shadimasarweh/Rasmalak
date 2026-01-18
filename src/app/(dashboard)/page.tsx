'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Plus, ArrowUpRight, ArrowDownRight, Search, X, Edit2, Trash2, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { useTransactions, useCurrency, useBaseCurrency, useStore } from '@/store/useStore';
import { Transaction } from '@/types';
import { calculateStats, getCurrentMonthTransactions, groupByCategory, getCategoryById, convertCurrency } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { CURRENCIES } from '@/lib/constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

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

// Compact number formatter
function formatCompact(amount: number, language: string): string {
  const locale = language === 'ar' ? 'ar-SA' : 'en-US';
  if (Math.abs(amount) >= 1000000) {
    return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(amount);
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount);
}

export default function HomePage() {
  const { t, language, isRTL } = useTranslation();
  const transactions = useTransactions();
  const currency = useCurrency();
  const baseCurrency = useBaseCurrency();
  const deleteTransaction = useStore((state) => state.deleteTransaction);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const currentMonthTransactions = getCurrentMonthTransactions(transactions);
  const stats = calculateStats(currentMonthTransactions, currency, baseCurrency);
  const expensesByCategory = groupByCategory(currentMonthTransactions, 'expense', currency, baseCurrency);
  const topCategories = expensesByCategory.slice(0, 5);
  const recentTransactions = transactions.slice(0, 6);

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

  // Bar chart data for top spending
  const barChartData = topCategories.slice(0, 5).map(cat => {
    const category = getCategoryById(cat.name);
    return {
      name: language === 'ar' ? (category?.nameAr || cat.name) : (category?.name || cat.name),
      amount: cat.value,
      fill: cat.color || category?.color || '#14452F',
    };
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) => {
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

  // KPI Card component
  const KPICard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    color 
  }: { 
    title: string; 
    value: number; 
    change: number; 
    icon: React.ComponentType<{ className?: string }>; 
    color: 'primary' | 'success' | 'danger';
  }) => {
    const colorClasses = {
      primary: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
      success: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
      danger: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]',
    };
    const borderColors = {
      primary: 'border-[var(--color-primary)]/20',
      success: 'border-[var(--color-success)]/20',
      danger: 'border-[var(--color-danger)]/20',
    };
    
    return (
      <div className={`bg-[var(--color-bg-card)] rounded-xl border ${borderColors[color]} p-5 transition-shadow hover:shadow-md`}>
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
          </div>
          {change !== 0 && (
            <div className={`flex items-center gap-1 text-xs font-semibold ${change > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
              {change > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
        <p className="text-2xl font-bold text-[var(--color-text-primary)] ltr-nums mb-1">
          {formatAmount(value, currency, language)}
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">{title}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen app-surface">
      {/* Clean Header */}
      <div className="bg-[var(--color-bg-card)] border-b border-[var(--color-border)]">
        <div className="page-container">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-6">
            {/* Title & Date */}
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                {isRTL ? 'لوحة التحكم' : 'Dashboard'}
              </h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">{getMonthName()}</p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]`} />
              <input
                type="text"
                placeholder={language === 'ar' ? 'ابحث...' : 'Search transactions...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-2.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="page-container py-6">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <KPICard
            title={t.dashboard.balance}
            value={stats.balance}
            change={balanceChange}
            icon={Wallet}
            color="primary"
          />
          <KPICard
            title={t.dashboard.income}
            value={stats.totalIncome}
            change={incomeChange}
            icon={TrendingUp}
            color="success"
          />
          <KPICard
            title={t.dashboard.expenses}
            value={stats.totalExpenses}
            change={expenseChange}
            icon={TrendingDown}
            color="danger"
          />
        </div>

        {/* Main Grid: 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Recent Transactions */}
          <div className="lg:col-span-7">
            <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
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
          <div className="lg:col-span-5 space-y-6">
            {/* Top Spending Bar Chart */}
            <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
                {isRTL ? 'أعلى المصاريف' : 'Top Spending'}
              </h2>

              {topCategories.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {isRTL ? 'لا توجد مصاريف هذا الشهر' : 'No expenses this month'}
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
            <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
                {isRTL ? 'توزيع المصاريف' : 'Expense Breakdown'}
              </h2>

              {expensesByCategory.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-20 h-20 rounded-full border-4 border-[var(--color-border-light)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {isRTL ? 'لا توجد مصاريف' : 'No expenses'}
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
                        <Tooltip content={<CustomTooltip />} />
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

      {/* Floating Action Button */}
      <Link
        href="/transactions/new"
        className="fixed bottom-6 end-6 w-14 h-14 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105 z-50"
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
            className="w-full sm:max-w-md bg-[var(--color-bg-card)] rounded-t-2xl sm:rounded-xl p-6 mx-0 sm:mx-4 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Transaction Details */}
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[var(--color-border-light)]">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
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
            className="w-full max-w-sm bg-[var(--color-bg-card)] rounded-xl p-6 mx-4 animate-scaleIn"
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

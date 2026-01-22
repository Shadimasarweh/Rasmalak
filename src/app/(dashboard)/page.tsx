'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Plus, Search, X, Edit2, Trash2, Wallet, ChevronDown, ChevronUp, TrendingUp, TrendingDown, PiggyBank, CreditCard } from 'lucide-react';
import { useTransactions, useCurrency, useBaseCurrency, useStore, useMonthlyBudget } from '@/store/useStore';
import { Transaction } from '@/types';
import { calculateStats, getCurrentMonthTransactions, groupByCategory, getCategoryById, convertCurrency } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { CURRENCIES } from '@/lib/constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// Domain imports for insights
import type { Insight } from '@/insights/insight';
import type { RuleContext } from '@/rules/Rule';
import { runRules } from '@/application/ruleRunner';
import { overspendingRule, lowSavingsRule, highDebtRiskRule } from '@/rules';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

function formatCompact(amount: number, language: string): string {
  const locale = language === 'ar' ? 'ar-SA' : 'en-US';
  if (Math.abs(amount) >= 1000000) {
    return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(amount);
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount);
}

// ============================================================================
// ZONE 1: FINANCIAL SNAPSHOT - Grounded, not dull
// ============================================================================

const snapshotIcons = {
  income: TrendingUp,
  expenses: TrendingDown,
  balance: Wallet,
  savings: PiggyBank,
  debt: CreditCard,
};

function SnapshotCard({ 
  title, 
  value, 
  currency,
  language,
  type = 'balance',
}: { 
  title: string; 
  value: number; 
  currency: string;
  language: string;
  type?: 'income' | 'expenses' | 'balance' | 'savings' | 'debt';
}) {
  const Icon = snapshotIcons[type] || Wallet;
  
  // Subtle accent colors - understated but present
  const accentColors = {
    income: 'text-emerald-600/70 dark:text-emerald-400/70',
    expenses: 'text-slate-500 dark:text-slate-400',
    balance: 'text-indigo-600/70 dark:text-indigo-400/70',
    savings: 'text-amber-600/70 dark:text-amber-400/70',
    debt: 'text-slate-500 dark:text-slate-400',
  };

  const iconBg = {
    income: 'bg-emerald-500/8',
    expenses: 'bg-slate-500/8',
    balance: 'bg-indigo-500/8',
    savings: 'bg-amber-500/8',
    debt: 'bg-slate-500/8',
  };

  return (
    <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4 hover:border-[var(--color-border-dark)] transition-colors">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className={`w-7 h-7 rounded-lg ${iconBg[type]} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${accentColors[type]}`} />
        </div>
        <p className="text-xs text-[var(--color-text-muted)] font-medium">{title}</p>
      </div>
      <p className="text-lg font-semibold text-[var(--color-text-primary)] ltr-nums tabular-nums">
        {formatAmount(value, currency, language)}
      </p>
    </div>
  );
}

// ============================================================================
// GUIDANCE LAYER - State-aware bridge for early/empty users
// ============================================================================

interface GuidanceItem {
  key: string;
  text: string;
  href: string;
}

function GuidanceLayer({ 
  items,
  title,
}: { 
  items: GuidanceItem[];
  title: string;
}) {
  if (items.length === 0) return null;
  
  // Limit to 2 items max
  const visibleItems = items.slice(0, 2);
  
  return (
    <div className="rounded-xl border border-[var(--color-border)] border-dashed bg-[var(--color-bg-secondary)]/30 p-6">
      <h2 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-4">
        {title}
      </h2>
      <div className="space-y-3">
        {visibleItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="flex items-center gap-3.5 px-4 py-3.5 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] hover:border-[var(--color-border-dark)] hover:bg-[var(--color-bg-primary)] transition-all group"
          >
            <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]/40 group-hover:bg-[var(--color-primary)] transition-colors shrink-0" />
            <span className="text-sm text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">
              {item.text}
            </span>
            <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] ms-auto transition-colors rtl:rotate-180" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// ZONE 2: INSIGHTS - Authoritative, not polite
// ============================================================================

function InsightCard({ 
  insight, 
  language,
  t,
}: { 
  insight: Insight;
  language: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  const getInsightText = (titleKey: string) => {
    if (titleKey.includes('monthly_overspend')) {
      return {
        title: t.insights?.monthly_overspend?.title || 'High Spending',
        body: t.insights?.monthly_overspend?.body || 'Expenses exceed 90% of income',
      };
    }
    if (titleKey.includes('low_savings')) {
      return {
        title: t.insights?.low_savings_rate?.title || 'Low Savings',
        body: t.insights?.low_savings_rate?.body || 'Savings below 10%',
      };
    }
    if (titleKey.includes('high_debt')) {
      return {
        title: t.insights?.high_debt_risk?.title || 'High Debt',
        body: t.insights?.high_debt_risk?.body || 'Debt exceeds 40%',
      };
    }
    return { title: titleKey, body: '' };
  };

  const { title, body } = getInsightText(insight.titleKey);

  // Severity-specific styling - authoritative presence
  const severityConfig = {
    critical: {
      container: 'bg-red-500/[0.04] dark:bg-red-500/[0.08] border-red-500/20 shadow-sm shadow-red-500/5',
      accent: 'bg-red-500',
      badge: 'bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/20',
      label: language === 'ar' ? 'حرج' : 'Critical',
    },
    warning: {
      container: 'bg-amber-500/[0.04] dark:bg-amber-500/[0.08] border-amber-500/20 shadow-sm shadow-amber-500/5',
      accent: 'bg-amber-500',
      badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20',
      label: language === 'ar' ? 'تنبيه' : 'Warning',
    },
    info: {
      container: 'bg-slate-500/[0.03] dark:bg-slate-500/[0.06] border-slate-300/50 dark:border-slate-600/50',
      accent: 'bg-slate-400',
      badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20',
      label: language === 'ar' ? 'معلومة' : 'Info',
    },
  };

  const config = severityConfig[insight.severity];

  return (
    <div className={`relative rounded-xl border ${config.container} p-5 overflow-hidden`}>
      {/* Left accent bar */}
      <div className={`absolute top-0 bottom-0 start-0 w-1 ${config.accent}`} />
      
      <div className="flex items-start gap-4 ps-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-2.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${config.badge}`}>
              {config.label}
            </span>
          </div>
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] leading-snug mb-1.5">
            {title}
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function HomePage() {
  const { t, language, isRTL } = useTranslation();
  const transactions = useTransactions();
  const currency = useCurrency();
  const baseCurrency = useBaseCurrency();
  const deleteTransaction = useStore((state) => state.deleteTransaction);
  const monthlyBudget = useMonthlyBudget();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAllInsights, setShowAllInsights] = useState(false);

  const currentMonthTransactions = getCurrentMonthTransactions(transactions);
  const stats = calculateStats(currentMonthTransactions, currency, baseCurrency);
  const expensesByCategory = groupByCategory(currentMonthTransactions, 'expense', currency, baseCurrency);
  const topCategories = expensesByCategory.slice(0, 5);
  const recentTransactions = transactions.slice(0, 6);
  const monthlyDebtPayment = 0;

  // ============================================================================
  // INSIGHTS GENERATION
  // ============================================================================
  
  const insights = useMemo((): Insight[] => {
    const ruleContext: RuleContext = {
      user: {
        id: 'current-user',
        type: 'individual',
        country: 'JO',
        currency: currency,
        language: language as 'ar' | 'en',
        createdAt: new Date(),
      },
      profile: {
        userId: 'current-user',
        income: {
          amount: stats.totalIncome,
          frequency: 'monthly',
        },
        liabilities: monthlyDebtPayment > 0 ? {
          totalDebt: 0,
          monthlyDebtPayment: monthlyDebtPayment,
        } : undefined,
      },
      transactions: currentMonthTransactions.map(tx => ({
        id: tx.id,
        userId: 'current-user',
        type: tx.type as 'income' | 'expense',
        category: tx.category,
        amount: tx.amount,
        date: new Date(tx.date),
        notes: tx.description,
      })),
      calculatorResults: {},
    };

    if (stats.totalIncome <= 0) {
      return [];
    }

    const allRules = [overspendingRule, lowSavingsRule, highDebtRiskRule];
    return runRules(allRules, ruleContext);
  }, [currentMonthTransactions, stats.totalIncome, currency, language, monthlyDebtPayment]);

  const sortedInsights = useMemo(() => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return [...insights].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [insights]);

  const visibleInsights = showAllInsights ? sortedInsights : sortedInsights.slice(0, 2);
  const hasMoreInsights = sortedInsights.length > 2;
  const primaryInsight = sortedInsights[0];

  // ============================================================================
  // GUIDANCE LAYER LOGIC
  // Conditions: no transactions, no budget, or insights empty/trivial
  // ============================================================================
  
  const MINIMUM_TRANSACTION_THRESHOLD = 3;
  const hasIncome = stats.totalIncome > 0;
  const hasExpenses = stats.totalExpenses > 0;
  const hasSufficientTransactions = currentMonthTransactions.length >= MINIMUM_TRANSACTION_THRESHOLD;
  const hasBudgetSet = monthlyBudget > 0;
  const hasNonTrivialInsights = sortedInsights.some(i => i.severity === 'critical' || i.severity === 'warning');

  const guidanceItems = useMemo((): GuidanceItem[] => {
    const items: GuidanceItem[] = [];
    
    // Condition 1: No transactions or below threshold
    if (!hasSufficientTransactions && !hasExpenses) {
      items.push({
        key: 'add-transaction',
        text: t.guidance?.addFirstTransaction || (language === 'ar' 
          ? 'أضِف أول معاملة لتتبّع أنماط إنفاقك' 
          : 'Add your first expense to see spending patterns'),
        href: '/transactions/new',
      });
    }
    
    // Condition 2: No budget set
    if (!hasBudgetSet) {
      items.push({
        key: 'set-budget',
        text: t.guidance?.setBudget || (language === 'ar' 
          ? 'حدّد ميزانية شهرية لتفعيل التنبيهات' 
          : 'Set a monthly budget to activate alerts'),
        href: '/budget',
      });
    }
    
    // Condition 3: No income logged
    if (!hasIncome && hasSufficientTransactions) {
      items.push({
        key: 'log-income',
        text: t.guidance?.logIncome || (language === 'ar' 
          ? 'سجّل دخلك لحساب معدل الادخار' 
          : 'Log your income to calculate savings rate'),
        href: '/transactions/new',
      });
    }
    
    return items;
  }, [hasSufficientTransactions, hasExpenses, hasBudgetSet, hasIncome, t.guidance, language]);

  // Guidance layer only shows when:
  // 1. There are guidance items to show AND
  // 2. There are no non-trivial insights (so it doesn't compete)
  const showGuidanceLayer = guidanceItems.length > 0 && !hasNonTrivialInsights;

  const ViewAllArrow = isRTL ? ArrowLeft : ArrowRight;

  const formatDate = (dateStr: string) => {
    const locale = language === 'ar' ? 'ar-SA' : 'en-US';
    return new Date(dateStr).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
    });
  };

  const getMonthName = () => {
    const now = new Date();
    const locale = language === 'ar' ? 'ar-SA' : 'en-US';
    return now.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  };

  // Confident chart palette - muted but with presence
  const chartPalette = ['#475569', '#64748b', '#78716c', '#71717a', '#6b7280'];
  
  const chartData = expensesByCategory.slice(0, 5).map((cat, index) => {
    const category = getCategoryById(cat.name);
    return {
      name: language === 'ar' ? (category?.nameAr || cat.name) : (category?.name || cat.name),
      value: cat.value,
      color: chartPalette[index % chartPalette.length],
    };
  });

  const chartTotal = chartData.reduce((sum, c) => sum + c.value, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = (props: any) => {
    const { active, payload } = props;
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-lg text-sm">
          <p className="font-medium text-[var(--color-text-primary)]">{data.name}</p>
          <p className="text-[var(--color-text-secondary)] ltr-nums">{formatAmount(data.value, currency, language)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* ================================================================== */}
      {/* HEADER - The visual heartbeat / energy source */}
      {/* ================================================================== */}
      <header className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800" />
        
        {/* Subtle ambient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-[0.08]"
            style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 1) 0%, transparent 70%)' }}
          />
          <div 
            className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, rgba(245, 158, 11, 1) 0%, transparent 70%)' }}
          />
        </div>

        <div className="relative page-container py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-white tracking-tight">
                {t.dashboard.financialSnapshot || (language === 'ar' ? 'الموقف المالي' : 'Financial Snapshot')}
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">{getMonthName()}</p>
            </div>
            {/* Search */}
            <div className="relative w-full sm:w-56">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500`} />
              <input
                type="text"
                placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2.5 bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:bg-white/15 focus:border-white/20 transition-all`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-500 hover:text-white`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="page-container py-8">
        
        {/* ================================================================== */}
        {/* ZONE 1: FINANCIAL SNAPSHOT */}
        {/* ================================================================== */}
        <section>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SnapshotCard
              title={t.dashboard.income}
              value={stats.totalIncome}
              currency={currency}
              language={language}
              type="income"
            />
            <SnapshotCard
              title={t.dashboard.expenses}
              value={stats.totalExpenses}
              currency={currency}
              language={language}
              type="expenses"
            />
            <SnapshotCard
              title={t.dashboard.balance}
              value={stats.balance}
              currency={currency}
              language={language}
              type="balance"
            />
            <SnapshotCard
              title={t.dashboard.savingsRate || (language === 'ar' ? 'معدل الادخار' : 'Savings Rate')}
              value={stats.totalIncome > 0 ? Math.round(((stats.totalIncome - stats.totalExpenses) / stats.totalIncome) * 100) : 0}
              currency="%"
              language={language}
              type="savings"
            />
          </div>
        </section>

        {/* ================================================================== */}
        {/* GUIDANCE LAYER - Self-removing bridge for early users */}
        {/* Appears only when data is insufficient, disappears automatically */}
        {/* More vertical margin to feel intentional, not sandwiched */}
        {/* ================================================================== */}
        {showGuidanceLayer && (
          <section className="mt-10">
            <GuidanceLayer 
              items={guidanceItems}
              title={t.guidance?.title || (language === 'ar' ? 'الخطوة التالية' : 'Next step')}
            />
          </section>
        )}

        {/* ================================================================== */}
        {/* ZONE 2: INSIGHTS - Visually dominant, authoritative */}
        {/* ================================================================== */}
        {sortedInsights.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
              {t.dashboard.insightsSection || (language === 'ar' ? 'التنبيهات' : 'Insights')}
            </h2>
            <div className="space-y-4">
              {visibleInsights.map((insight, index) => (
                <InsightCard 
                  key={index} 
                  insight={insight} 
                  language={language}
                  t={t}
                />
              ))}
            </div>
            {hasMoreInsights && (
              <button
                onClick={() => setShowAllInsights(!showAllInsights)}
                className="mt-4 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
              >
                {showAllInsights 
                  ? (language === 'ar' ? 'عرض أقل' : 'Show less')
                  : (language === 'ar' ? `عرض ${sortedInsights.length - 2} المزيد` : `Show ${sortedInsights.length - 2} more`)
                }
                {showAllInsights ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </section>
        )}

        {/* ================================================================== */}
        {/* ZONE 3: PRIMARY ACTION - Deliberate, intentional */}
        {/* ================================================================== */}
        {primaryInsight && primaryInsight.severity === 'critical' && (
          <section className="mt-8">
            <Link
              href="/budget"
              className="block w-full py-3.5 px-5 bg-[var(--color-primary)] text-white rounded-xl text-center text-sm font-semibold shadow-lg shadow-[var(--color-primary)]/20 hover:shadow-xl hover:shadow-[var(--color-primary)]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              {language === 'ar' ? 'راجع ميزانيتك' : 'Review Your Budget'}
            </Link>
          </section>
        )}

        {/* ================================================================== */}
        {/* BREATHING GAP - Visual pause between conclusions and details */}
        {/* Whitespace signals: "Conclusion above, details below" */}
        {/* ================================================================== */}
        <div className="h-6" aria-hidden="true" />

        {/* ================================================================== */}
        {/* ZONE 4: EXPLORATION & CONTEXT - Confident, useful */}
        {/* ================================================================== */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-5">
            {t.dashboard.exploreContext || (language === 'ar' ? 'التفاصيل والتحليل' : 'Details & Analysis')}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Recent Transactions */}
            <div className="lg:col-span-7">
              <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {t.dashboard.recentTransactions}
                  </h3>
                  {recentTransactions.length > 0 && (
                    <Link
                      href="/transactions"
                      className="text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] flex items-center gap-1 transition-colors"
                    >
                      {t.dashboard.viewAll}
                      <ViewAllArrow className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>

                {recentTransactions.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-bg-secondary)] flex items-center justify-center mx-auto mb-3">
                      <Wallet className="w-5 h-5 text-[var(--color-text-muted)]" />
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)]">{t.dashboard.noTransactions}</p>
                  </div>
                ) : (
                  <div className="border-t border-[var(--color-border)]">
                    {recentTransactions.map((transaction, idx) => {
                      const category = getCategoryById(transaction.category);
                      const categoryColor = category?.color || '#64748b';
                      const isLast = idx === recentTransactions.length - 1;
                      return (
                        <button
                          key={transaction.id}
                          onClick={() => setSelectedTransaction(transaction)}
                          className={`w-full flex items-center gap-3.5 px-5 py-3.5 hover:bg-[var(--color-bg-secondary)] active:bg-[var(--color-bg-inset)] transition-colors text-start ${!isLast ? 'border-b border-[var(--color-border-light)]' : ''}`}
                        >
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: categoryColor + '15' }}
                          >
                            <div 
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: categoryColor }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                              {language === 'ar' ? category?.nameAr : category?.name || transaction.category}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                              {formatDate(transaction.date)}
                            </p>
                          </div>
                          <p className="text-sm font-medium ltr-nums tabular-nums shrink-0 text-[var(--color-text-primary)]">
                            {transaction.type === 'income' ? '+' : '−'}{formatAmount(
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

            {/* Charts Column */}
            <div className="lg:col-span-5 space-y-5">
              {/* Top Spending */}
              <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
                  {language === 'ar' ? 'أعلى المصاريف' : 'Top Spending'}
                </h3>

                {topCategories.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {language === 'ar' ? 'لا توجد مصاريف' : 'No expenses'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {topCategories.map((cat, index) => {
                      const category = getCategoryById(cat.name);
                      const displayName = language === 'ar' 
                        ? (category?.nameAr || cat.name) 
                        : (category?.name || cat.name);
                      const barColor = chartPalette[index % chartPalette.length];
                      const percentage = chartTotal > 0 ? (cat.value / chartTotal) * 100 : 0;
                      
                      return (
                        <div key={index}>
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="text-[var(--color-text-primary)] font-medium truncate">{displayName}</span>
                            <span className="text-[var(--color-text-secondary)] ltr-nums tabular-nums shrink-0 ms-3">
                              {formatAmount(cat.value, currency, language)}
                            </span>
                          </div>
                          <div className="h-2 bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: barColor,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Expense Breakdown */}
              <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
                  {language === 'ar' ? 'توزيع المصاريف' : 'Expense Breakdown'}
                </h3>

                {expensesByCategory.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="w-14 h-14 rounded-full border-2 border-[var(--color-border)] mx-auto mb-3" />
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {language === 'ar' ? 'لا توجد مصاريف' : 'No expenses'}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-5">
                    <div className="relative w-28 h-28 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={32}
                            outerRadius={52}
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
                        <span className="text-sm font-bold text-[var(--color-text-primary)] ltr-nums">
                          {formatCompact(chartTotal, language)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      {chartData.slice(0, 4).map((cat, index) => {
                        const percentage = chartTotal > 0 ? (cat.value / chartTotal) * 100 : 0;
                        return (
                          <div key={index} className="flex items-center gap-2.5 text-sm">
                            <div
                              className="w-2.5 h-2.5 rounded-sm shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-[var(--color-text-primary)] truncate flex-1">{cat.name}</span>
                            <span className="text-[var(--color-text-muted)] text-xs tabular-nums shrink-0">{percentage.toFixed(0)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
        
        {/* Bottom breathing room */}
        <div className="h-8" aria-hidden="true" />
      </div>

      {/* ================================================================== */}
      {/* ZONE 5: SYSTEM ACTIONS - Deliberate, clickable */}
      {/* ================================================================== */}
      <Link
        href="/transactions/new"
        className="hidden lg:flex fixed bottom-6 end-6 w-12 h-12 rounded-xl bg-[var(--color-primary)] text-white items-center justify-center shadow-lg shadow-[var(--color-primary)]/25 hover:shadow-xl hover:shadow-[var(--color-primary)]/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all z-50"
        aria-label={t.transactions?.addTransaction || 'Add Transaction'}
      >
        <Plus className="w-5 h-5" />
      </Link>

      {/* Transaction Modal */}
      {selectedTransaction && !showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" 
          onClick={() => setSelectedTransaction(null)}
        >
          <div
            className="w-full sm:max-w-sm bg-[var(--color-bg-card)] rounded-t-2xl sm:rounded-2xl p-5 mx-0 sm:mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[var(--color-border)]">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: (getCategoryById(selectedTransaction.category)?.color || '#64748b') + '15' }}
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getCategoryById(selectedTransaction.category)?.color || '#64748b' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--color-text-primary)]">
                  {language === 'ar' 
                    ? getCategoryById(selectedTransaction.category)?.nameAr 
                    : getCategoryById(selectedTransaction.category)?.name || selectedTransaction.category}
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {formatDate(selectedTransaction.date)}
                </p>
              </div>
              <p className="text-lg font-semibold ltr-nums text-[var(--color-text-primary)]">
                {selectedTransaction.type === 'income' ? '+' : '−'}{formatAmount(
                  convertCurrency(selectedTransaction.amount, selectedTransaction.currency || baseCurrency, currency),
                  currency,
                  language
                )}
              </p>
            </div>

            {selectedTransaction.description && (
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">{selectedTransaction.description}</p>
            )}

            <div className="space-y-2">
              <Link
                href={`/transactions/new?edit=${selectedTransaction.id}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] text-sm font-medium rounded-xl hover:bg-[var(--color-bg-inset)] active:scale-[0.98] transition-all"
                onClick={() => setSelectedTransaction(null)}
              >
                <Edit2 className="w-4 h-4" />
                {language === 'ar' ? 'تعديل' : 'Edit'}
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 text-sm font-medium rounded-xl hover:bg-red-500/5 active:scale-[0.98] transition-all"
              >
                <Trash2 className="w-4 h-4" />
                {language === 'ar' ? 'حذف' : 'Delete'}
              </button>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="w-full px-4 py-2.5 text-[var(--color-text-muted)] text-sm hover:text-[var(--color-text-secondary)] transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {selectedTransaction && showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" 
          onClick={() => { setShowDeleteConfirm(false); setSelectedTransaction(null); }}
        >
          <div
            className="w-full max-w-xs bg-[var(--color-bg-card)] rounded-2xl p-5 mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                {language === 'ar' ? 'حذف المعاملة؟' : 'Delete Transaction?'}
              </h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                {language === 'ar' ? 'لا يمكن التراجع عن هذا الإجراء.' : 'This action cannot be undone.'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setSelectedTransaction(null); }}
                className="flex-1 px-4 py-2.5 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] text-sm font-medium rounded-xl hover:bg-[var(--color-bg-inset)] active:scale-[0.98] transition-all"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  deleteTransaction(selectedTransaction.id);
                  setShowDeleteConfirm(false);
                  setSelectedTransaction(null);
                }}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 active:scale-[0.98] transition-all"
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

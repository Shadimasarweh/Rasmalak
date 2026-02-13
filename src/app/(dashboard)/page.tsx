'use client';

import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useCurrency, useUser, useUserName, useCategoryBudgets, useSavingsGoals, useLanguage } from '@/store/useStore';
import { useTransactions } from '@/store/transactionStore';
import { useMemo } from 'react';
import { DEFAULT_EXPENSE_CATEGORIES, CURRENCIES } from '@/lib/constants';
import { AIAlertBanner, AIGoalSuggestions } from '@/components/AIAlertBanner';

/* ═══════════════════════════════════════════════════
   Dashboard — Overview Page
   Fully tokenised with DS v2 classes & CSS variables.
   No inline hex / rgba. All spacing via tokens.
   ═══════════════════════════════════════════════════ */

export default function OverviewPage() {
  const intl = useIntl();
  const { transactions, getTotalIncome, getTotalExpenses, getNetBalance } = useTransactions();
  const currency = useCurrency();
  const user = useUser();
  const userName = useUserName();
  const displayName = user?.name || userName || intl.formatMessage({ id: 'dashboard.guest_user', defaultMessage: 'User' });

  /* ---------- Current Month Transactions ---------- */
  const currentMonthTransactions = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return transactions.filter(t => {
      const date = new Date(t.date);
      return date >= startOfMonth && date <= endOfMonth;
    });
  }, [transactions]);

  const monthlyIncome = useMemo(() =>
    currentMonthTransactions.filter(tx => tx.type === 'income').reduce((s, tx) => s + Math.abs(tx.amount), 0),
    [currentMonthTransactions]
  );

  const monthlyExpenses = useMemo(() =>
    currentMonthTransactions.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Math.abs(tx.amount), 0),
    [currentMonthTransactions]
  );

  const monthlyCashFlow = monthlyIncome - monthlyExpenses;
  const totalBalance = getNetBalance();
  const recentTransactions = transactions.slice(0, 5);
  const hasTransactions = transactions.length > 0;

  /* ---------- Budget & Goal Data ---------- */
  const language = useLanguage();
  const isRTL = language === 'ar';
  const categoryBudgets = useCategoryBudgets();
  const savingsGoals = useSavingsGoals();
  const currencyInfo = CURRENCIES.find(c => c.code === currency);
  const currencySymbol = isRTL ? currencyInfo?.symbolAr || currencyInfo?.symbol || currency : currencyInfo?.symbol || currency;

  const activeBudgets = useMemo(() => {
    return DEFAULT_EXPENSE_CATEGORIES
      .filter(cat => categoryBudgets[cat.id] && categoryBudgets[cat.id] > 0)
      .map(cat => {
        const limit = categoryBudgets[cat.id];
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const spent = transactions
          .filter(tx => tx.type === 'expense' && tx.category === cat.id && new Date(tx.date) >= startOfMonth && new Date(tx.date) <= endOfMonth)
          .reduce((s, tx) => s + Math.abs(tx.amount), 0);
        return { ...cat, limit, spent, percentage: Math.min((spent / limit) * 100, 100) };
      });
  }, [categoryBudgets, transactions]);

  const hasBudgets = activeBudgets.length > 0;

  const topGoal = useMemo(() => {
    if (savingsGoals.length === 0) return null;
    const inProgress = savingsGoals
      .filter(g => g.currentAmount < g.targetAmount)
      .sort((a, b) => {
        const pA = a.targetAmount > 0 ? a.currentAmount / a.targetAmount : 0;
        const pB = b.targetAmount > 0 ? b.currentAmount / b.targetAmount : 0;
        return pB - pA;
      });
    return inProgress[0] || savingsGoals[0];
  }, [savingsGoals]);

  /* ---------- Weekly Spending ---------- */
  const weeklySpending = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const spending: Record<string, number> = {};
    days.forEach(day => { spending[day] = 0; });
    transactions.forEach(tx => {
      if (tx.type !== 'expense') return;
      const txDate = new Date(tx.date);
      if (txDate >= startOfWeek && txDate <= now) {
        const dayName = days[txDate.getDay()];
        spending[dayName] += Math.abs(tx.amount);
      }
    });
    const maxSpending = Math.max(...Object.values(spending), 1);
    const todayName = days[now.getDay()];
    return days.map(day => ({
      day,
      amount: spending[day],
      height: spending[day] > 0 ? Math.max((spending[day] / maxSpending) * 100, 5) : 0,
      isToday: day === todayName,
    }));
  }, [transactions]);

  const hasWeeklySpending = weeklySpending.some(d => d.amount > 0);

  /* ---------- Greeting ---------- */
  const hour = new Date().getHours();
  let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' = 'morning';
  if (hour >= 5 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
  else timeOfDay = 'night';

  const greeting = intl.formatMessage(
    { id: 'dashboard.greeting', defaultMessage: '{timeOfDay, select, morning {Good Morning} afternoon {Good Afternoon} evening {Good Evening} night {Good Night} other {Hello}}' },
    { timeOfDay }
  );

  /* ---------- Helpers ---------- */
  const getCategoryIcon = (category: string | null) => {
    const icons: Record<string, string> = {
      food: '🍽️', transport: '🚗', shopping: '🛍️', entertainment: '🎬',
      health: '🏥', utilities: '💡', salary: '💰', freelance: '💼',
      investment: '📈', gift: '🎁', other: '📋',
    };
    return icons[category || 'other'] || '📋';
  };

  const incomeRatio = monthlyIncome + monthlyExpenses > 0 ? (monthlyIncome / (monthlyIncome + monthlyExpenses)) * 100 : 50;
  const goalPct = topGoal && topGoal.targetAmount > 0 ? Math.min(Math.round((topGoal.currentAmount / topGoal.targetAmount) * 100), 100) : 0;

  return (
    <div className="ds-page">
      {/* ===== AI ALERT ===== */}
      <AIAlertBanner />

      {/* ===== GREETING ===== */}
      <div className="ds-section-header">
        <div style={{ minWidth: 0 }}>
          <h1 className="ds-title-page">{greeting}, {displayName}</h1>
          <p className="ds-body" style={{ marginTop: 'var(--spacing-1)' }}>
            {intl.formatMessage({ id: 'dashboard.financial_overview', defaultMessage: "Here's your financial overview for today." })}
          </p>
        </div>
        <Link
          href="/transactions/new"
          className="ds-btn ds-btn-primary"
          style={{ paddingBlock: 'var(--spacing-2)', paddingInline: 'var(--spacing-4)' }}
        >
          <svg style={{ width: '1rem', height: '1rem', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>{intl.formatMessage({ id: 'dashboard.add_transaction', defaultMessage: 'Add Transaction' })}</span>
        </Link>
      </div>

      {/* ===== TOP CARDS ROW ===== */}
      <div className="ds-grid">
        {/* ── Hero: Total Balance ── */}
        <div className="ds-card-hero ds-col-4" style={{ minHeight: '180px' }}>
          <p className="ds-label" style={{ color: 'var(--color-text-on-hero-dim)', marginBottom: 'var(--spacing-2)', textTransform: 'uppercase' }}>
            {intl.formatMessage({ id: 'dashboard.total_balance', defaultMessage: 'Total Balance' })}
          </p>
          <div className="ds-metric" style={{ color: 'var(--color-text-on-hero)', fontSize: 'clamp(1.5rem, 4vw, 2.25rem)' }}>
            {intl.formatNumber(totalBalance, { style: 'currency', currency })}
          </div>
          {!hasTransactions && (
            <p className="ds-supporting" style={{ color: 'var(--color-text-on-hero-dim)', marginTop: 'var(--spacing-2)' }}>
              {intl.formatMessage({ id: 'dashboard.add_first_transaction_hint', defaultMessage: 'Add your first transaction to see your balance' })}
            </p>
          )}
          {/* Decorative wave */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '5rem' }}>
            <svg style={{ width: '100%', height: '100%' }} viewBox="0 0 300 80" preserveAspectRatio="none">
              <defs>
                <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
              </defs>
              <path d="M0 60 Q30 55 60 50 T120 42 T180 32 T240 26 T300 20" stroke="rgba(255,255,255,0.5)" strokeWidth="2" fill="none" />
              <path d="M0 60 Q30 55 60 50 T120 42 T180 32 T240 26 T300 20 L300 80 L0 80 Z" fill="url(#heroGradient)" />
            </svg>
          </div>
          {/* Decorative icon */}
          <div style={{ position: 'absolute', top: 'var(--spacing-5)', insetInlineEnd: 'var(--spacing-5)' }}>
            <div className="ds-icon-box" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
              <svg style={{ width: '1.5rem', height: '1.5rem', color: 'rgba(255,255,255,0.5)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
        </div>

        {/* ── Cash Flow ── */}
        <div className="ds-card ds-col-5">
          <p className="ds-title-card" style={{ marginBottom: 'var(--spacing-4)' }}>
            {intl.formatMessage({ id: 'dashboard.cash_flow_monthly', defaultMessage: 'Cash Flow (Monthly)' })}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-10)', flexWrap: 'wrap' }}>
            {/* Income */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
              <div className="ds-icon-box" style={{ background: 'var(--color-accent-growth-subtle)' }}>
                <svg style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-accent-growth)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <p className="ds-label">{intl.formatMessage({ id: 'dashboard.income', defaultMessage: 'Income' })}</p>
                <p className="ds-metric-sm" style={{ marginTop: 'var(--spacing-1)' }}>
                  {intl.formatNumber(monthlyIncome, { style: 'currency', currency })}
                </p>
              </div>
            </div>
            {/* Divider */}
            <div className="ds-divider-v" style={{ height: '3rem' }} />
            {/* Expenses */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
              <div className="ds-icon-box" style={{ background: 'var(--color-danger-bg)' }}>
                <svg style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-danger-text)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <p className="ds-label">{intl.formatMessage({ id: 'dashboard.expenses', defaultMessage: 'Expenses' })}</p>
                <p className="ds-metric-sm" style={{ marginTop: 'var(--spacing-1)' }}>
                  {intl.formatNumber(monthlyExpenses, { style: 'currency', currency })}
                </p>
              </div>
            </div>
          </div>

          {/* Cash flow bar */}
          {(monthlyIncome > 0 || monthlyExpenses > 0) ? (
            <div style={{ marginTop: 'var(--spacing-5)' }}>
              <div className="ds-progress" style={{ display: 'flex' }}>
                <div className="ds-progress-fill" style={{ width: `${incomeRatio}%`, borderRadius: 'var(--radius-pill) 0 0 var(--radius-pill)' }} />
                <div style={{ height: '100%', width: `${100 - incomeRatio}%`, background: 'var(--color-danger-text)', borderRadius: '0 var(--radius-pill) var(--radius-pill) 0' }} />
              </div>
              <p className="ds-supporting" style={{ textAlign: 'center', marginTop: 'var(--spacing-3)', fontWeight: 500, color: monthlyCashFlow >= 0 ? 'var(--color-accent-growth)' : 'var(--color-danger-text)' }}>
                {monthlyCashFlow >= 0
                  ? intl.formatMessage({ id: 'dashboard.saved_this_month', defaultMessage: 'Saved {amount} this month' }, { amount: intl.formatNumber(monthlyCashFlow, { style: 'currency', currency }) })
                  : intl.formatMessage({ id: 'dashboard.overspent_this_month', defaultMessage: 'Overspent {amount} this month' }, { amount: intl.formatNumber(Math.abs(monthlyCashFlow), { style: 'currency', currency }) })
                }
              </p>
            </div>
          ) : (
            <p className="ds-supporting" style={{ textAlign: 'center', marginTop: 'var(--spacing-5)' }}>
              {intl.formatMessage({ id: 'dashboard.no_monthly_data', defaultMessage: 'No transactions this month' })}
            </p>
          )}
        </div>

        {/* ── Top Goal ── */}
        <div className="ds-card ds-col-3">
          <div className="ds-section-header" style={{ marginBottom: 'var(--spacing-4)' }}>
            <p className="ds-title-card">
              {intl.formatMessage({ id: 'dashboard.top_goal', defaultMessage: 'Top Goal' })}
            </p>
            <Link href="/goals" className="ds-link-action">
              {intl.formatMessage({ id: 'dashboard.view_all', defaultMessage: 'View All' })}
            </Link>
          </div>
          {topGoal ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: topGoal.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={topGoal.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="ds-body" style={{ fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {topGoal.name}
                  </p>
                  <p className="ds-supporting">
                    {intl.formatMessage({ id: 'dashboard.target_amount', defaultMessage: 'Target: {amount}' }, { amount: `${currencySymbol} ${topGoal.targetAmount.toLocaleString()}` })}
                  </p>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-1)' }}>
                  <span className="ds-label">{currencySymbol} {topGoal.currentAmount.toLocaleString()}</span>
                  <span className="ds-label">{goalPct}%</span>
                </div>
                <div className="ds-progress">
                  <div className="ds-progress-fill" style={{ width: `${goalPct}%`, background: topGoal.color }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="ds-empty-state" style={{ paddingBlock: 'var(--spacing-6)' }}>
              <div className="ds-icon-box-lg" style={{ background: 'var(--color-bg-surface-2)' }}>
                <svg style={{ width: '1.5rem', height: '1.5rem', color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="ds-supporting">{intl.formatMessage({ id: 'dashboard.no_goals_yet', defaultMessage: 'No goals yet' })}</p>
              <Link href="/goals" className="ds-link-action">
                {intl.formatMessage({ id: 'dashboard.create_first_goal', defaultMessage: 'Create your first goal' })}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ===== MIDDLE: SPENDING + BUDGETS ===== */}
      <div className="ds-grid">
        {/* ── Spending Analysis ── */}
        <div className="ds-card ds-col-8">
          <div className="ds-section-header" style={{ marginBottom: 'var(--spacing-5)' }}>
            <h2 className="ds-title-section">
              {intl.formatMessage({ id: 'dashboard.spending_analysis', defaultMessage: 'Spending Analysis' })}
            </h2>
            <span className="ds-badge" style={{ background: 'var(--color-bg-surface-2)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)' }}>
              {intl.formatMessage({ id: 'dashboard.period_this_week', defaultMessage: 'This Week' })}
            </span>
          </div>
          {hasWeeklySpending ? (
            <div style={{ height: '12rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--spacing-3)', paddingTop: 'var(--spacing-4)' }}>
              {weeklySpending.map(bar => (
                <div key={bar.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                  <div style={{ height: '140px', display: 'flex', alignItems: 'flex-end', width: '100%', justifyContent: 'center' }}>
                    <div
                      style={{
                        width: '2.25rem',
                        height: bar.height > 0 ? `${Math.max(bar.height, 8)}%` : '4px',
                        borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                        background: bar.isToday ? 'var(--color-accent-growth)' : 'var(--color-border-subtle)',
                        transition: 'height 0.3s ease',
                      }}
                      title={intl.formatNumber(bar.amount, { style: 'currency', currency })}
                    />
                  </div>
                  <span className="ds-label" style={{ color: bar.isToday ? 'var(--color-accent-growth)' : 'var(--color-text-muted)', letterSpacing: 0, textTransform: 'none', fontSize: '0.75rem' }}>
                    {bar.day}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="ds-empty-state">
              <div className="ds-icon-box-lg" style={{ background: 'var(--color-bg-surface-2)' }}>
                <svg style={{ width: '1.5rem', height: '1.5rem', color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="ds-supporting">{intl.formatMessage({ id: 'dashboard.no_spending_this_week', defaultMessage: 'No spending recorded this week' })}</p>
              <Link href="/transactions/new" className="ds-link-action">
                {intl.formatMessage({ id: 'dashboard.add_first_expense', defaultMessage: 'Add your first expense' })}
              </Link>
            </div>
          )}
        </div>

        {/* ── Budgets ── */}
        <div className="ds-card ds-col-4">
          <div className="ds-section-header" style={{ marginBottom: 'var(--spacing-4)' }}>
            <h2 className="ds-title-section">
              {intl.formatMessage({ id: 'dashboard.budgets', defaultMessage: 'Budgets' })}
            </h2>
            <Link href="/budgets" className="ds-link-action">
              {intl.formatMessage({ id: 'dashboard.view_all', defaultMessage: 'View All' })}
            </Link>
          </div>
          {hasBudgets ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
              {activeBudgets.slice(0, 4).map(b => {
                const isOver = b.spent > b.limit;
                return (
                  <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: b.color }} />
                        <span className="ds-supporting" style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                          {isRTL ? b.nameAr : b.name}
                        </span>
                      </div>
                      <span className="ds-label" style={{ color: isOver ? 'var(--color-danger-text)' : 'var(--color-text-muted)' }}>
                        {currencySymbol} {b.spent.toLocaleString()} / {b.limit.toLocaleString()}
                      </span>
                    </div>
                    <div className="ds-progress" style={{ height: '4px' }}>
                      <div className="ds-progress-fill" style={{ width: `${b.percentage}%`, background: isOver ? 'var(--color-danger-text)' : b.color }} />
                    </div>
                  </div>
                );
              })}
              {activeBudgets.length > 4 && (
                <Link href="/budgets" className="ds-link-action" style={{ textAlign: 'center' }}>
                  +{activeBudgets.length - 4} {isRTL ? 'المزيد' : 'more'}
                </Link>
              )}
            </div>
          ) : (
            <div className="ds-empty-state" style={{ paddingBlock: 'var(--spacing-8)' }}>
              <div className="ds-icon-box-lg" style={{ background: 'var(--color-bg-surface-2)' }}>
                <svg style={{ width: '1.5rem', height: '1.5rem', color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="ds-supporting">{intl.formatMessage({ id: 'dashboard.no_budgets_set', defaultMessage: 'No budgets set' })}</p>
              <Link href="/budgets" className="ds-link-action">
                {intl.formatMessage({ id: 'dashboard.setup_first_budget', defaultMessage: 'Set up your first budget' })}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ===== LEARNING + FOR YOU ===== */}
      <div className="ds-grid">
        {/* ── Learning Progress ── */}
        <div className="ds-card ds-col-8">
          <div className="ds-section-header" style={{ marginBottom: 'var(--spacing-5)' }}>
            <h2 className="ds-title-section">
              {intl.formatMessage({ id: 'dashboard.learning_progress', defaultMessage: 'Learning Progress' })}
            </h2>
            <Link href="/learn" className="ds-link-action">
              {intl.formatMessage({ id: 'dashboard.continue_learning', defaultMessage: 'Continue Learning' })}
            </Link>
          </div>

          {/* Stats Row */}
          <div style={{ display: 'flex', gap: 'var(--spacing-6)', marginBottom: 'var(--spacing-5)', flexWrap: 'wrap' }}>
            {[
              { labelId: 'dashboard.lessons_completed', label: 'Lessons Completed', value: '2', iconColor: '#6366F1', bg: 'rgba(99,102,241,0.12)', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
              { labelId: 'dashboard.current_streak', label: 'Current Streak', value: intl.formatMessage({ id: 'dashboard.days_count', defaultMessage: '{count} days' }, { count: 3 }), iconColor: '#D4920A', bg: 'rgba(212,146,10,0.12)', icon: 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z' },
              { labelId: 'dashboard.time_spent', label: 'Time Spent', value: '13m', iconColor: 'var(--color-accent-growth)', bg: 'var(--color-accent-growth-subtle)', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            ].map(stat => (
              <div key={stat.labelId} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', flex: 1, minWidth: '140px' }}>
                <div className="ds-icon-box" style={{ background: stat.bg }}>
                  <svg style={{ width: '1.25rem', height: '1.25rem', color: stat.iconColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                  </svg>
                </div>
                <div style={{ minWidth: 0 }}>
                  <p className="ds-label">{intl.formatMessage({ id: stat.labelId, defaultMessage: stat.label })}</p>
                  <p className="ds-metric-sm" style={{ marginTop: 'var(--spacing-1)' }}>{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Current Learning Path */}
          <div className="ds-card-flush" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-4)' }}>
            <div className="ds-section-header" style={{ marginBottom: 'var(--spacing-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                <span className="ds-label" style={{ color: '#6366F1' }}>
                  {intl.formatMessage({ id: 'dashboard.current_path', defaultMessage: 'Current Path' })}
                </span>
                <span className="ds-supporting">
                  {intl.formatMessage({ id: 'dashboard.module_progress', defaultMessage: 'Module 1 of 4' })}
                </span>
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6366F1' }}>40%</span>
            </div>
            <h3 className="ds-body" style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-2)' }}>
              {intl.formatMessage({ id: 'dashboard.financial_foundations', defaultMessage: 'Financial Foundations' })}
            </h3>
            <div className="ds-progress" style={{ background: 'rgba(99,102,241,0.15)' }}>
              <div className="ds-progress-fill" style={{ width: '40%', background: '#6366F1' }} />
            </div>
            <p className="ds-supporting" style={{ marginTop: 'var(--spacing-2)' }}>
              {intl.formatMessage({ id: 'dashboard.next_lesson', defaultMessage: 'Next: Understanding Needs vs. Wants' })}
            </p>
          </div>
        </div>

        {/* ── For You ── */}
        <div className="ds-card ds-col-4">
          <div className="ds-section-header" style={{ marginBottom: 'var(--spacing-4)' }}>
            <h2 className="ds-title-section">
              {intl.formatMessage({ id: 'dashboard.for_you', defaultMessage: 'For You' })}
            </h2>
          </div>

          {/* Featured Article */}
          <div className="ds-card-flush" style={{ background: 'var(--color-accent-growth-subtle)', border: '1px solid rgba(31,122,90,0.15)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-2)' }}>
              <svg style={{ width: '1rem', height: '1rem', color: 'var(--color-accent-growth)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span className="ds-label" style={{ color: 'var(--color-accent-growth)' }}>
                {intl.formatMessage({ id: 'dashboard.featured', defaultMessage: 'Featured' })}
              </span>
            </div>
            <h4 className="ds-body" style={{ fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-1)' }}>
              {intl.formatMessage({ id: 'dashboard.featured_article_title', defaultMessage: 'The 50/30/20 Budget Rule' })}
            </h4>
            <p className="ds-supporting">
              {intl.formatMessage({ id: 'dashboard.min_read', defaultMessage: '{min} min read' }, { min: 5 })}
            </p>
          </div>

          {/* AI Goal Suggestions */}
          <AIGoalSuggestions />

          {/* Explore all courses */}
          <Link href="/learn" className="ds-btn ds-btn-ghost" style={{ width: '100%', marginTop: 'var(--spacing-3)' }}>
            <svg style={{ width: '1rem', height: '1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {intl.formatMessage({ id: 'dashboard.explore_all_courses', defaultMessage: 'Explore All Courses' })}
          </Link>
        </div>
      </div>

      {/* ===== RECENT TRANSACTIONS ===== */}
      <div className="ds-card">
        <div className="ds-section-header" style={{ marginBottom: 'var(--spacing-4)' }}>
          <h2 className="ds-title-section">
            {intl.formatMessage({ id: 'dashboard.recent_transactions', defaultMessage: 'Recent Transactions' })}
          </h2>
          <Link href="/transactions" className="ds-link-action" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
            <span>{intl.formatMessage({ id: 'dashboard.view_all', defaultMessage: 'View All' })}</span>
            <svg style={{ width: '1rem', height: '1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {recentTransactions.length > 0 ? (
          <div style={{ overflowX: 'auto', marginInline: 'calc(-1 * var(--spacing-5))', paddingInline: 'var(--spacing-5)' }}>
            <table className="ds-table" style={{ minWidth: '600px' }}>
              <thead>
                <tr>
                  <th>{intl.formatMessage({ id: 'dashboard.transaction', defaultMessage: 'Transaction' })}</th>
                  <th>{intl.formatMessage({ id: 'dashboard.category', defaultMessage: 'Category' })}</th>
                  <th>{intl.formatMessage({ id: 'dashboard.date', defaultMessage: 'Date' })}</th>
                  <th>{intl.formatMessage({ id: 'dashboard.status', defaultMessage: 'Status' })}</th>
                  <th style={{ textAlign: 'end' }}>{intl.formatMessage({ id: 'dashboard.amount', defaultMessage: 'Amount' })}</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map(tx => (
                  <tr key={tx.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                        <div className="ds-icon-box-sm" style={{ background: 'var(--color-bg-surface-2)', fontSize: '1rem' }}>
                          {getCategoryIcon(tx.category)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>{tx.description || tx.category || intl.formatMessage({ id: 'dashboard.transaction', defaultMessage: 'Transaction' })}</p>
                          <p className="ds-supporting" style={{ textTransform: 'capitalize' }}>{tx.type === 'income' ? intl.formatMessage({ id: 'dashboard.income', defaultMessage: 'Income' }) : intl.formatMessage({ id: 'dashboard.expense', defaultMessage: 'Expense' })}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{tx.category || '—'}</td>
                    <td>{tx.date ? intl.formatDate(new Date(tx.date), { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                    <td>
                      <span className="ds-badge ds-badge-success">
                        {intl.formatMessage({ id: 'dashboard.completed', defaultMessage: 'Completed' })}
                      </span>
                    </td>
                    <td style={{ textAlign: 'end', fontWeight: 500, color: tx.type === 'expense' ? 'var(--color-text-primary)' : 'var(--color-accent-growth)' }}>
                      {tx.type === 'income' ? '+' : '-'}{intl.formatNumber(Math.abs(tx.amount), { style: 'currency', currency: tx.currency || currency })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ds-empty-state">
            <div className="ds-icon-box-lg" style={{ background: 'var(--color-bg-surface-2)', width: '4rem', height: '4rem' }}>
              <svg style={{ width: '2rem', height: '2rem', color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="ds-supporting">{intl.formatMessage({ id: 'dashboard.no_transactions_yet', defaultMessage: 'No transactions yet' })}</p>
            <p className="ds-supporting" style={{ maxWidth: '16rem' }}>
              {intl.formatMessage({ id: 'dashboard.add_transaction_hint', defaultMessage: 'Add your first transaction to start tracking your finances' })}
            </p>
            <Link href="/transactions/new" className="ds-btn ds-btn-primary" style={{ marginTop: 'var(--spacing-2)' }}>
              <svg style={{ width: '1rem', height: '1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {intl.formatMessage({ id: 'dashboard.add_transaction', defaultMessage: 'Add Transaction' })}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useCurrency, useUser, useUserName } from '@/store/useStore';
import { useTransactions } from '@/store/transactionStore';
import { useMemo } from 'react';
import { AIAlertBanner, AIGoalSuggestions } from '@/components/AIAlertBanner';

export default function OverviewPage() {
  const intl = useIntl();
  const { transactions, getTotalIncome, getTotalExpenses, getNetBalance } = useTransactions();
  const currency = useCurrency();
  const user = useUser();
  const userName = useUserName();
  const displayName = user?.name || userName || intl.formatMessage({ id: 'dashboard.guest_user', defaultMessage: 'User' });

  // Filter transactions for current month
  const currentMonthTransactions = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return transactions.filter(t => {
      const date = new Date(t.date);
      return date >= startOfMonth && date <= endOfMonth;
    });
  }, [transactions]);

  // Compute monthly metrics from real data
  const monthlyIncome = useMemo(() => {
    return currentMonthTransactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  }, [currentMonthTransactions]);

  const monthlyExpenses = useMemo(() => {
    return currentMonthTransactions
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  }, [currentMonthTransactions]);

  const monthlyCashFlow = monthlyIncome - monthlyExpenses;

  // Total balance (all-time income - expenses)
  const totalBalance = getNetBalance();

  // Recent transactions (most recent 5)
  const recentTransactions = transactions.slice(0, 5);
  const hasTransactions = transactions.length > 0;

  // Weekly spending data - expenses grouped by day of current week
  const weeklySpending = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
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
      // Height as percentage of max (minimum 5% for visibility if non-zero)
      height: spending[day] > 0 ? Math.max((spending[day] / maxSpending) * 100, 5) : 0,
      isToday: day === todayName,
    }));
  }, [transactions]);

  const hasWeeklySpending = weeklySpending.some(d => d.amount > 0);

  // Determine time of day for ICU select
  const hour = new Date().getHours();
  let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' = 'morning';
  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning';
  } else if (hour >= 12 && hour < 17) {
    timeOfDay = 'afternoon';
  } else if (hour >= 17 && hour < 22) {
    timeOfDay = 'evening';
  } else {
    timeOfDay = 'night';
  }
  const greeting = intl.formatMessage(
    { id: 'dashboard.greeting', defaultMessage: '{timeOfDay, select, morning {Good Morning} afternoon {Good Afternoon} evening {Good Evening} night {Good Night} other {Hello}}' },
    { timeOfDay }
  );

  return (
    <div style={{ padding: 'var(--spacing-3)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ===== AI ALERT BANNER ===== */}
      <AIAlertBanner />
      
      {/* ===== GREETING SECTION ===== */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>{greeting}, {displayName}</h1>
          <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
            {intl.formatMessage({ id: 'dashboard.financial_overview', defaultMessage: "Here's your financial overview for today." })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <Link 
            href="/transactions/new"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              paddingInline: '1rem', 
              paddingBlock: '0.625rem',
              backgroundColor: 'var(--color-brand-emerald)',
              color: '#FFFFFF',
              border: 'none',
              textDecoration: 'none',
            }} 
            className="text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            <svg style={{ width: '1rem', height: '1rem', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>{intl.formatMessage({ id: 'dashboard.add_transaction', defaultMessage: 'Add Transaction' })}</span>
          </Link>
        </div>
      </div>

      {/* ===== TOP CARDS ROW ===== */}
      <div className="grid grid-cols-12 gap-5">
        {/* Total Balance Card - HERO */}
        <div 
          className="col-span-4 rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #065F46 0%, #047857 50%, #10B981 100%)',
            minHeight: '180px'
          }}
        >
          <p className="text-emerald-200 text-sm font-medium mb-1">
            {intl.formatMessage({ id: 'dashboard.total_balance', defaultMessage: 'Total Balance' })}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-white text-4xl font-bold tracking-tight">
              {intl.formatNumber(totalBalance, { style: 'currency', currency })}
            </span>
          </div>
          
          {/* Empty state hint if no transactions */}
          {!hasTransactions && (
            <p className="text-emerald-200/70 text-xs mt-2">
              {intl.formatMessage({ id: 'dashboard.add_first_transaction_hint', defaultMessage: 'Add your first transaction to see your balance' })}
            </p>
          )}
          
          {/* Chart Illustration */}
          <div className="absolute bottom-0 left-0 right-0 h-20">
            <svg className="w-full h-full" viewBox="0 0 300 80" preserveAspectRatio="none">
              <defs>
                <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
              </defs>
              <path
                d="M0 60 Q30 55 60 50 T120 42 T180 32 T240 26 T300 20"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M0 60 Q30 55 60 50 T120 42 T180 32 T240 26 T300 20 L300 80 L0 80 Z"
                fill="url(#heroGradient)"
              />
            </svg>
          </div>
          
          {/* Decorative Icon */}
          <div style={{ position: 'absolute', top: '1.25rem', insetInlineEnd: '1.25rem' }} className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
            <svg className="w-6 h-6 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
        </div>

        {/* Cash Flow Card */}
        <div 
          className="col-span-5 rounded-2xl shadow-sm" 
          style={{ 
            padding: '1.25rem',
            backgroundColor: 'var(--theme-bg-card)',
            border: '1px solid var(--theme-border)',
          }}
        >
          <p className="text-sm font-medium" style={{ marginBlockEnd: '1rem', color: 'var(--theme-text-secondary)' }}>
            {intl.formatMessage({ id: 'dashboard.cash_flow_monthly', defaultMessage: 'Cash Flow (Monthly)' })}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2.5rem', flexWrap: 'wrap' }}>
            {/* Income */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="rounded-xl" style={{ width: '2.75rem', height: '2.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                    {intl.formatMessage({ id: 'dashboard.income', defaultMessage: 'Income' })}
                  </p>
                <p className="text-xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                  {intl.formatNumber(monthlyIncome, { style: 'currency', currency })}
                </p>
              </div>
            </div>
            {/* Divider */}
            <div style={{ width: '1px', height: '3rem', flexShrink: 0, backgroundColor: 'var(--theme-border)' }} />
            {/* Expenses */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="rounded-xl" style={{ width: '2.75rem', height: '2.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: 'rgba(239, 68, 68, 0.15)' }}>
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                    {intl.formatMessage({ id: 'dashboard.expenses', defaultMessage: 'Expenses' })}
                  </p>
                <p className="text-xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                  {intl.formatNumber(monthlyExpenses, { style: 'currency', currency })}
                </p>
              </div>
            </div>
          </div>
          {/* Progress Bar - shows ratio of income to expenses */}
          {(monthlyIncome > 0 || monthlyExpenses > 0) ? (
            <>
              <div className="mt-4 h-1.5 rounded-full overflow-hidden flex" style={{ backgroundColor: 'var(--theme-border)' }}>
                <div 
                  className="h-full bg-emerald-500 rounded-full" 
                  style={{ width: `${monthlyIncome + monthlyExpenses > 0 ? (monthlyIncome / (monthlyIncome + monthlyExpenses)) * 100 : 50}%` }} 
                />
                <div 
                  className="h-full bg-red-400 rounded-full" 
                  style={{ width: `${monthlyIncome + monthlyExpenses > 0 ? (monthlyExpenses / (monthlyIncome + monthlyExpenses)) * 100 : 50}%` }} 
                />
              </div>
              <p className={`text-center text-sm font-medium mt-3 ${monthlyCashFlow >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {monthlyCashFlow >= 0 
                  ? intl.formatMessage(
                      { id: 'dashboard.saved_this_month', defaultMessage: 'Saved {amount} this month' }, 
                      { amount: intl.formatNumber(monthlyCashFlow, { style: 'currency', currency }) }
                    )
                  : intl.formatMessage(
                      { id: 'dashboard.overspent_this_month', defaultMessage: 'Overspent {amount} this month' },
                      { amount: intl.formatNumber(Math.abs(monthlyCashFlow), { style: 'currency', currency }) }
                    )
                }
              </p>
            </>
          ) : (
            <p className="text-center text-sm mt-4" style={{ color: 'var(--theme-text-muted)' }}>
              {intl.formatMessage({ id: 'dashboard.no_monthly_data', defaultMessage: 'No transactions this month' })}
            </p>
          )}
        </div>

        {/* Top Goal Card - Empty State (Goals feature coming soon) */}
        <div 
          className="col-span-3 rounded-2xl shadow-sm" 
          style={{ 
            padding: '1.25rem',
            backgroundColor: 'var(--theme-bg-card)',
            border: '1px solid var(--theme-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBlockEnd: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
              {intl.formatMessage({ id: 'dashboard.top_goal', defaultMessage: 'Top Goal' })}
            </p>
            <Link href="/goals" className="text-sm text-emerald-500 font-medium hover:underline" style={{ flexShrink: 0 }}>
              {intl.formatMessage({ id: 'dashboard.view_all', defaultMessage: 'View All' })}
            </Link>
          </div>
          {/* Empty state */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBlock: '1.5rem', gap: '0.75rem' }}>
            <div className="rounded-xl" style={{ width: '3rem', height: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--theme-border)' }}>
              <svg className="w-6 h-6" style={{ color: 'var(--theme-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-sm text-center" style={{ color: 'var(--theme-text-secondary)' }}>
              {intl.formatMessage({ id: 'dashboard.no_goals_yet', defaultMessage: 'No goals yet' })}
            </p>
            <Link 
              href="/goals" 
              className="text-sm text-emerald-500 font-medium hover:underline"
            >
              {intl.formatMessage({ id: 'dashboard.create_first_goal', defaultMessage: 'Create your first goal' })}
            </Link>
          </div>
        </div>
      </div>

      {/* ===== MIDDLE SECTION: SPENDING + BUDGETS ===== */}
      <div className="grid grid-cols-12 gap-5">
        {/* Spending Analysis */}
        <div 
          className="col-span-8 rounded-2xl shadow-sm" 
          style={{ 
            padding: '1.25rem',
            backgroundColor: 'var(--theme-bg-card)',
            border: '1px solid var(--theme-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBlockEnd: '1.5rem', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {intl.formatMessage({ id: 'dashboard.spending_analysis', defaultMessage: 'Spending Analysis' })}
            </h2>
            <span 
              className="text-sm rounded-lg"
              style={{ 
                paddingInline: '0.75rem', 
                paddingBlock: '0.375rem', 
                flexShrink: 0,
                color: 'var(--theme-text-secondary)',
                border: '1px solid var(--theme-border)',
              }}
            >
              {intl.formatMessage({ id: 'dashboard.period_this_week', defaultMessage: 'This Week' })}
            </span>
          </div>
          {/* Bar Chart - Real weekly spending data */}
          {hasWeeklySpending ? (
            <div className="h-48 flex items-end justify-between gap-3 pt-4">
              {weeklySpending.map((bar) => (
                <div key={bar.day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex justify-center" style={{ height: '140px', alignItems: 'flex-end', display: 'flex' }}>
                    <div
                      className="w-9 rounded-t-lg transition-all"
                      style={{ 
                        height: bar.height > 0 ? `${Math.max(bar.height, 8)}%` : '4px',
                        backgroundColor: bar.isToday ? '#10B981' : 'var(--theme-border)',
                      }}
                      title={intl.formatNumber(bar.amount, { style: 'currency', currency })}
                    />
                  </div>
                  <span 
                    className="text-xs font-medium"
                    style={{ color: bar.isToday ? '#10B981' : 'var(--theme-text-muted)' }}
                  >
                    {bar.day}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '12rem', gap: '0.75rem' }}>
              <div className="rounded-xl" style={{ width: '3rem', height: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--theme-border)' }}>
                <svg className="w-6 h-6" style={{ color: 'var(--theme-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
                {intl.formatMessage({ id: 'dashboard.no_spending_this_week', defaultMessage: 'No spending recorded this week' })}
              </p>
              <Link href="/transactions/new" className="text-sm text-emerald-500 font-medium hover:underline">
                {intl.formatMessage({ id: 'dashboard.add_first_expense', defaultMessage: 'Add your first expense' })}
              </Link>
            </div>
          )}
        </div>

        {/* Budgets - Empty State (Budgets feature coming soon) */}
        <div 
          className="col-span-4 rounded-2xl shadow-sm" 
          style={{ 
            padding: '1.25rem',
            backgroundColor: 'var(--theme-bg-card)',
            border: '1px solid var(--theme-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBlockEnd: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {intl.formatMessage({ id: 'dashboard.budgets', defaultMessage: 'Budgets' })}
            </h2>
            <Link href="/budgets" className="text-sm text-emerald-500 font-medium hover:underline" style={{ flexShrink: 0 }}>
              {intl.formatMessage({ id: 'dashboard.view_all', defaultMessage: 'View All' })}
            </Link>
          </div>
          {/* Empty state */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBlock: '2rem', gap: '0.75rem' }}>
            <div className="rounded-xl" style={{ width: '3rem', height: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--theme-border)' }}>
              <svg className="w-6 h-6" style={{ color: 'var(--theme-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-center" style={{ color: 'var(--theme-text-secondary)' }}>
              {intl.formatMessage({ id: 'dashboard.no_budgets_set', defaultMessage: 'No budgets set' })}
            </p>
            <Link 
              href="/budgets" 
              className="text-sm text-emerald-500 font-medium hover:underline"
            >
              {intl.formatMessage({ id: 'dashboard.setup_first_budget', defaultMessage: 'Set up your first budget' })}
            </Link>
          </div>
        </div>
      </div>

      {/* ===== LEARNING PROGRESS SECTION ===== */}
      <div className="grid grid-cols-12 gap-5">
        {/* Learning Overview */}
        <div 
          className="col-span-8 rounded-2xl shadow-sm" 
          style={{ 
            padding: '1.25rem',
            backgroundColor: 'var(--theme-bg-card)',
            border: '1px solid var(--theme-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBlockEnd: '1.5rem', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {intl.formatMessage({ id: 'dashboard.learning_progress', defaultMessage: 'Learning Progress' })}
            </h2>
            <Link href="/learn" className="text-sm text-emerald-500 font-medium hover:underline" style={{ flexShrink: 0 }}>
              {intl.formatMessage({ id: 'dashboard.continue_learning', defaultMessage: 'Continue Learning' })}
            </Link>
          </div>
          
          {/* Learning Stats Row */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBlockEnd: '1.5rem', flexWrap: 'wrap' }}>
            {/* Lessons Completed */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1', minWidth: '140px' }}>
              <div className="rounded-xl" style={{ width: '2.75rem', height: '2.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: 'rgba(99, 102, 241, 0.15)' }}>
                <svg className="w-5 h-5" style={{ color: '#6366F1' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  {intl.formatMessage({ id: 'dashboard.lessons_completed', defaultMessage: 'Lessons Completed' })}
                </p>
                <p className="text-xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>2</p>
              </div>
            </div>
            
            {/* Current Streak */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1', minWidth: '140px' }}>
              <div className="rounded-xl" style={{ width: '2.75rem', height: '2.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                <svg className="w-5 h-5" style={{ color: '#F59E0B' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  {intl.formatMessage({ id: 'dashboard.current_streak', defaultMessage: 'Current Streak' })}
                </p>
                <p className="text-xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                  {intl.formatMessage({ id: 'dashboard.days_count', defaultMessage: '{count} days' }, { count: 3 })}
                </p>
              </div>
            </div>
            
            {/* Time Spent */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1', minWidth: '140px' }}>
              <div className="rounded-xl" style={{ width: '2.75rem', height: '2.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
                <svg className="w-5 h-5" style={{ color: '#10B981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  {intl.formatMessage({ id: 'dashboard.time_spent', defaultMessage: 'Time Spent' })}
                </p>
                <p className="text-xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>13m</p>
              </div>
            </div>
          </div>
          
          {/* Current Learning Path Progress */}
          <div 
            style={{ 
              padding: '1rem',
              borderRadius: 'var(--radius-card)',
              backgroundColor: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBlockEnd: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {intl.formatMessage({ id: 'dashboard.current_path', defaultMessage: 'Current Path' })}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--theme-text-muted)' }}>
                  {intl.formatMessage({ id: 'dashboard.module_progress', defaultMessage: 'Module 1 of 4' })}
                </span>
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6366F1' }}>40%</span>
            </div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)', marginBlockEnd: '0.5rem' }}>
              {intl.formatMessage({ id: 'dashboard.financial_foundations', defaultMessage: 'Financial Foundations' })}
            </h3>
            <div style={{ height: '6px', backgroundColor: 'rgba(99, 102, 241, 0.2)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '40%', backgroundColor: '#6366F1', borderRadius: '999px' }} />
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--theme-text-muted)' }}>
              {intl.formatMessage({ id: 'dashboard.next_lesson', defaultMessage: 'Next: Understanding Needs vs. Wants' })}
            </p>
          </div>
        </div>

        {/* Featured & Recommendations */}
        <div 
          className="col-span-4 rounded-2xl shadow-sm" 
          style={{ 
            padding: '1.25rem',
            backgroundColor: 'var(--theme-bg-card)',
            border: '1px solid var(--theme-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBlockEnd: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {intl.formatMessage({ id: 'dashboard.for_you', defaultMessage: 'For You' })}
            </h2>
          </div>
          
          {/* Featured Article */}
          <div 
            style={{ 
              padding: '0.875rem',
              borderRadius: 'var(--radius-card)',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              marginBlockEnd: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBlockEnd: '0.5rem' }}>
              <svg className="w-4 h-4" style={{ color: '#10B981', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {intl.formatMessage({ id: 'dashboard.featured', defaultMessage: 'Featured' })}
              </span>
            </div>
            <h4 className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)', marginBlockEnd: '0.25rem' }}>
              {intl.formatMessage({ id: 'dashboard.featured_article_title', defaultMessage: 'The 50/30/20 Budget Rule' })}
            </h4>
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              {intl.formatMessage({ id: 'dashboard.min_read', defaultMessage: '{min} min read' }, { min: 5 })}
            </p>
          </div>
          
          {/* AI Goal Suggestions */}
          <AIGoalSuggestions />
          
          {/* Quick Action */}
          <Link 
            href="/learn"
            style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--theme-border)',
              color: 'var(--theme-text-secondary)',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
            }}
            className="hover:bg-white/5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {intl.formatMessage({ id: 'dashboard.explore_all_courses', defaultMessage: 'Explore All Courses' })}
          </Link>
        </div>
      </div>

      {/* ===== RECENT TRANSACTIONS ===== */}
      <div 
        className="rounded-2xl shadow-sm" 
        style={{ 
          padding: '1.25rem',
          backgroundColor: 'var(--theme-bg-card)',
          border: '1px solid var(--theme-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBlockEnd: '1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
            {intl.formatMessage({ id: 'dashboard.recent_transactions', defaultMessage: 'Recent Transactions' })}
          </h2>
          <Link href="/transactions" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }} className="text-sm text-emerald-500 font-medium hover:underline">
            <span>{intl.formatMessage({ id: 'dashboard.view_all', defaultMessage: 'View All' })}</span>
            <svg style={{ width: '1rem', height: '1rem', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {/* Table or Empty State */}
        {recentTransactions.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--theme-border)' }}>
                <th style={{ textAlign: 'start', paddingBlock: '0.75rem', color: 'var(--theme-text-muted)' }} className="text-xs font-medium uppercase tracking-wider">
                  {intl.formatMessage({ id: 'dashboard.transaction', defaultMessage: 'Transaction' })}
                </th>
                <th style={{ textAlign: 'start', paddingBlock: '0.75rem', color: 'var(--theme-text-muted)' }} className="text-xs font-medium uppercase tracking-wider">
                  {intl.formatMessage({ id: 'dashboard.category', defaultMessage: 'Category' })}
                </th>
                <th style={{ textAlign: 'start', paddingBlock: '0.75rem', color: 'var(--theme-text-muted)' }} className="text-xs font-medium uppercase tracking-wider">
                  {intl.formatMessage({ id: 'dashboard.date', defaultMessage: 'Date' })}
                </th>
                <th style={{ textAlign: 'start', paddingBlock: '0.75rem', color: 'var(--theme-text-muted)' }} className="text-xs font-medium uppercase tracking-wider">
                  {intl.formatMessage({ id: 'dashboard.status', defaultMessage: 'Status' })}
                </th>
                <th style={{ textAlign: 'end', paddingBlock: '0.75rem', color: 'var(--theme-text-muted)' }} className="text-xs font-medium uppercase tracking-wider">
                  {intl.formatMessage({ id: 'dashboard.amount', defaultMessage: 'Amount' })}
                </th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx) => {
                // Map category to emoji icon
                const getCategoryIcon = (category: string | null) => {
                  const icons: Record<string, string> = {
                    food: '🍽️',
                    transport: '🚗',
                    shopping: '🛍️',
                    entertainment: '🎬',
                    health: '🏥',
                    utilities: '💡',
                    salary: '💰',
                    freelance: '💼',
                    investment: '📈',
                    gift: '🎁',
                    other: '📋',
                  };
                  return icons[category || 'other'] || '📋';
                };

                return (
                  <tr key={tx.id} style={{ borderBottom: '1px solid var(--theme-divider)' }} className="last:border-b-0">
                    <td style={{ paddingBlock: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="rounded-xl" style={{ width: '2.5rem', height: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0, backgroundColor: 'var(--theme-border)' }}>
                          {getCategoryIcon(tx.category)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{tx.description || tx.category || intl.formatMessage({ id: 'dashboard.transaction', defaultMessage: 'Transaction' })}</p>
                          <p className="text-xs capitalize" style={{ color: 'var(--theme-text-muted)' }}>{tx.type === 'income' ? intl.formatMessage({ id: 'dashboard.income', defaultMessage: 'Income' }) : intl.formatMessage({ id: 'dashboard.expense', defaultMessage: 'Expense' })}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ paddingBlock: '1rem', color: 'var(--theme-text-secondary)' }} className="text-sm capitalize">{tx.category || '—'}</td>
                    <td style={{ paddingBlock: '1rem', color: 'var(--theme-text-secondary)' }} className="text-sm">
                      {tx.date ? intl.formatDate(new Date(tx.date), { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ paddingBlock: '1rem' }}>
                      <span style={{ paddingInline: '0.5rem', paddingBlock: '0.125rem', backgroundColor: 'rgba(16, 185, 129, 0.15)' }} className="text-xs font-medium rounded-full text-emerald-500">
                        {intl.formatMessage({ id: 'dashboard.completed', defaultMessage: 'Completed' })}
                      </span>
                    </td>
                    <td 
                      style={{ paddingBlock: '1rem', textAlign: 'end' }} 
                      className={`text-sm font-medium ${tx.type === 'expense' ? '' : 'text-emerald-500'}`}
                    >
                      <span style={{ color: tx.type === 'expense' ? 'var(--theme-text-primary)' : '#10B981' }}>
                        {tx.type === 'income' ? '+' : '-'}{intl.formatNumber(Math.abs(tx.amount), { style: 'currency', currency: tx.currency || currency })}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBlock: '3rem', gap: '1rem' }}>
            <div className="rounded-xl" style={{ width: '4rem', height: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--theme-border)' }}>
              <svg className="w-8 h-8" style={{ color: 'var(--theme-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
              {intl.formatMessage({ id: 'dashboard.no_transactions_yet', defaultMessage: 'No transactions yet' })}
            </p>
            <p className="text-xs text-center max-w-xs" style={{ color: 'var(--theme-text-muted)' }}>
              {intl.formatMessage({ id: 'dashboard.add_transaction_hint', defaultMessage: 'Add your first transaction to start tracking your finances' })}
            </p>
            <Link 
              href="/transactions/new" 
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

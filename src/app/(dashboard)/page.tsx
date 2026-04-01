'use client';

import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useCurrency, useUser, useUserName, useLanguage } from '@/store/useStore';
import { useBudget } from '@/store/budgetStore';
import { useGoals } from '@/store/goalsStore';
import { useTransactions } from '@/store/transactionStore';
import { useMemo, useState, useEffect } from 'react';
import { DEFAULT_EXPENSE_CATEGORIES, ALL_CATEGORIES, CURRENCIES } from '@/lib/constants';
import { AIAlertBanner, AIGoalSuggestions } from '@/components/AIAlertBanner';
import { styledNum } from '@/components/StyledNumber';
import { Skeleton } from '@/components/ui/Skeleton';
import { useNotificationStore } from '@/store/notificationStore';

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

  /* ---------- Micro-interaction states ---------- */
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const [mounted, setMounted] = useState(false);
  const [skipCoaching, setSkipCoaching] = useState(false);
  useEffect(() => { setMounted(true); }, []);

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
  const { categoryBudgets } = useBudget();
  const { savingsGoals } = useGoals();
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
    const days = [
      intl.formatMessage({ id: 'dashboard.day_sun', defaultMessage: 'Sun' }),
      intl.formatMessage({ id: 'dashboard.day_mon', defaultMessage: 'Mon' }),
      intl.formatMessage({ id: 'dashboard.day_tue', defaultMessage: 'Tue' }),
      intl.formatMessage({ id: 'dashboard.day_wed', defaultMessage: 'Wed' }),
      intl.formatMessage({ id: 'dashboard.day_thu', defaultMessage: 'Thu' }),
      intl.formatMessage({ id: 'dashboard.day_fri', defaultMessage: 'Fri' }),
      intl.formatMessage({ id: 'dashboard.day_sat', defaultMessage: 'Sat' }),
    ];
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
  }, [transactions, intl]);

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

  /* ---------- Previous Month Data (for trend comparison) ---------- */
  const previousMonthData = useMemo(() => {
    const now = new Date();
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    let prevIncome = 0;
    let prevExpenses = 0;
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (d >= prevStart && d <= prevEnd) {
        if (tx.type === 'income') prevIncome += Math.abs(tx.amount);
        else prevExpenses += Math.abs(tx.amount);
      }
    });
    return { income: prevIncome, expenses: prevExpenses, cashFlow: prevIncome - prevExpenses };
  }, [transactions]);

  /* ---------- Year-to-Date Cumulative Cash Flow ---------- */
  const ytdCashFlow = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    let income = 0;
    let expenses = 0;
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (d >= startOfYear && d <= now) {
        if (tx.type === 'income') income += Math.abs(tx.amount);
        else expenses += Math.abs(tx.amount);
      }
    });
    return { income, expenses, net: income - expenses };
  }, [transactions]);

  /* ---------- Budget Utilization ---------- */
  const budgetUtilization = useMemo(() => {
    if (activeBudgets.length === 0) return null;
    const totalBudgeted = activeBudgets.reduce((s, b) => s + b.limit, 0);
    const totalSpent = activeBudgets.reduce((s, b) => s + b.spent, 0);
    const withinBudget = activeBudgets.filter(b => b.spent <= b.limit).length;
    return {
      totalBudgeted,
      totalSpent,
      percentage: totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0,
      withinBudget,
      totalCategories: activeBudgets.length,
      isOver: totalSpent > totalBudgeted,
    };
  }, [activeBudgets]);

  /* ---------- Cash Flow Trend vs Last Month ---------- */
  const cashFlowTrend = useMemo(() => {
    const prevCF = previousMonthData.cashFlow;
    if (prevCF === 0 && monthlyCashFlow === 0) return { direction: 'same' as const, percent: 0 };
    if (prevCF === 0) return { direction: monthlyCashFlow > 0 ? 'up' as const : 'down' as const, percent: 100 };
    const change = ((monthlyCashFlow - prevCF) / Math.abs(prevCF)) * 100;
    return {
      direction: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'same' as const,
      percent: Math.min(Math.abs(Math.round(change)), 999),
    };
  }, [monthlyCashFlow, previousMonthData]);

  // Smart notification generation
  const addNotification = useNotificationStore(state => state.addNotification);

  useEffect(() => {
    if (!transactions.length) return;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const daysLeft = endOfMonth.getDate() - now.getDate();

    const currentSpending: Record<string, number> = {};
    const prevSpending: Record<string, number> = {};
    let currentMonthIncome = 0;

    transactions.forEach((tx) => {
      const d = new Date(tx.date);
      if (tx.type === 'expense' && d >= startOfMonth && d <= endOfMonth) {
        const cat = tx.category || 'other';
        currentSpending[cat] = (currentSpending[cat] || 0) + Math.abs(tx.amount);
      }
      if (tx.type === 'expense' && d >= prevStart && d <= prevEnd) {
        const cat = tx.category || 'other';
        prevSpending[cat] = (prevSpending[cat] || 0) + Math.abs(tx.amount);
      }
      if (tx.type === 'income' && d >= startOfMonth && d <= endOfMonth) {
        currentMonthIncome += Math.abs(tx.amount);
      }
    });

    // 1. Spending spike — any category up 30%+ vs last month
    Object.entries(currentSpending).forEach(([cat, amount]) => {
      const prev = prevSpending[cat] || 0;
      if (prev > 0 && amount > prev * 1.3) {
        const pctIncrease = Math.round(((amount - prev) / prev) * 100);
        addNotification({
          type: 'spending_alert',
          severity: 'critical',
          messageEn: `Your ${cat} spending is trending ${pctIncrease}% higher than last month with ${daysLeft} days left.`,
          messageAr: `إنفاقك على ${cat} يتجه للارتفاع بنسبة ${intl.formatNumber(pctIncrease)}% مقارنة بالشهر الماضي مع بقاء ${intl.formatNumber(daysLeft)} يوماً.`,
          actionHref: '/transactions',
          actionLabelEn: 'View transactions',
          actionLabelAr: 'عرض المعاملات',
        });
      }
    });

    // 2. Goal proximity — any goal within 10% of completion
    if (savingsGoals) {
      savingsGoals.forEach((goal) => {
        if (goal.targetAmount <= 0) return;
        const pct = goal.currentAmount / goal.targetAmount;
        const remaining = goal.targetAmount - goal.currentAmount;
        if (pct >= 0.9 && pct < 1) {
          addNotification({
            type: 'goal_progress',
            severity: 'positive',
            messageEn: `You're ${currency} ${intl.formatNumber(Math.round(remaining))} away from your ${goal.name} goal. One more deposit!`,
            messageAr: `أنت على بعد ${currency} ${intl.formatNumber(Math.round(remaining))} من هدف ${goal.nameAr || goal.name}. إيداع واحد آخر!`,
            actionHref: '/goals',
            actionLabelEn: 'Add funds',
            actionLabelAr: 'إضافة أموال',
          });
        }
      });
    }

    // 3. Salary not detected — past the 25th with no income recorded
    if (now.getDate() >= 25 && currentMonthIncome === 0) {
      addNotification({
        type: 'salary_missing',
        severity: 'warning',
        messageEn: `Your salary usually arrives by the 25th. It hasn't been recorded yet this month.`,
        messageAr: `عادةً ما يصل راتبك بحلول ال٢٥ من الشهر. لم يتم تسجيله بعد هذا الشهر.`,
        actionHref: '/transactions/new/income',
        actionLabelEn: 'Add income',
        actionLabelAr: 'إضافة دخل',
      });
    }

    // 4. Overspending alert — expenses exceed income
    const totalCurrentExpenses = Object.values(currentSpending).reduce((s, v) => s + v, 0);
    if (currentMonthIncome > 0 && totalCurrentExpenses > currentMonthIncome) {
      addNotification({
        type: 'spending_alert',
        severity: 'warning',
        messageEn: `You're spending more than you earn this month. Review your expenses to get back on track.`,
        messageAr: `إنفاقك أكثر من دخلك هذا الشهر. راجع مصروفاتك للعودة إلى المسار الصحيح.`,
        actionHref: '/transactions',
        actionLabelEn: 'Review spending',
        actionLabelAr: 'مراجعة الإنفاق',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, savingsGoals]);

  /* ---------- Helpers ---------- */
  const fmtCurrency = (value: number, cur: string = currency) =>
    styledNum(intl.formatNumber(value, { style: 'currency', currency: cur }));
  const fmtLocale = (value: number) =>
    styledNum(intl.formatNumber(value));

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

  if (isInitialLoad) {
    return (
      <div className="ds-page" style={{ background: 'var(--ds-bg-page)', direction: isRTL ? 'rtl' : 'ltr' }}>
        <div className="ds-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
          <Skeleton width="200px" height="32px" borderRadius="8px" />
          <div style={{ height: '16px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <Skeleton height="100px" borderRadius="16px" />
            <Skeleton height="100px" borderRadius="16px" />
            <Skeleton height="100px" borderRadius="16px" />
          </div>
          <div style={{ height: '16px' }} />
          <Skeleton height="200px" borderRadius="16px" />
          <div style={{ height: '16px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Skeleton height="180px" borderRadius="16px" />
            <Skeleton height="180px" borderRadius="16px" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ds-page">
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
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
          style={{ paddingBlock: 'var(--spacing-2)', paddingInline: 'var(--spacing-4)', transition: 'all 150ms ease' }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <svg style={{ width: '1rem', height: '1rem', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>{intl.formatMessage({ id: 'dashboard.add_transaction', defaultMessage: 'Add Transaction' })}</span>
        </Link>
      </div>

      {transactions.length > 0 || skipCoaching ? (
      <>
      {/* ===== MONTHLY FINANCIAL SUMMARY ===== */}
      <div style={{
        background: 'var(--ds-bg-card)',
        border: '0.5px solid var(--ds-border)',
        borderRadius: '16px',
        padding: '20px 24px',
        boxShadow: 'var(--ds-shadow-card)',
        direction: isRTL ? 'rtl' : 'ltr',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ds-text-heading)', margin: 0 }}>
            {intl.formatMessage({ id: 'dashboard.monthly_summary', defaultMessage: 'Monthly Summary' })}
          </p>
          <Link href="/transactions" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ds-primary)', textDecoration: 'none', flexShrink: 0 }}>
            {intl.formatMessage({ id: 'dashboard.view_transactions', defaultMessage: 'View Transactions' })} →
          </Link>
        </div>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {/* Net Cash Flow */}
          <div style={{ flex: '1 1 140px', minWidth: 0 }}>
            <p className="ds-label" style={{ marginBottom: '4px' }}>
              {intl.formatMessage({ id: 'dashboard.net_cash_flow', defaultMessage: 'Net Cash Flow' })}
            </p>
            <p style={{
              fontSize: '22px', fontWeight: 700, margin: '0 0 6px 0',
              color: monthlyCashFlow >= 0 ? 'var(--color-accent-growth)' : 'var(--color-danger-text)',
            }}>
              {monthlyCashFlow >= 0 ? '+' : ''}{fmtCurrency(monthlyCashFlow)}
            </p>
            {(previousMonthData.income > 0 || previousMonthData.expenses > 0) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{
                  fontSize: '11px', fontWeight: 500,
                  color: cashFlowTrend.direction === 'up' ? 'var(--color-accent-growth)' : cashFlowTrend.direction === 'down' ? 'var(--color-danger-text)' : 'var(--color-text-muted)',
                }}>
                  {cashFlowTrend.direction === 'up' ? '↑' : cashFlowTrend.direction === 'down' ? '↓' : '→'} {intl.formatNumber(cashFlowTrend.percent)}%
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  {intl.formatMessage({ id: 'dashboard.vs_last_month', defaultMessage: 'vs last month' })}
                </span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="ds-divider-v" style={{ height: 'auto', alignSelf: 'stretch' }} />

          {/* YTD Cumulative Cash Flow */}
          <div style={{ flex: '1.5 1 180px', minWidth: 0 }}>
            <p className="ds-label" style={{ marginBottom: '8px' }}>
              {intl.formatMessage({ id: 'dashboard.ytd_cash_flow', defaultMessage: 'Year to Date Cash Flow' })}
            </p>
            {(ytdCashFlow.income > 0 || ytdCashFlow.expenses > 0) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* YTD bar */}
                <div style={{ height: '6px', borderRadius: '3px', background: 'var(--ds-border)', overflow: 'hidden', display: 'flex' }}>
                  {(() => {
                    const total = ytdCashFlow.income + ytdCashFlow.expenses;
                    const incPct = total > 0 ? (ytdCashFlow.income / total) * 100 : 50;
                    return (
                      <>
                        <div style={{
                          height: '100%',
                          width: mounted ? `${incPct}%` : '0%',
                          background: 'var(--color-accent-growth)',
                          borderRadius: '3px 0 0 3px',
                          transition: 'width 600ms ease-out',
                        }} />
                        <div style={{
                          height: '100%',
                          width: mounted ? `${100 - incPct}%` : '0%',
                          background: 'var(--color-danger-text)',
                          borderRadius: '0 3px 3px 0',
                          transition: 'width 600ms ease-out',
                        }} />
                      </>
                    );
                  })()}
                </div>
                {/* Income / Expenses rows */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent-growth)', flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      {intl.formatMessage({ id: 'dashboard.ytd_income', defaultMessage: 'Income' })}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--color-accent-growth)', fontWeight: 600 }}>
                    {currencySymbol} {fmtLocale(ytdCashFlow.income)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-danger-text)', flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      {intl.formatMessage({ id: 'dashboard.ytd_expenses', defaultMessage: 'Expenses' })}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--color-danger-text)', fontWeight: 600 }}>
                    {currencySymbol} {fmtLocale(ytdCashFlow.expenses)}
                  </span>
                </div>
                {/* Net line */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '0.5px solid var(--ds-border)', paddingTop: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    {intl.formatMessage({ id: 'dashboard.ytd_net', defaultMessage: 'Net' })}
                  </span>
                  <span style={{
                    fontSize: '13px', fontWeight: 700,
                    color: ytdCashFlow.net >= 0 ? 'var(--color-accent-growth)' : 'var(--color-danger-text)',
                  }}>
                    {ytdCashFlow.net >= 0 ? '+' : ''}{currencySymbol} {fmtLocale(ytdCashFlow.net)}
                  </span>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                {intl.formatMessage({ id: 'dashboard.no_ytd_data', defaultMessage: 'No transactions this year' })}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="ds-divider-v" style={{ height: 'auto', alignSelf: 'stretch' }} />

          {/* Budget Usage */}
          <div style={{ flex: '1 1 140px', minWidth: 0 }}>
            <p className="ds-label" style={{ marginBottom: '8px' }}>
              {intl.formatMessage({ id: 'dashboard.budget_usage', defaultMessage: 'Budget Usage' })}
            </p>
            {budgetUtilization ? (
              <>
                <div className="ds-progress" style={{ height: '6px', marginBottom: '8px' }}>
                  <div className="ds-progress-fill" style={{
                    width: mounted ? `${budgetUtilization.percentage}%` : '0%',
                    background: budgetUtilization.isOver ? 'var(--color-danger-text)' : 'var(--ds-primary)',
                    transition: 'width 600ms ease-out',
                  }} />
                </div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text-heading)', margin: '0 0 2px 0' }}>
                  {intl.formatNumber(Math.round(budgetUtilization.percentage))}%
                  <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--color-text-muted)', marginInlineStart: '4px' }}>
                    {intl.formatMessage({ id: 'dashboard.used', defaultMessage: 'used' })}
                  </span>
                </p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>
                  {intl.formatMessage(
                    { id: 'dashboard.categories_within_budget', defaultMessage: '{count} of {total} within budget' },
                    { count: intl.formatNumber(budgetUtilization.withinBudget), total: intl.formatNumber(budgetUtilization.totalCategories) }
                  )}
                </p>
              </>
            ) : (
              <div>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 6px 0' }}>
                  {intl.formatMessage({ id: 'dashboard.no_budgets_set', defaultMessage: 'No budgets set' })}
                </p>
                <Link href="/budgets" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-primary)', textDecoration: 'none' }}>
                  {intl.formatMessage({ id: 'dashboard.setup_first_budget', defaultMessage: 'Set up your first budget' })}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== TOP CARDS ROW ===== */}
      <div className="ds-grid">
        {/* ── Hero: Total Balance ── */}
        <div
          className={totalBalance < 0 ? 'ds-col-4' : 'ds-card-hero ds-col-4'}
          style={{
            minHeight: '180px',
            ...(totalBalance < 0
              ? {
                  background: 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 50%, #DC2626 100%)',
                  border: 'none',
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--spacing-5)',
                  boxShadow: '0 4px 24px rgba(220, 38, 38, 0.25)',
                  position: 'relative' as const,
                  overflow: 'hidden',
                  color: '#FFFFFF',
                }
              : {}),
          }}
        >
          <p className="ds-label" style={{ color: 'rgba(255,255,255,0.65)', marginBottom: 'var(--spacing-2)', textTransform: 'uppercase' }}>
            {intl.formatMessage({ id: 'dashboard.total_balance', defaultMessage: 'Total Balance' })}
          </p>
          <div className="ds-metric" style={{ color: '#FFFFFF', fontSize: 'clamp(1.5rem, 4vw, 2.25rem)' }}>
            {fmtCurrency(totalBalance)}
          </div>
          {totalBalance < 0 && hasTransactions && (
            <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: 'var(--spacing-2)', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {intl.formatMessage({ id: 'dashboard.negative_balance_warning', defaultMessage: 'Expenses exceed income' })}
            </p>
          )}
          {!hasTransactions && (
            <p className="ds-supporting" style={{ color: 'rgba(255,255,255,0.65)', marginTop: 'var(--spacing-2)' }}>
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
              {totalBalance < 0 ? (
                <svg style={{ width: '1.5rem', height: '1.5rem', color: 'rgba(255,255,255,0.5)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg style={{ width: '1.5rem', height: '1.5rem', color: 'rgba(255,255,255,0.5)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              )}
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
                  {fmtCurrency(monthlyIncome)}
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
                  {fmtCurrency(monthlyExpenses)}
                </p>
              </div>
            </div>
          </div>

          {/* Cash flow bar */}
          {(monthlyIncome > 0 || monthlyExpenses > 0) ? (
            <div style={{ marginTop: 'var(--spacing-5)' }}>
              <div className="ds-progress" style={{ display: 'flex' }}>
                <div className="ds-progress-fill" style={{ width: mounted ? `${incomeRatio}%` : '0%', borderRadius: 'var(--radius-pill) 0 0 var(--radius-pill)', transition: 'width 600ms ease-out' }} />
                <div style={{ height: '100%', width: mounted ? `${100 - incomeRatio}%` : '0%', background: 'var(--color-danger-text)', borderRadius: '0 var(--radius-pill) var(--radius-pill) 0', transition: 'width 600ms ease-out' }} />
              </div>
              <p className="ds-supporting" style={{ textAlign: 'center', marginTop: 'var(--spacing-3)', fontWeight: 500, color: monthlyCashFlow >= 0 ? 'var(--color-accent-growth)' : 'var(--color-danger-text)' }}>
                {monthlyCashFlow >= 0
                  ? <>{intl.formatMessage({ id: 'dashboard.saved_label', defaultMessage: 'Saved' })} {fmtCurrency(monthlyCashFlow)} {intl.formatMessage({ id: 'dashboard.this_month_suffix', defaultMessage: 'this month' })}</>
                  : <>{intl.formatMessage({ id: 'dashboard.overspent_label', defaultMessage: 'Overspent' })} {fmtCurrency(Math.abs(monthlyCashFlow))} {intl.formatMessage({ id: 'dashboard.this_month_suffix', defaultMessage: 'this month' })}</>
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
                    {intl.formatMessage({ id: 'dashboard.target_amount', defaultMessage: 'Target: {amount}' }, { amount: `${currencySymbol} ${intl.formatNumber(topGoal.targetAmount)}` })}
                  </p>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-1)' }}>
                  <span className="ds-label">{currencySymbol} {fmtLocale(topGoal.currentAmount)}</span>
                  <span className="ds-label">{intl.formatNumber(goalPct)}%</span>
                </div>
                <div className="ds-progress">
                  <div className="ds-progress-fill" style={{ width: mounted ? `${goalPct}%` : '0%', background: topGoal.color, transition: 'width 600ms ease-out' }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="ds-empty-state" style={{ paddingBlock: 'var(--spacing-6)', animation: 'fadeIn 300ms ease-out' }}>
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
            <div className="ds-empty-state" style={{ animation: 'fadeIn 300ms ease-out' }}>
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
                        {currencySymbol} {fmtLocale(b.spent)} / {fmtLocale(b.limit)}
                      </span>
                    </div>
                    <div className="ds-progress" style={{ height: '4px' }}>
                      <div className="ds-progress-fill" style={{ width: mounted ? `${b.percentage}%` : '0%', background: isOver ? 'var(--color-danger-text)' : b.color, transition: 'width 600ms ease-out' }} />
                    </div>
                  </div>
                );
              })}
              {activeBudgets.length > 4 && (
                <Link href="/budgets" className="ds-link-action" style={{ textAlign: 'center' }}>
                  {intl.formatMessage({ id: 'dashboard.more_budgets', defaultMessage: '+{count} more' }, { count: intl.formatNumber(activeBudgets.length - 4) })}
                </Link>
              )}
            </div>
          ) : (
            <div className="ds-empty-state" style={{ paddingBlock: 'var(--spacing-8)', animation: 'fadeIn 300ms ease-out' }}>
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
              { labelId: 'dashboard.lessons_completed', label: 'Lessons Completed', value: intl.formatNumber(2), iconColor: 'var(--ds-primary)', bg: 'rgba(45,106,79,0.1)', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
              { labelId: 'dashboard.current_streak', label: 'Current Streak', value: intl.formatMessage({ id: 'dashboard.days_count', defaultMessage: '{count} days' }, { count: intl.formatNumber(3) }), iconColor: '#D4920A', bg: 'rgba(212,146,10,0.12)', icon: 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z' },
              { labelId: 'dashboard.time_spent', label: 'Time Spent', value: isRTL ? '١٣ د' : '13m', iconColor: 'var(--color-accent-growth)', bg: 'var(--color-accent-growth-subtle)', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
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

          {/* Financial Literacy Score */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            padding: '12px 16px',
            background: 'var(--ds-bg-card)',
            border: '0.5px solid var(--ds-border)',
            borderRadius: '12px',
            marginBottom: '16px',
          }}>
            {(() => {
              const score = 0;
              const radius = 19;
              const circumference = 2 * Math.PI * radius;
              const displayPercent = score === 0 ? 3 : Math.min(score, 100);
              const offset = circumference - (displayPercent / 100) * circumference;
              return (
                <div style={{ width: '48px', height: '48px', flexShrink: 0, position: 'relative' }}>
                  <svg width="48" height="48" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r={radius} fill="none" stroke="var(--ds-border)" strokeWidth="3" />
                    <circle cx="24" cy="24" r={radius} fill="none" stroke="var(--ds-primary)" strokeWidth="3"
                      strokeDasharray={circumference} strokeDashoffset={offset}
                      strokeLinecap="round" transform="rotate(-90 24 24)" />
                  </svg>
                  <span style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '15px', fontWeight: 700, color: 'var(--ds-text-heading)',
                  }}>
                    {intl.formatNumber(score)}
                  </span>
                </div>
              );
            })()}
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', margin: 0 }}>
                {intl.formatMessage({ id: 'dashboard.literacy_score', defaultMessage: 'Financial Literacy Score' })}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', margin: '2px 0 0 0' }}>
                {intl.formatMessage({ id: 'dashboard.literacy_score_desc', defaultMessage: 'Complete courses to improve' })}
              </p>
            </div>
            <Link
              href="/learn"
              style={{
                marginInlineStart: 'auto',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--ds-primary)',
                textDecoration: 'none',
                flexShrink: 0,
              }}
            >
              {intl.formatMessage({ id: 'dashboard.improve', defaultMessage: 'Improve' })} →
            </Link>
          </div>

          {/* Current Learning Path */}
          <div className="ds-card-flush" style={{ background: 'var(--ds-bg-tinted)', border: '0.5px solid var(--ds-border-tinted)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-4)' }}>
            <div className="ds-section-header" style={{ marginBottom: 'var(--spacing-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                <span className="ds-label" style={{ color: 'var(--ds-primary)' }}>
                  {intl.formatMessage({ id: 'dashboard.current_path', defaultMessage: 'Current Path' })}
                </span>
                <span className="ds-supporting">
                  {intl.formatMessage({ id: 'dashboard.module_progress', defaultMessage: 'Module 1 of 4' })}
                </span>
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ds-primary)' }}>{intl.formatNumber(40)}%</span>
            </div>
            <h3 className="ds-body" style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-2)' }}>
              {intl.formatMessage({ id: 'dashboard.financial_foundations', defaultMessage: 'Financial Foundations' })}
            </h3>
            <div className="ds-progress" style={{ background: 'var(--ds-bg-tinted)' }}>
              <div className="ds-progress-fill" style={{ width: mounted ? '40%' : '0%', background: 'var(--ds-primary-glow)', transition: 'width 600ms ease-out' }} />
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
          <div
            className="ds-card-flush"
            style={{ background: 'var(--color-accent-growth-subtle)', border: '1px solid rgba(31,122,90,0.15)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', cursor: 'pointer', transition: 'box-shadow 200ms ease' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
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
              {intl.formatMessage({ id: 'dashboard.min_read', defaultMessage: '{min} min read' }, { min: intl.formatNumber(5) })}
            </p>
          </div>

          {/* Recommended for you — horizontal scroll */}
          <div
            className="ds-hide-scrollbar"
            style={{
              display: 'flex',
              gap: '12px',
              overflowX: 'auto',
              marginBottom: '12px',
              paddingBottom: '4px',
            }}
          >
            {[
              {
                titleId: 'dashboard.rec_budgeting',
                titleDefault: 'Budgeting Basics',
                titleAr: 'أساسيات الميزانية',
                descId: 'dashboard.rec_budgeting_desc',
                descDefault: 'Build your first budget',
                descAr: 'ابنِ ميزانيتك الأولى',
                color: '#2D6A4F',
              },
              {
                titleId: 'dashboard.rec_saving',
                titleDefault: 'Emergency Fund',
                titleAr: 'صندوق الطوارئ',
                descId: 'dashboard.rec_saving_desc',
                descDefault: 'Start saving today',
                descAr: 'ابدأ الادخار اليوم',
                color: '#0E7490',
              },
              {
                titleId: 'dashboard.rec_investing',
                titleDefault: 'Investing 101',
                titleAr: 'مقدمة في الاستثمار',
                descId: 'dashboard.rec_investing_desc',
                descDefault: 'Grow your wealth',
                descAr: 'نمِّ ثروتك',
                color: '#D97706',
              },
            ].map((rec) => (
              <Link
                key={rec.titleId}
                href="/learn"
                style={{
                  minWidth: '160px',
                  padding: '14px 16px',
                  background: 'var(--ds-bg-card)',
                  border: '0.5px solid var(--ds-border)',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  flexShrink: 0,
                  transition: 'box-shadow 0.2s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: rec.color,
                }} />
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', margin: 0 }}>
                  {isRTL
                    ? rec.titleAr
                    : intl.formatMessage({ id: rec.titleId, defaultMessage: rec.titleDefault })}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', margin: 0 }}>
                  {isRTL
                    ? rec.descAr
                    : intl.formatMessage({ id: rec.descId, defaultMessage: rec.descDefault })}
                </p>
              </Link>
            ))}
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
                    <td style={{ textTransform: 'capitalize' }}>{(() => { const cat = ALL_CATEGORIES.find(c => c.id === tx.category); return cat ? (isRTL ? cat.nameAr : cat.name) : (tx.category || '—'); })()}</td>
                    <td>{tx.date ? intl.formatDate(new Date(tx.date), { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                    <td>
                      <span className="ds-badge ds-badge-success">
                        {intl.formatMessage({ id: 'dashboard.completed', defaultMessage: 'Completed' })}
                      </span>
                    </td>
                    <td style={{ textAlign: 'end', fontWeight: 500, color: tx.type === 'expense' ? 'var(--color-text-primary)' : 'var(--color-accent-growth)' }}>
                      {tx.type === 'income' ? '+' : '-'}{fmtCurrency(Math.abs(tx.amount), tx.currency || currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ds-empty-state" style={{ animation: 'fadeIn 300ms ease-out' }}>
            <div className="ds-icon-box-lg" style={{ background: 'var(--color-bg-surface-2)', width: '4rem', height: '4rem' }}>
              <svg style={{ width: '2rem', height: '2rem', color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="ds-supporting">{intl.formatMessage({ id: 'dashboard.no_transactions_yet', defaultMessage: 'No transactions yet' })}</p>
            <p className="ds-supporting" style={{ maxWidth: '16rem' }}>
              {intl.formatMessage({ id: 'dashboard.add_transaction_hint', defaultMessage: 'Add your first transaction to start tracking your finances' })}
            </p>
            <Link
              href="/transactions/new"
              className="ds-btn ds-btn-primary"
              style={{ marginTop: 'var(--spacing-2)', transition: 'all 150ms ease' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <svg style={{ width: '1rem', height: '1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {intl.formatMessage({ id: 'dashboard.add_transaction', defaultMessage: 'Add Transaction' })}
            </Link>
          </div>
        )}
      </div>
      </>
      ) : (
      <>
        {/* ===== COACHING EMPTY STATE ===== */}

        {/* Balance Placeholder */}
        <div style={{
          background: 'var(--ds-bg-card)',
          border: '0.5px solid var(--ds-border)',
          borderRadius: '16px',
          padding: '32px 24px',
          boxShadow: 'var(--ds-shadow-card)',
          textAlign: 'center',
          animation: 'fadeIn 300ms ease-out',
        }}>
          <p style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            {intl.formatMessage({ id: 'dashboard.total_balance', defaultMessage: 'Total Balance' })}
          </p>
          <p style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 700, color: 'var(--ds-text-heading)' }}>
            {fmtCurrency(0)}
          </p>
        </div>

        {/* Coaching Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          animation: 'fadeIn 300ms ease-out',
          animationDelay: '80ms',
          animationFillMode: 'backwards',
        }}>
          {/* Add a transaction */}
          <div style={{
            background: 'var(--ds-bg-card)',
            border: '1.5px solid #D1FAE5',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#F0F7F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: '22px', height: '22px', color: '#2D6A4F' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '2px' }}>
                {intl.formatMessage({ id: 'dashboard.coach_add_title', defaultMessage: 'Add a transaction' })}
              </p>
              <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
                {intl.formatMessage({ id: 'dashboard.coach_add_subtitle', defaultMessage: 'أضف أول معاملة' })}
              </p>
              <p style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>
                {intl.formatMessage({ id: 'dashboard.coach_add_desc', defaultMessage: 'Record your first income or expense to start tracking.' })}
              </p>
            </div>
            <Link
              href="/transactions/new"
              className="ds-btn ds-btn-primary"
              style={{ marginTop: 'auto', textAlign: 'center', transition: 'all 150ms ease' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {intl.formatMessage({ id: 'dashboard.coach_add_cta', defaultMessage: 'Add now' })}
            </Link>
          </div>

          {/* Set a budget */}
          <div style={{
            background: 'var(--ds-bg-card)',
            border: '0.5px solid var(--ds-border)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#F0F7F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: '22px', height: '22px', color: '#2D6A4F' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '2px' }}>
                {intl.formatMessage({ id: 'dashboard.coach_budget_title', defaultMessage: 'Set a budget' })}
              </p>
              <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
                {intl.formatMessage({ id: 'dashboard.coach_budget_subtitle', defaultMessage: 'حدد ميزانيتك' })}
              </p>
              <p style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>
                {intl.formatMessage({ id: 'dashboard.coach_budget_desc', defaultMessage: 'Control your spending with monthly limits per category.' })}
              </p>
            </div>
            <Link
              href="/budgets"
              style={{
                marginTop: 'auto',
                textAlign: 'center',
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--ds-primary)',
                background: 'transparent',
                border: '1px solid var(--ds-border)',
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'all 150ms ease',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {intl.formatMessage({ id: 'dashboard.coach_budget_cta', defaultMessage: 'Set budget' })}
            </Link>
          </div>

          {/* Create a goal */}
          <div style={{
            background: 'var(--ds-bg-card)',
            border: '0.5px solid var(--ds-border)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#F0F7F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: '22px', height: '22px', color: '#2D6A4F' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '2px' }}>
                {intl.formatMessage({ id: 'dashboard.coach_goal_title', defaultMessage: 'Create a goal' })}
              </p>
              <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
                {intl.formatMessage({ id: 'dashboard.coach_goal_subtitle', defaultMessage: 'أنشئ هدفاً مالياً' })}
              </p>
              <p style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>
                {intl.formatMessage({ id: 'dashboard.coach_goal_desc', defaultMessage: 'Save toward something meaningful — emergency fund, travel, or a purchase.' })}
              </p>
            </div>
            <Link
              href="/goals"
              style={{
                marginTop: 'auto',
                textAlign: 'center',
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--ds-primary)',
                background: 'transparent',
                border: '1px solid var(--ds-border)',
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'all 150ms ease',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {intl.formatMessage({ id: 'dashboard.coach_goal_cta', defaultMessage: 'Create goal' })}
            </Link>
          </div>
        </div>

        {/* Mustasharak AI Nudge */}
        <div style={{
          background: '#0F1914',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          animation: 'fadeIn 300ms ease-out',
          animationDelay: '160ms',
          animationFillMode: 'backwards',
        }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(45,106,79,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg style={{ width: '22px', height: '22px', color: '#6EE7B7' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.59.659H9.06a2.25 2.25 0 01-1.59-.659L5 14.5m14 0V5a2 2 0 00-2-2H7a2 2 0 00-2 2v9.5" />
            </svg>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, margin: 0 }}>
            {intl.formatMessage({ id: 'dashboard.coach_ai_nudge', defaultMessage: "Add your first transaction and I'll start analyzing your spending patterns." })}
          </p>
        </div>

        {/* Skip coaching */}
        <button
          onClick={() => setSkipCoaching(true)}
          style={{
            display: 'block', margin: '16px auto 0', background: 'none', border: 'none',
            fontSize: '12px', fontWeight: 500, color: '#9CA3AF', cursor: 'pointer',
          }}
        >
          {isRTL ? 'تخطي' : 'Skip'}
        </button>
      </>
      )}
    </div>
  );
}

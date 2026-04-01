'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useLanguage, useCurrency } from '@/store/useStore';
import { useTransactions } from '@/store/transactionStore';
import type { Transaction } from '@/store/transactionStore';
import { useBudget } from '@/store/budgetStore';
import { DEFAULT_EXPENSE_CATEGORIES, CURRENCIES } from '@/lib/constants';
import { styledNum } from '@/components/StyledNumber';
import { Skeleton } from '@/components/ui/Skeleton';
import { Toast } from '@/components/ui/Toast';
import { useGoals, getMonthlyFundingAmount, goalFundingCategoryId } from '@/store/goalsStore';
import { calculateHealthScore } from '@/lib/healthScore';
import { useEmergencyFund } from '@/store/emergencyFundStore';

/* ===== ICONS (module scope — Fault Log F-007) ===== */
const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const SaveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/* ===== CATEGORY ROW (module scope) ===== */
function CategoryBudgetRow({
  categoryId,
  name,
  color,
  spent,
  budgetValue,
  currencySymbol,
  onChange,
  isRTL,
  fmtNumber,
}: {
  categoryId: string;
  name: string;
  color: string;
  spent: number;
  budgetValue: string;
  currencySymbol: string;
  onChange: (value: string) => void;
  isRTL: boolean;
  fmtNumber: (value: number) => string;
}) {
  const limit = parseFloat(budgetValue) || 0;
  const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const isOver = spent > limit && limit > 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: 'var(--ds-bg-input)',
        border: '0.5px solid var(--ds-border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Color dot */}
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
        {/* Category name */}
        <span
          style={{
            flex: 1,
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--ds-text-heading)',
          }}
        >
          {name}
        </span>
        {/* Budget input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '130px' }}>
          <span style={{ fontSize: '12px', color: 'var(--ds-text-muted)', flexShrink: 0 }}>
            {currencySymbol}
          </span>
          <input
            type="number"
            value={budgetValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0"
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: '14px',
              fontWeight: 500,
              border: '0.5px solid var(--ds-border)',
              borderRadius: '8px',
              backgroundColor: 'var(--ds-bg-card)',
              color: 'var(--ds-text-heading)',
              outline: 'none',
              direction: 'ltr',
              textAlign: isRTL ? 'right' : 'left',
            }}
          />
        </div>
      </div>

      {/* Progress bar (only shows when budget is set) */}
      {limit > 0 && (
        <div>
          <div
            style={{
              height: '4px',
              borderRadius: '4px',
              backgroundColor: 'var(--ds-bg-tinted)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${percentage}%`,
                borderRadius: '4px',
                backgroundColor: isOver ? 'var(--ds-error)' : color,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '4px',
              fontSize: '11px',
              color: isOver ? 'var(--ds-error)' : 'var(--ds-text-muted)',
            }}
          >
            <span>{currencySymbol} {styledNum(fmtNumber(spent))}</span>
            <span>{styledNum(fmtNumber(Math.round(percentage)))}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/* ===== MAIN PAGE ===== */
export default function BudgetsPage() {
  const intl = useIntl();
  const language = useLanguage();
  const currency = useCurrency();
  const isRTL = language === 'ar';
  const { monthlyBudget, categoryBudgets, saveAll } = useBudget();
  const { transactions: realTransactions } = useTransactions();

  const transactions = realTransactions;

  const { savingsGoals } = useGoals();
  const { fund: emergencyFund } = useEmergencyFund();

  const currencyInfo = CURRENCIES.find((c) => c.code === currency);
  const currencySymbol = isRTL
    ? currencyInfo?.symbolAr || currencyInfo?.symbol || currency
    : currencyInfo?.symbol || currency;

  // Temp state for editing — only sync from store when user hasn't started editing
  const [tempMonthlyBudget, setTempMonthlyBudget] = useState('');
  const [tempBudgets, setTempBudgets] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      setTempMonthlyBudget(monthlyBudget > 0 ? monthlyBudget.toString() : '');
    }
  }, [monthlyBudget, isDirty]);

  useEffect(() => {
    if (!isDirty) {
      const initial: Record<string, string> = {};
      DEFAULT_EXPENSE_CATEGORIES.forEach((cat) => {
        initial[cat.id] = categoryBudgets[cat.id]?.toString() || '';
      });
      setTempBudgets(initial);
    }
  }, [categoryBudgets, isDirty]);

  // Compute spending per category for current month
  const spendingByCategory = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const map: Record<string, number> = {};
    transactions.forEach((tx) => {
      if (tx.type !== 'expense') return;
      const d = new Date(tx.date);
      if (d >= startOfMonth && d <= endOfMonth) {
        const cat = tx.category || 'other-expense';
        map[cat] = (map[cat] || 0) + Math.abs(tx.amount);
      }
    });
    return map;
  }, [transactions]);

  const totalCategoryBudget = Object.values(tempBudgets).reduce(
    (sum, v) => sum + (parseFloat(v) || 0),
    0
  );
  const monthlyBudgetValue = parseFloat(tempMonthlyBudget) || 0;
  // Display total = monthly budget if set, otherwise sum of categories
  const displayBudget = monthlyBudgetValue > 0 ? monthlyBudgetValue : totalCategoryBudget;
  const totalSpent = Object.values(spendingByCategory).reduce((s, v) => s + v, 0);

  // Health score computation
  const healthScore = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysInMonth = endOfMonth.getDate();
    let mIncome = 0;
    let mExpenses = 0;
    const loggedDays = new Set<string>();
    transactions.forEach((tx: Transaction) => {
      const d = new Date(tx.date);
      if (d >= startOfMonth && d <= endOfMonth) {
        if (tx.type === 'income') mIncome += Math.abs(tx.amount);
        else mExpenses += Math.abs(tx.amount);
        loggedDays.add(tx.date);
      }
    });
    let categoriesOverBudget = 0;
    let totalCatsWithBudget = 0;
    DEFAULT_EXPENSE_CATEGORIES.forEach(cat => {
      const limit = parseFloat(tempBudgets[cat.id]) || categoryBudgets[cat.id] || 0;
      if (limit > 0) {
        totalCatsWithBudget++;
        if ((spendingByCategory[cat.id] || 0) > limit) categoriesOverBudget++;
      }
    });
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    let totalExp3m = 0;
    transactions.forEach((tx: Transaction) => {
      const d = new Date(tx.date);
      if (tx.type === 'expense' && d >= threeMonthsAgo && d <= endOfMonth) {
        totalExp3m += Math.abs(tx.amount);
      }
    });
    const goalsOnTrack = savingsGoals.filter(g => {
      if (g.targetAmount <= 0) return false;
      return g.currentAmount / g.targetAmount > 0;
    }).length;
    return calculateHealthScore({
      monthlyIncome: mIncome,
      monthlyExpenses: mExpenses,
      budgetLimit: displayBudget,
      budgetSpent: totalSpent,
      categoriesOverBudget,
      totalCategories: totalCatsWithBudget,
      emergencyFundCurrent: emergencyFund ? emergencyFund.currentAmount : 0,
      averageMonthlyExpenses: totalExp3m / 3,
      goalsOnTrack,
      totalGoals: savingsGoals.length,
      daysLoggedThisMonth: loggedDays.size,
      daysInMonth,
      coursesCompleted: 0,
      totalCourses: 30,
    });
  }, [transactions, savingsGoals, spendingByCategory, categoryBudgets, tempBudgets, displayBudget, totalSpent, emergencyFund]);

  // Recurring transaction detection
  interface RecurringPattern {
    id: string;
    description: string;
    amount: number;
    amountVaries: boolean;
    amountMin: number;
    amountMax: number;
    frequency: 'monthly' | 'weekly';
    approximateDay: number;
    occurrences: number;
    annualCost: number;
    confirmed: boolean;
    dismissed: boolean;
  }

  const [confirmedPatterns, setConfirmedPatterns] = useState<Record<string, boolean>>({});

  const recurringPatterns = useMemo(() => {
    const expenses = transactions.filter((tx: Transaction) => tx.type === 'expense');
    const groups: Record<string, Transaction[]> = {};
    expenses.forEach((tx: Transaction) => {
      const key = (tx.description || tx.category || 'unknown').toLowerCase().trim();
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });
    const patterns: RecurringPattern[] = [];
    Object.entries(groups).forEach(([key, txs]) => {
      if (txs.length < 2) return;
      const sorted = [...txs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let isMonthly = true;
      for (let i = 1; i < sorted.length; i++) {
        const daysBetween = Math.abs(
          (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime())
          / (1000 * 60 * 60 * 24)
        );
        if (daysBetween < 20 || daysBetween > 40) { isMonthly = false; break; }
      }
      if (!isMonthly) return;
      const amounts = sorted.map(tx => Math.abs(tx.amount));
      const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
      const minAmount = Math.min(...amounts);
      const maxAmount = Math.max(...amounts);
      const amountVaries = (maxAmount - minAmount) / avgAmount > 0.05;
      const days = sorted.map(tx => new Date(tx.date).getDate());
      const avgDay = Math.round(days.reduce((s, d) => s + d, 0) / days.length);
      const id = key.replace(/\s+/g, '_');
      patterns.push({
        id,
        description: sorted[0].description || sorted[0].category || key,
        amount: Math.round(avgAmount),
        amountVaries,
        amountMin: Math.round(minAmount),
        amountMax: Math.round(maxAmount),
        frequency: 'monthly',
        approximateDay: avgDay,
        occurrences: sorted.length,
        annualCost: Math.round(avgAmount * 12),
        confirmed: confirmedPatterns[id] === true,
        dismissed: confirmedPatterns[id] === false,
      });
    });
    return patterns.filter(p => !p.dismissed).sort((a, b) => b.annualCost - a.annualCost);
  }, [transactions, confirmedPatterns]);

  const totalAnnualRecurring = recurringPatterns.reduce((sum, p) => sum + p.annualCost, 0);

  const handleConfirmPattern = (id: string) => {
    setConfirmedPatterns(prev => ({ ...prev, [id]: true }));
  };

  const handleDismissPattern = (id: string) => {
    setConfirmedPatterns(prev => ({ ...prev, [id]: false }));
  };

  const handleSave = () => {
    const finalCategories: Record<string, number> = {};
    Object.entries(tempBudgets).forEach(([catId, value]) => {
      const amount = parseFloat(value) || 0;
      if (amount > 0) {
        finalCategories[catId] = amount;
      }
    });

    // Preserve goal-funding entries that aren't part of the form
    Object.entries(categoryBudgets).forEach(([catId, value]) => {
      if (catId.startsWith('goal-funding-') && value > 0) {
        finalCategories[catId] = value;
      }
    });

    saveAll(monthlyBudgetValue, finalCategories);
    setIsDirty(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const t = (key: string, defaultMessage: string) =>
    intl.formatMessage({ id: `dashboard.${key}`, defaultMessage });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 80px)',
        padding: 'var(--spacing-3)',
        direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
      {/* Back link */}
      <Link
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--ds-text-muted)',
          textDecoration: 'none',
          marginBottom: 'var(--spacing-2)',
        }}
        className="hover:underline"
      >
        <span style={{ transform: isRTL ? 'scaleX(-1)' : 'none', display: 'inline-flex' }}>
          <ArrowLeftIcon />
        </span>
        {intl.formatMessage({ id: 'dashboard.budgets_back_to_dashboard', defaultMessage: 'Back to Dashboard' })}
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 'var(--spacing-3)' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: 'var(--ds-text-heading)',
            lineHeight: 1.2,
            fontFeatureSettings: '"kern" 1',
          }}
        >
          {t('budgets', 'Budgets')}
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--ds-text-body)',
            lineHeight: 1.6,
            marginTop: '4px',
          }}
        >
          {intl.formatMessage({ id: 'dashboard.budgets_subtitle', defaultMessage: 'Set an overall monthly budget or per-category spending limits.' })}
        </p>
      </div>

      {/* Monthly budget card */}
      <div
        className="ds-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: 'var(--spacing-2)',
        }}
      >
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--ds-text-heading)',
            fontFeatureSettings: '"kern" 1',
          }}
        >
          {intl.formatMessage({ id: 'dashboard.budgets_monthly_budget', defaultMessage: 'Monthly Budget' })}
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginTop: '-8px' }}>
          {intl.formatMessage({ id: 'dashboard.budgets_monthly_budget_desc', defaultMessage: 'Total monthly spending limit (regardless of categories)' })}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-muted)', flexShrink: 0 }}>
            {currencySymbol}
          </span>
          <input
            type="number"
            value={tempMonthlyBudget}
            onChange={(e) => { setTempMonthlyBudget(e.target.value); setIsDirty(true); }}
            placeholder="0"
            style={{
              flex: 1,
              padding: '12px 14px',
              fontSize: '20px',
              fontWeight: 600,
              border: '0.5px solid var(--ds-border)',
              borderRadius: '8px',
              backgroundColor: 'var(--ds-bg-input)',
              color: 'var(--ds-text-heading)',
              outline: 'none',
              direction: 'ltr',
              textAlign: isRTL ? 'right' : 'left',
            }}
          />
        </div>
      </div>

      {/* ===== FINANCIAL HEALTH SCORE ===== */}
      <div style={{
        background: 'var(--ds-bg-card)',
        border: '0.5px solid var(--ds-border)',
        borderRadius: '16px',
        padding: '20px 24px',
        boxShadow: 'var(--ds-shadow-card)',
        marginBottom: '16px',
        direction: isRTL ? 'rtl' : 'ltr',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {/* Score ring */}
          {(() => {
            const r = 30;
            const circ = 2 * Math.PI * r;
            const offset = circ * (1 - healthScore.overall / 100);
            const ringColor = healthScore.overall >= 70 ? 'var(--ds-primary-glow)' : healthScore.overall >= 40 ? 'var(--ds-accent-gold)' : 'var(--ds-error)';
            return (
              <div style={{ position: 'relative', width: '72px', height: '72px', flexShrink: 0 }}>
                <svg width="72" height="72" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r={r} fill="none" stroke="var(--ds-border)" strokeWidth="4" />
                  <circle cx="36" cy="36" r={r} fill="none"
                    stroke={ringColor} strokeWidth="4"
                    strokeDasharray={circ} strokeDashoffset={offset}
                    strokeLinecap="round" transform="rotate(-90 36 36)"
                    style={{ transition: 'stroke-dashoffset 600ms ease-out' }} />
                </svg>
                <span style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px', fontWeight: 700, color: 'var(--ds-text-heading)',
                }}>
                  {intl.formatNumber(healthScore.overall)}
                </span>
              </div>
            );
          })()}

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)', margin: 0 }}>
                {intl.formatMessage({ id: 'dashboard.health_score', defaultMessage: 'Financial health score' })}
              </p>
              {(() => {
                const rc: Record<string, { bg: string; color: string; border: string; en: string; ar: string }> = {
                  excellent: { bg: 'var(--ds-success-bg)', color: 'var(--ds-success-text)', border: 'var(--ds-success-border)', en: 'EXCELLENT', ar: 'ممتاز' },
                  good: { bg: 'var(--ds-success-bg)', color: 'var(--ds-success-text)', border: 'var(--ds-success-border)', en: 'GOOD', ar: 'جيد' },
                  fair: { bg: 'var(--ds-warning-bg)', color: 'var(--ds-warning-text)', border: 'var(--ds-warning-border)', en: 'FAIR', ar: 'مقبول' },
                  needs_work: { bg: 'var(--ds-error-bg)', color: 'var(--ds-error-text)', border: 'var(--ds-error-border)', en: 'NEEDS WORK', ar: 'يحتاج تحسين' },
                };
                const r = rc[healthScore.rating];
                return (
                  <span style={{
                    fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px',
                    background: r.bg, color: r.color, border: `0.5px solid ${r.border}`,
                    letterSpacing: '0.04em',
                  }}>
                    {isRTL ? r.ar : r.en}
                  </span>
                );
              })()}
            </div>

            {/* Factor breakdown — all 6 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginTop: '12px' }}>
              {healthScore.factors.map(f => {
                const names: Record<string, { en: string; ar: string }> = {
                  savings_rate: { en: 'Savings Rate', ar: 'معدل الادخار' },
                  budget_adherence: { en: 'Budget', ar: 'الميزانية' },
                  emergency_fund: { en: 'Emergency Fund', ar: 'صندوق الطوارئ' },
                  goal_progress: { en: 'Goals', ar: 'الأهداف' },
                  consistency: { en: 'Consistency', ar: 'الانتظام' },
                  literacy: { en: 'Literacy', ar: 'الثقافة المالية' },
                };
                const name = names[f.id] || { en: f.id, ar: f.id };
                const barColor = f.status === 'good' ? 'var(--ds-primary-glow)' : f.status === 'fair' ? 'var(--ds-accent-gold)' : 'var(--ds-error)';
                return (
                  <div key={f.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--ds-text-muted)' }}>
                        {isRTL ? name.ar : name.en}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
                        {intl.formatNumber(f.score)}
                      </span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--ds-bg-tinted)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${f.score}%`, height: '100%', background: barColor, borderRadius: '4px', transition: 'width 600ms ease-out' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ===== RECURRING CHARGES ===== */}
      {recurringPatterns.length > 0 && (
        <div style={{
          background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
          padding: '20px 24px', boxShadow: 'var(--ds-shadow-card)', marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', margin: 0, fontFeatureSettings: '"kern" 1' }}>
                {intl.formatMessage({ id: 'dashboard.budgets_recurring_charges', defaultMessage: 'Recurring charges' })}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', margin: '2px 0 0 0' }}>
                {intl.formatMessage({ id: 'dashboard.budgets_recurring_auto_detected', defaultMessage: 'Auto-detected from your transactions' })}
              </p>
            </div>
            <div style={{ textAlign: isRTL ? 'left' : 'right' }}>
              <p style={{ fontSize: '11px', color: 'var(--ds-text-muted)', margin: 0 }}>
                {intl.formatMessage({ id: 'dashboard.budgets_annual_total', defaultMessage: 'Annual total' })}
              </p>
              <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-error)', margin: '2px 0 0 0' }}>
                {currencySymbol} {styledNum(intl.formatNumber(totalAnnualRecurring))}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recurringPatterns.map((pattern, idx) => (
              <div key={pattern.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: !pattern.confirmed ? '12px 24px' : '12px 0',
                borderBottom: idx < recurringPatterns.length - 1 ? '0.5px solid var(--ds-border)' : 'none',
                background: !pattern.confirmed ? 'rgba(217,119,6,0.03)' : 'transparent',
                margin: !pattern.confirmed ? '0 -24px' : '0',
                flexWrap: 'wrap',
              }}>
                {/* Icon */}
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  background: pattern.confirmed ? 'rgba(45,106,79,0.1)' : 'rgba(217,119,6,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: pattern.confirmed ? 'var(--ds-primary)' : 'var(--ds-accent-gold)',
                  flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10z" />
                    <line x1="9" y1="7" x2="15" y2="7" />
                    <line x1="9" y1="11" x2="15" y2="11" />
                    <line x1="9" y1="15" x2="12" y2="15" />
                  </svg>
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pattern.description}
                    </p>
                    <span style={{
                      fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px',
                      letterSpacing: '0.04em',
                      background: pattern.confirmed ? 'var(--ds-success-bg)' : 'var(--ds-warning-bg)',
                      color: pattern.confirmed ? 'var(--ds-success-text)' : 'var(--ds-warning-text)',
                      border: `0.5px solid ${pattern.confirmed ? 'var(--ds-success-border)' : 'var(--ds-warning-border)'}`,
                    }}>
                      {pattern.confirmed
                        ? (isRTL ? 'مؤكد' : 'CONFIRMED')
                        : (isRTL ? 'مكتشف' : 'DETECTED')}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', margin: '2px 0 0 0' }}>
                    {pattern.amountVaries
                      ? (isRTL
                          ? `~شهرياً، المبلغ يتراوح (${currencySymbol} ${intl.formatNumber(pattern.amountMin)}-${intl.formatNumber(pattern.amountMax)})`
                          : `~Monthly, amount varies (${currencySymbol} ${intl.formatNumber(pattern.amountMin)}-${intl.formatNumber(pattern.amountMax)})`)
                      : (isRTL
                          ? `شهرياً في حوالي ${intl.formatNumber(pattern.approximateDay)} من كل شهر`
                          : `Monthly on the ~${intl.formatNumber(pattern.approximateDay)}${getOrdinalSuffix(pattern.approximateDay)}`)}
                  </p>
                </div>

                {/* Amount + annual */}
                <div style={{ textAlign: isRTL ? 'left' : 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)', margin: 0 }}>
                    {pattern.amountVaries ? '~' : ''}{currencySymbol} {styledNum(intl.formatNumber(pattern.amount))}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--ds-text-muted)', margin: '2px 0 0 0' }}>
                    {currencySymbol} {styledNum(intl.formatNumber(pattern.annualCost))}/{isRTL ? 'سنة' : 'yr'}
                  </p>
                </div>

                {/* Confirm/dismiss buttons for unconfirmed patterns */}
                {!pattern.confirmed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                    <button onClick={() => handleConfirmPattern(pattern.id)} style={{
                      padding: '4px 8px', background: 'var(--ds-bg-tinted)', border: '0.5px solid var(--ds-border-tinted)',
                      borderRadius: '4px', fontSize: '10px', color: 'var(--ds-primary)', fontWeight: 500, cursor: 'pointer',
                    }}>
                      {isRTL ? 'نعم' : 'Yes'}
                    </button>
                    <button onClick={() => handleDismissPattern(pattern.id)} style={{
                      padding: '4px 8px', background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)',
                      borderRadius: '4px', fontSize: '10px', color: 'var(--ds-text-muted)', fontWeight: 500, cursor: 'pointer',
                    }}>
                      {isRTL ? 'لا' : 'No'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: '16px', paddingTop: '12px', borderTop: '0.5px solid var(--ds-border)',
            flexWrap: 'wrap', gap: '8px',
          }}>
            <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', margin: 0 }}>
              {isRTL
                ? `${intl.formatNumber(recurringPatterns.length)} رسوم متكررة مكتشفة`
                : `${intl.formatNumber(recurringPatterns.length)} recurring charge${recurringPatterns.length !== 1 ? 's' : ''} detected`}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--ds-text-muted)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--ds-success-bg)', border: '0.5px solid var(--ds-success-border)', display: 'inline-block' }} />
                {isRTL ? 'مؤكد' : 'Confirmed'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--ds-text-muted)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--ds-warning-bg)', border: '0.5px solid var(--ds-warning-border)', display: 'inline-block' }} />
                {isRTL ? 'يحتاج مراجعة' : 'Needs review'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Budget Summary */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px',
        background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
        padding: '20px 24px', boxShadow: 'var(--ds-shadow-card)', marginBottom: '16px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px 0' }}>
            {intl.formatMessage({ id: 'dashboard.budgets_total_budget', defaultMessage: 'Total Budget' })}
          </p>
          <p style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ds-text-heading)', margin: 0 }}>
            {currencySymbol} {styledNum(intl.formatNumber(displayBudget))}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px 0' }}>
            {intl.formatMessage({ id: 'dashboard.spent', defaultMessage: 'Spent' })}
          </p>
          <p style={{ fontSize: '20px', fontWeight: 600, margin: 0, color: totalSpent > displayBudget && displayBudget > 0 ? 'var(--ds-error)' : 'var(--ds-text-heading)' }}>
            {currencySymbol} {styledNum(intl.formatNumber(totalSpent))}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px 0' }}>
            {intl.formatMessage({ id: 'dashboard.left', defaultMessage: 'Left' })}
          </p>
          <p style={{ fontSize: '20px', fontWeight: 600, margin: 0, color: displayBudget - totalSpent >= 0 ? 'var(--ds-primary)' : 'var(--ds-error)' }}>
            {currencySymbol} {styledNum(intl.formatNumber(Math.abs(displayBudget - totalSpent)))}
          </p>
        </div>
      </div>

      {/* Category budgets */}
      <div
        className="ds-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-1)',
          marginBottom: 'var(--spacing-2)',
        }}
      >
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--ds-text-heading)',
            marginBottom: '8px',
            fontFeatureSettings: '"kern" 1',
          }}
        >
          {intl.formatMessage({ id: 'dashboard.budgets_category_budgets', defaultMessage: 'Category Budgets' })}
        </h2>

        {DEFAULT_EXPENSE_CATEGORIES.map((cat) => (
          <CategoryBudgetRow
            key={cat.id}
            categoryId={cat.id}
            name={isRTL ? cat.nameAr : cat.name}
            color={cat.color}
            spent={spendingByCategory[cat.id] || 0}
            budgetValue={tempBudgets[cat.id] || ''}
            currencySymbol={currencySymbol}
            onChange={(v) => { setTempBudgets((prev) => ({ ...prev, [cat.id]: v })); setIsDirty(true); }}
            isRTL={isRTL}
            fmtNumber={(v) => intl.formatNumber(v)}
          />
        ))}
      </div>

      {/* Goal Funding section */}
      {(() => {
        const fundedGoals = savingsGoals.filter(g => getMonthlyFundingAmount(g) > 0);
        if (fundedGoals.length === 0) return null;
        return (
          <div
            className="ds-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-1)',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            <div style={{ marginBottom: '8px' }}>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: 'var(--ds-text-heading)',
                  fontFeatureSettings: '"kern" 1',
                  marginBottom: '2px',
                }}
              >
                {intl.formatMessage({ id: 'dashboard.budgets_goal_funding', defaultMessage: 'Goal Funding' })}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', margin: 0 }}>
                {intl.formatMessage({ id: 'dashboard.budgets_goal_funding_desc', defaultMessage: 'Auto-created from your savings goals' })}
              </p>
            </div>

            {fundedGoals.map((goal) => {
              const catId = goalFundingCategoryId(goal.id);
              const monthlyAmount = getMonthlyFundingAmount(goal);
              const spent = spendingByCategory[catId] || 0;
              const percentage = monthlyAmount > 0 ? Math.min((spent / monthlyAmount) * 100, 100) : 0;
              const isOver = spent > monthlyAmount;

              return (
                <div
                  key={goal.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--ds-bg-input)',
                    border: '0.5px solid var(--ds-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: goal.color,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'var(--ds-text-heading)',
                          margin: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {intl.formatMessage(
                          { id: 'dashboard.budgets_monthly_goal_funding', defaultMessage: 'Monthly {goal} Funding' },
                          { goal: goal.name }
                        )}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--ds-text-heading)',
                        flexShrink: 0,
                      }}
                    >
                      {currencySymbol} {styledNum(intl.formatNumber(monthlyAmount))}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: '4px', borderRadius: '2px', background: 'var(--ds-border)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: '2px',
                        width: `${percentage}%`,
                        background: isOver ? 'var(--color-danger-text)' : goal.color,
                        transition: 'width 400ms ease-out',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: isOver ? 'var(--color-danger-text)' : 'var(--ds-text-muted)' }}>
                      {intl.formatMessage({ id: 'dashboard.spent', defaultMessage: 'Spent' })}: {currencySymbol} {styledNum(intl.formatNumber(spent))}
                    </span>
                    <Link
                      href="/goals"
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: 'var(--ds-primary)',
                        textDecoration: 'none',
                      }}
                    >
                      {intl.formatMessage({ id: 'dashboard.budgets_goal_funding_edit_hint', defaultMessage: 'Edit from Goals page' })}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '9px 18px',
          background: isSaved ? 'var(--ds-primary-hover)' : 'var(--ds-primary)',
          color: '#FFFFFF',
          fontSize: '13px',
          fontWeight: 500,
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          width: '100%',
          transition: 'background-color 150ms ease',
        }}
        className="hover:opacity-90 transition-opacity"
      >
        {isSaved ? <CheckIcon /> : <SaveIcon />}
        {isSaved
          ? intl.formatMessage({ id: 'dashboard.budgets_saved', defaultMessage: 'Saved!' })
          : intl.formatMessage({ id: 'dashboard.budgets_save_budgets', defaultMessage: 'Save Budgets' })}
      </button>
    </div>
  );
}

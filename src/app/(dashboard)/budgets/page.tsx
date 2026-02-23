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
}: {
  categoryId: string;
  name: string;
  color: string;
  spent: number;
  budgetValue: string;
  currencySymbol: string;
  onChange: (value: string) => void;
  isRTL: boolean;
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
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'var(--color-bg-input)',
        border: '1px solid var(--color-border)',
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
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
          }}
        >
          {name}
        </span>
        {/* Budget input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '130px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
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
              fontSize: '0.875rem',
              fontWeight: 600,
              border: '1px solid var(--color-border-input)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-surface-1)',
              color: 'var(--color-text-primary)',
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
              height: '6px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--color-border)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${percentage}%`,
                borderRadius: 'var(--radius-pill)',
                backgroundColor: isOver ? 'var(--color-danger-text)' : color,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '4px',
              fontSize: '0.6875rem',
              color: isOver ? 'var(--color-danger-text)' : 'var(--color-text-muted)',
            }}
          >
            <span>{currencySymbol} {styledNum(spent.toLocaleString())}</span>
            <span>{percentage.toFixed(0)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== MAIN PAGE ===== */
export default function BudgetsPage() {
  const intl = useIntl();
  const language = useLanguage();
  const currency = useCurrency();
  const isRTL = language === 'ar';
  const { monthlyBudget, categoryBudgets, setMonthlyBudget, setCategoryBudget, removeCategoryBudget } = useBudget();
  const { transactions } = useTransactions();

  const currencyInfo = CURRENCIES.find((c) => c.code === currency);
  const currencySymbol = isRTL
    ? currencyInfo?.symbolAr || currencyInfo?.symbol || currency
    : currencyInfo?.symbol || currency;

  // Temp state for editing
  const [tempMonthlyBudget, setTempMonthlyBudget] = useState('');
  const [tempBudgets, setTempBudgets] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);

  // Initialize from store
  useEffect(() => {
    setTempMonthlyBudget(monthlyBudget > 0 ? monthlyBudget.toString() : '');
  }, [monthlyBudget]);

  useEffect(() => {
    const initial: Record<string, string> = {};
    DEFAULT_EXPENSE_CATEGORIES.forEach((cat) => {
      initial[cat.id] = categoryBudgets[cat.id]?.toString() || '';
    });
    setTempBudgets(initial);
  }, [categoryBudgets]);

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

  const handleSave = () => {
    // Save monthly budget
    setMonthlyBudget(monthlyBudgetValue);

    // Save category budgets
    Object.entries(tempBudgets).forEach(([catId, value]) => {
      const amount = parseFloat(value) || 0;
      if (amount > 0) {
        setCategoryBudget(catId, amount);
      } else {
        removeCategoryBudget(catId);
      }
    });
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
          fontSize: '0.875rem',
          fontWeight: 500,
          color: 'var(--color-accent-growth)',
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
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            lineHeight: 1.2,
          }}
        >
          {t('budgets', 'Budgets')}
        </h1>
        <p
          style={{
            fontSize: '0.9375rem',
            color: 'var(--color-text-secondary)',
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
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          {intl.formatMessage({ id: 'dashboard.budgets_monthly_budget', defaultMessage: 'Monthly Budget' })}
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '-8px' }}>
          {intl.formatMessage({ id: 'dashboard.budgets_monthly_budget_desc', defaultMessage: 'Total monthly spending limit (regardless of categories)' })}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-muted)', flexShrink: 0 }}>
            {currencySymbol}
          </span>
          <input
            type="number"
            value={tempMonthlyBudget}
            onChange={(e) => setTempMonthlyBudget(e.target.value)}
            placeholder="0"
            style={{
              flex: 1,
              padding: '12px 14px',
              fontSize: '1.25rem',
              fontWeight: 700,
              border: '1px solid var(--color-border-input)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-input)',
              color: 'var(--color-text-primary)',
              outline: 'none',
              direction: 'ltr',
              textAlign: isRTL ? 'right' : 'left',
            }}
          />
        </div>
      </div>

      {/* Summary card */}
      <div
        className="ds-card"
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          padding: '1rem 1.25rem',
          marginBottom: 'var(--spacing-2)',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>
            {intl.formatMessage({ id: 'dashboard.budgets_total_budget', defaultMessage: 'Total Budget' })}
          </p>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {currencySymbol} {styledNum(displayBudget.toLocaleString())}
          </p>
        </div>
        <div style={{ width: '1px', backgroundColor: 'var(--color-border)', alignSelf: 'stretch' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>
            {t('spent', 'Spent')}
          </p>
          <p
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: totalSpent > displayBudget && displayBudget > 0 ? 'var(--color-danger-text)' : 'var(--color-text-primary)',
            }}
          >
            {currencySymbol} {styledNum(totalSpent.toLocaleString())}
          </p>
        </div>
        <div style={{ width: '1px', backgroundColor: 'var(--color-border)', alignSelf: 'stretch' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>
            {t('left', 'Left')}
          </p>
          <p
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: displayBudget - totalSpent >= 0 ? 'var(--color-accent-growth)' : 'var(--color-danger-text)',
            }}
          >
            {currencySymbol} {styledNum(Math.abs(displayBudget - totalSpent).toLocaleString())}
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
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: '8px',
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
            onChange={(v) => setTempBudgets((prev) => ({ ...prev, [cat.id]: v }))}
            isRTL={isRTL}
          />
        ))}
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '14px 28px',
          background: isSaved ? '#6366F1' : 'var(--color-accent-growth)',
          color: '#FFFFFF',
          fontSize: '0.9375rem',
          fontWeight: 600,
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          width: '100%',
          transition: 'background 0.2s',
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

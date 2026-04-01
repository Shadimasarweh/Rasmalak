'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useTransactions, Transaction } from '@/store/transactionStore';
import { useGoals } from '@/store/goalsStore';
import { useCurrency, useLanguage } from '@/store/useStore';
import { DEFAULT_EXPENSE_CATEGORIES, ALL_CATEGORIES, CURRENCIES } from '@/lib/constants';
import { styledNum } from '@/components/StyledNumber';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';
import { calculateHealthScore } from '@/lib/healthScore';
import { useBudget } from '@/store/budgetStore';

/* ============================================
   TRANSACTIONS PAGE
   Bound by: /docs/contracts/Transactions.functional.md
   
   This page:
   - Reads exclusively from the transaction store
   - Displays true empty state when no transactions exist
   - Shows no charts/summaries when empty (Contract Section 5)
   - Allows delete with confirmation (Contract Section 4)
   - Recalculates totals on every mutation (Contract Section 7)
   ============================================ */

/* ===== ICONS ===== */
const PlusIcon = () => (
  <svg style={{ width: '1rem', height: '1rem', marginRight: '0.375rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const TrashIcon = () => (
  <svg style={{ width: '1rem', height: '1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const EmptyIcon = () => (
  <svg style={{ width: '4rem', height: '4rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

/* ===== DELETE CONFIRMATION MODAL ===== */
function DeleteConfirmModal({
  transaction,
  onConfirm,
  onCancel,
  intl,
}: {
  transaction: Transaction;
  onConfirm: () => void;
  onCancel: () => void;
  intl: ReturnType<typeof useIntl>;
}) {
  const typeLabel = intl.formatMessage(
    { id: 'transactions.transaction_type', defaultMessage: '{type, select, income {Income} expense {Expense} other {Transaction}}' },
    { type: transaction.type }
  );
  const amountLabel = styledNum(intl.formatNumber(Math.abs(transaction.amount), { style: 'currency', currency: transaction.currency }));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        className="ds-card"
        style={{
          maxWidth: '400px',
          margin: '0 16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--ds-text-heading)',
            marginBottom: '8px',
            fontFeatureSettings: '"kern" 1',
          }}
        >
          {intl.formatMessage({ id: 'transactions.delete_title', defaultMessage: 'Delete Transaction' })}
        </h3>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--ds-text-body)',
            lineHeight: 1.6,
            marginBottom: '12px',
          }}
        >
          {intl.formatMessage(
            { id: 'transactions.delete_confirm', defaultMessage: 'Are you sure you want to delete this {type} of {amount}? This action cannot be undone.' },
            { type: typeLabel, amount: amountLabel }
          )}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--ds-text-body)',
              background: 'transparent',
              border: '0.5px solid var(--ds-border)',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            {intl.formatMessage({ id: 'transactions.cancel', defaultMessage: 'Cancel' })}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#FFFFFF',
              background: 'var(--ds-error)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {intl.formatMessage({ id: 'transactions.delete', defaultMessage: 'Delete' })}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== EMPTY STATE ===== */
function EmptyState({ intl }: { intl: ReturnType<typeof useIntl> }) {
  const language = useLanguage();
  const isRtl = language === 'ar';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-4)',
        textAlign: 'center',
        animation: 'fadeIn 300ms ease-out',
        direction: isRtl ? 'rtl' : 'ltr',
      }}
    >
      {/* Icon in tinted circle */}
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#F0F7F4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}
      >
        <svg style={{ width: '2rem', height: '2rem', color: '#2D6A4F' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#0F1914',
          marginBottom: '4px',
        }}
      >
        {intl.formatMessage({ id: 'transactions.no_transactions_recorded', defaultMessage: 'No transactions recorded' })}
      </h3>
      <p
        style={{
          fontSize: '12px',
          color: '#9CA3AF',
          marginBottom: '8px',
        }}
      >
        {intl.formatMessage({ id: 'transactions.empty_state_subtitle', defaultMessage: 'سجّل معاملاتك المالية' })}
      </p>
      <p
        style={{
          fontSize: '14px',
          color: '#374151',
          marginBottom: '20px',
          maxWidth: '320px',
          lineHeight: 1.6,
        }}
      >
        {intl.formatMessage({ id: 'transactions.empty_state_description', defaultMessage: 'This page displays your financial transactions. Add your first transaction to begin tracking.' })}
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/transactions/new"
          className="ds-btn ds-btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', transition: 'all 150ms ease' }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <PlusIcon />
          {intl.formatMessage({ id: 'transactions.empty_add_expense', defaultMessage: 'Add expense' })}
        </Link>
        <Link
          href="/transactions/new/income"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
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
          {intl.formatMessage({ id: 'transactions.empty_add_income', defaultMessage: 'Add income' })}
        </Link>
      </div>
    </div>
  );
}

/* ===== TRANSACTION ROW ===== */
function TransactionRow({
  transaction,
  onDelete,
  intl,
}: {
  transaction: Transaction;
  onDelete: () => void;
  intl: ReturnType<typeof useIntl>;
}) {
  const isIncome = transaction.type === 'income';
  const isRowRtl = intl.locale.startsWith('ar');
  const formattedDate = intl.formatDate(new Date(transaction.date), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const typeLabel = intl.formatMessage(
    { id: 'transactions.transaction_type', defaultMessage: '{type, select, income {Income} expense {Expense} other {Transaction}}' },
    { type: transaction.type }
  );
  const categoryObj = ALL_CATEGORIES.find(c => c.id === transaction.category);
  const categoryLabel = categoryObj ? (isRowRtl ? categoryObj.nameAr : categoryObj.name) : (transaction.category || '—');

  return (
    <tr className="ds-table-row">
      <td className="ds-table-cell ds-body">{formattedDate}</td>
      <td className="ds-table-cell">
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--ds-text-heading)',
          }}
        >
          {categoryLabel}
        </span>
      </td>
      <td className="ds-table-cell ds-body">{(() => {
        const desc = transaction.description || '—';
        if (desc.includes('||')) {
          const [ar, en] = desc.split('||');
          return isRowRtl ? ar : en;
        }
        return desc;
      })()}</td>
      <td className="ds-table-cell">
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '0.04em',
              borderRadius: '4px',
              background: isIncome ? 'var(--ds-success-bg)' : 'var(--ds-error-bg)',
              color: isIncome ? 'var(--ds-success-text)' : 'var(--ds-error-text)',
              border: isIncome ? '0.5px solid var(--ds-success-border)' : '0.5px solid var(--ds-error-border)',
              textTransform: 'capitalize',
            }}
          >
            {typeLabel}
          </span>
          {transaction.isRecurring && (
            <span
              title={
                transaction.recurringEndDate
                  ? intl.formatMessage(
                      { id: 'transactions.recurring_until', defaultMessage: 'Until {date}' },
                      { date: intl.formatDate(new Date(transaction.recurringEndDate), { month: 'short', day: 'numeric', year: 'numeric' }) }
                    )
                  : intl.formatMessage({ id: 'transactions.recurring_indefinite', defaultMessage: 'Repeats until cancelled' })
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 6px',
                fontSize: '10px',
                fontWeight: 500,
                borderRadius: '4px',
                background: 'var(--ds-primary-light, #F0F7F4)',
                color: 'var(--ds-primary)',
                border: '0.5px solid var(--ds-primary)',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              {intl.formatMessage({ id: 'transactions.recurring_badge', defaultMessage: 'Recurring' })}
            </span>
          )}
        </div>
      </td>
      <td
        className="ds-table-cell"
        style={{
          textAlign: 'right',
          fontWeight: 500,
          color: isIncome ? 'var(--ds-primary)' : 'var(--ds-error)',
        }}
      >
        {transaction.type === 'income' ? '+' : '-'}{styledNum(intl.formatNumber(Math.abs(transaction.amount)))}
      </td>
      <td className="ds-table-cell" style={{ textAlign: 'end' }}>
        <button
          type="button"
          onClick={onDelete}
          style={{
            padding: '6px',
            background: 'transparent',
            border: 'none',
            borderRadius: '8px',
            color: 'var(--ds-text-muted)',
            cursor: 'pointer',
          }}
          title={intl.formatMessage({ id: 'transactions.delete_transaction', defaultMessage: 'Delete transaction' })}
        >
          <TrashIcon />
        </button>
      </td>
    </tr>
  );
}

/* ===== MAIN PAGE ===== */
export default function TransactionsPage() {
  const intl = useIntl();
  const currency = useCurrency();
  const language = useLanguage();
  const isRtl = language === 'ar';
  const { transactions: realTransactions, deleteTransaction, getTotalIncome, getTotalExpenses, getNetBalance } =
    useTransactions();

  // TEMP: fake transactions for visual testing — DELETE before production
  const _now = new Date();
  const _d = (monthsBack: number, day: number = 5) =>
    new Date(_now.getFullYear(), _now.getMonth() - monthsBack, day).toISOString();
  const _fakeTxns: Transaction[] = [
    // This month
    { id: 'f1', type: 'income', amount: 3500, currency: 'JOD', category: 'salary', date: _d(0, 1), description: 'الراتب||Salary', user_id: '', isRecurring: true, recurringEndDate: null },
    { id: 'f2', type: 'expense', amount: 450, currency: 'JOD', category: 'food', date: _d(0, 3), description: 'بقالة||Groceries', user_id: '', isRecurring: false, recurringEndDate: null },
    { id: 'f3', type: 'expense', amount: 800, currency: 'JOD', category: 'housing', date: _d(0, 1), description: 'إيجار||Rent', user_id: '', isRecurring: true, recurringEndDate: null },
    { id: 'f4', type: 'expense', amount: 200, currency: 'JOD', category: 'transport', date: _d(0, 5), description: 'وقود||Gas', user_id: '', isRecurring: false, recurringEndDate: null },
    { id: 'f5', type: 'expense', amount: 45, currency: 'JOD', category: 'entertainment', date: _d(0, 10), description: 'نتفليكس||Netflix', user_id: '', isRecurring: true, recurringEndDate: '2026-12-31' },
    { id: 'f6', type: 'expense', amount: 120, currency: 'JOD', category: 'shopping', date: _d(0, 12), description: 'ملابس||Clothes', user_id: '', isRecurring: false, recurringEndDate: null },
    { id: 'f7', type: 'expense', amount: 75, currency: 'JOD', category: 'health', date: _d(0, 1), description: 'اشتراك نادي||Gym membership', user_id: '', isRecurring: true, recurringEndDate: null },
    // Last month (same day pattern — ~30 days apart)
    { id: 'f8', type: 'income', amount: 3500, currency: 'JOD', category: 'salary', date: _d(1, 1), description: 'الراتب||Salary', user_id: '', isRecurring: true, recurringEndDate: null },
    { id: 'f9', type: 'expense', amount: 430, currency: 'JOD', category: 'food', date: _d(1, 3), description: 'بقالة||Groceries', user_id: '', isRecurring: false, recurringEndDate: null },
    { id: 'f10', type: 'expense', amount: 800, currency: 'JOD', category: 'housing', date: _d(1, 1), description: 'إيجار||Rent', user_id: '', isRecurring: true, recurringEndDate: null },
    { id: 'f11', type: 'expense', amount: 190, currency: 'JOD', category: 'transport', date: _d(1, 5), description: 'وقود||Gas', user_id: '', isRecurring: false, recurringEndDate: null },
    { id: 'f12', type: 'expense', amount: 45, currency: 'JOD', category: 'entertainment', date: _d(1, 10), description: 'نتفليكس||Netflix', user_id: '', isRecurring: true, recurringEndDate: '2026-12-31' },
    { id: 'f13', type: 'expense', amount: 75, currency: 'JOD', category: 'health', date: _d(1, 1), description: 'اشتراك نادي||Gym membership', user_id: '', isRecurring: true, recurringEndDate: null },
    // 2 months ago
    { id: 'f14', type: 'income', amount: 3500, currency: 'JOD', category: 'salary', date: _d(2, 1), description: 'الراتب||Salary', user_id: '', isRecurring: true, recurringEndDate: null },
    { id: 'f15', type: 'expense', amount: 470, currency: 'JOD', category: 'food', date: _d(2, 3), description: 'بقالة||Groceries', user_id: '', isRecurring: false, recurringEndDate: null },
    { id: 'f16', type: 'expense', amount: 800, currency: 'JOD', category: 'housing', date: _d(2, 1), description: 'إيجار||Rent', user_id: '', isRecurring: true, recurringEndDate: null },
    { id: 'f17', type: 'expense', amount: 45, currency: 'JOD', category: 'entertainment', date: _d(2, 10), description: 'نتفليكس||Netflix', user_id: '', isRecurring: true, recurringEndDate: '2026-12-31' },
    { id: 'f18', type: 'expense', amount: 75, currency: 'JOD', category: 'health', date: _d(2, 1), description: 'اشتراك نادي||Gym membership', user_id: '', isRecurring: true, recurringEndDate: null },
  ];
  const transactions = realTransactions.length > 0 ? realTransactions : _fakeTxns;

  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  // ===== FILTER STATE =====
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'this_month' | 'last_month' | 'three_months' | 'all_time'>('all_time');

  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'this_month':
        return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
      case 'last_month':
        return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0) };
      case 'three_months':
        return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
      case 'all_time':
      default:
        return { start: new Date(2000, 0, 1), end: new Date(2099, 11, 31) };
    }
  }, [dateRange]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx: Transaction) => {
      const d = new Date(tx.date);
      if (d < dateRangeBounds.start || d > dateRangeBounds.end) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (categoryFilter && (tx.category || '').toLowerCase() !== categoryFilter.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const desc = (tx.description || '').toLowerCase();
        const cat = (tx.category || '').toLowerCase();
        if (!desc.includes(q) && !cat.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, dateRangeBounds, typeFilter, categoryFilter, searchQuery]);

  const filteredIncome = filteredTransactions
    .filter((tx: Transaction) => tx.type === 'income')
    .reduce((sum: number, tx: Transaction) => sum + Math.abs(tx.amount), 0);
  const filteredExpenses = filteredTransactions
    .filter((tx: Transaction) => tx.type === 'expense')
    .reduce((sum: number, tx: Transaction) => sum + Math.abs(tx.amount), 0);
  const filteredBalance = filteredIncome - filteredExpenses;
  const hasAnyTransactions = transactions.length > 0;
  const hasFilteredResults = filteredTransactions.length > 0;

  /* ---------- Micro-interaction states ---------- */
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Computed values - recalculated on every render per Contract Section 7
  const totalIncome = getTotalIncome();
  const totalExpenses = getTotalExpenses();
  const netBalance = getNetBalance();
  const { savingsGoals } = useGoals();

  const currencyInfo = CURRENCIES.find((c) => c.code === currency);
  const currencySymbol = isRtl
    ? currencyInfo?.symbolAr || currencyInfo?.symbol || currency
    : currencyInfo?.symbol || currency;

  // Spending by category (current month)
  const spendingByCategory = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const map: Record<string, number> = {};
    transactions.forEach((tx: Transaction) => {
      if (tx.type !== 'expense') return;
      const d = new Date(tx.date);
      if (d >= startOfMonth && d <= endOfMonth) {
        const cat = tx.category || 'other-expense';
        map[cat] = (map[cat] || 0) + Math.abs(tx.amount);
      }
    });
    return map;
  }, [transactions]);

  const totalSpent = Object.values(spendingByCategory).reduce((a, b) => a + b, 0);

  const { monthlyIncome, monthlyExpenses } = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    let income = 0;
    let expenses = 0;
    transactions.forEach((tx: Transaction) => {
      const d = new Date(tx.date);
      if (d >= startOfMonth && d <= endOfMonth) {
        if (tx.type === 'income') income += Math.abs(tx.amount);
        else expenses += Math.abs(tx.amount);
      }
    });
    return { monthlyIncome: income, monthlyExpenses: expenses };
  }, [transactions]);

  const savingsRate = monthlyIncome > 0
    ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)
    : 0;

  const trendData = useMemo(() => {
    const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const now = new Date();
    const months: { name: string; income: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      let inc = 0;
      let exp = 0;
      transactions.forEach((tx: Transaction) => {
        const d = new Date(tx.date);
        if (d >= start && d <= end) {
          if (tx.type === 'income') inc += Math.abs(tx.amount);
          else exp += Math.abs(tx.amount);
        }
      });
      const idx = start.getMonth();
      months.push({ name: isRtl ? AR_MONTHS[idx] : EN_MONTHS[idx], income: inc, expenses: exp });
    }
    return months;
  }, [transactions, isRtl]);

  const prevMonthSpending = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    const map: Record<string, number> = {};
    transactions.forEach((tx: Transaction) => {
      if (tx.type !== 'expense') return;
      const d = new Date(tx.date);
      if (d >= start && d <= end) {
        const cat = tx.category || 'other-expense';
        map[cat] = (map[cat] || 0) + Math.abs(tx.amount);
      }
    });
    return map;
  }, [transactions]);

  const topCategories = useMemo(() => {
    return DEFAULT_EXPENSE_CATEGORIES
      .map(cat => ({ ...cat, spent: spendingByCategory[cat.id] || 0 }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);
  }, [spendingByCategory]);

  // Health score
  const { categoryBudgets } = useBudget();
  const healthScore = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysInMonth = endOfMonth.getDate();
    const loggedDays = new Set<string>();
    transactions.forEach((tx: Transaction) => {
      const d = new Date(tx.date);
      if (d >= startOfMonth && d <= endOfMonth) loggedDays.add(tx.date);
    });
    let categoriesOverBudget = 0;
    let totalCatsWithBudget = 0;
    DEFAULT_EXPENSE_CATEGORIES.forEach(cat => {
      const limit = categoryBudgets[cat.id] || 0;
      if (limit > 0) {
        totalCatsWithBudget++;
        if ((spendingByCategory[cat.id] || 0) > limit) categoriesOverBudget++;
      }
    });
    const emergencyGoal = savingsGoals.find(g =>
      g.name.toLowerCase().includes('emergency') || g.name.includes('طوارئ')
    );
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    let totalExp3m = 0;
    transactions.forEach((tx: Transaction) => {
      const d = new Date(tx.date);
      if (tx.type === 'expense' && d >= threeMonthsAgo && d <= endOfMonth) totalExp3m += Math.abs(tx.amount);
    });
    const goalsOnTrack = savingsGoals.filter(g => g.targetAmount > 0 && g.currentAmount / g.targetAmount > 0).length;
    return calculateHealthScore({
      monthlyIncome,
      monthlyExpenses,
      budgetLimit: 0,
      budgetSpent: monthlyExpenses,
      categoriesOverBudget,
      totalCategories: totalCatsWithBudget,
      emergencyFundCurrent: emergencyGoal ? emergencyGoal.currentAmount : 0,
      averageMonthlyExpenses: totalExp3m / 3,
      goalsOnTrack,
      totalGoals: savingsGoals.length,
      daysLoggedThisMonth: loggedDays.size,
      daysInMonth,
      coursesCompleted: 0,
      totalCourses: 30,
    });
  }, [transactions, savingsGoals, spendingByCategory, categoryBudgets, monthlyIncome, monthlyExpenses]);

  // Handle delete with confirmation per Contract Section 4
  const handleDeleteClick = (transaction: Transaction) => {
    setDeleteTarget(transaction);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteTransaction(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

  // ===== Recurring transaction detection =====
  const [confirmedPatterns, setConfirmedPatterns] = useState<Record<string, boolean>>({});

  interface RecurringPattern {
    id: string;
    description: string;
    amount: number;
    amountVaries: boolean;
    amountMin: number;
    amountMax: number;
    approximateDay: number;
    occurrences: number;
    annualCost: number;
    confirmed: boolean;
    dismissed: boolean;
  }

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

  function getOrdinalSuffix(day: number): string {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  if (isInitialLoad) {
    return (
      <div className="ds-page" style={{ background: 'var(--ds-bg-page)', direction: isRtl ? 'rtl' : 'ltr' }}>
        <div className="ds-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
          <Skeleton width="200px" height="32px" borderRadius="8px" />
          <div style={{ height: '16px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <Skeleton height="80px" borderRadius="16px" />
            <Skeleton height="80px" borderRadius="16px" />
            <Skeleton height="80px" borderRadius="16px" />
          </div>
          <div style={{ height: '16px' }} />
          <Skeleton height="400px" borderRadius="16px" />
        </div>
      </div>
    );
  }

  return (
    <div className="ds-page" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      {/* ===== PAGE HEADER ===== */}
      <div className="ds-section-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="ds-title-page">
            {intl.formatMessage({ id: 'transactions.title', defaultMessage: 'Transactions' })}
          </h1>
          <p className="ds-body">
            {intl.formatMessage({ id: 'transactions.subtitle', defaultMessage: 'Record and view your financial activity.' })}
          </p>
        </div>
        <div className="flex items-center" style={{ gap: 'var(--spacing-1)' }}>
          <Link
            href="/transactions/new"
            className="ds-btn ds-btn-primary"
            style={{ transition: 'all 150ms ease' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <PlusIcon />
            {intl.formatMessage({ id: 'transactions.add_transaction', defaultMessage: 'Add Transaction' })}
          </Link>
        </div>
      </div>

      {/* ===== CONDITIONAL CONTENT ===== */}
      {/* Per Contract Section 5 & 8: No charts/summaries when empty */}
      {hasAnyTransactions ? (
        <>
          {/* ===== STATS ROW ===== */}
          {/* Per Contract Section 7: Totals computed from visible transactions only */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            {/* Total Income */}
            <div className="ds-card">
              <div>
                <p className="ds-title-card">
                  {intl.formatMessage({ id: 'transactions.total_income', defaultMessage: 'Total Income' })}
                </p>
                <p className="ds-metric-sm" style={{ color: 'var(--ds-primary)' }}>
                  {styledNum(intl.formatNumber(filteredIncome, { style: 'currency', currency }))}
                </p>
              </div>
            </div>

            {/* Total Expenses */}
            <div className="ds-card">
              <div>
                <p className="ds-title-card">
                  {intl.formatMessage({ id: 'transactions.total_expenses', defaultMessage: 'Total Expenses' })}
                </p>
                <p className="ds-metric-sm" style={{ color: 'var(--ds-error)' }}>
                  {styledNum(intl.formatNumber(filteredExpenses, { style: 'currency', currency }))}
                </p>
              </div>
            </div>

            {/* Net Balance */}
            <div className="ds-card">
              <div>
                <p className="ds-title-card">
                  {intl.formatMessage({ id: 'transactions.net_balance', defaultMessage: 'Net Balance' })}
                </p>
                <p
                  className="ds-metric-sm"
                  style={{ color: filteredBalance >= 0 ? 'var(--ds-primary)' : 'var(--ds-error)' }}
                >
                  {styledNum(intl.formatNumber(filteredBalance, { style: 'currency', currency }))}
                </p>
              </div>
            </div>
          </div>

          {/* ===== FILTER BAR ===== */}
          <div style={{
            background: '#FFFFFF', border: '0.5px solid #E5E7EB', borderRadius: '16px',
            padding: '14px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            marginBottom: '16px', direction: isRtl ? 'rtl' : 'ltr',
          }}>
            {/* Search + date row */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
              {/* Search input */}
              <div style={{
                flex: 1, minWidth: '180px', display: 'flex', alignItems: 'center', gap: '8px',
                background: '#F5F0EB', borderRadius: '8px', padding: '8px 12px',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'transactions.search_placeholder', defaultMessage: 'Search transactions...' })}
                  style={{
                    flex: 1, border: 'none', background: 'transparent',
                    fontSize: '13px', color: '#0F1914', outline: 'none',
                  }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                    color: '#9CA3AF', display: 'flex',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Date range selector */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as 'this_month' | 'last_month' | 'three_months' | 'all_time')}
                style={{
                  padding: '8px 12px', background: '#F5F0EB', border: '0.5px solid #E5E7EB',
                  borderRadius: '8px', fontSize: '13px', color: '#374151', outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="this_month">{intl.formatMessage({ id: 'transactions.date_this_month', defaultMessage: 'This month' })}</option>
                <option value="last_month">{intl.formatMessage({ id: 'transactions.date_last_month', defaultMessage: 'Last month' })}</option>
                <option value="three_months">{intl.formatMessage({ id: 'transactions.date_three_months', defaultMessage: 'Last 3 months' })}</option>
                <option value="all_time">{intl.formatMessage({ id: 'transactions.date_all_time', defaultMessage: 'All time' })}</option>
              </select>
            </div>

            {/* Type + category filter pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              {(['all', 'income', 'expense'] as const).map((type) => {
                const active = typeFilter === type;
                const labels: Record<string, { en: string; ar: string }> = {
                  all: { en: 'All', ar: 'الكل' },
                  income: { en: 'Income', ar: 'الدخل' },
                  expense: { en: 'Expenses', ar: 'المصروفات' },
                };
                return (
                  <button key={type} onClick={() => setTypeFilter(type)} style={{
                    padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                    cursor: 'pointer',
                    background: active ? '#2D6A4F' : 'transparent',
                    color: active ? '#FFFFFF' : '#374151',
                    border: active ? 'none' : '0.5px solid #E5E7EB',
                  }}>
                    {isRtl ? labels[type].ar : labels[type].en}
                  </button>
                );
              })}

              <div style={{ width: '1px', height: '20px', background: '#E5E7EB', margin: '0 4px' }} />

              {['food', 'transport', 'shopping', 'bills', 'health', 'entertainment'].map((catId) => {
                const active = categoryFilter === catId;
                return (
                  <button key={catId} onClick={() => setCategoryFilter(active ? null : catId)} style={{
                    padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                    background: active ? '#F0F7F4' : 'transparent',
                    color: active ? '#2D6A4F' : '#374151',
                    border: active ? '0.5px solid #D1FAE5' : '0.5px solid #E5E7EB',
                  }}>
                    {intl.formatMessage({ id: `categories.${catId}`, defaultMessage: catId })}
                    {active && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                  </button>
                );
              })}
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
            direction: isRtl ? 'rtl' : 'ltr',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
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
                    const cfg = rc[healthScore.rating];
                    return (
                      <span style={{
                        fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px',
                        background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.border}`,
                        letterSpacing: '0.04em',
                      }}>
                        {isRtl ? cfg.ar : cfg.en}
                      </span>
                    );
                  })()}
                </div>
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
                          <span style={{ fontSize: '11px', color: 'var(--ds-text-muted)' }}>{isRtl ? name.ar : name.en}</span>
                          <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>{intl.formatNumber(f.score)}</span>
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

          {/* ===== ANALYSIS METRIC CARDS ===== */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
              padding: '20px 24px', boxShadow: 'var(--ds-shadow-card)', textAlign: 'center',
            }}>
              <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px 0' }}>
                {intl.formatMessage({ id: 'transactions.monthly_income', defaultMessage: 'Income' })}
              </p>
              <p style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ds-primary)', margin: 0 }}>
                {currencySymbol} {styledNum(intl.formatNumber(monthlyIncome))}
              </p>
            </div>
            <div style={{
              background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
              padding: '20px 24px', boxShadow: 'var(--ds-shadow-card)', textAlign: 'center',
            }}>
              <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px 0' }}>
                {intl.formatMessage({ id: 'transactions.monthly_expenses', defaultMessage: 'Expenses' })}
              </p>
              <p style={{
                fontSize: '24px', fontWeight: 600, margin: 0,
                color: monthlyExpenses > monthlyIncome && monthlyIncome > 0 ? 'var(--ds-error)' : 'var(--ds-text-heading)',
              }}>
                {currencySymbol} {styledNum(intl.formatNumber(monthlyExpenses))}
              </p>
            </div>
            <div style={{
              background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
              padding: '20px 24px', boxShadow: 'var(--ds-shadow-card)', textAlign: 'center',
            }}>
              <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px 0' }}>
                {intl.formatMessage({ id: 'transactions.savings_rate', defaultMessage: 'Savings Rate' })}
              </p>
              <p style={{
                fontSize: '24px', fontWeight: 600, margin: 0,
                color: savingsRate >= 0 ? 'var(--ds-primary)' : 'var(--ds-error)',
              }}>
                {intl.formatNumber(savingsRate)}%
              </p>
            </div>
          </div>

          {/* ===== ANALYSIS ROW 1: Spending Donut + Income vs Expenses ===== */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>

            {/* Spending breakdown donut */}
            <div style={{
              background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
              padding: '20px 24px', boxShadow: 'var(--ds-shadow-card)',
            }}>
              <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', margin: '0 0 16px 0', fontFeatureSettings: '"kern" 1' }}>
                {intl.formatMessage({ id: 'transactions.spending_breakdown', defaultMessage: 'Spending breakdown' })}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {/* SVG Donut */}
                <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="46" fill="none" stroke="var(--ds-border)" strokeWidth="10" />
                    {(() => {
                      let cumulativeAngle = -90;
                      return topCategories.filter(c => c.spent > 0).map((cat) => {
                        const pct = totalSpent > 0 ? (cat.spent / totalSpent) : 0;
                        const dashLength = 2 * Math.PI * 46;
                        const dashOffset = dashLength * (1 - pct);
                        const rotation = cumulativeAngle;
                        cumulativeAngle += pct * 360;
                        return (
                          <circle key={cat.id} cx="60" cy="60" r="46" fill="none"
                            stroke={cat.color} strokeWidth="10"
                            strokeDasharray={dashLength} strokeDashoffset={dashOffset}
                            strokeLinecap="round" transform={`rotate(${rotation} 60 60)`} />
                        );
                      });
                    })()}
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ds-text-heading)' }}>
                      {styledNum(intl.formatNumber(Math.round(totalSpent)))}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--ds-text-muted)' }}>{currencySymbol}</span>
                  </div>
                </div>
                {/* Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  {topCategories.map(cat => (
                    <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: cat.color }} />
                        <span style={{ fontSize: '12px', color: cat.spent > 0 ? 'var(--ds-text-heading)' : 'var(--ds-text-muted)' }}>
                          {isRtl ? cat.nameAr : cat.name}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: cat.spent > 0 ? 'var(--ds-text-heading)' : 'var(--ds-text-muted)' }}>
                        {styledNum(intl.formatNumber(Math.round(cat.spent)))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Income vs Expenses chart */}
            <div style={{
              background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
              padding: '20px 24px', boxShadow: 'var(--ds-shadow-card)',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', margin: 0, fontFeatureSettings: '"kern" 1' }}>
                  {intl.formatMessage({ id: 'transactions.income_vs_expenses', defaultMessage: 'Income vs expenses' })}
                </p>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--ds-text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '10px', height: '2px', background: 'var(--ds-primary)', display: 'inline-block' }} />
                    {intl.formatMessage({ id: 'transactions.income_label', defaultMessage: 'Income' })}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '10px', height: '2px', background: 'var(--ds-error)', display: 'inline-block' }} />
                    {intl.formatMessage({ id: 'transactions.expenses_label', defaultMessage: 'Expenses' })}
                  </span>
                </div>
              </div>
              <div style={{ flex: 1, minHeight: '140px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="txIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2D6A4F" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#2D6A4F" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} reversed={isRtl} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '8px', fontSize: '13px' }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={((value: any, name: any) => {
                        const numVal = typeof value === 'number' ? value : parseFloat(value) || 0;
                        const label = name === 'income'
                          ? intl.formatMessage({ id: 'transactions.income_label', defaultMessage: 'Income' })
                          : intl.formatMessage({ id: 'transactions.expenses_label', defaultMessage: 'Expenses' });
                        return [currencySymbol + ' ' + intl.formatNumber(Math.round(numVal)), label];
                      }) as any}
                    />
                    <Area type="monotone" dataKey="income" stroke="#2D6A4F" strokeWidth={2} fill="url(#txIncomeGrad)" />
                    <Area type="monotone" dataKey="expenses" stroke="#DC2626" strokeWidth={2} strokeDasharray="4 3" fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{ borderTop: '0.5px solid var(--ds-border)', marginTop: '12px', paddingTop: '10px', display: 'flex', gap: '8px' }}>
                <Link href="/calculators/compound-savings" style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '6px 12px', background: 'transparent', color: 'var(--ds-primary)',
                  border: '1.5px solid var(--ds-btn-secondary-border)', borderRadius: '8px', fontSize: '12px', fontWeight: 500, textDecoration: 'none',
                  transition: 'box-shadow 200ms ease',
                }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                >
                  {intl.formatMessage({ id: 'transactions.savings_calculator', defaultMessage: 'Savings calculator' })}
                </Link>
                <Link href="/chat" style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '6px 12px', background: 'transparent', color: 'var(--ds-primary)',
                  border: '1.5px solid var(--ds-btn-secondary-border)', borderRadius: '8px', fontSize: '12px', fontWeight: 500, textDecoration: 'none',
                  transition: 'box-shadow 200ms ease',
                }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                >
                  {intl.formatMessage({ id: 'transactions.ask_mustasharak', defaultMessage: 'Ask Mustasharak' })}
                </Link>
              </div>
            </div>
          </div>

          {/* ===== ANALYSIS ROW 2: Monthly Comparison + AI Insight ===== */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>

            {/* Monthly comparison */}
            <div style={{
              background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
              padding: '20px 24px', boxShadow: 'var(--ds-shadow-card)',
            }}>
              <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', margin: '0 0 4px 0', fontFeatureSettings: '"kern" 1' }}>
                {intl.formatMessage({ id: 'transactions.monthly_comparison', defaultMessage: 'Monthly comparison' })}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', margin: '0 0 12px 0' }}>
                {intl.formatMessage({ id: 'transactions.this_vs_last', defaultMessage: 'This month vs last month' })}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {topCategories.slice(0, 4).map(cat => {
                  const prev = prevMonthSpending[cat.id] || 0;
                  const curr = cat.spent;
                  const change = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : (curr > 0 ? 100 : 0);
                  const maxVal = Math.max(prev, curr, 1);
                  return (
                    <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--ds-text-muted)', width: '60px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isRtl ? cat.nameAr : cat.name}
                      </span>
                      <div style={{ flex: 1, display: 'flex', gap: '2px', height: '14px' }}>
                        <div style={{ height: '100%', background: cat.color, opacity: 0.3, borderRadius: '3px 0 0 3px', width: `${(prev / maxVal) * 100}%` }} />
                        <div style={{ height: '100%', background: cat.color, borderRadius: '0 3px 3px 0', width: `${(curr / maxVal) * 100}%` }} />
                      </div>
                      <span style={{
                        fontSize: '10px', fontWeight: 500, minWidth: '36px', textAlign: isRtl ? 'left' : 'right',
                        color: change > 0 ? 'var(--ds-error)' : change < 0 ? 'var(--ds-primary)' : 'var(--ds-text-muted)',
                      }}>
                        {change > 0 ? '+' : ''}{intl.formatNumber(change)}%
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px', fontSize: '10px', color: 'var(--ds-text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--ds-text-body)', opacity: 0.3, display: 'inline-block' }} />
                  {intl.formatMessage({ id: 'transactions.last_month', defaultMessage: 'Last month' })}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--ds-text-body)', display: 'inline-block' }} />
                  {intl.formatMessage({ id: 'transactions.this_month', defaultMessage: 'This month' })}
                </span>
              </div>
            </div>

            {/* AI Insight — dark glass card */}
            <div style={{
              background: 'var(--ds-bg-card-dark)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px',
              padding: '20px 24px', boxShadow: 'inset 0 0 40px rgba(34,197,94,0.04)',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--ds-primary-glow)">
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 500, color: '#F0FDF4', margin: 0 }}>
                    {intl.formatMessage({ id: 'transactions.ai_insight', defaultMessage: 'AI insight' })}
                  </p>
                  <p style={{ fontSize: '11px', color: '#6B7280', margin: '2px 0 0 0' }}>
                    {intl.formatMessage({ id: 'transactions.based_on_data', defaultMessage: 'Based on your spending data' })}
                  </p>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#F0FDF4', lineHeight: 1.6, margin: 0, opacity: 0.9, flex: 1 }}>
                {(() => {
                  if (monthlyExpenses > monthlyIncome && monthlyIncome > 0) {
                    const overBy = Math.round(monthlyExpenses - monthlyIncome);
                    return isRtl
                      ? `إنفاقك هذا الشهر تجاوز دخلك بمقدار ${currencySymbol} ${intl.formatNumber(overBy)}. راجع نفقاتك أو تحدث مع مستشارك.`
                      : `Your spending this month exceeds your income by ${currencySymbol} ${intl.formatNumber(overBy)}. Review your expenses or talk to Mustasharak.`;
                  }
                  if (savingsRate > 20) {
                    return isRtl
                      ? `معدل ادخارك ${intl.formatNumber(savingsRate)}% — أداء ممتاز! استمر بهذا المعدل.`
                      : `Your savings rate is ${intl.formatNumber(savingsRate)}% — excellent! Keep this up.`;
                  }
                  return isRtl
                    ? 'راقب إنفاقك اليومي للحفاظ على ميزانيتك.'
                    : 'Track your daily spending to stay within budget.';
                })()}
              </p>
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)', marginTop: '12px', paddingTop: '10px', display: 'flex', gap: '8px' }}>
                <Link href="/chat" style={{
                  flex: 1, textAlign: 'center', padding: '6px 12px', color: 'var(--ds-primary-glow)',
                  border: '1.5px solid rgba(74,222,128,0.3)', borderRadius: '8px', fontSize: '12px', fontWeight: 500, textDecoration: 'none',
                  transition: 'box-shadow 200ms ease',
                }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                >
                  {intl.formatMessage({ id: 'transactions.get_advice', defaultMessage: 'Get advice' })}
                </Link>
                <Link href="/learn" style={{
                  flex: 1, textAlign: 'center', padding: '6px 12px', color: 'var(--ds-primary-glow)',
                  border: '1.5px solid rgba(74,222,128,0.3)', borderRadius: '8px', fontSize: '12px', fontWeight: 500, textDecoration: 'none',
                  transition: 'box-shadow 200ms ease',
                }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                >
                  {intl.formatMessage({ id: 'transactions.learn_budgeting', defaultMessage: 'Learn budgeting' })}
                </Link>
              </div>
            </div>
          </div>

          {/* ===== SAVINGS GOALS ===== */}
          {savingsGoals.length > 0 && (
            <div style={{
              background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
              padding: '20px 24px', boxShadow: 'var(--ds-shadow-card)', marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', margin: 0, fontFeatureSettings: '"kern" 1' }}>
                  {intl.formatMessage({ id: 'transactions.savings_goals', defaultMessage: 'Savings goals' })}
                </p>
                <Link href="/goals" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ds-primary)', textDecoration: 'none' }}>
                  {intl.formatMessage({ id: 'transactions.manage_goals', defaultMessage: 'Manage goals' })}
                </Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                {savingsGoals.slice(0, 4).map(goal => {
                  const pct = goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0;
                  return (
                    <div key={goal.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
                          {isRtl ? (goal.nameAr || goal.name) : goal.name}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: goal.color || 'var(--ds-primary)' }}>{intl.formatNumber(pct)}%</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--ds-bg-tinted)', borderRadius: '4px', overflow: 'hidden', marginBottom: '4px' }}>
                        <div style={{ width: mounted ? `${Math.min(pct, 100)}%` : '0%', height: '100%', background: goal.color || 'var(--ds-primary-glow)', borderRadius: '4px', transition: 'width 600ms ease-out' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ds-text-muted)' }}>
                        <span>{currencySymbol} {styledNum(intl.formatNumber(Math.round(goal.currentAmount)))} / {styledNum(intl.formatNumber(Math.round(goal.targetAmount)))}</span>
                        {goal.deadline && <span>{intl.formatDate(new Date(goal.deadline), { month: 'short', year: 'numeric' })}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recurring charges — kept at original position as fallback */}
          {false && recurringPatterns.length > 0 && (
            <div style={{
              background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
              padding: '20px 24px', boxShadow: 'var(--ds-shadow-card)',
              marginBottom: '16px', direction: isRtl ? 'rtl' : 'ltr',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', margin: 0, fontFeatureSettings: '"kern" 1' }}>
                    {intl.formatMessage({ id: 'transactions.recurring_charges', defaultMessage: 'Recurring charges' })}
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', margin: '2px 0 0 0' }}>
                    {intl.formatMessage({ id: 'transactions.recurring_auto_detected', defaultMessage: 'Auto-detected from your expenses' })}
                  </p>
                </div>
                <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
                  <p style={{ fontSize: '11px', color: 'var(--ds-text-muted)', margin: 0 }}>
                    {intl.formatMessage({ id: 'transactions.annual_total', defaultMessage: 'Annual total' })}
                  </p>
                  <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-error)', margin: '2px 0 0 0' }}>
                    {styledNum(intl.formatNumber(totalAnnualRecurring, { style: 'currency', currency }))}
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
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                          {(() => {
                            const d = pattern.description;
                            if (d.includes('||')) { const [ar, en] = d.split('||'); return isRtl ? ar : en; }
                            const cat = ALL_CATEGORIES.find(c => c.id === d.toLowerCase() || c.name.toLowerCase() === d.toLowerCase());
                            return cat ? (isRtl ? cat.nameAr : cat.name) : d;
                          })()}
                        </p>
                        <span style={{
                          fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px',
                          letterSpacing: '0.04em', flexShrink: 0,
                          background: pattern.confirmed ? 'var(--ds-success-bg)' : 'var(--ds-warning-bg)',
                          color: pattern.confirmed ? 'var(--ds-success-text)' : 'var(--ds-warning-text)',
                          border: `0.5px solid ${pattern.confirmed ? 'var(--ds-success-border)' : 'var(--ds-warning-border)'}`,
                        }}>
                          {pattern.confirmed
                            ? (isRtl ? 'مؤكد' : 'CONFIRMED')
                            : (isRtl ? 'مكتشف' : 'DETECTED')}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', margin: '2px 0 0 0' }}>
                        {pattern.amountVaries
                          ? (isRtl
                              ? `~شهرياً، المبلغ يتراوح (${intl.formatNumber(pattern.amountMin)} - ${intl.formatNumber(pattern.amountMax)})`
                              : `~Monthly, varies (${intl.formatNumber(pattern.amountMin, { style: 'currency', currency })} - ${intl.formatNumber(pattern.amountMax, { style: 'currency', currency })})`)
                          : (isRtl
                              ? `شهرياً في حوالي ${intl.formatNumber(pattern.approximateDay)} من كل شهر`
                              : `Monthly on the ~${pattern.approximateDay}${getOrdinalSuffix(pattern.approximateDay)}`)}
                      </p>
                    </div>

                    {/* Amount + annual */}
                    <div style={{ textAlign: isRtl ? 'left' : 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)', margin: 0 }}>
                        {pattern.amountVaries ? '~' : ''}{styledNum(intl.formatNumber(pattern.amount, { style: 'currency', currency }))}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--ds-text-muted)', margin: '2px 0 0 0' }}>
                        {styledNum(intl.formatNumber(pattern.annualCost, { style: 'currency', currency }))}/{isRtl ? 'سنة' : 'yr'}
                      </p>
                    </div>

                    {/* Confirm/dismiss for unconfirmed */}
                    {!pattern.confirmed && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                        <button onClick={() => handleConfirmPattern(pattern.id)} style={{
                          padding: '4px 8px', background: 'var(--ds-bg-tinted)', border: '0.5px solid var(--ds-border-tinted)',
                          borderRadius: '4px', fontSize: '10px', color: 'var(--ds-primary)', fontWeight: 500, cursor: 'pointer',
                        }}>
                          {isRtl ? 'نعم' : 'Yes'}
                        </button>
                        <button onClick={() => handleDismissPattern(pattern.id)} style={{
                          padding: '4px 8px', background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)',
                          borderRadius: '4px', fontSize: '10px', color: 'var(--ds-text-muted)', fontWeight: 500, cursor: 'pointer',
                        }}>
                          {isRtl ? 'لا' : 'No'}
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
                  {isRtl
                    ? `${intl.formatNumber(recurringPatterns.length)} رسوم متكررة مكتشفة`
                    : `${recurringPatterns.length} recurring charge${recurringPatterns.length !== 1 ? 's' : ''} detected`}
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--ds-text-muted)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--ds-success-bg)', border: '0.5px solid var(--ds-success-border)', display: 'inline-block' }} />
                    {isRtl ? 'مؤكد' : 'Confirmed'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--ds-text-muted)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--ds-warning-bg)', border: '0.5px solid var(--ds-warning-border)', display: 'inline-block' }} />
                    {isRtl ? 'يحتاج مراجعة' : 'Needs review'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ===== NO RESULTS STATE ===== */}
          {hasAnyTransactions && !hasFilteredResults && (
            <div style={{
              background: '#FFFFFF', border: '0.5px solid #E5E7EB', borderRadius: '16px',
              padding: '40px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              textAlign: 'center',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%', background: '#F0F7F4',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px', color: '#9CA3AF',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 8px 0' }}>
                {intl.formatMessage({ id: 'transactions.no_results', defaultMessage: 'No transactions match your filters' })}
              </p>
              <button onClick={() => { setSearchQuery(''); setTypeFilter('all'); setCategoryFilter(null); setDateRange('all_time'); }} style={{
                padding: '8px 16px', background: 'transparent', color: '#2D6A4F',
                border: '1.5px solid #86EFAC', borderRadius: '8px',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              }}>
                {intl.formatMessage({ id: 'transactions.clear_filters', defaultMessage: 'Clear all filters' })}
              </button>
            </div>
          )}

          {/* ===== TRANSACTIONS TABLE ===== */}
          {hasFilteredResults && (
          <div className="ds-card" style={{ overflow: 'hidden' }}>
            <div className="ds-section-header">
              <h2 className="ds-title-section">
                {intl.formatMessage({ id: 'transactions.all_transactions', defaultMessage: 'All Transactions' })}
              </h2>
              <span className="ds-supporting">
                {filteredTransactions.length === transactions.length
                  ? intl.formatMessage({ id: 'transactions.transaction_count', defaultMessage: '{count} transactions' }, { count: intl.formatNumber(transactions.length) })
                  : intl.formatMessage({ id: 'transactions.filtered_count', defaultMessage: '{filtered} of {total} transactions' }, { filtered: intl.formatNumber(filteredTransactions.length), total: intl.formatNumber(transactions.length) })}
              </span>
            </div>

            <div className="overflow-x-auto">
            <table style={{ width: '100%', minWidth: '600px' }}>
              <thead>
                <tr className="ds-table-header">
                  <th className="ds-table-cell ds-label" style={{ textAlign: 'start' }}>
                    {intl.formatMessage({ id: 'transactions.date', defaultMessage: 'Date' })}
                  </th>
                  <th className="ds-table-cell ds-label" style={{ textAlign: 'start' }}>
                    {intl.formatMessage({ id: 'transactions.category', defaultMessage: 'Category' })}
                  </th>
                  <th className="ds-table-cell ds-label" style={{ textAlign: 'start' }}>
                    {intl.formatMessage({ id: 'transactions.description', defaultMessage: 'Description' })}
                  </th>
                  <th className="ds-table-cell ds-label" style={{ textAlign: 'start' }}>
                    {intl.formatMessage({ id: 'transactions.type', defaultMessage: 'Type' })}
                  </th>
                  <th className="ds-table-cell ds-label" style={{ textAlign: 'end' }}>
                    {intl.formatMessage({ id: 'transactions.amount', defaultMessage: 'Amount' })}
                  </th>
                  <th className="ds-table-cell ds-label" style={{ textAlign: 'right', width: '60px' }}>

                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    onDelete={() => handleDeleteClick(transaction)}
                    intl={intl}
                  />
                ))}
              </tbody>
            </table>
            </div>
          </div>
          )}

          {/* ===== RECURRING CHARGES ===== */}
          {recurringPatterns.length > 0 && (
            <div style={{
              background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
              padding: '20px 24px', boxShadow: 'var(--ds-shadow-card)',
              marginTop: '16px', direction: isRtl ? 'rtl' : 'ltr',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', margin: 0, fontFeatureSettings: '"kern" 1' }}>
                    {intl.formatMessage({ id: 'transactions.recurring_charges', defaultMessage: 'Recurring charges' })}
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', margin: '2px 0 0 0' }}>
                    {intl.formatMessage({ id: 'transactions.recurring_auto_detected', defaultMessage: 'Auto-detected from your expenses' })}
                  </p>
                </div>
                <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
                  <p style={{ fontSize: '11px', color: 'var(--ds-text-muted)', margin: 0 }}>
                    {intl.formatMessage({ id: 'transactions.annual_total', defaultMessage: 'Annual total' })}
                  </p>
                  <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-error)', margin: '2px 0 0 0' }}>
                    {styledNum(intl.formatNumber(totalAnnualRecurring, { style: 'currency', currency }))}
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
                    margin: !pattern.confirmed ? '0 -24px' : '0', flexWrap: 'wrap',
                  }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px',
                      background: pattern.confirmed ? 'rgba(45,106,79,0.1)' : 'rgba(217,119,6,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: pattern.confirmed ? 'var(--ds-primary)' : 'var(--ds-accent-gold)', flexShrink: 0,
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10z" />
                        <line x1="9" y1="7" x2="15" y2="7" /><line x1="9" y1="11" x2="15" y2="11" /><line x1="9" y1="15" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(() => {
                            const d = pattern.description;
                            if (d.includes('||')) { const [ar, en] = d.split('||'); return isRtl ? ar : en; }
                            const cat = ALL_CATEGORIES.find(c => c.id === d.toLowerCase() || c.name.toLowerCase() === d.toLowerCase());
                            return cat ? (isRtl ? cat.nameAr : cat.name) : d;
                          })()}</p>
                        <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.04em', flexShrink: 0,
                          background: pattern.confirmed ? 'var(--ds-success-bg)' : 'var(--ds-warning-bg)',
                          color: pattern.confirmed ? 'var(--ds-success-text)' : 'var(--ds-warning-text)',
                          border: `0.5px solid ${pattern.confirmed ? 'var(--ds-success-border)' : 'var(--ds-warning-border)'}`,
                        }}>{pattern.confirmed ? (isRtl ? 'مؤكد' : 'CONFIRMED') : (isRtl ? 'مكتشف' : 'DETECTED')}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', margin: '2px 0 0 0' }}>
                        {pattern.amountVaries
                          ? (isRtl ? `~شهرياً، المبلغ يتراوح (${intl.formatNumber(pattern.amountMin)} - ${intl.formatNumber(pattern.amountMax)})` : `~Monthly, varies (${intl.formatNumber(pattern.amountMin, { style: 'currency', currency })} - ${intl.formatNumber(pattern.amountMax, { style: 'currency', currency })})`)
                          : (isRtl ? `شهرياً في حوالي ${intl.formatNumber(pattern.approximateDay)} من كل شهر` : `Monthly on the ~${pattern.approximateDay}${getOrdinalSuffix(pattern.approximateDay)}`)}
                      </p>
                    </div>
                    <div style={{ textAlign: isRtl ? 'left' : 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)', margin: 0 }}>{pattern.amountVaries ? '~' : ''}{styledNum(intl.formatNumber(pattern.amount, { style: 'currency', currency }))}</p>
                      <p style={{ fontSize: '11px', color: 'var(--ds-text-muted)', margin: '2px 0 0 0' }}>{styledNum(intl.formatNumber(pattern.annualCost, { style: 'currency', currency }))}/{isRtl ? 'سنة' : 'yr'}</p>
                    </div>
                    {!pattern.confirmed && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                        <button onClick={() => handleConfirmPattern(pattern.id)} style={{ padding: '4px 8px', background: 'var(--ds-bg-tinted)', border: '0.5px solid var(--ds-border-tinted)', borderRadius: '4px', fontSize: '10px', color: 'var(--ds-primary)', fontWeight: 500, cursor: 'pointer' }}>{isRtl ? 'نعم' : 'Yes'}</button>
                        <button onClick={() => handleDismissPattern(pattern.id)} style={{ padding: '4px 8px', background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '4px', fontSize: '10px', color: 'var(--ds-text-muted)', fontWeight: 500, cursor: 'pointer' }}>{isRtl ? 'لا' : 'No'}</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '0.5px solid var(--ds-border)', flexWrap: 'wrap', gap: '8px' }}>
                <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', margin: 0 }}>{isRtl ? `${intl.formatNumber(recurringPatterns.length)} رسوم متكررة مكتشفة` : `${recurringPatterns.length} recurring charge${recurringPatterns.length !== 1 ? 's' : ''} detected`}</p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--ds-text-muted)' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--ds-success-bg)', border: '0.5px solid var(--ds-success-border)', display: 'inline-block' }} />{isRtl ? 'مؤكد' : 'Confirmed'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--ds-text-muted)' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--ds-warning-bg)', border: '0.5px solid var(--ds-warning-border)', display: 'inline-block' }} />{isRtl ? 'يحتاج مراجعة' : 'Needs review'}</span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Empty State per Contract Section 5 */
        <div className="ds-card">
          <EmptyState intl={intl} />
        </div>
      )}

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      {/* Per Contract Section 4: Deletion requires explicit confirmation */}
      {deleteTarget && (
        <DeleteConfirmModal
          transaction={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          intl={intl}
        />
      )}
    </div>
  );
}

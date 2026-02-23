'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useTransactions } from '@/store/transactionStore';
import { useCurrency } from '@/store/useStore';
import { useAuthStore } from '@/store/authStore';
import { styledNum } from '@/components/StyledNumber';

/* ============================================
   ADD EXPENSE PAGE
   Bound by: /docs/contracts/Transactions.functional.md
   
   This page:
   - Has real input fields with validation
   - Creates transaction on submit
   - Redirects to Transactions page after creation
   - No educational copy or placeholder logic
   ============================================ */

/* ===== EXPENSE CATEGORIES ===== */
const EXPENSE_CATEGORIES = [
  { id: 'food', labelKey: 'categories.food' },
  { id: 'transport', labelKey: 'categories.transport' },
  { id: 'shopping', labelKey: 'categories.shopping' },
  { id: 'housing', labelKey: 'categories.housing' },
  { id: 'health', labelKey: 'categories.health' },
  { id: 'entertainment', labelKey: 'categories.entertainment' },
  { id: 'bills', labelKey: 'categories.bills' },
] as const;

/* ===== ICONS ===== */
const FoodIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
    <line x1="6" y1="1" x2="6" y2="4" />
    <line x1="10" y1="1" x2="10" y2="4" />
    <line x1="14" y1="1" x2="14" y2="4" />
  </svg>
);

const TransportIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const ShoppingIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const HomeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const HealthIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const EntertainmentIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
    <polyline points="17 2 12 7 7 2" />
  </svg>
);

const BillsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  food: <FoodIcon />,
  transport: <TransportIcon />,
  shopping: <ShoppingIcon />,
  housing: <HomeIcon />,
  health: <HealthIcon />,
  entertainment: <EntertainmentIcon />,
  bills: <BillsIcon />,
};

/* ===== TRANSACTION TYPE TOGGLE ===== */
function TransactionTypeToggle({ intl }: { intl: ReturnType<typeof useIntl> }) {
  return (
    <div
      style={{
        display: 'flex',
        padding: '4px',
        background: 'var(--theme-bg-tertiary)',
        borderRadius: 'var(--radius-pill)',
      }}
    >
      <span
        style={{
          flex: 1,
          padding: '10px 24px',
          fontSize: '0.875rem',
          fontWeight: 500,
          borderRadius: 'var(--radius-pill)',
          background: 'var(--color-bg-surface-1)',
          color: 'var(--color-error)',
          boxShadow: '0 1px 3px rgb(0 0 0 / 0.1)',
          textAlign: 'center',
          cursor: 'default',
        }}
      >
        {intl.formatMessage({ id: 'transactions.expense', defaultMessage: 'Expense' })}
      </span>
      <Link
        href="/transactions/new/income"
        style={{
          flex: 1,
          padding: '10px 24px',
          fontSize: '0.875rem',
          fontWeight: 500,
          borderRadius: 'var(--radius-pill)',
          background: 'transparent',
          color: 'var(--color-text-muted)',
          textAlign: 'center',
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        {intl.formatMessage({ id: 'transactions.income', defaultMessage: 'Income' })}
      </Link>
    </div>
  );
}

/* ===== CATEGORY ITEM ===== */
function CategoryItem({
  id,
  icon,
  label,
  selected,
  onClick,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-2)',
        borderRadius: 'var(--radius-sm)',
        border: selected ? '2px solid var(--color-error)' : '1px solid var(--color-border)',
        background: selected ? 'rgba(239, 68, 68, 0.08)' : 'var(--color-bg-surface-1)',
        cursor: 'pointer',
        gap: '8px',
        minHeight: '80px',
        transition: 'all 0.15s ease',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: selected ? 'var(--color-error)' : 'var(--color-text-muted)',
        }}
      >
        {icon}
      </div>
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 500,
          color: selected ? 'var(--color-error)' : 'var(--color-text-secondary)',
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ===== MAIN PAGE ===== */
export default function AddExpensePage() {
  const intl = useIntl();
  const router = useRouter();
  const { addTransaction } = useTransactions();
  const currency = useCurrency();
  
  // Auth state - gate form submission until auth is ready
  const initialized = useAuthStore((state) => state.initialized);
  const user = useAuthStore((state) => state.user);
  const isAuthReady = initialized && !!user;
  
  console.log('[AddExpense] initialized:', initialized, 'user:', user?.id, 'isAuthReady:', isAuthReady);

  // Form state
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  // Validation state
  const [errors, setErrors] = useState<{ amount?: string; category?: string; date?: string }>({});

  // Validate form
  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    // Amount validation - must be positive number
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = intl.formatMessage({ id: 'transactions.error_amount_required', defaultMessage: 'Amount must be a positive number' });
    }

    // Category validation - required
    if (!category) {
      newErrors.category = intl.formatMessage({ id: 'transactions.error_category_required', defaultMessage: 'Please select a category' });
    }

    // Date validation - required and valid
    if (!date) {
      newErrors.date = intl.formatMessage({ id: 'transactions.error_date_required', defaultMessage: 'Date is required' });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!validate()) return;

    // Create transaction per Contract Section 4
    addTransaction({
      amount: parseFloat(amount),
      currency: currency,
      date: date,
      type: 'expense',
      category: category,
      description: description || undefined,
    });

    // Redirect to transactions page
    router.push('/transactions');
  };

  // Handle cancel
  const handleCancel = () => {
    router.push('/transactions');
  };

  // Format display amount using intl for locale-aware currency display
  // Only show decimals if user explicitly entered them (contains a dot)
  const parsedAmount = amount ? parseFloat(amount) : 0;
  const hasDecimals = amount.includes('.');
  const formattedAmount = styledNum(intl.formatNumber(parsedAmount, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }));
  
  // Format date for display (locale-aware)
  const formattedDate = date ? intl.formatDate(new Date(date + 'T00:00:00'), { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        paddingTop: 'var(--spacing-2)',
        paddingBottom: 'var(--spacing-4)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '500px' }}>
        <div className="ds-card">
          {/* ===== TRANSACTION TYPE TOGGLE ===== */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 'var(--spacing-3)',
            }}
          >
            <div style={{ width: '240px' }}>
              <TransactionTypeToggle intl={intl} />
            </div>
          </div>

          {/* ===== AMOUNT INPUT ===== */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-3)' }}>
            <p
              style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 'var(--spacing-1)',
              }}
            >
              {intl.formatMessage({ id: 'transactions.amount', defaultMessage: 'Amount' })}
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                style={{
                  fontSize: '3rem',
                  fontWeight: 300,
                  color: amount ? 'var(--color-error)' : 'var(--color-text-muted)',
                  letterSpacing: '-0.02em',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  width: '200px',
                  textAlign: 'center',
                }}
              />
              {/* Locale-aware currency display */}
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 500,
                  color: amount ? 'var(--color-error)' : 'var(--color-text-muted)',
                }}
              >
                {formattedAmount}
              </span>
            </div>
            {errors.amount && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px' }}>
                {errors.amount}
              </p>
            )}
          </div>

          {/* ===== CATEGORY GRID ===== */}
          <div style={{ marginBottom: 'var(--spacing-3)' }}>
            <p
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--spacing-1)',
              }}
            >
              {intl.formatMessage({ id: 'transactions.select_category', defaultMessage: 'Select Category' })}
            </p>
            {errors.category && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginBottom: '8px' }}>
                {errors.category}
              </p>
            )}
            <div
              style={{
                display: 'grid',
                gap: 'var(--spacing-1)',
              }}
              className="grid-cols-3 sm:grid-cols-4"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <CategoryItem
                  key={cat.id}
                  id={cat.id}
                  icon={CATEGORY_ICONS[cat.id]}
                  label={intl.formatMessage({ id: cat.labelKey, defaultMessage: cat.id })}
                  selected={category === cat.id}
                  onClick={() => setCategory(cat.id)}
                />
              ))}
            </div>
          </div>

          {/* ===== DATE PICKER ===== */}
          <div style={{ marginBottom: 'var(--spacing-2)' }}>
            <p
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                marginBottom: '6px',
              }}
            >
              {intl.formatMessage({ id: 'transactions.date', defaultMessage: 'Date' })}
            </p>
            <div style={{ position: 'relative' }}>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '0.875rem',
                  color: 'var(--color-text-primary)',
                  background: 'var(--color-bg-input)',
                  border: errors.date
                    ? '1px solid var(--color-error)'
                    : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  outline: 'none',
                }}
              />
            </div>
            {errors.date && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px' }}>
                {errors.date}
              </p>
            )}
          </div>

          {/* ===== DESCRIPTION ===== */}
          <div style={{ marginBottom: 'var(--spacing-3)' }}>
            <p
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                marginBottom: '6px',
              }}
            >
              {intl.formatMessage({ id: 'transactions.description_optional', defaultMessage: 'Description (optional)' })}
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={intl.formatMessage({ id: 'transactions.expense_description_placeholder', defaultMessage: 'What was this expense for?' })}
              rows={2}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '0.875rem',
                color: 'var(--color-text-primary)',
                background: 'var(--color-bg-input)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>

          {/* ===== FOOTER ACTIONS ===== */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 'var(--spacing-2)',
              borderTop: '1px solid var(--color-divider)',
            }}
          >
            <button
              type="button"
              onClick={handleCancel}
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 0',
              }}
            >
              {intl.formatMessage({ id: 'transactions.cancel', defaultMessage: 'Cancel' })}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isAuthReady}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#FFFFFF',
                background: isAuthReady ? 'var(--color-error)' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '12px 24px',
                cursor: isAuthReady ? 'pointer' : 'not-allowed',
                opacity: isAuthReady ? 1 : 0.6,
              }}
            >
              <CheckIcon />
              {intl.formatMessage({ id: 'transactions.add_expense', defaultMessage: 'Add Expense' })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

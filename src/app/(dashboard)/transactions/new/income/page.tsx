'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useTransactions } from '@/store/transactionStore';
import { useCurrency, useLanguage } from '@/store/useStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabaseClient';
import { styledNum } from '@/components/StyledNumber';

/* ============================================
   ADD INCOME PAGE
   Bound by: /docs/contracts/Transactions.functional.md
   
   This page:
   - Has real input fields with validation
   - Creates transaction on submit
   - Redirects to Transactions page after creation
   - No educational copy or placeholder logic
   ============================================ */

/* ===== INCOME CATEGORIES ===== */
const INCOME_CATEGORIES = [
  { id: 'salary', labelKey: 'categories.salary' },
  { id: 'freelance', labelKey: 'categories.freelance' },
  { id: 'investments', labelKey: 'categories.investments' },
  { id: 'gifts', labelKey: 'categories.gifts' },
  { id: 'rental', labelKey: 'categories.rental' },
  { id: 'refunds', labelKey: 'categories.refunds' },
  { id: 'bonus', labelKey: 'categories.bonus' },
] as const;

/* ===== ICONS ===== */
const SalaryIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const FreelanceIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const InvestmentsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const GiftsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 12 20 22 4 22 4 12" />
    <rect x="2" y="7" width="20" height="5" />
    <line x1="12" y1="22" x2="12" y2="7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </svg>
);

const RentalIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const RefundsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const BonusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="7" />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  salary: <SalaryIcon />,
  freelance: <FreelanceIcon />,
  investments: <InvestmentsIcon />,
  gifts: <GiftsIcon />,
  rental: <RentalIcon />,
  refunds: <RefundsIcon />,
  bonus: <BonusIcon />,
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
      <Link
        href="/transactions/new"
        style={{
          flex: 1,
          padding: '10px 24px',
          fontSize: '0.875rem',
          fontWeight: 500,
          borderRadius: 'var(--radius-pill)',
          background: 'transparent',
          color: 'var(--ds-text-muted)',
          textAlign: 'center',
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        {intl.formatMessage({ id: 'transactions.expense', defaultMessage: 'Expense' })}
      </Link>
      <span
        style={{
          flex: 1,
          padding: '10px 24px',
          fontSize: '0.875rem',
          fontWeight: 500,
          borderRadius: 'var(--radius-pill)',
          background: 'var(--color-bg-surface-1)',
          color: 'var(--ds-primary)',
          boxShadow: '0 1px 3px rgb(0 0 0 / 0.1)',
          textAlign: 'center',
          cursor: 'default',
        }}
      >
        {intl.formatMessage({ id: 'transactions.income', defaultMessage: 'Income' })}
      </span>
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
        borderRadius: '8px',
        border: selected ? '0.5px solid var(--ds-primary)' : '0.5px solid var(--ds-border)',
        background: selected ? 'rgba(45, 106, 79, 0.06)' : 'var(--ds-bg-card)',
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
          color: selected ? 'var(--ds-primary)' : 'var(--ds-text-muted)',
        }}
      >
        {icon}
      </div>
      <span
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: selected ? 'var(--ds-primary)' : 'var(--ds-text-muted)',
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ===== MAIN PAGE ===== */
export default function AddIncomePage() {
  const intl = useIntl();
  const router = useRouter();
  const { addTransaction } = useTransactions();
  const currency = useCurrency();
  const language = useLanguage();
  const isRtl = language === 'ar';

  // Auth state - gate form submission until auth is ready
  const initialized = useAuthStore((state) => state.initialized);
  const user = useAuthStore((state) => state.user);
  const isAuthReady = initialized && !!user;

  // Recover session if auth store lost the user (e.g. transient refresh failure)
  useEffect(() => {
    if (initialized && !user) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          useAuthStore.getState().setSession(data.session);
        }
      });
    }
  }, [initialized, user]);

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
      type: 'income',
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
        paddingInline: '20px',
        direction: isRtl ? 'rtl' : 'ltr',
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
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--ds-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
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
                  color: amount ? 'var(--ds-primary)' : 'var(--ds-text-muted)',
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
                  fontSize: '18px',
                  fontWeight: 500,
                  color: amount ? 'var(--ds-primary)' : 'var(--ds-text-muted)',
                }}
              >
                {formattedAmount}
              </span>
            </div>
            {errors.amount && (
              <p style={{ fontSize: '12px', color: 'var(--ds-error)', marginTop: '4px' }}>
                {errors.amount}
              </p>
            )}
          </div>

          {/* ===== CATEGORY GRID ===== */}
          <div style={{ marginBottom: 'var(--spacing-3)' }}>
            <p
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--ds-text-heading)',
                marginBottom: 'var(--spacing-1)',
              }}
            >
              {intl.formatMessage({ id: 'transactions.select_category', defaultMessage: 'Select Category' })}
            </p>
            {errors.category && (
              <p style={{ fontSize: '12px', color: 'var(--ds-error)', marginBottom: '8px' }}>
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
              {INCOME_CATEGORIES.map((cat) => (
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
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--ds-text-heading)',
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
                  padding: '10px 14px',
                  fontSize: '14px',
                  color: 'var(--ds-text-heading)',
                  background: 'var(--ds-bg-input)',
                  border: errors.date
                    ? '0.5px solid var(--ds-error)'
                    : '0.5px solid var(--ds-border)',
                  borderRadius: '8px',
                  outline: 'none',
                }}
              />
            </div>
            {errors.date && (
              <p style={{ fontSize: '12px', color: 'var(--ds-error)', marginTop: '4px' }}>
                {errors.date}
              </p>
            )}
          </div>

          {/* ===== DESCRIPTION ===== */}
          <div style={{ marginBottom: 'var(--spacing-3)' }}>
            <p
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--ds-text-heading)',
                marginBottom: '6px',
              }}
            >
              {intl.formatMessage({ id: 'transactions.description_optional', defaultMessage: 'Description (optional)' })}
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={intl.formatMessage({ id: 'transactions.income_description_placeholder', defaultMessage: 'What was this income from?' })}
              rows={2}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                color: 'var(--ds-text-heading)',
                background: 'var(--ds-bg-input)',
                border: '0.5px solid var(--ds-border)',
                borderRadius: '8px',
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
              borderTop: '0.5px solid var(--ds-border)',
            }}
          >
            <button
              type="button"
              onClick={handleCancel}
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--ds-text-muted)',
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
                fontSize: '13px',
                fontWeight: 500,
                color: '#FFFFFF',
                background: isAuthReady ? 'var(--ds-primary)' : 'var(--ds-text-muted)',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 18px',
                cursor: isAuthReady ? 'pointer' : 'not-allowed',
                opacity: isAuthReady ? 1 : 0.6,
              }}
            >
              <CheckIcon />
              {intl.formatMessage({ id: 'transactions.add_income', defaultMessage: 'Add Income' })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

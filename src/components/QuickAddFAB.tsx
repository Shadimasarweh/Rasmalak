'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useIntl } from 'react-intl';
import { useLanguage, useCurrency } from '@/store/useStore';
import { useTransactions } from '@/store/transactionStore';
import { useBudget } from '@/store/budgetStore';
import { useAuthStore } from '@/store/authStore';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, CURRENCIES } from '@/lib/constants';

export default function QuickAddFAB() {
  const pathname = usePathname();
  const intl = useIntl();
  const language = useLanguage();
  const currency = useCurrency();
  const isRtl = language === 'ar';
  const { transactions, addTransaction } = useTransactions();
  const { categoryBudgets } = useBudget();
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const isAuthReady = initialized && !!user;

  const currencyInfo = CURRENCIES.find(c => c.code === currency);
  const currencySymbol = isRtl
    ? (currencyInfo?.symbolAr || currencyInfo?.symbol || currency)
    : (currencyInfo?.symbol || currency);

  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringEndDate, setRecurringEndDate] = useState('');

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 769);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Reset form when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setCategory(null);
      setType('expense');
      setIsRecurring(false);
      setRecurringEndDate('');
    }
  }, [isOpen]);

  // Budget context
  const budgetWarning = (() => {
    if (type !== 'expense' || !category || !amount) return null;
    const limit = categoryBudgets[category];
    if (!limit || limit <= 0) return null;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    let currentSpend = 0;
    transactions.forEach(tx => {
      if (tx.type !== 'expense') return;
      const d = new Date(tx.date);
      if (d >= startOfMonth && d <= endOfMonth && (tx.category || '') === category) {
        currentSpend += Math.abs(tx.amount);
      }
    });

    const newTotal = currentSpend + (parseFloat(amount) || 0);
    const pct = Math.round((newTotal / limit) * 100);
    if (pct > 80) {
      const cat = DEFAULT_EXPENSE_CATEGORIES.find(c => c.id === category);
      const catName = cat ? (isRtl ? cat.nameAr : cat.name) : category;
      return {
        messageEn: `This puts ${catName} at ${currencySymbol} ${intl.formatNumber(Math.round(newTotal))} — ${pct}% ${pct > 100 ? 'over' : 'of'} budget`,
        messageAr: `هذا سيجعل ${catName} عند ${currencySymbol} ${intl.formatNumber(Math.round(newTotal))} — ${intl.formatNumber(pct)}% ${pct > 100 ? 'فوق' : 'من'} الميزانية`,
        isOver: pct > 100,
      };
    }
    return null;
  })();

  const parsedAmount = parseFloat(amount) || 0;
  const canSubmit = isAuthReady && amount && parsedAmount > 0 && category;

  const handleSubmit = () => {
    if (!canSubmit) return;
    addTransaction({
      amount: parsedAmount,
      currency,
      date: new Date().toISOString().split('T')[0],
      type,
      category: category!,
      description: undefined,
      isRecurring,
      recurringEndDate: isRecurring && recurringEndDate ? recurringEndDate : null,
    });
    setIsOpen(false);
  };

  const categories = type === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;

  if (!isMobile || !isAuthReady || pathname.startsWith('/learn')) return null;

  return (
    <>
      {/* FAB */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '80px',
            ...(isRtl ? { left: '24px' } : { right: '24px' }),
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#2D6A4F',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(45,106,79,0.3)',
            zIndex: 40,
            transition: 'transform 150ms ease',
          }}
          onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)'; }}
          onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}

      {/* Bottom sheet */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.4)',
            }}
          />

          {/* Sheet */}
          <div style={{
            position: 'relative',
            background: '#FFFFFF',
            borderRadius: '16px 16px 0 0',
            border: '0.5px solid #E5E7EB',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.1)',
            padding: '20px',
            direction: isRtl ? 'rtl' : 'ltr',
            maxHeight: '85vh',
            overflowY: 'auto',
          }}>
            {/* Handle */}
            <div style={{
              width: '40px', height: '4px', borderRadius: '2px',
              background: '#E5E7EB', margin: '0 auto 16px',
            }} />

            {/* Type toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                onClick={() => { setType('expense'); setCategory(null); }}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                  background: type === 'expense' ? '#DC2626' : 'transparent',
                  color: type === 'expense' ? '#FFFFFF' : '#374151',
                  border: type === 'expense' ? 'none' : '0.5px solid #E5E7EB',
                }}
              >
                {intl.formatMessage({ id: 'transactions.expense', defaultMessage: 'Expense' })}
              </button>
              <button
                onClick={() => { setType('income'); setCategory(null); }}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                  background: type === 'income' ? '#2D6A4F' : 'transparent',
                  color: type === 'income' ? '#FFFFFF' : '#374151',
                  border: type === 'income' ? 'none' : '0.5px solid #E5E7EB',
                }}
              >
                {intl.formatMessage({ id: 'transactions.income', defaultMessage: 'Income' })}
              </button>
            </div>

            {/* Amount input */}
            <div style={{ marginBottom: '16px', textAlign: 'center' }}>
              <p style={{
                fontSize: '11px', fontWeight: 500, color: '#9CA3AF',
                textTransform: 'uppercase', letterSpacing: '0.04em',
                margin: '0 0 8px 0',
              }}>
                {intl.formatMessage({ id: 'transactions.amount', defaultMessage: 'Amount' })}
              </p>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                autoFocus
                style={{
                  width: '100%', textAlign: 'center',
                  fontSize: '36px', fontWeight: 300,
                  color: amount
                    ? (type === 'expense' ? '#DC2626' : '#2D6A4F')
                    : '#9CA3AF',
                  border: 'none', background: 'transparent', outline: 'none',
                }}
              />
              <p style={{
                fontSize: '13px', margin: '4px 0 0 0',
                color: amount
                  ? (type === 'expense' ? '#DC2626' : '#2D6A4F')
                  : '#9CA3AF',
              }}>
                {currencySymbol}
              </p>
            </div>

            {/* Category pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {categories.map((cat) => {
                const active = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(active ? null : cat.id)}
                    style={{
                      padding: '8px 14px', borderRadius: '8px',
                      fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                      background: active ? '#F0F7F4' : '#F5F0EB',
                      color: active ? '#2D6A4F' : '#374151',
                      border: active ? '0.5px solid #D1FAE5' : '0.5px solid #E5E7EB',
                    }}
                  >
                    {isRtl ? cat.nameAr : cat.name}
                  </button>
                );
              })}
            </div>

            {/* Budget warning */}
            {budgetWarning && (
              <div style={{
                background: budgetWarning.isOver ? '#FEF2F2' : '#FFFBEB',
                border: `0.5px solid ${budgetWarning.isOver ? '#FECACA' : '#FDE68A'}`,
                borderRadius: '8px', padding: '10px 14px', marginBottom: '12px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke={budgetWarning.isOver ? '#DC2626' : '#D97706'}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p style={{
                  fontSize: '12px', margin: 0,
                  color: budgetWarning.isOver ? '#991B1B' : '#92400E',
                }}>
                  {isRtl ? budgetWarning.messageAr : budgetWarning.messageEn}
                </p>
              </div>
            )}

            {/* Recurring toggle */}
            <div style={{ marginBottom: '12px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: isRecurring ? '0.5px solid #2D6A4F' : '0.5px solid #E5E7EB',
                  background: isRecurring ? 'rgba(45, 106, 79, 0.06)' : '#F9FAFB',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => {
                    setIsRecurring(e.target.checked);
                    if (!e.target.checked) setRecurringEndDate('');
                  }}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#2D6A4F',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                  {intl.formatMessage({ id: 'transactions.recurring_transaction', defaultMessage: 'Recurring transaction' })}
                </span>
              </label>

              {isRecurring && (
                <div style={{ marginTop: '8px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 500, color: '#374151', margin: '0 0 6px 0' }}>
                    {intl.formatMessage({ id: 'transactions.recurring_end_date', defaultMessage: 'End date (optional)' })}
                  </p>
                  <input
                    type="date"
                    value={recurringEndDate}
                    onChange={(e) => setRecurringEndDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '14px',
                      color: '#374151',
                      background: '#F9FAFB',
                      border: '0.5px solid #E5E7EB',
                      borderRadius: '8px',
                      outline: 'none',
                    }}
                  />
                  {!recurringEndDate && (
                    <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0 0' }}>
                      {intl.formatMessage({ id: 'transactions.recurring_indefinite', defaultMessage: 'Repeats until cancelled' })}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                width: '100%', padding: '12px',
                background: !canSubmit
                  ? '#E5E7EB'
                  : (type === 'expense' ? '#DC2626' : '#2D6A4F'),
                color: !canSubmit ? '#9CA3AF' : '#FFFFFF',
                border: 'none', borderRadius: '8px',
                fontSize: '13px', fontWeight: 500,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
              }}
            >
              {canSubmit
                ? (type === 'expense'
                    ? (isRtl
                        ? `إضافة مصروف — ${currencySymbol} ${intl.formatNumber(parsedAmount)}`
                        : `Add expense — ${currencySymbol} ${intl.formatNumber(parsedAmount)}`)
                    : (isRtl
                        ? `إضافة دخل — ${currencySymbol} ${intl.formatNumber(parsedAmount)}`
                        : `Add income — ${currencySymbol} ${intl.formatNumber(parsedAmount)}`))
                : (isRtl ? 'حفظ' : 'Save')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

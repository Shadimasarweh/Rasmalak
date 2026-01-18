'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Settings, Loader2 } from 'lucide-react';
import { CategoryPicker } from '@/components';
import { useStore, useCurrency, useTransactions } from '@/store/useStore';
import { TransactionType } from '@/types';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, CURRENCIES } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';
import { useMemo } from 'react';

function NewTransactionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addTransaction = useStore((state) => state.addTransaction);
  const updateTransaction = useStore((state) => state.updateTransaction);
  const transactions = useTransactions();
  const currency = useCurrency();
  const { t, language, isRTL } = useTranslation();
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Check if we're editing an existing transaction
  const editId = searchParams.get('edit');
  const editingTransaction = useMemo(() => {
    if (!editId) return null;
    return transactions.find(t => t.id === editId) || null;
  }, [editId, transactions]);
  const isEditing = !!editingTransaction;

  const initialType = editingTransaction?.type || (searchParams.get('type') as TransactionType) || 'expense';
  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol || currency;

  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState(editingTransaction?.amount?.toString() || '');
  const [category, setCategory] = useState(editingTransaction?.category || '');
  const [description, setDescription] = useState(editingTransaction?.description || '');
  const [date, setDate] = useState(editingTransaction?.date || new Date().toISOString().split('T')[0]);
  const [initialized, setInitialized] = useState(false);

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  // Initialize form with editing transaction data
  useEffect(() => {
    if (editingTransaction && !initialized) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setCategory(editingTransaction.category);
      setDescription(editingTransaction.description || '');
      setDate(editingTransaction.date);
      setInitialized(true);
    }
  }, [editingTransaction, initialized]);

  // Set default category when type changes (only for new transactions)
  useEffect(() => {
    if (!isEditing && !category) {
      const categories = type === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;
      setCategory(categories[0].id);
    }
  }, [type, isEditing, category]);

  const handleCategorySelect = (categoryId: string) => {
    setCategory(categoryId);
    // Auto-focus amount input when category is selected
    setTimeout(() => {
      amountInputRef.current?.focus();
    }, 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !category) return;

    if (isEditing && editingTransaction) {
      // Update existing transaction
      updateTransaction(editingTransaction.id, {
        type,
        amount: parseFloat(amount),
        currency, // Update to current display currency
        category,
        description,
        date,
      });
    } else {
      // Add new transaction
      addTransaction({
        type,
        amount: parseFloat(amount),
        currency, // Store the currency the transaction was entered in
        category,
        description,
        date,
      });
    }

    router.push('/transactions');
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 header-glass">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/transactions"
              className="w-11 h-11 rounded-2xl bg-[var(--color-bg-card)] flex items-center justify-center shadow-sm border border-[var(--color-border-light)] transition-all hover:shadow-md"
            >
              <BackArrow className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </Link>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              {isEditing 
                ? (language === 'ar' ? 'تعديل المعاملة' : 'Edit Transaction')
                : t.transactions.newTransaction}
            </h1>
          </div>

          <Link
            href="/settings"
            className="w-11 h-11 rounded-2xl bg-[var(--color-bg-card)] flex items-center justify-center shadow-sm border border-[var(--color-border-light)] transition-all hover:shadow-md"
          >
            <Settings className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </Link>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 space-y-6 pb-8 animate-fadeInUp">
        {/* Type Toggle */}
        <div className="card">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
            {t.transactions.type}
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                type === 'expense'
                  ? 'bg-[var(--color-danger)] text-white'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
              }`}
            >
              {t.transactions.expense}
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                type === 'income'
                  ? 'bg-[var(--color-success)] text-white'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
              }`}
            >
              {t.transactions.income}
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div className="card">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
            {t.transactions.amount}
          </label>
          <div className="relative">
            <input
              ref={amountInputRef}
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full text-4xl font-bold text-center py-4 bg-[var(--color-bg-secondary)] rounded-xl border-2 border-transparent focus:border-[var(--color-primary)] focus:bg-[var(--color-bg-card)] transition-all outline-none text-[var(--color-text-primary)]"
              required
            />
            <span className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-lg text-[var(--color-text-muted)]`}>
              {currencySymbol}
            </span>
          </div>
        </div>

        {/* Category Picker */}
        <div className="card">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
            {t.transactions.category}
          </label>
          <CategoryPicker
            type={type}
            selectedCategory={category}
            onSelect={handleCategorySelect}
          />
        </div>

        {/* Description */}
        <div className="card">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
            {t.transactions.descriptionOptional}
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.transactions.descriptionPlaceholder}
            className="input"
          />
        </div>

        {/* Date */}
        <div className="card">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
            {t.transactions.date}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!amount || !category}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            amount && category
              ? isEditing
                ? 'bg-[var(--color-primary)] text-white hover:opacity-90'
                : type === 'expense'
                  ? 'bg-[var(--color-danger)] text-white hover:opacity-90'
                  : 'bg-[var(--color-success)] text-white hover:opacity-90'
              : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] cursor-not-allowed'
          }`}
        >
          {isEditing 
            ? (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes')
            : type === 'expense' ? t.transactions.addExpense : t.transactions.addIncome}
        </button>
      </form>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
    </div>
  );
}

export default function NewTransactionPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NewTransactionForm />
    </Suspense>
  );
}



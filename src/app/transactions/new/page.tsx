'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, X, Loader2 } from 'lucide-react';
import { CategoryPicker } from '@/components';
import { useStore } from '@/store/useStore';
import { TransactionType } from '@/types';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@/lib/constants';

function NewTransactionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addTransaction = useStore((state) => state.addTransaction);

  const initialType = (searchParams.get('type') as TransactionType) || 'expense';

  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Set default category when type changes
  useEffect(() => {
    const categories = type === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;
    setCategory(categories[0].id);
  }, [type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !category) return;

    addTransaction({
      type,
      amount: parseFloat(amount),
      category,
      description,
      date,
    });

    router.push('/transactions');
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--color-bg-primary)]">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/transactions"
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"
            >
              <ArrowRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </Link>
            <h1 className="text-xl font-bold">معاملة جديدة</h1>
          </div>

          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"
          >
            <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 space-y-6 pb-8">
        {/* Type Toggle */}
        <div className="card">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
            نوع المعاملة
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                type === 'expense'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-[var(--color-text-secondary)]'
              }`}
            >
              مصروف
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                type === 'income'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-[var(--color-text-secondary)]'
              }`}
            >
              دخل
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div className="card">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
            المبلغ
          </label>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full text-4xl font-bold text-center py-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-[var(--color-primary)] focus:bg-white transition-all outline-none"
              required
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[var(--color-text-muted)]">
              ر.س
            </span>
          </div>
        </div>

        {/* Category Picker */}
        <div className="card">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
            الفئة
          </label>
          <CategoryPicker
            type={type}
            selectedCategory={category}
            onSelect={setCategory}
          />
        </div>

        {/* Description */}
        <div className="card">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
            الوصف (اختياري)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="أضف وصفاً..."
            className="input"
          />
        </div>

        {/* Date */}
        <div className="card">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
            التاريخ
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
              ? type === 'expense'
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {type === 'expense' ? 'إضافة مصروف' : 'إضافة دخل'}
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

'use client';

import Link from 'next/link';
import { Plus, ArrowLeft, ArrowRight } from 'lucide-react';
import { OverviewTransactionRow } from '@/components';
import { useTransactions, useCurrency } from '@/store/useStore';
import { formatCurrency, getCurrentMonthTransactions } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

export default function OverviewPage() {
  const { t, isRTL } = useTranslation();
  const transactions = useTransactions();
  const currency = useCurrency();

  const currentMonthTransactions = getCurrentMonthTransactions(transactions);

  const totalIncome = currentMonthTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpenses = currentMonthTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const balance = totalIncome - totalExpenses;
  const recentTransactions = transactions.slice(0, 5);
  const ViewAllArrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="w-full">
      {/* Page Header */}
      <header className="px-6 py-5 border-b border-[var(--color-border-light)] bg-[var(--color-bg-card)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              {t.overview.title}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              {isRTL ? 'ملخص مالي' : 'Financial snapshot'}
            </p>
          </div>
          <Link href="/transactions/new" className="btn btn-primary">
            <Plus className="w-4 h-4" />
            {t.transactions.addTransaction}
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="px-6 py-6 space-y-5">
        
        {/* Section 1: Balance Card */}
        <section className="bg-[var(--color-bg-card)] border border-[var(--color-border-light)] rounded-xl p-5">
          <p className="text-sm text-[var(--color-text-muted)] mb-1">
            {t.overview.totalBalance}
          </p>
          <p className={`text-3xl font-bold ltr-nums ${balance >= 0 ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-danger)]'}`}>
            {formatCurrency(balance, currency)}
          </p>
          
          {/* Inline Income / Expenses */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[var(--color-border-light)]">
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">{t.dashboard.income}</p>
              <p className="text-base font-semibold text-[var(--color-success)] ltr-nums">
                {formatCurrency(totalIncome, currency)}
              </p>
            </div>
            <div className="w-px h-8 bg-[var(--color-border-light)]" />
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">{t.dashboard.expenses}</p>
              <p className="text-base font-semibold text-[var(--color-text-secondary)] ltr-nums">
                {formatCurrency(totalExpenses, currency)}
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Recent Activity */}
        <section className="bg-[var(--color-bg-card)] border border-[var(--color-border-light)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              {t.overview.recentTransactions}
            </h2>
            {recentTransactions.length > 0 && (
              <Link 
                href="/transactions" 
                className="text-xs text-[var(--color-primary)] font-medium flex items-center gap-1 hover:underline"
              >
                {t.dashboard.viewAll}
                <ViewAllArrow className="w-3 h-3" />
              </Link>
            )}
          </div>

          {recentTransactions.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] py-2">
              {t.overview.noTransactions}
            </p>
          ) : (
            <div className="divide-y divide-[var(--color-border-light)]">
              {recentTransactions.map((transaction) => (
                <OverviewTransactionRow
                  key={transaction.id}
                  category={transaction.category}
                  description={transaction.description}
                  date={transaction.date}
                  amount={transaction.amount}
                  type={transaction.type}
                />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Plus, Sparkles } from 'lucide-react';
import { Header, BottomNav, StatsCard, TransactionItem, ExpenseChart } from '@/components';
import { useTransactions, useCurrency } from '@/store/useStore';
import { calculateStats, getCurrentMonthTransactions, groupByCategory, formatCurrency } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

export default function HomePage() {
  const { t, isRTL } = useTranslation();
  const transactions = useTransactions();
  const currency = useCurrency();
  const currentMonthTransactions = getCurrentMonthTransactions(transactions);
  const stats = calculateStats(currentMonthTransactions);
  const expensesByCategory = groupByCategory(currentMonthTransactions, 'expense');
  const recentTransactions = transactions.slice(0, 5);

  const ViewAllArrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen pb-24 bg-[var(--color-bg-primary)]">
      <Header showGreeting />

      <main className="px-4 space-y-5 animate-fadeInUp">
        {/* Balance Card */}
        <div className="card-gradient p-5 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[var(--color-gold)]" />
              <p className="text-sm opacity-90 font-medium">{t.dashboard.balance}</p>
            </div>
            <p className="text-4xl font-bold ltr-nums mb-5 tracking-tight">
              {formatCurrency(stats.balance, currency)}
            </p>

            <div className="flex gap-3">
              <Link
                href="/transactions/new?type=income"
                className="flex-1 btn bg-white/20 hover:bg-white/30 text-white text-sm py-2.5 backdrop-blur-sm border border-white/10"
              >
                <Plus className="w-4 h-4" />
                {t.transactions.income}
              </Link>
              <Link
                href="/transactions/new?type=expense"
                className="flex-1 btn bg-white/20 hover:bg-white/30 text-white text-sm py-2.5 backdrop-blur-sm border border-white/10"
              >
                <Plus className="w-4 h-4" />
                {t.transactions.expense}
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatsCard type="income" value={stats.totalIncome} label={t.dashboard.income} />
          <StatsCard type="expense" value={stats.totalExpenses} label={t.dashboard.expenses} />
        </div>

        {/* Expense Breakdown */}
        {expensesByCategory.length > 0 && (
          <div className="card">
            <div className="section-header">
              <h2 className="section-title">{t.dashboard.expensesByCategory}</h2>
              <span className="badge badge-primary">{t.dashboard.thisMonth}</span>
            </div>
            <ExpenseChart data={expensesByCategory} />
          </div>
        )}

        {/* Recent Transactions */}
        <div className="card">
          <div className="section-header">
            <h2 className="section-title">{t.dashboard.recentTransactions}</h2>
            <Link href="/transactions" className="section-link">
              {t.dashboard.viewAll}
              <ViewAllArrow className="w-4 h-4" />
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="empty-state py-8">
              <p className="empty-state-desc">{t.dashboard.noTransactions}</p>
              <Link href="/transactions/new" className="btn btn-primary">
                <Plus className="w-4 h-4" />
                {t.nav.add}
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((transaction, index) => (
                <div
                  key={transaction.id}
                  className="animate-fadeInUp"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <TransactionItem transaction={transaction} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

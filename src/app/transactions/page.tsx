'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus, Filter, Search } from 'lucide-react';
import { BottomNav, TransactionItem, MonthlyChart } from '@/components';
import { useTransactions } from '@/store/useStore';
import { getMonthlyData } from '@/lib/utils';
import { TransactionType } from '@/types';

type FilterType = 'all' | 'income' | 'expense';

export default function TransactionsPage() {
  const transactions = useTransactions();
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showChart, setShowChart] = useState(true);

  const monthlyData = getMonthlyData(transactions, 6);

  const filteredTransactions = transactions.filter((t) => {
    const matchesFilter = filter === 'all' || t.type === filter;
    const matchesSearch =
      searchQuery === '' ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
    const date = transaction.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, typeof transactions>);

  const sortedDates = Object.keys(groupedTransactions).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--color-bg-primary)]">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"
            >
              <ArrowRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </Link>
            <h1 className="text-xl font-bold">المعاملات</h1>
          </div>

          <Link
            href="/transactions/new"
            className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center shadow-sm"
          >
            <Plus className="w-5 h-5 text-white" />
          </Link>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pr-10"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 pb-3 flex gap-2">
          {(['all', 'income', 'expense'] as FilterType[]).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === type
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-white text-[var(--color-text-secondary)]'
              }`}
            >
              {type === 'all' ? 'الكل' : type === 'income' ? 'الدخل' : 'المصاريف'}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 space-y-4">
        {/* Monthly Chart */}
        {showChart && monthlyData.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">نظرة عامة</h2>
              <button
                onClick={() => setShowChart(false)}
                className="text-sm text-[var(--color-text-muted)]"
              >
                إخفاء
              </button>
            </div>
            <MonthlyChart data={monthlyData} />
          </div>
        )}

        {/* Transactions List */}
        {sortedDates.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-[var(--color-text-muted)] mb-4">لا توجد معاملات</p>
            <Link href="/transactions/new" className="btn btn-primary">
              <Plus className="w-4 h-4" />
              إضافة معاملة
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDates.map((date) => (
              <div key={date}>
                <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 px-1">
                  {new Date(date).toLocaleDateString('ar-SA', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <div className="card space-y-2">
                  {groupedTransactions[date].map((transaction) => (
                    <TransactionItem key={transaction.id} transaction={transaction} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

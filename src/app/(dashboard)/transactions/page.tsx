'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, Settings, TrendingUp, TrendingDown, Wallet, Hash } from 'lucide-react';
import { PageHeader, PageContainer, SectionCard, TransactionItem, MonthlyChart } from '@/components';
import { useTransactions, useCurrency } from '@/store/useStore';
import { getMonthlyData, getWeeklyData, getDailyData } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { CURRENCIES } from '@/lib/constants';

type FilterType = 'all' | 'income' | 'expense';
type ChartPeriod = 'daily' | 'weekly' | 'monthly';

export default function TransactionsPage() {
  const transactions = useTransactions();
  const currency = useCurrency();
  const { t, language, isRTL } = useTranslation();
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showChart, setShowChart] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('monthly');

  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol || currency;

  const chartData = useMemo(() => {
    switch (chartPeriod) {
      case 'daily':
        return getDailyData(transactions, 14);
      case 'weekly':
        return getWeeklyData(transactions, 8);
      case 'monthly':
      default:
        return getMonthlyData(transactions, 6);
    }
  }, [transactions, chartPeriod]);

  const analysis = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netBalance = totalIncome - totalExpenses;
    const transactionCount = transactions.length;
    return { totalIncome, totalExpenses, netBalance, transactionCount };
  }, [transactions]);

  const filteredTransactions = transactions.filter((t) => {
    const matchesFilter = filter === 'all' || t.type === filter;
    const matchesSearch =
      searchQuery === '' ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Toolbar: Search + Filters (below header, no overlap)
  const searchToolbar = (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]`} />
        <input
          type="text"
          placeholder={t.transactions.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`input ${isRTL ? 'pr-12' : 'pl-12'}`}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        {(['all', 'income', 'expense'] as FilterType[]).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
              filter === type
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-[var(--color-border-light)] hover:border-[var(--color-border)]'
            }`}
          >
            {type === 'all' ? t.transactions.all : type === 'income' ? t.transactions.income : t.transactions.expense}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader 
        title={t.transactions.title}
        showBack
        backUrl="/"
        actions={
          <>
            <Link
              href="/transactions/new"
              className="w-11 h-11 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
            >
              <Plus className="w-5 h-5 text-white" />
            </Link>
            <Link
              href="/settings"
              className="w-11 h-11 rounded-2xl bg-[var(--color-bg-card)] flex items-center justify-center shadow-sm border border-[var(--color-border-light)] transition-all hover:shadow-md"
            >
              <Settings className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </Link>
          </>
        }
        toolbar={searchToolbar}
      />

      <PageContainer>
        {/* Analysis Section */}
        <SectionCard title={t.transactions.analysis}>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[var(--color-bg-secondary)] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-[var(--color-success)]" />
                <span className="text-sm text-[var(--color-text-muted)]">{t.transactions.totalIncome}</span>
              </div>
              <p className="text-xl font-bold text-[var(--color-success)] ltr-nums">{currencySymbol} {analysis.totalIncome.toLocaleString()}</p>
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-5 h-5 text-[var(--color-danger)]" />
                <span className="text-sm text-[var(--color-text-muted)]">{t.transactions.totalExpenses}</span>
              </div>
              <p className="text-xl font-bold text-[var(--color-danger)] ltr-nums">{currencySymbol} {analysis.totalExpenses.toLocaleString()}</p>
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-[var(--color-primary)]" />
                <span className="text-sm text-[var(--color-text-muted)]">{t.transactions.netBalance}</span>
              </div>
              <p className={`text-xl font-bold ltr-nums ${analysis.netBalance >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                {currencySymbol} {analysis.netBalance.toLocaleString()}
              </p>
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-5 h-5 text-[var(--color-text-secondary)]" />
                <span className="text-sm text-[var(--color-text-muted)]">{t.transactions.transactionCount}</span>
              </div>
              <p className="text-xl font-bold text-[var(--color-text-primary)]">{analysis.transactionCount}</p>
            </div>
          </div>
        </SectionCard>

        {/* Chart Section */}
        {chartData.length > 0 && (
          <SectionCard
            title={t.transactions.overview}
            action={
              <div className="flex items-center gap-3">
                <div className="flex bg-[var(--color-bg-secondary)] rounded-lg p-1">
                  {(['daily', 'weekly', 'monthly'] as ChartPeriod[]).map((period) => (
                    <button
                      key={period}
                      onClick={() => setChartPeriod(period)}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        chartPeriod === period
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {t.transactions[period]}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowChart(!showChart)}
                  className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                >
                  {showChart ? t.transactions.hide : t.transactions.show}
                </button>
              </div>
            }
          >
            {showChart && <MonthlyChart data={chartData} />}
          </SectionCard>
        )}

        {/* Transactions List */}
        {sortedDates.length === 0 ? (
          <SectionCard className="text-center py-12">
            <p className="text-[var(--color-text-muted)] mb-4 text-lg">{t.transactions.noTransactions}</p>
            <Link href="/transactions/new" className="btn btn-primary">
              <Plus className="w-5 h-5" />
              {t.transactions.addTransaction}
            </Link>
          </SectionCard>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date}>
                <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-3 px-1">
                  {formatDate(date)}
                </p>
                <SectionCard padding="sm" className="space-y-2">
                  {groupedTransactions[date].map((transaction) => (
                    <TransactionItem key={transaction.id} transaction={transaction} />
                  ))}
                </SectionCard>
              </div>
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}

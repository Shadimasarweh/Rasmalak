'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, Settings, TrendingUp, TrendingDown, Wallet, Hash, Edit2, Trash2 } from 'lucide-react';
import { PageHeader, PageContainer, SectionCard, TransactionItem, MonthlyChart } from '@/components';
import { useTransactions, useCurrency, useBaseCurrency, useStore } from '@/store/useStore';
import { getMonthlyData, getWeeklyData, getDailyData, convertCurrency, getCategoryById } from '@/lib/utils';
import { Transaction } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { CURRENCIES } from '@/lib/constants';

type FilterType = 'all' | 'income' | 'expense';
type ChartPeriod = 'daily' | 'weekly' | 'monthly';

export default function TransactionsPage() {
  const transactions = useTransactions();
  const currency = useCurrency();
  const baseCurrency = useBaseCurrency();
  const deleteTransaction = useStore((state) => state.deleteTransaction);
  const { t, language, isRTL } = useTranslation();
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showChart, setShowChart] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('monthly');

  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol || currency;

  const chartData = useMemo(() => {
    switch (chartPeriod) {
      case 'daily':
        return getDailyData(transactions, 14, language);
      case 'weekly':
        return getWeeklyData(transactions, 8, language);
      case 'monthly':
      default:
        return getMonthlyData(transactions, 6, language);
    }
  }, [transactions, chartPeriod, language]);

  const analysis = useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => {
        const amount = convertCurrency(t.amount, t.currency || baseCurrency, currency);
        return sum + amount;
      }, 0);
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => {
        const amount = convertCurrency(t.amount, t.currency || baseCurrency, currency);
        return sum + amount;
      }, 0);
    const netBalance = totalIncome - totalExpenses;
    const transactionCount = transactions.length;
    return { totalIncome, totalExpenses, netBalance, transactionCount };
  }, [transactions, currency, baseCurrency]);

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
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <PageHeader 
        title={t.transactions.title}
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
                    <TransactionItem 
                      key={transaction.id} 
                      transaction={transaction} 
                      onClick={() => setSelectedTransaction(transaction)}
                    />
                  ))}
                </SectionCard>
              </div>
            ))}
          </div>
        )}

        {/* Transaction Action Modal */}
        {selectedTransaction && !showDeleteConfirm && (
          <div 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[var(--color-overlay)]" 
            onClick={() => setSelectedTransaction(null)}
          >
            <div
              className="w-full sm:max-w-md bg-[var(--color-bg-card)] rounded-t-2xl sm:rounded-2xl p-6 mx-0 sm:mx-4 animate-slideUp"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Transaction Details */}
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[var(--color-border-light)]">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: (getCategoryById(selectedTransaction.category)?.color || '#64748b') + '15' }}
                >
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: getCategoryById(selectedTransaction.category)?.color || '#64748b' }}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-[var(--color-text-primary)]">
                    {language === 'ar' 
                      ? getCategoryById(selectedTransaction.category)?.nameAr 
                      : getCategoryById(selectedTransaction.category)?.name || selectedTransaction.category}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {new Date(selectedTransaction.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <p className={`text-xl font-bold ltr-nums ${
                  selectedTransaction.type === 'income' 
                    ? 'text-[var(--color-success)]' 
                    : 'text-[var(--color-danger)]'
                }`}>
                  {selectedTransaction.type === 'income' ? '+' : '-'}
                  {new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  }).format(convertCurrency(selectedTransaction.amount, selectedTransaction.currency || baseCurrency, currency))} {CURRENCIES.find(c => c.code === currency)?.[language === 'ar' ? 'symbolAr' : 'symbol']}
                </p>
              </div>

              {selectedTransaction.description && (
                <p className="text-sm text-[var(--color-text-secondary)] mb-6 px-1">
                  {selectedTransaction.description}
                </p>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <Link
                  href={`/transactions/new?edit=${selectedTransaction.id}`}
                  className="w-full btn btn-secondary flex items-center justify-center gap-3"
                  onClick={() => setSelectedTransaction(null)}
                >
                  <Edit2 className="w-5 h-5" />
                  {language === 'ar' ? 'تعديل المعاملة' : 'Edit Transaction'}
                </Link>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full btn flex items-center justify-center gap-3 bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20"
                >
                  <Trash2 className="w-5 h-5" />
                  {language === 'ar' ? 'حذف المعاملة' : 'Delete Transaction'}
                </button>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="w-full btn btn-ghost"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {selectedTransaction && showDeleteConfirm && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)]" 
            onClick={() => {
              setShowDeleteConfirm(false);
              setSelectedTransaction(null);
            }}
          >
            <div
              className="w-full max-w-sm bg-[var(--color-bg-card)] rounded-2xl p-6 mx-4 animate-scaleIn"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-[var(--color-danger)]" />
                </div>
                <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                  {language === 'ar' ? 'حذف المعاملة؟' : 'Delete Transaction?'}
                </h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {language === 'ar' 
                    ? 'لا يمكن التراجع عن هذا الإجراء.'
                    : 'This action cannot be undone.'}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedTransaction(null);
                  }}
                  className="flex-1 btn btn-secondary"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    deleteTransaction(selectedTransaction.id);
                    setShowDeleteConfirm(false);
                    setSelectedTransaction(null);
                  }}
                  className="flex-1 btn bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger)]/90"
                >
                  {language === 'ar' ? 'حذف' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </div>
  );
}

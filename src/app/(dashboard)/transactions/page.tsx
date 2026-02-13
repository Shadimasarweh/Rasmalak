'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useTransactions, Transaction } from '@/store/transactionStore';
import { useCurrency } from '@/store/useStore';

/* ============================================
   TRANSACTIONS PAGE
   Bound by: /docs/contracts/Transactions.functional.md
   
   This page:
   - Reads exclusively from the transaction store
   - Displays true empty state when no transactions exist
   - Shows no charts/summaries when empty (Contract Section 5)
   - Allows delete with confirmation (Contract Section 4)
   - Recalculates totals on every mutation (Contract Section 7)
   ============================================ */

/* ===== ICONS ===== */
const PlusIcon = () => (
  <svg style={{ width: '1rem', height: '1rem', marginRight: '0.375rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const TrashIcon = () => (
  <svg style={{ width: '1rem', height: '1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const EmptyIcon = () => (
  <svg style={{ width: '4rem', height: '4rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

/* ===== DELETE CONFIRMATION MODAL ===== */
function DeleteConfirmModal({
  transaction,
  onConfirm,
  onCancel,
  intl,
}: {
  transaction: Transaction;
  onConfirm: () => void;
  onCancel: () => void;
  intl: ReturnType<typeof useIntl>;
}) {
  const typeLabel = intl.formatMessage(
    { id: 'transactions.transaction_type', defaultMessage: '{type, select, income {Income} expense {Expense} other {Transaction}}' },
    { type: transaction.type }
  );
  const amountLabel = intl.formatNumber(Math.abs(transaction.amount), { style: 'currency', currency: transaction.currency });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        className="ds-card"
        style={{
          maxWidth: '400px',
          margin: '0 16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--spacing-1)',
          }}
        >
          {intl.formatMessage({ id: 'transactions.delete_title', defaultMessage: 'Delete Transaction' })}
        </h3>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--spacing-2)',
          }}
        >
          {intl.formatMessage(
            { id: 'transactions.delete_confirm', defaultMessage: 'Are you sure you want to delete this {type} of {amount}? This action cannot be undone.' },
            { type: typeLabel, amount: amountLabel }
          )}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
              background: 'transparent',
              border: '1px solid var(--color-border-input)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            {intl.formatMessage({ id: 'transactions.cancel', defaultMessage: 'Cancel' })}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#FFFFFF',
              background: 'var(--color-error)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            {intl.formatMessage({ id: 'transactions.delete', defaultMessage: 'Delete' })}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== EMPTY STATE ===== */
// Per Contract Section 5: Neutral language, one primary action, no educational prompts
function EmptyState({ intl }: { intl: ReturnType<typeof useIntl> }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-4)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          color: 'var(--color-border-subtle)',
          marginBottom: 'var(--spacing-2)',
        }}
      >
        <EmptyIcon />
      </div>
      <h3
        style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: '8px',
        }}
      >
        {intl.formatMessage({ id: 'budgets.no_budgets_recorded', defaultMessage: 'No budgets set up yet' })}
      </h3>
      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--color-text-muted)',
          marginBottom: 'var(--spacing-2)',
          maxWidth: '300px',
        }}
      >
        {intl.formatMessage({ id: 'budgets.empty_state_description', defaultMessage: 'This page displays your budget allocations. Set up your first budget to begin tracking.' })}
      </p>
      <Link
        href="/transactions/new"
        className="ds-btn ds-btn-primary"
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        <PlusIcon />
        {intl.formatMessage({ id: 'budgets.edit_budget', defaultMessage: 'Edit Budget' })}
      </Link>
    </div>
  );
}

/* ===== TRANSACTION ROW ===== */
function TransactionRow({
  transaction,
  onDelete,
  intl,
}: {
  transaction: Transaction;
  onDelete: () => void;
  intl: ReturnType<typeof useIntl>;
}) {
  const isIncome = transaction.type === 'income';
  const formattedDate = intl.formatDate(new Date(transaction.date), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const typeLabel = intl.formatMessage(
    { id: 'transactions.transaction_type', defaultMessage: '{type, select, income {Income} expense {Expense} other {Transaction}}' },
    { type: transaction.type }
  );

  return (
    <tr className="ds-table-row">
      <td className="ds-table-cell ds-body">{formattedDate}</td>
      <td className="ds-table-cell">
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
          }}
        >
          {transaction.category || '—'}
        </span>
      </td>
      <td className="ds-table-cell ds-body">{transaction.description || '—'}</td>
      <td className="ds-table-cell">
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            fontSize: '0.6875rem',
            fontWeight: 600,
            borderRadius: 'var(--radius-pill)',
            background: isIncome ? 'var(--color-accent-growth-subtle)' : 'var(--color-danger-bg)',
            color: isIncome ? 'var(--color-success)' : 'var(--color-error)',
            textTransform: 'capitalize',
          }}
        >
          {typeLabel}
        </span>
      </td>
      <td
        className="ds-table-cell"
        style={{
          textAlign: 'right',
          fontWeight: 600,
          color: isIncome ? 'var(--color-success)' : 'var(--color-error)',
        }}
      >
        {intl.formatMessage(
          { id: 'transactions.amount_signed', defaultMessage: '{type, select, income {+{amount}} expense {-{amount}} other {{amount}}}' },
          { 
            type: transaction.type,
            amount: intl.formatNumber(Math.abs(transaction.amount), { style: 'currency', currency: transaction.currency })
          }
        )}
      </td>
      <td className="ds-table-cell" style={{ textAlign: 'right' }}>
        <button
          type="button"
          onClick={onDelete}
          style={{
            padding: '6px',
            background: 'transparent',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
          }}
          title={intl.formatMessage({ id: 'transactions.delete_transaction', defaultMessage: 'Delete transaction' })}
        >
          <TrashIcon />
        </button>
      </td>
    </tr>
  );
}

/* ===== MAIN PAGE ===== */
export default function TransactionsPage() {
  const intl = useIntl();
  const currency = useCurrency();
  const { transactions, deleteTransaction, getTotalIncome, getTotalExpenses, getNetBalance } =
    useTransactions();

  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  // Computed values - recalculated on every render per Contract Section 7
  const totalIncome = getTotalIncome();
  const totalExpenses = getTotalExpenses();
  const netBalance = getNetBalance();
  const hasTransactions = transactions.length > 0;

  // Handle delete with confirmation per Contract Section 4
  const handleDeleteClick = (transaction: Transaction) => {
    setDeleteTarget(transaction);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteTransaction(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

  return (
    <div className="ds-page">
      {/* ===== PAGE HEADER ===== */}
      <div className="ds-section-header">
        <div>
          <h1 className="ds-title-page">
            {intl.formatMessage({ id: 'budgets.title', defaultMessage: 'Budgets' })}
          </h1>
          <p className="ds-body">
            {intl.formatMessage({ id: 'budgets.subtitle', defaultMessage: 'Manage and track your budget allocations.' })}
          </p>
        </div>
        <div className="flex items-center" style={{ gap: 'var(--spacing-1)' }}>
          <Link href="/transactions/new" className="ds-btn ds-btn-primary">
            <PlusIcon />
            {intl.formatMessage({ id: 'budgets.edit_budget', defaultMessage: 'Edit Budget' })}
          </Link>
        </div>
      </div>

      {/* ===== CONDITIONAL CONTENT ===== */}
      {/* Per Contract Section 5 & 8: No charts/summaries when empty */}
      {hasTransactions ? (
        <>
          {/* ===== STATS ROW ===== */}
          {/* Per Contract Section 7: Totals computed from visible transactions only */}
          <div className="responsive-grid-3">
            {/* Total Income */}
            <div className="ds-card">
              <div>
                <p className="ds-title-card">
                  {intl.formatMessage({ id: 'transactions.total_income', defaultMessage: 'Total Income' })}
                </p>
                <p className="ds-metric-sm" style={{ color: 'var(--color-success)' }}>
                  {intl.formatNumber(totalIncome, { style: 'currency', currency })}
                </p>
              </div>
            </div>

            {/* Total Expenses */}
            <div className="ds-card">
              <div>
                <p className="ds-title-card">
                  {intl.formatMessage({ id: 'transactions.total_expenses', defaultMessage: 'Total Expenses' })}
                </p>
                <p className="ds-metric-sm" style={{ color: 'var(--color-error)' }}>
                  {intl.formatNumber(totalExpenses, { style: 'currency', currency })}
                </p>
              </div>
            </div>

            {/* Net Balance */}
            <div className="ds-card">
              <div>
                <p className="ds-title-card">
                  {intl.formatMessage({ id: 'transactions.net_balance', defaultMessage: 'Net Balance' })}
                </p>
                <p
                  className="ds-metric-sm"
                  style={{ color: netBalance >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}
                >
                  {intl.formatNumber(netBalance, { style: 'currency', currency })}
                </p>
              </div>
            </div>
          </div>

          {/* ===== TRANSACTIONS TABLE ===== */}
          <div className="ds-card">
            <div className="ds-section-header">
              <h2 className="ds-title-section">
                {intl.formatMessage({ id: 'transactions.all_transactions', defaultMessage: 'All Transactions' })}
              </h2>
              <span className="ds-supporting">
                {intl.formatMessage({ id: 'transactions.transaction_count', defaultMessage: '{count} transaction(s)' }, { count: transactions.length })}
              </span>
            </div>

            <div className="overflow-x-auto">
            <table style={{ width: '100%', minWidth: '600px' }}>
              <thead>
                <tr className="ds-table-header">
                  <th className="ds-table-cell ds-label" style={{ textAlign: 'left' }}>
                    {intl.formatMessage({ id: 'transactions.date', defaultMessage: 'Date' })}
                  </th>
                  <th className="ds-table-cell ds-label" style={{ textAlign: 'left' }}>
                    {intl.formatMessage({ id: 'transactions.category', defaultMessage: 'Category' })}
                  </th>
                  <th className="ds-table-cell ds-label" style={{ textAlign: 'left' }}>
                    {intl.formatMessage({ id: 'transactions.description', defaultMessage: 'Description' })}
                  </th>
                  <th className="ds-table-cell ds-label" style={{ textAlign: 'left' }}>
                    {intl.formatMessage({ id: 'transactions.type', defaultMessage: 'Type' })}
                  </th>
                  <th className="ds-table-cell ds-label" style={{ textAlign: 'right' }}>
                    {intl.formatMessage({ id: 'transactions.amount', defaultMessage: 'Amount' })}
                  </th>
                  <th className="ds-table-cell ds-label" style={{ textAlign: 'right', width: '60px' }}>
                    
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    onDelete={() => handleDeleteClick(transaction)}
                    intl={intl}
                  />
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </>
      ) : (
        /* Empty State per Contract Section 5 */
        <div className="ds-card">
          <EmptyState intl={intl} />
        </div>
      )}

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      {/* Per Contract Section 4: Deletion requires explicit confirmation */}
      {deleteTarget && (
        <DeleteConfirmModal
          transaction={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          intl={intl}
        />
      )}
    </div>
  );
}

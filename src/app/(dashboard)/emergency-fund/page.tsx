'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useLanguage, useCurrency } from '@/store/useStore';
import { useTransactions } from '@/store/transactionStore';
import { useEmergencyFund } from '@/store/emergencyFundStore';
import { CURRENCIES } from '@/lib/constants';
import { styledNum } from '@/components/StyledNumber';
import { Skeleton } from '@/components/ui/Skeleton';

export default function EmergencyFundPage() {
  const intl = useIntl();
  const language = useLanguage();
  const isRTL = language === 'ar';
  const currency = useCurrency();
  const currencyInfo = CURRENCIES.find(c => c.code === currency);
  const currencySymbol = isRTL ? currencyInfo?.symbolAr || currencyInfo?.symbol || currency : currencyInfo?.symbol || currency;

  const { transactions } = useTransactions();
  const { fund, deposits, loading, createFund, updateTarget, setMonthlyContribution, addDeposit, deleteDeposit } = useEmergencyFund();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Setup form state
  const [targetInput, setTargetInput] = useState('');
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [contributionInput, setContributionInput] = useState('');
  const [showContributionForm, setShowContributionForm] = useState(false);

  // Deposit form state
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [isWithdraw, setIsWithdraw] = useState(false);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const avgMonthlyExpenses = useMemo(() => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const expenses = transactions
      .filter(tx => tx.type === 'expense' && new Date(tx.date) >= threeMonthsAgo)
      .reduce((s, tx) => s + Math.abs(tx.amount), 0);
    return expenses / 3;
  }, [transactions]);

  const monthsCovered = fund && avgMonthlyExpenses > 0
    ? Math.round((fund.currentAmount / avgMonthlyExpenses) * 10) / 10
    : 0;

  const progressPct = fund && fund.targetAmount > 0
    ? Math.min((fund.currentAmount / fund.targetAmount) * 100, 100)
    : 0;

  const statusColor = monthsCovered >= 6 ? '#16a34a' : monthsCovered >= 3 ? '#D97706' : '#DC2626';
  const statusBg = monthsCovered >= 6 ? '#f0fdf4' : monthsCovered >= 3 ? '#fffbeb' : '#fef2f2';

  const handleCreateFund = async () => {
    const val = parseFloat(targetInput);
    if (!val || val <= 0) return;
    await createFund(val);
    setTargetInput('');
  };

  const handleUpdateTarget = async () => {
    const val = parseFloat(targetInput);
    if (!val || val <= 0) return;
    await updateTarget(val);
    setTargetInput('');
    setShowTargetForm(false);
  };

  const handleSetContribution = async () => {
    const val = parseFloat(contributionInput);
    if (val == null || val < 0) return;
    await setMonthlyContribution(val);
    setContributionInput('');
    setShowContributionForm(false);
  };

  const handleDeposit = async () => {
    const val = parseFloat(depositAmount);
    if (!val || val <= 0) return;
    const amount = isWithdraw ? -val : val;
    await addDeposit(amount, depositNote || undefined);
    setDepositAmount('');
    setDepositNote('');
  };

  const handleDeleteDeposit = async (id: string) => {
    await deleteDeposit(id);
    setDeleteConfirmId(null);
  };

  const fmt = (n: number) => styledNum(intl.formatNumber(n));
  const fmtCur = (n: number) => styledNum(intl.formatNumber(n, { style: 'currency', currency }));

  if (loading) {
    return (
      <div className="ds-page" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        <Skeleton width="12rem" height="2rem" borderRadius="8px" />
        <div style={{ marginTop: 'var(--spacing-4)' }}>
          <Skeleton width="100%" height="12rem" borderRadius="12px" />
        </div>
        <div style={{ marginTop: 'var(--spacing-4)' }}>
          <Skeleton width="100%" height="8rem" borderRadius="12px" />
        </div>
      </div>
    );
  }

  // No fund yet — setup view
  if (!fund) {
    return (
      <div className="ds-page" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        <div style={{ marginBottom: 'var(--spacing-6)' }}>
          <h1 className="ds-title-page" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
            <span style={{ fontSize: '1.5rem' }}>🛡️</span>
            {intl.formatMessage({ id: 'dashboard.ef_title', defaultMessage: 'Emergency Fund' })}
          </h1>
          <p className="ds-supporting" style={{ marginTop: 'var(--spacing-1)' }}>
            {intl.formatMessage({ id: 'dashboard.ef_page_subtitle', defaultMessage: 'Your safety net for unexpected expenses' })}
          </p>
        </div>

        <div className="ds-card" style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center', padding: 'var(--spacing-8)' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '20px',
            background: 'var(--color-primary-light)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--spacing-4)',
          }}>
            <span style={{ fontSize: '2rem' }}>🛡️</span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-2)' }}>
            {intl.formatMessage({ id: 'dashboard.ef_no_fund', defaultMessage: 'Start your emergency fund' })}
          </h2>
          <p className="ds-supporting" style={{ marginBottom: 'var(--spacing-5)', maxWidth: '320px', marginInline: 'auto' }}>
            {intl.formatMessage({ id: 'dashboard.ef_no_fund_desc', defaultMessage: 'Build a safety net for unexpected expenses.' })}
          </p>

          {avgMonthlyExpenses > 0 && (
            <div style={{
              padding: 'var(--spacing-3)', background: 'var(--color-bg-surface-2)',
              borderRadius: 'var(--radius-lg)', marginBottom: 'var(--spacing-4)', textAlign: isRTL ? 'right' : 'left',
            }}>
              <p className="ds-label" style={{ marginBottom: 'var(--spacing-1)' }}>
                {intl.formatMessage({ id: 'dashboard.ef_monthly_avg', defaultMessage: 'Avg. monthly expenses' })}
              </p>
              <p style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{fmtCur(Math.round(avgMonthlyExpenses))}</p>
              <p className="ds-supporting" style={{ marginTop: 'var(--spacing-1)' }}>
                {intl.formatMessage({ id: 'dashboard.ef_target_months', defaultMessage: 'Target: {months} months of expenses' }, { months: 6 })}
                {' → '}{fmtCur(Math.round(avgMonthlyExpenses * 6))}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', textAlign: isRTL ? 'right' : 'left' }}>
            <label className="ds-label">
              {intl.formatMessage({ id: 'dashboard.ef_set_target', defaultMessage: 'Set Target' })}
            </label>
            <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
              <input
                type="number"
                value={targetInput}
                onChange={e => setTargetInput(e.target.value)}
                placeholder={intl.formatMessage({ id: 'dashboard.ef_target_placeholder', defaultMessage: 'Enter target amount' })}
                style={{
                  flex: 1, padding: 'var(--spacing-3)', borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border-default)', background: 'var(--color-bg-card)',
                  color: 'var(--color-text-primary)', fontSize: '0.875rem',
                }}
              />
              <button
                onClick={handleCreateFund}
                disabled={!targetInput || parseFloat(targetInput) <= 0}
                style={{
                  padding: 'var(--spacing-3) var(--spacing-5)', background: 'var(--color-primary)',
                  color: '#FFF', borderRadius: 'var(--radius-lg)', border: 'none', fontWeight: 600,
                  fontSize: '0.875rem', cursor: 'pointer', opacity: !targetInput || parseFloat(targetInput) <= 0 ? 0.5 : 1,
                }}
              >
                {intl.formatMessage({ id: 'dashboard.ef_create_cta', defaultMessage: 'Create Emergency Fund' })}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fund exists — full view
  return (
    <div className="ds-page" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--spacing-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-3)' }}>
          <div>
            <h1 className="ds-title-page" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <span style={{ fontSize: '1.5rem' }}>🛡️</span>
              {intl.formatMessage({ id: 'dashboard.ef_title', defaultMessage: 'Emergency Fund' })}
            </h1>
            <p className="ds-supporting" style={{ marginTop: 'var(--spacing-1)' }}>
              {intl.formatMessage({ id: 'dashboard.ef_page_subtitle', defaultMessage: 'Your safety net for unexpected expenses' })}
            </p>
          </div>
          <div style={{
            padding: 'var(--spacing-2) var(--spacing-4)', borderRadius: 'var(--radius-full)',
            background: statusBg, color: statusColor, fontWeight: 600, fontSize: '0.875rem',
          }}>
            {monthsCovered >= 6
              ? intl.formatMessage({ id: 'dashboard.ef_status_strong', defaultMessage: 'Strong' })
              : monthsCovered >= 3
              ? intl.formatMessage({ id: 'dashboard.ef_status_building', defaultMessage: 'Building' })
              : intl.formatMessage({ id: 'dashboard.ef_status_starting', defaultMessage: 'Getting Started' })}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-5)' }}>
        <div className="ds-card" style={{ padding: 'var(--spacing-5)' }}>
          <p className="ds-label" style={{ marginBottom: 'var(--spacing-2)', textTransform: 'uppercase' }}>
            {intl.formatMessage({ id: 'dashboard.ef_balance', defaultMessage: 'Balance' })}
          </p>
          <p className="ds-metric" style={{ color: 'var(--color-primary)', fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>
            {fmtCur(fund.currentAmount)}
          </p>
        </div>

        <div className="ds-card" style={{ padding: 'var(--spacing-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-2)' }}>
            <p className="ds-label" style={{ textTransform: 'uppercase' }}>
              {intl.formatMessage({ id: 'dashboard.ef_target', defaultMessage: 'Target' })}
            </p>
            <button
              onClick={() => { setShowTargetForm(!showTargetForm); setTargetInput(String(fund.targetAmount)); }}
              style={{ fontSize: '0.75rem', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
            >
              {intl.formatMessage({ id: 'dashboard.ef_update_target', defaultMessage: 'Update Target' })}
            </button>
          </div>
          <p className="ds-metric" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>
            {fmtCur(fund.targetAmount)}
          </p>
          {showTargetForm && (
            <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-3)' }}>
              <input
                type="number"
                value={targetInput}
                onChange={e => setTargetInput(e.target.value)}
                style={{
                  flex: 1, padding: 'var(--spacing-2)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-default)', background: 'var(--color-bg-card)',
                  color: 'var(--color-text-primary)', fontSize: '0.875rem',
                }}
              />
              <button
                onClick={handleUpdateTarget}
                style={{
                  padding: 'var(--spacing-2) var(--spacing-3)', background: 'var(--color-primary)',
                  color: '#FFF', borderRadius: 'var(--radius-md)', border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                ✓
              </button>
            </div>
          )}
        </div>

        <div className="ds-card" style={{ padding: 'var(--spacing-5)' }}>
          <p className="ds-label" style={{ marginBottom: 'var(--spacing-2)', textTransform: 'uppercase' }}>
            {intl.formatMessage({ id: 'dashboard.ef_months_covered_label', defaultMessage: 'Months of expenses covered' })}
          </p>
          <p className="ds-metric" style={{ color: statusColor, fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>
            {intl.formatMessage({ id: 'dashboard.ef_months_covered', defaultMessage: '{months} months covered' }, { months: monthsCovered })}
          </p>
          <p className="ds-supporting" style={{ marginTop: 'var(--spacing-1)' }}>
            {intl.formatMessage({ id: 'dashboard.ef_recommended', defaultMessage: '6 months recommended' })}
          </p>
        </div>

        <div className="ds-card" style={{ padding: 'var(--spacing-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-2)' }}>
            <p className="ds-label" style={{ textTransform: 'uppercase' }}>
              {intl.formatMessage({ id: 'dashboard.ef_monthly_contribution', defaultMessage: 'Monthly Contribution' })}
            </p>
            <button
              onClick={() => { setShowContributionForm(!showContributionForm); setContributionInput(String(fund.monthlyContribution || '')); }}
              style={{ fontSize: '0.75rem', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
            >
              {intl.formatMessage({ id: 'dashboard.ef_update_contribution', defaultMessage: 'Update' })}
            </button>
          </div>
          <p className="ds-metric" style={{ color: fund.monthlyContribution > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)', fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>
            {fund.monthlyContribution > 0 ? fmtCur(fund.monthlyContribution) : intl.formatMessage({ id: 'dashboard.ef_not_set', defaultMessage: 'Not set' })}
          </p>
          {fund.monthlyContribution > 0 && (
            <p className="ds-supporting" style={{ marginTop: 'var(--spacing-1)' }}>
              {intl.formatMessage({ id: 'dashboard.ef_contribution_budget_note', defaultMessage: 'Reserved in your monthly budget' })}
            </p>
          )}
          {showContributionForm && (
            <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-3)' }}>
              <input
                type="number"
                value={contributionInput}
                onChange={e => setContributionInput(e.target.value)}
                placeholder="0"
                style={{
                  flex: 1, padding: 'var(--spacing-2)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-default)', background: 'var(--color-bg-card)',
                  color: 'var(--color-text-primary)', fontSize: '0.875rem',
                }}
              />
              <button
                onClick={handleSetContribution}
                style={{
                  padding: 'var(--spacing-2) var(--spacing-3)', background: 'var(--color-primary)',
                  color: '#FFF', borderRadius: 'var(--radius-md)', border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                ✓
              </button>
            </div>
          )}
        </div>

        {avgMonthlyExpenses > 0 && (
          <div className="ds-card" style={{ padding: 'var(--spacing-5)' }}>
            <p className="ds-label" style={{ marginBottom: 'var(--spacing-2)', textTransform: 'uppercase' }}>
              {intl.formatMessage({ id: 'dashboard.ef_monthly_avg', defaultMessage: 'Avg. monthly expenses' })}
            </p>
            <p className="ds-metric" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>
              {fmtCur(Math.round(avgMonthlyExpenses))}
            </p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="ds-card" style={{ padding: 'var(--spacing-5)', marginBottom: 'var(--spacing-5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-2)' }}>
          <span className="ds-label">{intl.formatMessage({ id: 'dashboard.ef_progress_label', defaultMessage: 'Fund Progress' })}</span>
          <span className="ds-label" style={{ fontWeight: 600 }}>{fmt(Math.round(progressPct))}%</span>
        </div>
        <div style={{ height: '14px', background: 'var(--color-bg-surface-2)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 'var(--spacing-2)' }}>
          <div style={{
            width: mounted ? `${progressPct}%` : '0%',
            height: '100%',
            borderRadius: 'var(--radius-lg)',
            transition: 'width 800ms ease-out',
            background: `linear-gradient(90deg, ${statusColor}, ${statusColor}dd)`,
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="ds-supporting">{fmtCur(fund.currentAmount)}</span>
          <span className="ds-supporting">{fmtCur(fund.targetAmount)}</span>
        </div>
      </div>

      {/* Add Deposit / Withdraw */}
      <div className="ds-card" style={{ padding: 'var(--spacing-5)', marginBottom: 'var(--spacing-5)' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-4)' }}>
          <button
            onClick={() => setIsWithdraw(false)}
            style={{
              flex: 1, padding: 'var(--spacing-2)', borderRadius: 'var(--radius-md)',
              border: `2px solid ${!isWithdraw ? 'var(--color-primary)' : 'var(--color-border-default)'}`,
              background: !isWithdraw ? 'var(--color-primary-light)' : 'transparent',
              color: !isWithdraw ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            {intl.formatMessage({ id: 'dashboard.ef_add_funds', defaultMessage: 'Add Funds' })}
          </button>
          <button
            onClick={() => setIsWithdraw(true)}
            style={{
              flex: 1, padding: 'var(--spacing-2)', borderRadius: 'var(--radius-md)',
              border: `2px solid ${isWithdraw ? '#DC2626' : 'var(--color-border-default)'}`,
              background: isWithdraw ? '#fef2f2' : 'transparent',
              color: isWithdraw ? '#DC2626' : 'var(--color-text-secondary)',
              fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            {intl.formatMessage({ id: 'dashboard.ef_withdraw', defaultMessage: 'Withdraw' })}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          <div>
            <label className="ds-label" style={{ marginBottom: 'var(--spacing-1)', display: 'block' }}>
              {intl.formatMessage({ id: 'dashboard.ef_deposit_amount', defaultMessage: 'Deposit Amount' })}
            </label>
            <input
              type="number"
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              placeholder={intl.formatMessage({ id: 'dashboard.ef_deposit_placeholder', defaultMessage: 'Enter amount' })}
              style={{
                width: '100%', padding: 'var(--spacing-3)', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border-default)', background: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)', fontSize: '1rem',
              }}
            />
          </div>
          <div>
            <label className="ds-label" style={{ marginBottom: 'var(--spacing-1)', display: 'block' }}>
              {intl.formatMessage({ id: 'dashboard.ef_deposit_note', defaultMessage: 'Note (optional)' })}
            </label>
            <input
              type="text"
              value={depositNote}
              onChange={e => setDepositNote(e.target.value)}
              placeholder={intl.formatMessage({ id: 'dashboard.ef_deposit_note_placeholder', defaultMessage: 'e.g. Monthly contribution' })}
              style={{
                width: '100%', padding: 'var(--spacing-3)', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border-default)', background: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)', fontSize: '0.875rem',
              }}
            />
          </div>
          <button
            onClick={handleDeposit}
            disabled={!depositAmount || parseFloat(depositAmount) <= 0}
            style={{
              padding: 'var(--spacing-3)', borderRadius: 'var(--radius-lg)', border: 'none',
              background: isWithdraw ? '#DC2626' : 'var(--color-primary)',
              color: '#FFF', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              opacity: !depositAmount || parseFloat(depositAmount) <= 0 ? 0.5 : 1,
            }}
          >
            {isWithdraw
              ? intl.formatMessage({ id: 'dashboard.ef_withdraw', defaultMessage: 'Withdraw' })
              : intl.formatMessage({ id: 'dashboard.ef_submit_deposit', defaultMessage: 'Add to Fund' })}
          </button>
        </div>
      </div>

      {/* Deposit History */}
      <div className="ds-card" style={{ padding: 'var(--spacing-5)' }}>
        <h2 className="ds-title-section" style={{ marginBottom: 'var(--spacing-4)' }}>
          {intl.formatMessage({ id: 'dashboard.ef_history', defaultMessage: 'Deposit History' })}
        </h2>

        {deposits.length === 0 ? (
          <div className="ds-empty-state" style={{ paddingBlock: 'var(--spacing-6)' }}>
            <p className="ds-supporting">
              {intl.formatMessage({ id: 'dashboard.ef_no_deposits', defaultMessage: 'No deposits yet' })}
            </p>
            <p className="ds-supporting" style={{ fontSize: '0.8rem' }}>
              {intl.formatMessage({ id: 'dashboard.ef_no_deposits_desc', defaultMessage: 'Add your first deposit to start building your safety net.' })}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
            {deposits.map(dep => (
              <div
                key={dep.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'var(--spacing-3) var(--spacing-4)',
                  background: 'var(--color-bg-surface-2)', borderRadius: 'var(--radius-lg)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                    <span style={{
                      width: '28px', height: '28px', borderRadius: 'var(--radius-md)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: dep.amount >= 0 ? 'var(--color-primary-light)' : '#fef2f2',
                      color: dep.amount >= 0 ? 'var(--color-primary)' : '#DC2626',
                      fontSize: '0.8rem', fontWeight: 700,
                    }}>
                      {dep.amount >= 0 ? '+' : '−'}
                    </span>
                    <div>
                      <p style={{ fontWeight: 600, color: dep.amount >= 0 ? 'var(--color-primary)' : '#DC2626', fontSize: '0.9rem' }}>
                        {dep.amount >= 0 ? '+' : ''}{fmtCur(dep.amount)}
                      </p>
                      {dep.note && (
                        <p className="ds-supporting" style={{ fontSize: '0.75rem' }}>{dep.note}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                  <span className="ds-supporting" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {intl.formatDate(new Date(dep.createdAt), { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  {deleteConfirmId === dep.id ? (
                    <div style={{ display: 'flex', gap: 'var(--spacing-1)' }}>
                      <button
                        onClick={() => handleDeleteDeposit(dep.id)}
                        style={{
                          padding: '2px 8px', borderRadius: 'var(--radius-sm)', border: 'none',
                          background: '#DC2626', color: '#FFF', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        style={{
                          padding: '2px 8px', borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border-default)', background: 'transparent',
                          color: 'var(--color-text-secondary)', fontSize: '0.7rem', cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(dep.id)}
                      style={{
                        padding: '4px', borderRadius: 'var(--radius-sm)', border: 'none',
                        background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {fund.createdAt && (
          <p className="ds-supporting" style={{ marginTop: 'var(--spacing-4)', textAlign: 'center', fontSize: '0.75rem' }}>
            {intl.formatMessage(
              { id: 'dashboard.ef_created', defaultMessage: 'Fund created on {date}' },
              { date: intl.formatDate(new Date(fund.createdAt), { month: 'long', day: 'numeric', year: 'numeric' }) }
            )}
          </p>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useLanguage, useCurrency, useSavingsGoals, useStore } from '@/store/useStore';
import { CURRENCIES } from '@/lib/constants';

/* ===== FIXED PALETTE (matching existing brand colors) ===== */
const GOAL_COLORS = [
  '#10B981', // emerald
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#6366F1', // indigo
  '#F59E0B', // amber
  '#EC4899', // pink
  '#EF4444', // red
  '#14B8A6', // teal
  '#F472B6', // rose
  '#6B7280', // gray
];

/* ===== ICONS (module scope — Fault Log F-007) ===== */
const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

const FlagIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

/* ===== ADD FUNDS MODAL (module scope) ===== */
function AddFundsModal({
  isOpen,
  goalName,
  currencySymbol,
  onClose,
  onConfirm,
  isRTL,
  intl,
}: {
  isOpen: boolean;
  goalName: string;
  currencySymbol: string;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  isRTL: boolean;
  intl: ReturnType<typeof useIntl>;
}) {
  const [amount, setAmount] = useState('');

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        backgroundColor: 'rgba(0,0,0,0.45)',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg-surface-1)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          direction: isRTL ? 'rtl' : 'ltr',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: '4px',
          }}
        >
          {intl.formatMessage({ id: 'dashboard.goals_add_funds', defaultMessage: 'Add Funds' })}
        </h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          {goalName}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>
            {currencySymbol}
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            autoFocus
            style={{
              flex: 1,
              padding: '10px 12px',
              fontSize: '1.125rem',
              fontWeight: 600,
              border: '1px solid var(--color-border-input)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-input)',
              color: 'var(--color-text-primary)',
              outline: 'none',
              direction: 'ltr',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '0.875rem',
              fontWeight: 500,
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            {intl.formatMessage({ id: 'dashboard.goals_cancel', defaultMessage: 'Cancel' })}
          </button>
          <button
            onClick={() => {
              const val = parseFloat(amount);
              if (val > 0) {
                onConfirm(val);
                setAmount('');
              }
            }}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-accent-growth)',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            {intl.formatMessage({ id: 'dashboard.goals_add', defaultMessage: 'Add' })}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== GOAL CARD (module scope) ===== */
function GoalCard({
  goal,
  currencySymbol,
  onAddFunds,
  onDelete,
  isRTL,
  intl,
}: {
  goal: { id: string; name: string; nameAr: string; targetAmount: number; currentAmount: number; deadline?: string; color: string };
  currencySymbol: string;
  onAddFunds: () => void;
  onDelete: () => void;
  isRTL: boolean;
  intl: ReturnType<typeof useIntl>;
}) {
  const percentage = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const isComplete = percentage >= 100;

  return (
    <div
      className="ds-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          [isRTL ? 'right' : 'left']: 0,
          width: '4px',
          height: '100%',
          backgroundColor: goal.color,
          borderRadius: isRTL ? '0 var(--radius-xl) var(--radius-xl) 0' : 'var(--radius-xl) 0 0 var(--radius-xl)',
        }}
      />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: goal.color + '20',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: goal.color,
            }}
          >
            <FlagIcon />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {goal.name}
            </h3>
            {goal.deadline && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {intl.formatMessage({ id: 'dashboard.goals_deadline', defaultMessage: 'Deadline' })}:{' '}
                {new Date(goal.deadline).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onDelete}
          title={intl.formatMessage({ id: 'dashboard.goals_delete', defaultMessage: 'Delete' })}
          style={{
            padding: '6px',
            border: 'none',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            borderRadius: '4px',
            flexShrink: 0,
          }}
          className="hover:opacity-70"
        >
          <TrashIcon />
        </button>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>
            {currencySymbol} {goal.currentAmount.toLocaleString()}
          </span>
          <span style={{ fontWeight: 600, color: isComplete ? 'var(--color-accent-growth)' : 'var(--color-text-secondary)' }}>
            {percentage.toFixed(0)}%
          </span>
        </div>
        <div
          style={{
            height: '8px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--color-border)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${percentage}%`,
              borderRadius: 'var(--radius-pill)',
              backgroundColor: isComplete ? 'var(--color-accent-growth)' : goal.color,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.6875rem',
            marginTop: '4px',
            color: 'var(--color-text-muted)',
          }}
        >
          <span>
            {intl.formatMessage({ id: 'dashboard.goals_remaining', defaultMessage: 'Remaining' })}: {currencySymbol} {remaining.toLocaleString()}
          </span>
          <span>
            {intl.formatMessage({ id: 'dashboard.goals_target', defaultMessage: 'Target' })}: {currencySymbol} {goal.targetAmount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Add Funds button */}
      {!isComplete && (
        <button
          onClick={onAddFunds}
          style={{
            padding: '8px 16px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            border: `1px solid ${goal.color}30`,
            borderRadius: 'var(--radius-sm)',
            background: goal.color + '10',
            color: goal.color,
            cursor: 'pointer',
            width: '100%',
          }}
          className="hover:opacity-80 transition-opacity"
        >
          {intl.formatMessage({ id: 'dashboard.goals_add_funds', defaultMessage: 'Add Funds' })}
        </button>
      )}
      {isComplete && (
        <div
          style={{
            textAlign: 'center',
            padding: '8px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--color-accent-growth)',
            backgroundColor: 'color-mix(in srgb, var(--color-accent-growth) 6%, transparent)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {intl.formatMessage({ id: 'dashboard.goals_goal_achieved', defaultMessage: 'Goal achieved!' })}
        </div>
      )}
    </div>
  );
}

/* ===== CREATE GOAL FORM (module scope) ===== */
function CreateGoalForm({
  currencySymbol,
  isRTL,
  onCancel,
  onSave,
  intl,
}: {
  currencySymbol: string;
  isRTL: boolean;
  onCancel: () => void;
  onSave: (data: { name: string; nameAr: string; targetAmount: number; deadline?: string; color: string; currentAmount: number }) => void;
  intl: ReturnType<typeof useIntl>;
}) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selectedColor, setSelectedColor] = useState(GOAL_COLORS[0]);

  const handleSubmit = () => {
    const amount = parseFloat(target);
    if (!name.trim() || !amount || amount <= 0) return;
    onSave({
      name: name.trim(),
      nameAr: name.trim(), // same value — single name field
      targetAmount: amount,
      deadline: deadline || undefined,
      color: selectedColor,
      currentAmount: 0,
    });
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    marginBottom: '6px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontSize: '0.875rem',
    border: '1px solid var(--color-border-input)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-bg-input)',
    color: 'var(--color-text-primary)',
    outline: 'none',
  };

  return (
    <div
      className="ds-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        border: '2px solid var(--color-accent-growth)',
      }}
    >
      <h3
        style={{
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
        }}
      >
        {intl.formatMessage({ id: 'dashboard.goals_new_savings_goal', defaultMessage: 'New Savings Goal' })}
      </h3>

      {/* Goal Name */}
      <div>
        <label style={labelStyle}>{intl.formatMessage({ id: 'dashboard.goals_goal_name', defaultMessage: 'Goal Name' })}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={intl.formatMessage({ id: 'dashboard.goals_goal_name_placeholder', defaultMessage: 'e.g. Summer Vacation' })}
          style={inputStyle}
        />
      </div>

      {/* Target amount */}
      <div>
        <label style={labelStyle}>{intl.formatMessage({ id: 'dashboard.goals_target_amount', defaultMessage: 'Target Amount' })}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', flexShrink: 0 }}>
            {currencySymbol}
          </span>
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="0"
            style={{ ...inputStyle, direction: 'ltr' }}
          />
        </div>
      </div>

      {/* Deadline */}
      <div>
        <label style={labelStyle}>{intl.formatMessage({ id: 'dashboard.goals_deadline_optional', defaultMessage: 'Deadline (optional)' })}</label>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Color picker */}
      <div>
        <label style={labelStyle}>{intl.formatMessage({ id: 'dashboard.goals_color', defaultMessage: 'Color' })}</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {GOAL_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedColor(c)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: c,
                border: selectedColor === c ? '3px solid var(--color-text-primary)' : '2px solid transparent',
                cursor: 'pointer',
                outline: selectedColor === c ? '2px solid var(--color-bg-surface-1)' : 'none',
                transition: 'transform 0.15s',
                transform: selectedColor === c ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '0.875rem',
            fontWeight: 500,
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
          >
            {intl.formatMessage({ id: 'dashboard.goals_cancel', defaultMessage: 'Cancel' })}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !parseFloat(target)}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: !name.trim() || !parseFloat(target) ? 'var(--color-border)' : 'var(--color-accent-growth)',
              color: !name.trim() || !parseFloat(target) ? 'var(--color-text-muted)' : '#FFFFFF',
              cursor: !name.trim() || !parseFloat(target) ? 'not-allowed' : 'pointer',
            }}
          >
            {intl.formatMessage({ id: 'dashboard.goals_create_goal', defaultMessage: 'Create Goal' })}
        </button>
      </div>
    </div>
  );
}

/* ===== MAIN PAGE ===== */
export default function GoalsPage() {
  const intl = useIntl();
  const language = useLanguage();
  const currency = useCurrency();
  const isRTL = language === 'ar';
  const savingsGoals = useSavingsGoals();
  const addSavingsGoal = useStore((state) => state.addSavingsGoal);
  const updateSavingsGoal = useStore((state) => state.updateSavingsGoal);
  const deleteSavingsGoal = useStore((state) => state.deleteSavingsGoal);

  const currencyInfo = CURRENCIES.find((c) => c.code === currency);
  const currencySymbol = isRTL
    ? currencyInfo?.symbolAr || currencyInfo?.symbol || currency
    : currencyInfo?.symbol || currency;

  const [showCreate, setShowCreate] = useState(false);
  const [addFundsGoalId, setAddFundsGoalId] = useState<string | null>(null);

  const addFundsGoal = savingsGoals.find((g) => g.id === addFundsGoalId);

  const totalTarget = savingsGoals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
  const overallPercentage = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 80px)',
        padding: 'var(--spacing-6)',
        direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
      {/* Back link */}
      <Link
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: 'var(--color-accent-growth)',
          textDecoration: 'none',
          marginBottom: 'var(--spacing-5)',
        }}
        className="hover:underline"
      >
        <span style={{ transform: isRTL ? 'scaleX(-1)' : 'none', display: 'inline-flex' }}>
          <ArrowLeftIcon />
        </span>
        {intl.formatMessage({ id: 'dashboard.goals_back_to_dashboard', defaultMessage: 'Back to Dashboard' })}
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--spacing-6)', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
            }}
          >
            {intl.formatMessage({ id: 'dashboard.goals_title', defaultMessage: 'Savings Goals' })}
          </h1>
          <p
            style={{
              fontSize: '0.9375rem',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              marginTop: '4px',
            }}
          >
            {intl.formatMessage({ id: 'dashboard.goals_subtitle', defaultMessage: 'Set your financial goals and track your progress toward achieving them.' })}
          </p>
        </div>

        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-accent-growth)',
              color: '#FFFFFF',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            className="hover:opacity-90 transition-opacity"
          >
            <PlusIcon />
            {intl.formatMessage({ id: 'dashboard.goals_new_goal', defaultMessage: 'New Goal' })}
          </button>
        )}
      </div>

      {/* Overall progress summary (only if goals exist) */}
      {savingsGoals.length > 0 && (
        <div
          className="ds-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginBottom: 'var(--spacing-5)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {intl.formatMessage({ id: 'dashboard.goals_overall_progress', defaultMessage: 'Overall Progress' })}
            </p>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: overallPercentage >= 100 ? 'var(--color-accent-growth)' : 'var(--color-text-secondary)' }}>
              {overallPercentage.toFixed(0)}%
            </p>
          </div>
          <div
            style={{
              height: '10px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--color-border)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${overallPercentage}%`,
                borderRadius: 'var(--radius-pill)',
                background: 'linear-gradient(90deg, var(--color-accent-growth), #14B8A6)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            <span>
              {intl.formatMessage({ id: 'dashboard.goals_saved', defaultMessage: 'Saved' })}: {currencySymbol} {totalSaved.toLocaleString()}
            </span>
            <span>
              {intl.formatMessage({ id: 'dashboard.goals_target', defaultMessage: 'Target' })}: {currencySymbol} {totalTarget.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div style={{ marginBottom: 'var(--spacing-5)' }}>
          <CreateGoalForm
            currencySymbol={currencySymbol}
            isRTL={isRTL}
            intl={intl}
            onCancel={() => setShowCreate(false)}
            onSave={(data) => {
              addSavingsGoal(data);
              setShowCreate(false);
            }}
          />
        </div>
      )}

      {/* Goals grid */}
      {savingsGoals.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 'var(--spacing-5)',
          }}
        >
          {savingsGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currencySymbol={currencySymbol}
              isRTL={isRTL}
              intl={intl}
              onAddFunds={() => setAddFundsGoalId(goal.id)}
              onDelete={() => {
                if (confirm(intl.formatMessage({ id: 'dashboard.goals_delete_confirm', defaultMessage: 'Are you sure you want to delete this goal?' }))) {
                  deleteSavingsGoal(goal.id);
                }
              }}
            />
          ))}
        </div>
      ) : (
        !showCreate && (
          <div
            className="ds-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              paddingBlock: '3rem',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-muted)',
              }}
            >
              <FlagIcon />
            </div>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
              {intl.formatMessage({ id: 'dashboard.goals_no_goals', defaultMessage: 'No goals yet' })}
            </p>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-accent-growth)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {intl.formatMessage({ id: 'dashboard.goals_create_first', defaultMessage: 'Create your first goal' })}
            </button>
          </div>
        )
      )}

      {/* Add Funds Modal */}
      <AddFundsModal
        isOpen={!!addFundsGoalId}
        goalName={addFundsGoal ? addFundsGoal.name : ''}
        currencySymbol={currencySymbol}
        isRTL={isRTL}
        intl={intl}
        onClose={() => setAddFundsGoalId(null)}
        onConfirm={(amount) => {
          if (addFundsGoalId && addFundsGoal) {
            updateSavingsGoal(addFundsGoalId, {
              currentAmount: addFundsGoal.currentAmount + amount,
            });
          }
          setAddFundsGoalId(null);
        }}
      />
    </div>
  );
}

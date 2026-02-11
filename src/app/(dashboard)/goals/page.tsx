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
}: {
  isOpen: boolean;
  goalName: string;
  currencySymbol: string;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  isRTL: boolean;
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
          backgroundColor: 'var(--theme-bg-card)',
          borderRadius: 'var(--radius-card)',
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
            color: 'var(--color-brand-navy)',
            marginBottom: '4px',
          }}
        >
          {isRTL ? 'إضافة مبلغ' : 'Add Funds'}
        </h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--theme-text-muted)', marginBottom: '1rem' }}>
          {goalName}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--theme-text-muted)' }}>
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
              border: '1px solid var(--theme-border-input)',
              borderRadius: 'var(--radius-input)',
              backgroundColor: 'var(--theme-bg-input)',
              color: 'var(--theme-text-primary)',
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
              border: '1px solid var(--theme-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              color: 'var(--theme-text-secondary)',
              cursor: 'pointer',
            }}
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
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
              background: 'var(--color-brand-emerald)',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            {isRTL ? 'إضافة' : 'Add'}
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
}: {
  goal: { id: string; name: string; nameAr: string; targetAmount: number; currentAmount: number; deadline?: string; color: string };
  currencySymbol: string;
  onAddFunds: () => void;
  onDelete: () => void;
  isRTL: boolean;
}) {
  const percentage = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const isComplete = percentage >= 100;

  return (
    <div
      className="card-standard"
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
          borderRadius: isRTL ? '0 var(--radius-card) var(--radius-card) 0' : 'var(--radius-card) 0 0 var(--radius-card)',
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
                color: 'var(--color-brand-navy)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {goal.name}
            </h3>
            {goal.deadline && (
              <p style={{ fontSize: '0.75rem', color: 'var(--theme-text-muted)' }}>
                {isRTL ? 'الموعد النهائي:' : 'Deadline:'}{' '}
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
          title={isRTL ? 'حذف' : 'Delete'}
          style={{
            padding: '6px',
            border: 'none',
            background: 'transparent',
            color: 'var(--theme-text-muted)',
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
          <span style={{ color: 'var(--theme-text-muted)' }}>
            {currencySymbol} {goal.currentAmount.toLocaleString()}
          </span>
          <span style={{ fontWeight: 600, color: isComplete ? '#10B981' : 'var(--theme-text-secondary)' }}>
            {percentage.toFixed(0)}%
          </span>
        </div>
        <div
          style={{
            height: '8px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--theme-border)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${percentage}%`,
              borderRadius: 'var(--radius-pill)',
              backgroundColor: isComplete ? '#10B981' : goal.color,
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
            color: 'var(--theme-text-muted)',
          }}
        >
          <span>
            {isRTL ? 'المتبقي:' : 'Remaining:'} {currencySymbol} {remaining.toLocaleString()}
          </span>
          <span>
            {isRTL ? 'الهدف:' : 'Target:'} {currencySymbol} {goal.targetAmount.toLocaleString()}
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
          {isRTL ? 'إضافة مبلغ' : 'Add Funds'}
        </button>
      )}
      {isComplete && (
        <div
          style={{
            textAlign: 'center',
            padding: '8px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#10B981',
            backgroundColor: '#10B98110',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {isRTL ? 'تم تحقيق الهدف!' : 'Goal achieved!'}
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
}: {
  currencySymbol: string;
  isRTL: boolean;
  onCancel: () => void;
  onSave: (data: { name: string; nameAr: string; targetAmount: number; deadline?: string; color: string; currentAmount: number }) => void;
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
    color: 'var(--theme-text-secondary)',
    marginBottom: '6px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontSize: '0.875rem',
    border: '1px solid var(--theme-border-input)',
    borderRadius: 'var(--radius-input)',
    backgroundColor: 'var(--theme-bg-input)',
    color: 'var(--theme-text-primary)',
    outline: 'none',
  };

  return (
    <div
      className="card-standard"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        border: '2px solid var(--color-brand-emerald)',
      }}
    >
      <h3
        style={{
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--color-brand-navy)',
        }}
      >
        {isRTL ? 'هدف ادخار جديد' : 'New Savings Goal'}
      </h3>

      {/* Goal Name */}
      <div>
        <label style={labelStyle}>{isRTL ? 'اسم الهدف' : 'Goal Name'}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isRTL ? 'مثال: رحلة صيفية' : 'e.g. Summer Vacation'}
          style={inputStyle}
        />
      </div>

      {/* Target amount */}
      <div>
        <label style={labelStyle}>{isRTL ? 'المبلغ المستهدف' : 'Target Amount'}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--theme-text-muted)', flexShrink: 0 }}>
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
        <label style={labelStyle}>{isRTL ? 'الموعد النهائي (اختياري)' : 'Deadline (optional)'}</label>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Color picker */}
      <div>
        <label style={labelStyle}>{isRTL ? 'اللون' : 'Color'}</label>
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
                border: selectedColor === c ? '3px solid var(--color-brand-navy)' : '2px solid transparent',
                cursor: 'pointer',
                outline: selectedColor === c ? '2px solid var(--theme-bg-card)' : 'none',
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
            border: '1px solid var(--theme-border)',
            borderRadius: 'var(--radius-sm)',
            background: 'transparent',
            color: 'var(--theme-text-secondary)',
            cursor: 'pointer',
          }}
        >
          {isRTL ? 'إلغاء' : 'Cancel'}
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
            background: !name.trim() || !parseFloat(target) ? 'var(--theme-border)' : 'var(--color-brand-emerald)',
            color: !name.trim() || !parseFloat(target) ? 'var(--theme-text-muted)' : '#FFFFFF',
            cursor: !name.trim() || !parseFloat(target) ? 'not-allowed' : 'pointer',
          }}
        >
          {isRTL ? 'إنشاء الهدف' : 'Create Goal'}
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
        padding: 'var(--spacing-3)',
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
          color: 'var(--color-brand-emerald)',
          textDecoration: 'none',
          marginBottom: 'var(--spacing-2)',
        }}
        className="hover:underline"
      >
        <span style={{ transform: isRTL ? 'scaleX(-1)' : 'none', display: 'inline-flex' }}>
          <ArrowLeftIcon />
        </span>
        {isRTL ? 'العودة للرئيسية' : 'Back to Dashboard'}
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--spacing-3)', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--color-brand-navy)',
              lineHeight: 1.2,
            }}
          >
            {isRTL ? 'أهداف الادخار' : 'Savings Goals'}
          </h1>
          <p
            style={{
              fontSize: '0.9375rem',
              color: 'var(--theme-text-secondary)',
              lineHeight: 1.6,
              marginTop: '4px',
            }}
          >
            {isRTL
              ? 'حدد أهدافك المالية وتابع تقدمك نحو تحقيقها.'
              : 'Set your financial goals and track your progress toward achieving them.'}
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
              background: 'var(--color-brand-emerald)',
              color: '#FFFFFF',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            className="hover:opacity-90 transition-opacity"
          >
            <PlusIcon />
            {isRTL ? 'هدف جديد' : 'New Goal'}
          </button>
        )}
      </div>

      {/* Overall progress summary (only if goals exist) */}
      {savingsGoals.length > 0 && (
        <div
          className="card-standard"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginBottom: 'var(--spacing-2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-brand-navy)' }}>
              {isRTL ? 'التقدم الإجمالي' : 'Overall Progress'}
            </p>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: overallPercentage >= 100 ? '#10B981' : 'var(--theme-text-secondary)' }}>
              {overallPercentage.toFixed(0)}%
            </p>
          </div>
          <div
            style={{
              height: '10px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--theme-border)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${overallPercentage}%`,
                borderRadius: 'var(--radius-pill)',
                background: 'linear-gradient(90deg, #10B981, #14B8A6)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--theme-text-muted)' }}>
            <span>
              {isRTL ? 'تم ادخار:' : 'Saved:'} {currencySymbol} {totalSaved.toLocaleString()}
            </span>
            <span>
              {isRTL ? 'الهدف:' : 'Target:'} {currencySymbol} {totalTarget.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div style={{ marginBottom: 'var(--spacing-2)' }}>
          <CreateGoalForm
            currencySymbol={currencySymbol}
            isRTL={isRTL}
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
            gap: 'var(--spacing-2)',
          }}
        >
          {savingsGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currencySymbol={currencySymbol}
              isRTL={isRTL}
              onAddFunds={() => setAddFundsGoalId(goal.id)}
              onDelete={() => {
                if (confirm(isRTL ? 'هل أنت متأكد من حذف هذا الهدف؟' : 'Are you sure you want to delete this goal?')) {
                  deleteSavingsGoal(goal.id);
                }
              }}
            />
          ))}
        </div>
      ) : (
        !showCreate && (
          <div
            className="card-standard"
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
                backgroundColor: 'var(--theme-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--theme-text-muted)',
              }}
            >
              <FlagIcon />
            </div>
            <p style={{ fontSize: '0.9375rem', color: 'var(--theme-text-secondary)', textAlign: 'center' }}>
              {isRTL ? 'لا توجد أهداف بعد' : 'No goals yet'}
            </p>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-brand-emerald)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {isRTL ? 'أنشئ هدفك الأول' : 'Create your first goal'}
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

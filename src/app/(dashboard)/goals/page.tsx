'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useIntl } from 'react-intl';
import {
  useCurrency,
  useSavingsGoals,
  useMonthlyBudget,
  useCategoryBudgets,
  useStore,
} from '@/store/useStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useTransactions } from '@/store/transactionStore';
import { useAIInsights } from '@/ai';
import { DEFAULT_EXPENSE_CATEGORIES, CURRENCIES } from '@/lib/constants';

/* ===== ICONS ===== */
const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TargetIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const FlagIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

const PiggyBankIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2" />
    <path d="M2 9.5a1.5 1.5 0 0 1 3 0" />
    <circle cx="14.5" cy="9" r="0.5" fill="currentColor" />
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const GOAL_COLORS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
  '#EF4444', '#14B8A6', '#6366F1', '#F97316', '#06B6D4',
];

interface GoalFormData {
  name: string;
  nameAr: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string;
  color: string;
}

const emptyForm: GoalFormData = {
  name: '',
  nameAr: '',
  targetAmount: '',
  currentAmount: '0',
  deadline: '',
  color: '#10B981',
};

export default function GoalsPage() {
  const router = useRouter();
  const intl = useIntl();
  const { t, language, isRTL } = useTranslation();
  const currency = useCurrency();
  const savingsGoals = useSavingsGoals();
  const monthlyBudget = useMonthlyBudget();
  const categoryBudgets = useCategoryBudgets();
  const { transactions } = useTransactions();
  const { alerts } = useAIInsights();

  const addSavingsGoal = useStore((s) => s.addSavingsGoal);
  const updateSavingsGoal = useStore((s) => s.updateSavingsGoal);
  const deleteSavingsGoal = useStore((s) => s.deleteSavingsGoal);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GoalFormData>(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'goals' | 'budget' | 'nudgets'>('goals');

  const ArrowBack = isRTL ? ArrowRightIcon : ArrowLeftIcon;

  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.[language === 'ar' ? 'symbolAr' : 'symbol'] || currency;

  // Monthly spending data
  const currentMonthExpenses = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return transactions.filter(tx => {
      const date = new Date(tx.date);
      return tx.type === 'expense' && date >= startOfMonth && date <= endOfMonth;
    });
  }, [transactions]);

  const totalMonthlySpent = useMemo(() => {
    return currentMonthExpenses.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  }, [currentMonthExpenses]);

  const categorySpending = useMemo(() => {
    const spending: Record<string, number> = {};
    currentMonthExpenses.forEach(tx => {
      const cat = tx.category || 'other-expense';
      spending[cat] = (spending[cat] || 0) + Math.abs(tx.amount);
    });
    return spending;
  }, [currentMonthExpenses]);

  // Form handlers
  const openAddForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (goalId: string) => {
    const goal = savingsGoals.find(g => g.id === goalId);
    if (!goal) return;
    setForm({
      name: goal.name,
      nameAr: goal.nameAr,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      deadline: goal.deadline || '',
      color: goal.color,
    });
    setEditingId(goalId);
    setShowForm(true);
  };

  const handleSave = () => {
    const target = parseFloat(form.targetAmount) || 0;
    const current = parseFloat(form.currentAmount) || 0;
    if (!form.name && !form.nameAr) return;
    if (target <= 0) return;

    if (editingId) {
      updateSavingsGoal(editingId, {
        name: form.name,
        nameAr: form.nameAr,
        targetAmount: target,
        currentAmount: current,
        deadline: form.deadline || undefined,
        color: form.color,
      });
    } else {
      addSavingsGoal({
        name: form.name,
        nameAr: form.nameAr,
        targetAmount: target,
        currentAmount: current,
        deadline: form.deadline || undefined,
        color: form.color,
      });
    }
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = (id: string) => {
    deleteSavingsGoal(id);
    setDeleteConfirmId(null);
  };

  const tabs = [
    { id: 'goals' as const, label: t.goals.savingsGoals },
    { id: 'budget' as const, label: t.goals.budgetOverview },
    { id: 'nudgets' as const, label: t.goals.nudgetAlerts },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ===== HEADER ===== */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => router.back()}
          style={{
            width: '2.5rem',
            height: '2.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-input)',
            border: '1px solid var(--theme-border)',
            backgroundColor: 'var(--theme-bg-card)',
            color: 'var(--theme-text-secondary)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          className="hover:opacity-80 transition-opacity"
        >
          <ArrowBack />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
            {t.goals.title}
          </h1>
          <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
            {t.goals.subtitle}
          </p>
        </div>
        <button
          onClick={openAddForm}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            paddingInline: '1rem',
            paddingBlock: '0.625rem',
            backgroundColor: 'var(--color-brand-emerald)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 'var(--radius-input)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          className="text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <PlusIcon />
          <span>{t.goals.addGoal}</span>
        </button>
      </div>

      {/* ===== TABS ===== */}
      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          padding: '0.25rem',
          borderRadius: 'var(--radius-input)',
          backgroundColor: 'var(--theme-bg-card)',
          border: '1px solid var(--theme-border)',
        }}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              paddingBlock: '0.625rem',
              paddingInline: '1rem',
              borderRadius: 'calc(var(--radius-input) - 2px)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 150ms',
              backgroundColor: activeTab === tab.id ? 'var(--color-brand-emerald)' : 'transparent',
              color: activeTab === tab.id ? '#FFFFFF' : 'var(--theme-text-secondary)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== TAB CONTENT ===== */}

      {/* --- GOALS TAB --- */}
      {activeTab === 'goals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Summary Stats */}
          {savingsGoals.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                className="rounded-2xl"
                style={{
                  padding: '1.25rem',
                  backgroundColor: 'var(--theme-bg-card)',
                  border: '1px solid var(--theme-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    className="rounded-xl"
                    style={{
                      width: '2.75rem',
                      height: '2.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#10B981',
                    }}
                  >
                    <TargetIcon />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                      {language === 'ar' ? 'عدد الأهداف' : 'Total Goals'}
                    </p>
                    <p className="text-xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                      {savingsGoals.length}
                    </p>
                  </div>
                </div>
              </div>
              <div
                className="rounded-2xl"
                style={{
                  padding: '1.25rem',
                  backgroundColor: 'var(--theme-bg-card)',
                  border: '1px solid var(--theme-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    className="rounded-xl"
                    style={{
                      width: '2.75rem',
                      height: '2.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      backgroundColor: 'rgba(99, 102, 241, 0.15)',
                      color: '#6366F1',
                    }}
                  >
                    <FlagIcon />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                      {language === 'ar' ? 'المبلغ المستهدف' : 'Total Target'}
                    </p>
                    <p className="text-xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                      {intl.formatNumber(
                        savingsGoals.reduce((s, g) => s + g.targetAmount, 0),
                        { style: 'currency', currency }
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div
                className="rounded-2xl"
                style={{
                  padding: '1.25rem',
                  backgroundColor: 'var(--theme-bg-card)',
                  border: '1px solid var(--theme-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    className="rounded-xl"
                    style={{
                      width: '2.75rem',
                      height: '2.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      color: '#F59E0B',
                    }}
                  >
                    <PiggyBankIcon />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                      {language === 'ar' ? 'المبلغ المدخر' : 'Total Saved'}
                    </p>
                    <p className="text-xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                      {intl.formatNumber(
                        savingsGoals.reduce((s, g) => s + g.currentAmount, 0),
                        { style: 'currency', currency }
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Goals List */}
          {savingsGoals.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {savingsGoals.map(goal => {
                const progress = goal.targetAmount > 0
                  ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
                  : 0;
                const isComplete = progress >= 100;
                const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
                const displayName = language === 'ar' && goal.nameAr ? goal.nameAr : goal.name;

                return (
                  <div
                    key={goal.id}
                    className="rounded-2xl shadow-sm"
                    style={{
                      padding: '1.25rem',
                      backgroundColor: 'var(--theme-bg-card)',
                      border: '1px solid var(--theme-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <div
                          className="rounded-xl"
                          style={{
                            width: '3rem',
                            height: '3rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            backgroundColor: goal.color + '20',
                            color: goal.color,
                          }}
                        >
                          {isComplete ? <CheckIcon /> : <TargetIcon />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <h3 className="text-base font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                            {displayName}
                          </h3>
                          {goal.deadline && (
                            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                              {t.goals.dueBy}: {intl.formatDate(new Date(goal.deadline), { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <button
                          onClick={() => openEditForm(goal.id)}
                          style={{
                            width: '2rem',
                            height: '2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--theme-border)',
                            backgroundColor: 'transparent',
                            color: 'var(--theme-text-muted)',
                            cursor: 'pointer',
                          }}
                          className="hover:opacity-80 transition-opacity"
                          title={t.goals.editGoal}
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(goal.id)}
                          style={{
                            width: '2rem',
                            height: '2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            backgroundColor: 'transparent',
                            color: '#EF4444',
                            cursor: 'pointer',
                          }}
                          className="hover:opacity-80 transition-opacity"
                          title={t.goals.deleteGoal}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                        <span className="text-sm font-medium" style={{ color: goal.color }}>
                          {progress.toFixed(0)}% {t.goals.ofTarget}
                        </span>
                        <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                          {isComplete ? t.goals.completed : `${t.goals.remaining}: ${intl.formatNumber(remaining, { style: 'currency', currency })}`}
                        </span>
                      </div>
                      <div
                        style={{
                          height: '8px',
                          borderRadius: '999px',
                          overflow: 'hidden',
                          backgroundColor: 'var(--theme-border)',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${progress}%`,
                            borderRadius: '999px',
                            backgroundColor: goal.color,
                            transition: 'width 300ms ease',
                          }}
                        />
                      </div>
                    </div>

                    {/* Amounts */}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{t.goals.currentAmount}</p>
                        <p className="text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                          {intl.formatNumber(goal.currentAmount, { style: 'currency', currency })}
                        </p>
                      </div>
                      <div style={{ textAlign: 'end' }}>
                        <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{t.goals.targetAmount}</p>
                        <p className="text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                          {intl.formatNumber(goal.targetAmount, { style: 'currency', currency })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div
              className="rounded-2xl shadow-sm"
              style={{
                padding: '3rem 1.5rem',
                backgroundColor: 'var(--theme-bg-card)',
                border: '1px solid var(--theme-border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
              }}
            >
              <div
                className="rounded-xl"
                style={{
                  width: '4rem',
                  height: '4rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--theme-border)',
                  color: 'var(--theme-text-muted)',
                }}
              >
                <TargetIcon />
              </div>
              <p className="text-base font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
                {t.goals.noGoals}
              </p>
              <p className="text-sm text-center max-w-xs" style={{ color: 'var(--theme-text-muted)' }}>
                {t.goals.noGoalsDesc}
              </p>
              <button
                onClick={openAddForm}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  paddingInline: '1.25rem',
                  paddingBlock: '0.75rem',
                  backgroundColor: 'var(--color-brand-emerald)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-input)',
                  cursor: 'pointer',
                }}
                className="text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <PlusIcon />
                {t.goals.createFirstGoal}
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- BUDGET TAB --- */}
      {activeTab === 'budget' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {monthlyBudget > 0 ? (
            <>
              {/* Monthly Budget Overview Card */}
              <div
                className="rounded-2xl relative overflow-hidden"
                style={{
                  padding: '1.25rem',
                  background: 'linear-gradient(135deg, #065F46 0%, #047857 50%, #10B981 100%)',
                  minHeight: '140px',
                }}
              >
                <p className="text-emerald-200 text-sm font-medium mb-1">{t.goals.monthlyBudget}</p>
                <div className="text-white text-3xl font-bold tracking-tight mb-3">
                  {intl.formatNumber(monthlyBudget, { style: 'currency', currency })}
                </div>
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                  <div>
                    <p className="text-emerald-200/70 text-xs">{t.goals.spent}</p>
                    <p className="text-white text-lg font-semibold">
                      {intl.formatNumber(totalMonthlySpent, { style: 'currency', currency })}
                    </p>
                  </div>
                  <div>
                    <p className="text-emerald-200/70 text-xs">{t.goals.remaining_budget}</p>
                    <p className={`text-lg font-semibold ${monthlyBudget - totalMonthlySpent >= 0 ? 'text-white' : 'text-red-300'}`}>
                      {intl.formatNumber(monthlyBudget - totalMonthlySpent, { style: 'currency', currency })}
                    </p>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min((totalMonthlySpent / monthlyBudget) * 100, 100)}%`,
                        backgroundColor: totalMonthlySpent <= monthlyBudget ? 'rgba(255,255,255,0.8)' : '#EF4444',
                        borderRadius: '999px',
                        transition: 'width 300ms ease',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.375rem' }}>
                    <span className="text-emerald-200/70 text-xs">
                      {((totalMonthlySpent / monthlyBudget) * 100).toFixed(0)}% {language === 'ar' ? 'مستخدم' : 'used'}
                    </span>
                    <span className={`text-xs font-medium ${totalMonthlySpent <= monthlyBudget ? 'text-emerald-200' : 'text-red-300'}`}>
                      {totalMonthlySpent <= monthlyBudget ? t.goals.onTrack : t.goals.overBudget}
                    </span>
                  </div>
                </div>
                {/* Decorative icon */}
                <div style={{ position: 'absolute', top: '1.25rem', insetInlineEnd: '1.25rem' }} className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                  <PiggyBankIcon />
                </div>
              </div>

              {/* Category Budgets */}
              {Object.keys(categoryBudgets).length > 0 && (
                <div
                  className="rounded-2xl shadow-sm"
                  style={{
                    padding: '1.25rem',
                    backgroundColor: 'var(--theme-bg-card)',
                    border: '1px solid var(--theme-border)',
                  }}
                >
                  <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text-primary)' }}>
                    {t.goals.categorySpending}
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {Object.entries(categoryBudgets).map(([catId, limit]) => {
                      const cat = DEFAULT_EXPENSE_CATEGORIES.find(c => c.id === catId);
                      if (!cat || limit <= 0) return null;
                      const spent = categorySpending[catId] || 0;
                      const pct = Math.min((spent / limit) * 100, 100);
                      const isOver = spent > limit;

                      return (
                        <div key={catId}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                              <div
                                className="rounded-lg"
                                style={{
                                  width: '2rem',
                                  height: '2rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  backgroundColor: cat.color + '15',
                                }}
                              >
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                              </div>
                              <span className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                                {language === 'ar' ? cat.nameAr : cat.name}
                              </span>
                            </div>
                            <span className="text-xs" style={{ color: isOver ? '#EF4444' : 'var(--theme-text-muted)', flexShrink: 0 }}>
                              {intl.formatNumber(spent, { style: 'currency', currency })} / {intl.formatNumber(limit, { style: 'currency', currency })}
                            </span>
                          </div>
                          <div style={{ height: '6px', backgroundColor: 'var(--theme-border)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${pct}%`,
                                backgroundColor: isOver ? '#EF4444' : cat.color,
                                borderRadius: '999px',
                                transition: 'width 300ms ease',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Link to budget settings */}
              <Link
                href="/budget"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--theme-border)',
                  backgroundColor: 'var(--theme-bg-card)',
                  color: 'var(--theme-text-secondary)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
                className="hover:opacity-80 transition-opacity"
              >
                <EditIcon />
                {language === 'ar' ? 'تعديل إعدادات الميزانية' : 'Edit Budget Settings'}
              </Link>
            </>
          ) : (
            /* No budget empty state */
            <div
              className="rounded-2xl shadow-sm"
              style={{
                padding: '3rem 1.5rem',
                backgroundColor: 'var(--theme-bg-card)',
                border: '1px solid var(--theme-border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
              }}
            >
              <div
                className="rounded-xl"
                style={{
                  width: '4rem',
                  height: '4rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--theme-border)',
                  color: 'var(--theme-text-muted)',
                }}
              >
                <PiggyBankIcon />
              </div>
              <p className="text-base font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
                {t.goals.noBudgetSet}
              </p>
              <p className="text-sm text-center max-w-xs" style={{ color: 'var(--theme-text-muted)' }}>
                {t.goals.noBudgetDesc}
              </p>
              <Link
                href="/budget"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  paddingInline: '1.25rem',
                  paddingBlock: '0.75rem',
                  backgroundColor: 'var(--color-brand-emerald)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-input)',
                  textDecoration: 'none',
                }}
                className="text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {t.goals.setupBudget}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* --- NUDGETS TAB --- */}
      {activeTab === 'nudgets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {alerts.length > 0 ? (
            alerts.map(alert => {
              const severityStyles = {
                high: {
                  bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#EF4444',
                },
                medium: {
                  bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  color: '#F59E0B',
                },
                low: {
                  bg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  color: '#6366F1',
                },
              };
              const style = severityStyles[alert.severity];

              return (
                <div
                  key={alert.id}
                  className="rounded-2xl"
                  style={{
                    padding: '1.25rem',
                    background: style.bg,
                    border: style.border,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div
                      className="rounded-xl"
                      style={{
                        width: '2.75rem',
                        height: '2.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        backgroundColor: style.color + '15',
                        color: style.color,
                      }}
                    >
                      <BellIcon />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)', marginBottom: '0.25rem' }}>
                        {language === 'ar' ? alert.titleAr : alert.title}
                      </h3>
                      <p className="text-sm" style={{ color: 'var(--theme-text-secondary)', lineHeight: 1.5 }}>
                        {language === 'ar' ? alert.messageAr : alert.message}
                      </p>
                      {alert.actionRoute && (
                        <Link
                          href={alert.actionRoute}
                          style={{
                            display: 'inline-block',
                            marginTop: '0.75rem',
                            padding: '0.375rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: style.color,
                            color: '#FFFFFF',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          {language === 'ar' ? alert.actionLabelAr : alert.actionLabel}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            /* No alerts empty state */
            <div
              className="rounded-2xl shadow-sm"
              style={{
                padding: '3rem 1.5rem',
                backgroundColor: 'var(--theme-bg-card)',
                border: '1px solid var(--theme-border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
              }}
            >
              <div
                className="rounded-xl"
                style={{
                  width: '4rem',
                  height: '4rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--theme-border)',
                  color: 'var(--theme-text-muted)',
                }}
              >
                <BellIcon />
              </div>
              <p className="text-base font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
                {t.goals.noAlerts}
              </p>
              <p className="text-sm text-center max-w-xs" style={{ color: 'var(--theme-text-muted)' }}>
                {t.goals.noAlertsDesc}
              </p>
              <Link
                href="/transactions/new"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  paddingInline: '1.25rem',
                  paddingBlock: '0.75rem',
                  backgroundColor: 'var(--color-brand-emerald)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-input)',
                  textDecoration: 'none',
                }}
                className="text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <PlusIcon />
                {language === 'ar' ? 'أضف معاملة' : 'Add Transaction'}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      {deleteConfirmId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '1rem',
          }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="rounded-2xl shadow-lg"
            style={{
              width: '100%',
              maxWidth: '24rem',
              padding: '1.5rem',
              backgroundColor: 'var(--theme-bg-card)',
              border: '1px solid var(--theme-border)',
            }}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--theme-text-primary)' }}>
              {t.goals.deleteGoal}
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--theme-text-secondary)' }}>
              {t.goals.deleteConfirm}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{
                  flex: 1,
                  paddingBlock: '0.625rem',
                  borderRadius: 'var(--radius-input)',
                  border: '1px solid var(--theme-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--theme-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                {t.goals.cancel}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                style={{
                  flex: 1,
                  paddingBlock: '0.625rem',
                  borderRadius: 'var(--radius-input)',
                  border: 'none',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                {t.goals.deleteGoal}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD/EDIT GOAL MODAL ===== */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '1rem',
          }}
          onClick={() => { setShowForm(false); setEditingId(null); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="rounded-2xl shadow-lg"
            style={{
              width: '100%',
              maxWidth: '28rem',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '1.5rem',
              backgroundColor: 'var(--theme-bg-card)',
              border: '1px solid var(--theme-border)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                {editingId ? t.goals.editGoal : t.goals.addGoal}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); }}
                style={{
                  width: '2rem',
                  height: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--theme-text-muted)',
                  cursor: 'pointer',
                }}
              >
                <CloseIcon />
              </button>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Goal Name (English) */}
              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>
                  {t.goals.goalName}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder={language === 'ar' ? 'مثال: شراء سيارة' : 'e.g. Buy a car'}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--theme-border)',
                    backgroundColor: 'var(--theme-bg-input)',
                    color: 'var(--theme-text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Goal Name (Arabic) */}
              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>
                  {t.goals.goalNameAr}
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={form.nameAr}
                  onChange={e => setForm({ ...form, nameAr: e.target.value })}
                  placeholder="مثال: شراء سيارة"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--theme-border)',
                    backgroundColor: 'var(--theme-bg-input)',
                    color: 'var(--theme-text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Target Amount */}
              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>
                  {t.goals.targetAmount} ({currencySymbol})
                </label>
                <input
                  type="number"
                  value={form.targetAmount}
                  onChange={e => setForm({ ...form, targetAmount: e.target.value })}
                  placeholder="0"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--theme-border)',
                    backgroundColor: 'var(--theme-bg-input)',
                    color: 'var(--theme-text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Current Amount */}
              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>
                  {t.goals.currentAmount} ({currencySymbol})
                </label>
                <input
                  type="number"
                  value={form.currentAmount}
                  onChange={e => setForm({ ...form, currentAmount: e.target.value })}
                  placeholder="0"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--theme-border)',
                    backgroundColor: 'var(--theme-bg-input)',
                    color: 'var(--theme-text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>
                  {t.goals.deadline}
                </label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={e => setForm({ ...form, deadline: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--theme-border)',
                    backgroundColor: 'var(--theme-bg-input)',
                    color: 'var(--theme-text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--theme-text-secondary)' }}>
                  {t.goals.color}
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {GOAL_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setForm({ ...form, color })}
                      style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '50%',
                        backgroundColor: color,
                        border: form.color === color ? '3px solid var(--theme-text-primary)' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'transform 150ms',
                        transform: form.color === color ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); }}
                style={{
                  flex: 1,
                  paddingBlock: '0.75rem',
                  borderRadius: 'var(--radius-input)',
                  border: '1px solid var(--theme-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--theme-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                {t.goals.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={(!form.name && !form.nameAr) || !(parseFloat(form.targetAmount) > 0)}
                style={{
                  flex: 1,
                  paddingBlock: '0.75rem',
                  borderRadius: 'var(--radius-input)',
                  border: 'none',
                  backgroundColor: 'var(--color-brand-emerald)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  opacity: (!form.name && !form.nameAr) || !(parseFloat(form.targetAmount) > 0) ? 0.5 : 1,
                }}
              >
                {t.goals.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

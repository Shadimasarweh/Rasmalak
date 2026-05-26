'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { Calendar, Save, Check, Sparkles, Info } from 'lucide-react';
import { useLanguage, useCurrency } from '@/store/useStore';
import { useTransactions } from '@/store/transactionStore';
import { useBudgetCycles } from '@/store/budgetCyclesStore';
import { useEmergencyFund } from '@/store/emergencyFundStore';
import { useGoals, getMonthlyFundingAmount } from '@/store/goalsStore';
import { convertCadence } from '@/lib/emergencyFund/baseline';
import { estimateMonthlyIncome, evaluateSavingsFitness } from '@/lib/budget/savingsFitness';
import { DEFAULT_EXPENSE_CATEGORIES, CURRENCIES } from '@/lib/constants';
import { styledNum } from '@/components/StyledNumber';
import { MoneyInput } from '@/components/MoneyInput';
import {
  suggestNextMonthPlan,
  suggestionRationale,
  AutoBudgetCategorySuggestion,
  AutoBudgetResult,
} from '@/lib/autoBudget';
import CategoryComparisonTable from '@/components/money/CategoryComparisonTable';
import { AI_FEATURES } from '@/ai/config';

/**
 * Plan Your Month
 * ---------------
 * Future-oriented screen. Users decide what they WANT to spend before the
 * month happens. Reality (actual spend) is shown only as a comparison
 * panel at the bottom and is rendered in a different color so it can
 * never be mistaken for the plan itself.
 *
 * Microcopy guard: when the user is past the 5th of the month and edits
 * a number, we surface a hint that this isn't where you record what
 * already happened.
 */

const MIDMONTH_THRESHOLD_DAY = 5;

interface CategoryRowProps {
  categoryId: string;
  name: string;
  color: string;
  value: string;
  suggestion?: AutoBudgetCategorySuggestion;
  aiRationale?: string;
  currencySymbol: string;
  isRTL: boolean;
  locale: 'en' | 'ar';
  onChange: (val: string) => void;
  onApplySuggestion: () => void;
  showMidMonthHint: boolean;
  onMidMonthHintShown: () => void;
}

function CategoryPlanRow({
  name,
  color,
  value,
  suggestion,
  aiRationale,
  currencySymbol,
  isRTL,
  locale,
  onChange,
  onApplySuggestion,
  showMidMonthHint,
  onMidMonthHintShown,
}: CategoryRowProps) {
  const intl = useIntl();
  const [hintVisible, setHintVisible] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '12px',
        borderRadius: '10px',
        background: 'var(--ds-bg-input)',
        border: '0.5px solid var(--ds-border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
          }}
        />
        <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
          {name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '160px' }}>
          <span style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>{currencySymbol}</span>
          <MoneyInput
            value={value}
            onChange={(next) => {
              onChange(next);
              if (showMidMonthHint && !hintVisible) {
                setHintVisible(true);
                onMidMonthHintShown();
              }
            }}
            placeholder={suggestion ? String(suggestion.suggestedAmount) : '0'}
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: '14px',
              fontWeight: 500,
              border: '0.5px solid var(--ds-plan-border)',
              borderRadius: '8px',
              background: 'var(--ds-bg-card)',
              color: 'var(--ds-plan)',
              outline: 'none',
              direction: 'ltr',
              textAlign: isRTL ? 'right' : 'left',
            }}
          />
        </div>
      </div>

      {/* Smart-default suggestion chip */}
      {suggestion && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingInlineStart: '20px',
            flexWrap: 'wrap',
          }}
        >
          <span
            title={aiRationale || suggestionRationale(suggestion, locale)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: 'var(--ds-text-muted)',
            }}
          >
            <Sparkles size={11} style={{ color: 'var(--ds-plan)' }} />
            {intl.formatMessage({ id: 'money.plan_smart_default_label' })}
            {' · '}
            {currencySymbol} {styledNum(intl.formatNumber(suggestion.suggestedAmount))}
          </span>
          {String(value) !== String(suggestion.suggestedAmount) && (
            <button
              type="button"
              onClick={onApplySuggestion}
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--ds-plan)',
                background: 'var(--ds-plan-bg)',
                border: '0.5px solid var(--ds-plan-border)',
                padding: '3px 8px',
                borderRadius: '999px',
                cursor: 'pointer',
              }}
            >
              {intl.formatMessage({ id: 'money.plan_use_suggestion' })}
            </button>
          )}
        </div>
      )}

      {showMidMonthHint && hintVisible && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
            padding: '8px 10px',
            background: 'var(--ds-warning-bg)',
            border: '0.5px solid var(--ds-warning-border)',
            borderRadius: '8px',
            color: 'var(--ds-warning-text)',
            fontSize: '12px',
            lineHeight: 1.5,
          }}
        >
          <Info size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>
            <strong>{intl.formatMessage({ id: 'money.plan_midmonth_warning_title' })}</strong>{' '}
            {intl.formatMessage({ id: 'money.plan_midmonth_warning_body' })}{' '}
            <Link
              href="/money/track"
              style={{ color: 'var(--ds-actual)', fontWeight: 600, textDecoration: 'underline' }}
            >
              {intl.formatMessage({ id: 'money.plan_midmonth_warning_cta' })}
            </Link>
          </span>
        </div>
      )}
    </div>
  );
}

export default function PlanPage() {
  const intl = useIntl();
  const language = useLanguage();
  const currency = useCurrency();
  const isRTL = language === 'ar';
  const locale: 'en' | 'ar' = isRTL ? 'ar' : 'en';

  // Plan reads from the month-stamped budget_cycles table introduced
  // in migration 013. The legacy `useBudget()` (single row, no
  // history) is kept for callers that haven't migrated yet but the
  // Plan page is the source of truth for cycle data.
  const { currentCycle, saveCurrentCycle } = useBudgetCycles();
  const monthlyBudget = currentCycle?.monthlyBudget ?? 0;
  // Memoize so dependent useEffects don't re-run on every render
  // (currentCycle is recomputed on every store update; the inner
  // category map only changes on actual data change).
  const categoryBudgets = useMemo(
    () => currentCycle?.categoryBudgets ?? {},
    [currentCycle],
  );
  const saveAll = useCallback(
    (monthly: number, categories: Record<string, number>) => {
      void saveCurrentCycle(monthly, categories);
    },
    [saveCurrentCycle],
  );
  const { transactions } = useTransactions();
  const { savingsGoals } = useGoals();
  const { fund: emergencyFund } = useEmergencyFund();

  const currencyInfo = CURRENCIES.find((c) => c.code === currency);
  const currencySymbol = isRTL
    ? currencyInfo?.symbolAr || currencyInfo?.symbol || currency
    : currencyInfo?.symbol || currency;

  // Derive auto-budget suggestions from prior months. Pass amountBase
  // so the projection lives in base currency (architectural rule).
  const suggestion = useMemo(
    () => suggestNextMonthPlan(transactions.map((t) => ({
      type: t.type,
      amount: t.amount,
      amountBase: t.amountBase,
      date: t.date,
      category: t.category,
    }))),
    [transactions],
  );

  // Local edit state
  const [tempMonthlyBudget, setTempMonthlyBudget] = useState('');
  const [tempBudgets, setTempBudgets] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hintCounter, setHintCounter] = useState(0); // bump to dedupe hint surface
  const [aiRationales, setAiRationales] = useState<Record<string, string>>({});

  // Best-effort AI rationale refresh. Fails silently — the deterministic
  // rationale always renders. Triggered only when the feature flag is on
  // and we actually have at least one suggestion to refine.
  useEffect(() => {
    if (!AI_FEATURES.aiAutoBudget) return;
    const cats = Object.keys(suggestion.byCategory);
    if (cats.length === 0) return;
    const baseline: AutoBudgetResult = suggestion;
    let cancelled = false;
    fetch('/api/auto-budget/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseline, language: locale }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.rationales) setAiRationales(data.rationales);
      })
      .catch(() => {
        /* fail open — deterministic rationale stays */
      });
    return () => { cancelled = true; };
  }, [suggestion, locale]);

  useEffect(() => {
    if (!isDirty) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTempMonthlyBudget(monthlyBudget > 0 ? monthlyBudget.toString() : '');
    }
  }, [monthlyBudget, isDirty]);

  useEffect(() => {
    if (!isDirty) {
      const initial: Record<string, string> = {};
      DEFAULT_EXPENSE_CATEGORIES.forEach((cat) => {
        const stored = categoryBudgets[cat.id];
        initial[cat.id] = stored ? stored.toString() : '';
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTempBudgets(initial);
    }
  }, [categoryBudgets, isDirty]);

  const showMidMonthHint = useMemo(() => {
    return new Date().getDate() > MIDMONTH_THRESHOLD_DAY && hintCounter < 1;
  }, [hintCounter]);

  const totalCategory = Object.values(tempBudgets).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const monthlyBudgetValue = parseFloat(tempMonthlyBudget) || 0;
  const displayBudget = monthlyBudgetValue > 0 ? monthlyBudgetValue : totalCategory;

  const handleApplySuggestion = (catId: string, amount: number) => {
    setTempBudgets((prev) => ({ ...prev, [catId]: String(amount) }));
    setIsDirty(true);
  };

  const handleApplyAllSuggestions = () => {
    const next: Record<string, string> = { ...tempBudgets };
    Object.values(suggestion.byCategory).forEach((s) => {
      if (!next[s.categoryId] || parseFloat(next[s.categoryId] || '0') === 0) {
        next[s.categoryId] = String(s.suggestedAmount);
      }
    });
    setTempBudgets(next);
    setIsDirty(true);
  };

  const handleSave = () => {
    const finalCategories: Record<string, number> = {};
    Object.entries(tempBudgets).forEach(([catId, value]) => {
      const amount = parseFloat(value) || 0;
      if (amount > 0) finalCategories[catId] = amount;
    });
    Object.entries(categoryBudgets).forEach(([catId, value]) => {
      if (catId.startsWith('goal-funding-') && value > 0) finalCategories[catId] = value;
    });
    saveAll(monthlyBudgetValue, finalCategories);
    setIsDirty(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const fundedGoals = savingsGoals.filter((g) => getMonthlyFundingAmount(g) > 0);
  const emptySuggestionsAvailable = Object.values(suggestion.byCategory).some(
    (s) => !tempBudgets[s.categoryId] || parseFloat(tempBudgets[s.categoryId] || '0') === 0,
  );

  // Build the savings line list (goals + EF) for the fitness check.
  // We use the live monthly funding amount, not what's stored in the
  // budget cycle, because the doc requires the alert to reflect the
  // CURRENT goals state (paused goals already drop to 0).
  const savingsLines = useMemo(() => {
    const lines: { id: string; source: 'goal' | 'emergency-fund'; label: string; monthlyAmount: number; goalId?: string }[] = [];
    fundedGoals.forEach((g) => {
      lines.push({
        id: `goal-${g.id}`,
        source: 'goal',
        label: g.name,
        monthlyAmount: getMonthlyFundingAmount(g),
        goalId: g.id,
      });
    });
    if (emergencyFund && emergencyFund.monthlyContribution > 0) {
      const monthlyEquiv = emergencyFund.frequency === 'biweekly'
        ? convertCadence({ amount: emergencyFund.monthlyContribution, from: 'biweekly', to: 'monthly' })
        : emergencyFund.monthlyContribution;
      lines.push({
        id: 'emergency-fund',
        source: 'emergency-fund',
        label: intl.formatMessage({ id: 'dashboard.budgets_ef_contribution', defaultMessage: 'Emergency Fund' }),
        monthlyAmount: monthlyEquiv,
      });
    }
    return lines;
  }, [fundedGoals, emergencyFund, intl]);

  // Expected income: median of last 3 months' income, rounded.
  // Falls back to the user's planned monthly budget when there's
  // no income history (new accounts).
  const expectedIncome = useMemo(() => {
    const fromHistory = estimateMonthlyIncome(
      transactions.map((t) => ({ type: t.type, amountBase: t.amountBase, date: t.date })),
    );
    return fromHistory > 0 ? fromHistory : monthlyBudgetValue;
  }, [transactions, monthlyBudgetValue]);

  const fitness = useMemo(
    () => evaluateSavingsFitness(savingsLines, expectedIncome),
    [savingsLines, expectedIncome],
  );

  const [fitnessDismissed, setFitnessDismissed] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* HEADER */}
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--ds-plan)', marginBottom: '4px' }}>
          <Calendar size={18} />
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {intl.formatMessage({ id: 'money.timeline_plan' })}
          </span>
        </div>
        <h1 className="ds-title-page" style={{ marginBottom: '4px' }}>
          {intl.formatMessage({ id: 'money.plan_title' })}
        </h1>
        <p className="ds-body" style={{ marginTop: 0 }}>
          {intl.formatMessage({ id: 'money.plan_subtitle' })}
        </p>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--ds-plan)',
            background: 'var(--ds-plan-bg)',
            border: '0.5px solid var(--ds-plan-border)',
            padding: '6px 10px',
            borderRadius: '8px',
            display: 'inline-block',
            marginTop: '8px',
          }}
        >
          {intl.formatMessage({ id: 'money.plan_intent_label' })}
        </p>
      </div>

      {/* OVER-INCOME ALERT — fires when goal+EF savings > expected income */}
      {fitness.isOverBudget && !fitnessDismissed && (
        <div
          role="alert"
          style={{
            background: 'rgba(220, 38, 38, 0.06)',
            border: '0.5px solid rgba(220, 38, 38, 0.3)',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-error)', margin: 0, marginBottom: '4px' }}>
                {intl.formatMessage({ id: 'money.plan_savings_over_title', defaultMessage: 'Your goals exceed this month\u2019s budget room' })}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--ds-text-body)', margin: 0, lineHeight: 1.5 }}>
                {intl.formatMessage(
                  {
                    id: 'money.plan_savings_over_body',
                    defaultMessage: 'Your active goals + emergency fund add up to {savings} but your typical monthly income is {income}. Extend a target date or pause a goal to free up room.',
                  },
                  {
                    savings: `${currencySymbol} ${styledNum(intl.formatNumber(Math.round(fitness.totalSavings)))}`,
                    income: `${currencySymbol} ${styledNum(intl.formatNumber(Math.round(fitness.expectedIncome)))}`,
                  },
                )}
              </p>
            </div>
            <button
              onClick={() => setFitnessDismissed(true)}
              aria-label="Dismiss"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--ds-text-muted)',
                cursor: 'pointer',
                fontSize: '18px',
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {fitness.largestLine?.source === 'goal' && fitness.largestLine.goalId && (
              <Link
                href="/goals"
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#FFFFFF',
                  background: 'var(--ds-primary)',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  textDecoration: 'none',
                }}
              >
                {intl.formatMessage(
                  { id: 'money.plan_savings_over_goal_cta', defaultMessage: 'Adjust {label}' },
                  { label: fitness.largestLine.label },
                )}
              </Link>
            )}
            {fitness.largestLine?.source === 'emergency-fund' && (
              <Link
                href="/emergency-fund"
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#FFFFFF',
                  background: 'var(--ds-primary)',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  textDecoration: 'none',
                }}
              >
                {intl.formatMessage({ id: 'money.plan_savings_over_ef_cta', defaultMessage: 'Adjust Emergency Fund' })}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* MONTHLY TARGET */}
      <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <h2 className="ds-title-section" style={{ marginBottom: '4px' }}>
            {intl.formatMessage({ id: 'money.plan_total_question' })}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', margin: 0 }}>
            {intl.formatMessage({ id: 'money.plan_total_placeholder' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-plan)', flexShrink: 0 }}>
            {currencySymbol}
          </span>
          <MoneyInput
            value={tempMonthlyBudget}
            onChange={(next) => {
              setTempMonthlyBudget(next);
              setIsDirty(true);
            }}
            placeholder="0"
            style={{
              flex: 1,
              padding: '12px 14px',
              fontSize: '20px',
              fontWeight: 600,
              border: '0.5px solid var(--ds-plan-border)',
              borderRadius: '10px',
              background: 'var(--ds-plan-bg)',
              color: 'var(--ds-plan)',
              outline: 'none',
              direction: 'ltr',
              textAlign: isRTL ? 'right' : 'left',
            }}
          />
        </div>
      </div>

      {/* PLAN BY CATEGORY */}
      <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <h2 className="ds-title-section" style={{ margin: 0 }}>
            {intl.formatMessage({ id: 'money.plan_categories_heading' })}
          </h2>
          {emptySuggestionsAvailable ? (
            <button
              type="button"
              onClick={handleApplyAllSuggestions}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--ds-plan)',
                background: 'var(--ds-plan-bg)',
                border: '0.5px solid var(--ds-plan-border)',
                padding: '6px 12px',
                borderRadius: '999px',
                cursor: 'pointer',
              }}
            >
              <Sparkles size={12} />
              {intl.formatMessage({ id: 'money.plan_use_suggestion' })}
            </button>
          ) : !suggestion.hasEnoughHistory ? (
            <span style={{ fontSize: '11px', color: 'var(--ds-text-muted)' }}>
              {intl.formatMessage({ id: 'money.plan_no_history' })}
            </span>
          ) : null}
        </div>

        {DEFAULT_EXPENSE_CATEGORIES.map((cat) => (
          <CategoryPlanRow
            key={cat.id}
            categoryId={cat.id}
            name={isRTL ? cat.nameAr : cat.name}
            color={cat.color}
            value={tempBudgets[cat.id] || ''}
            suggestion={suggestion.byCategory[cat.id]}
            aiRationale={aiRationales[cat.id]}
            currencySymbol={currencySymbol}
            isRTL={isRTL}
            locale={locale}
            onChange={(v) => {
              setTempBudgets((prev) => ({ ...prev, [cat.id]: v }));
              setIsDirty(true);
            }}
            onApplySuggestion={() =>
              handleApplySuggestion(cat.id, suggestion.byCategory[cat.id]?.suggestedAmount || 0)
            }
            showMidMonthHint={showMidMonthHint}
            onMidMonthHintShown={() => setHintCounter((c) => c + 1)}
          />
        ))}
      </div>

      {/* GOAL FUNDING (planning, kept) */}
      {fundedGoals.length > 0 && (
        <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <h2 className="ds-title-section" style={{ marginBottom: '2px' }}>
              {intl.formatMessage({ id: 'dashboard.budgets_goal_funding', defaultMessage: 'Goal Funding' })}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', margin: 0 }}>
              {intl.formatMessage({ id: 'dashboard.budgets_goal_funding_desc', defaultMessage: 'Auto-created from your savings goals' })}
            </p>
          </div>
          {fundedGoals.map((goal) => {
            const monthlyAmount = getMonthlyFundingAmount(goal);
            return (
              <div
                key={goal.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--ds-bg-input)',
                  border: '0.5px solid var(--ds-border)',
                }}
              >
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: goal.color || 'var(--ds-plan)' }} />
                <p style={{ flex: 1, fontSize: '13px', color: 'var(--ds-text-heading)', margin: 0 }}>
                  {intl.formatMessage(
                    { id: 'dashboard.budgets_monthly_goal_funding', defaultMessage: 'Monthly {goal} Funding' },
                    { goal: goal.name },
                  )}
                </p>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ds-plan)' }}>
                  {currencySymbol} {styledNum(intl.formatNumber(monthlyAmount))}
                </span>
                <Link
                  href="/goals"
                  style={{ fontSize: '11px', color: 'var(--ds-actual)', textDecoration: 'none', flexShrink: 0 }}
                >
                  {intl.formatMessage({ id: 'dashboard.budgets_goal_funding_edit_hint', defaultMessage: 'Edit from Goals page' })}
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* EMERGENCY FUND CONTRIBUTION (locked savings line) */}
      {emergencyFund && emergencyFund.monthlyContribution > 0 && (() => {
        // For biweekly cadence, monthlyContribution stores the
        // BI-WEEKLY amount; convert to a monthly equivalent so the
        // Plan page sums consistently with the other savings lines.
        const monthlyEquiv = emergencyFund.frequency === 'biweekly'
          ? convertCadence({ amount: emergencyFund.monthlyContribution, from: 'biweekly', to: 'monthly' })
          : emergencyFund.monthlyContribution;
        return (
          <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <h2 className="ds-title-section" style={{ marginBottom: '2px' }}>
                {intl.formatMessage({ id: 'dashboard.budgets_ef_contribution', defaultMessage: 'Emergency Fund' })}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', margin: 0 }}>
                {intl.formatMessage({ id: 'dashboard.budgets_ef_contribution_desc', defaultMessage: 'Reserved monthly from your budget' })}
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--ds-bg-input)',
                border: '0.5px solid var(--ds-border)',
              }}
              title={intl.formatMessage({ id: 'dashboard.budgets_locked_hint', defaultMessage: 'Locked: edit from the source page' })}
            >
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--ds-actual)' }} />
              <p style={{ flex: 1, fontSize: '13px', color: 'var(--ds-text-heading)', margin: 0 }}>
                {intl.formatMessage({ id: 'dashboard.budgets_ef_monthly', defaultMessage: 'Monthly Contribution' })}
                {emergencyFund.frequency === 'biweekly' && (
                  <span style={{ marginInlineStart: '6px', color: 'var(--ds-text-muted)', fontWeight: 400, fontSize: '11px' }}>
                    {intl.formatMessage({ id: 'dashboard.budgets_ef_biweekly_note', defaultMessage: '(bi-weekly)' })}
                  </span>
                )}
              </p>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ds-plan)' }}>
                {currencySymbol} {styledNum(intl.formatNumber(Math.round(monthlyEquiv)))}
              </span>
              <Link
                href="/emergency-fund"
                style={{ fontSize: '11px', color: 'var(--ds-actual)', textDecoration: 'none', flexShrink: 0 }}
              >
                {intl.formatMessage({ id: 'dashboard.budgets_ef_edit_hint', defaultMessage: 'Edit from Emergency Fund page' })}
              </Link>
            </div>
          </div>
        );
      })()}

      {/* COMPACT COMPARE PREVIEW — current month */}
      <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <h2 className="ds-title-section" style={{ marginBottom: '2px' }}>
            {intl.formatMessage({ id: 'money.compare_title' })}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', margin: 0 }}>
            {intl.formatMessage({ id: 'money.compare_subtitle' })}
          </p>
        </div>
        <CategoryComparisonTable monthOffset={0} compact plannedOverride={(() => {
          const out: Record<string, number> = {};
          Object.entries(tempBudgets).forEach(([k, v]) => {
            const n = parseFloat(v);
            if (n > 0) out[k] = n;
          });
          return out;
        })()} />
        <Link
          href="/money/compare"
          style={{
            alignSelf: 'flex-start',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--ds-plan)',
            textDecoration: 'none',
          }}
        >
          {intl.formatMessage({ id: 'money.tab_compare' })} →
        </Link>
      </div>

      {/* SAVE */}
      <button
        type="button"
        onClick={handleSave}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '11px 18px',
          background: isSaved ? 'var(--ds-actual)' : 'var(--ds-plan)',
          color: '#FFFFFF',
          fontSize: '14px',
          fontWeight: 600,
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          width: '100%',
          transition: 'background-color 150ms ease',
        }}
      >
        {isSaved ? <Check size={16} /> : <Save size={16} />}
        {isSaved
          ? intl.formatMessage({ id: 'money.plan_saved' })
          : intl.formatMessage({ id: 'money.plan_save' })}
      </button>

      {/* Sub-text: planned total */}
      <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', textAlign: 'center', margin: 0 }}>
        {currencySymbol} {styledNum(intl.formatNumber(displayBudget))} · {intl.formatMessage({ id: 'money.legend_planned' })}
      </p>
    </div>
  );
}

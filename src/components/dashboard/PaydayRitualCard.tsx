'use client';

/**
 * Payday ritual — individual roadmap B3. On detected payday: last
 * cycle's report card (saved/overspent, top win, top leak, streak) and
 * a "pay yourself first" suggestion into the top goal, sized by the
 * Monte Carlo when the goal is short. Shows once per cycle, first two
 * days only — a ritual, not a nag. Ships dark behind paydayRitual.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { PartyPopper, X } from 'lucide-react';
import { AI_FEATURES } from '@/ai/config';
import { buildCycleReportCard } from '@/ai/deterministic/cycleReportCard';
import { estimateGoalRisk, monthlyNetSavingsSamples, seedFromId } from '@/ai/deterministic/goalRisk';
import { addDays } from '@/ai/deterministic/hijri';
import { mapToEngineTransactions } from '@/lib/predictive/inputs';
import { usePredictiveState } from '@/lib/predictive/PredictiveProvider';
import { useTransactions } from '@/store/transactionStore';
import { useGoals } from '@/store/goalsStore';
import { useBaseCurrency, useLanguage } from '@/store/useStore';
import { getCycleRange } from '@/lib/cycles';
import { DEFAULT_EXPENSE_CATEGORIES } from '@/lib/constants';
import { styledNum } from '@/components/StyledNumber';

const stampKey = (cycleKey: string) => `rasmalak:payday-ritual:${cycleKey}`;
const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

export default function PaydayRitualCard() {
  const intl = useIntl();
  const language = useLanguage();
  const currency = useBaseCurrency();
  const { transactions } = useTransactions();
  const { savingsGoals } = useGoals();
  const { state } = usePredictiveState();
  const [dismissed, setDismissed] = useState(false);

  const engineTxns = useMemo(() => mapToEngineTransactions(transactions), [transactions]);

  const report = useMemo(() => {
    if (!state || state.cycle.mode !== 'payday') return null;
    const current = state.cycle;
    const ended = getCycleRange({
      mode: 'payday',
      anchorDay: state.salary.paydayDayOfMonth,
      now: addDays(current.start, -1),
    });
    const before = getCycleRange({
      mode: 'payday',
      anchorDay: state.salary.paydayDayOfMonth,
      now: addDays(ended.start, -1),
    });
    return buildCycleReportCard({
      transactions: engineTxns,
      endedCycle: { start: ended.start, endExclusive: current.start },
      previousCycle: { start: before.start, endExclusive: ended.start },
    });
  }, [state, engineTxns]);

  const topGoal = useMemo(
    () => savingsGoals.find((g) => g.status === 'active' && g.deadline) ?? null,
    [savingsGoals],
  );
  const suggestion = useMemo(() => {
    if (!report || report.saved <= 0) return null;
    const fallback = round5(report.saved * 0.2);
    if (!topGoal) return fallback;
    const risk = estimateGoalRisk({
      targetBase: topGoal.targetAmount,
      currentBase: topGoal.currentAmount,
      deadline: topGoal.deadline,
      monthlySavingsSamples: monthlyNetSavingsSamples(engineTxns),
      seed: seedFromId(topGoal.id),
    });
    return risk && risk.requiredExtraMonthlyFor90 > 0
      ? round5(risk.requiredExtraMonthlyFor90)
      : fallback;
  }, [report, topGoal, engineTxns]);

  if (!AI_FEATURES.paydayRitual || !state || !report || dismissed) return null;
  if (state.cycle.mode !== 'payday' || state.salary.source !== 'detected') return null;
  if (state.cycle.daysElapsed > 2) return null; // day 1-2 of the cycle = the payday moment
  if (typeof window !== 'undefined' && window.localStorage.getItem(stampKey(state.cycle.key)) === '1') {
    return null;
  }

  const isRTL = language === 'ar';
  const streak = state.behavior.budgetAdherenceStreak ?? 0;
  const fmt = (v: number) =>
    styledNum(intl.formatNumber(v, { style: 'currency', currency, maximumFractionDigits: 0 }));
  const catLabel = (id: string) => {
    const meta = DEFAULT_EXPENSE_CATEGORIES.find((c) => c.id === id);
    return meta ? (isRTL ? meta.nameAr : meta.name) : id;
  };
  const dismiss = () => {
    if (typeof window !== 'undefined') window.localStorage.setItem(stampKey(state.cycle.key), '1');
    setDismissed(true);
  };

  return (
    <div
      className="ds-card"
      style={{ marginBottom: 'var(--space-lg)', borderInlineStart: '4px solid var(--color-primary)', position: 'relative' }}
    >
      <button
        onClick={dismiss}
        aria-label={intl.formatMessage({ id: 'dashboard.ritual_dismiss', defaultMessage: 'Dismiss' })}
        style={{ position: 'absolute', insetInlineEnd: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
      >
        <X size={16} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <PartyPopper size={20} style={{ color: 'var(--color-accent-gold)' }} />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
          {intl.formatMessage({ id: 'dashboard.ritual_title', defaultMessage: 'Payday — last cycle’s report card' })}
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: '0.875rem' }}>
        <span>
          {report.saved >= 0
            ? intl.formatMessage(
                { id: 'dashboard.ritual_saved', defaultMessage: 'You ended the cycle {amount} ahead.' },
                { amount: fmt(report.saved) },
              )
            : intl.formatMessage(
                { id: 'dashboard.ritual_overspent', defaultMessage: 'The cycle closed {amount} short — this one starts fresh.' },
                { amount: fmt(Math.abs(report.saved)) },
              )}
        </span>
        {report.topWin && (
          <span style={{ color: 'var(--color-primary)' }}>
            {intl.formatMessage(
              { id: 'dashboard.ritual_win', defaultMessage: 'Top win: {category} down {amount}.' },
              { category: catLabel(report.topWin.categoryId), amount: fmt(Math.abs(report.topWin.delta)) },
            )}
          </span>
        )}
        {report.topLeak && (
          <span style={{ color: 'var(--color-accent-gold)' }}>
            {intl.formatMessage(
              { id: 'dashboard.ritual_leak', defaultMessage: 'Watch: {category} up {amount}.' },
              { category: catLabel(report.topLeak.categoryId), amount: fmt(report.topLeak.delta) },
            )}
          </span>
        )}
        {streak >= 2 && (
          <span>
            {intl.formatMessage(
              { id: 'dashboard.ritual_streak', defaultMessage: '{months, plural, one {# month} other {# months}} inside budget and counting.' },
              { months: streak },
            )}
          </span>
        )}
      </div>

      {suggestion && topGoal && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            {intl.formatMessage(
              { id: 'dashboard.ritual_pyf', defaultMessage: 'Pay yourself first: {amount} into “{goal}”?' },
              { amount: fmt(suggestion), goal: isRTL ? topGoal.nameAr || topGoal.name : topGoal.name },
            )}
          </span>
          <Link href="/goals" className="ds-btn ds-btn-primary" style={{ fontSize: '0.8rem' }} onClick={dismiss}>
            {intl.formatMessage({ id: 'dashboard.ritual_pyf_cta', defaultMessage: 'Set it aside' })}
          </Link>
        </div>
      )}
    </div>
  );
}

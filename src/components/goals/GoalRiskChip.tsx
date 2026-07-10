'use client';

/**
 * Goal risk chip — engine roadmap Phase 3, item 10 surfaced.
 *
 * "{p}% on track" per goal, from the Monte Carlo over the user's own
 * monthly net savings, plus the one actionable number when the odds
 * are short: the extra per month that lifts the goal to 90%. Renders
 * nothing without a deadline or enough history — a goal without a date
 * has no odds, and three data points are the floor of honesty.
 *
 * Ships dark behind AI_FEATURES.goalRiskCard.
 */

import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { AI_FEATURES } from '@/ai/config';
import {
  estimateGoalRisk,
  monthlyNetSavingsSamples,
  seedFromId,
} from '@/ai/deterministic/goalRisk';
import { mapToEngineTransactions } from '@/lib/predictive/inputs';
import { useTransactions } from '@/store/transactionStore';
import { useBaseCurrency } from '@/store/useStore';
import { useDisplayInBase } from '@/lib/fx/useDisplayInBase';
import type { SavingsGoal } from '@/store/goalsStore';
import { styledNum } from '@/components/StyledNumber';

export default function GoalRiskChip({ goal }: { goal: SavingsGoal }) {
  const intl = useIntl();
  const baseCurrency = useBaseCurrency();
  const { transactions } = useTransactions();

  // Goal targets live in currency_native; the engine speaks base only.
  const target = useDisplayInBase({
    amount: goal.targetAmount,
    fromCurrency: goal.currencyNative,
    toCurrency: baseCurrency,
  });
  const current = useDisplayInBase({
    amount: goal.currentAmount,
    fromCurrency: goal.currencyNative,
    toCurrency: baseCurrency,
  });

  const samples = useMemo(
    () => monthlyNetSavingsSamples(mapToEngineTransactions(transactions)),
    [transactions],
  );

  const risk = useMemo(() => {
    if (!AI_FEATURES.goalRiskCard || !goal.deadline || target.loading || current.loading) {
      return null;
    }
    return estimateGoalRisk({
      targetBase: target.amount,
      currentBase: current.amount,
      deadline: goal.deadline,
      monthlySavingsSamples: samples,
      seed: seedFromId(goal.id),
    });
  }, [goal.deadline, goal.id, target.loading, target.amount, current.loading, current.amount, samples]);

  if (!risk) return null;

  const pct = Math.round(risk.probability * 100);
  const band =
    pct >= 75 ? 'var(--color-primary)' : pct >= 40 ? 'var(--color-accent-gold)' : 'var(--ds-error, #DC2626)';

  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          alignSelf: 'flex-start',
          fontSize: '0.75rem',
          fontWeight: 700,
          padding: '2px 10px',
          borderRadius: 999,
          color: '#fff',
          background: band,
        }}
      >
        {intl.formatMessage(
          { id: 'dashboard.goals_risk_on_track', defaultMessage: '{percent}% on track' },
          { percent: styledNum(intl.formatNumber(pct)) },
        )}
      </span>
      {risk.requiredExtraMonthlyFor90 > 0 && (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
          {intl.formatMessage(
            {
              id: 'dashboard.goals_risk_boost',
              defaultMessage: 'Add {amount}/month to reach 90%',
            },
            {
              amount: styledNum(
                intl.formatNumber(risk.requiredExtraMonthlyFor90, {
                  style: 'currency',
                  currency: baseCurrency,
                  maximumFractionDigits: 0,
                }),
              ),
            },
          )}
        </span>
      )}
    </div>
  );
}

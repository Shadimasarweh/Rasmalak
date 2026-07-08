'use client';

/**
 * PredictiveProvider — the single seam between the pure engine and the app.
 *
 * Computes PredictiveState in a memo over the already-loaded stores (the
 * full transaction history lives client-side) and exposes:
 *   - usePredictiveState(): raw state + the prompt-safe summary
 *   - usePredictions(): feature-flag-gated slices for UI cards
 *
 * Null-safe by design: outside the provider (or before hydration) both
 * hooks return empty state instead of throwing, so marketing pages, tests,
 * and legacy flows never break.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AI_FEATURES } from '@/ai/config';
import {
  computePredictiveState,
  summarizeForContext,
  type PredictiveState,
  type PredictiveContextSummary,
} from '@/ai/deterministic/predictiveState';
import type { SalaryProfile } from '@/ai/deterministic/salaryProfile';
import type { CashflowForecast } from '@/ai/deterministic/cashflowForecast';
import type { SafeToSpendResult } from '@/ai/deterministic/safeToSpend';
import type { ArchetypeResult, ComputedBehaviorSignals } from '@/ai/deterministic/behaviorProfile';
import { useTransactions } from '@/store/transactionStore';
import { useGoals, getMonthlyFundingAmount } from '@/store/goalsStore';
import { useBudgetCycles } from '@/store/budgetCyclesStore';
import { useUser as useAuthUser } from '@/store/authStore';
import { fetchPredictiveProfileBits, mapToEngineTransactions, type PredictiveProfileBits } from './inputs';
import { reconcileDuePredictions, syncPredictiveState } from './service';

export interface PredictiveContextValue {
  status: 'idle' | 'ready';
  state: PredictiveState | null;
  // null until the engine has minimum history — consumers pass this to
  // buildUserContext verbatim.
  summary: PredictiveContextSummary | null;
  refresh: () => void;
}

const EMPTY: PredictiveContextValue = {
  status: 'idle',
  state: null,
  summary: null,
  refresh: () => {},
};

const PredictiveContext = createContext<PredictiveContextValue>(EMPTY);

export function PredictiveProvider({ children }: { children: ReactNode }) {
  const { transactions, getNetBalance } = useTransactions();
  const { savingsGoals } = useGoals();
  const { cycles } = useBudgetCycles();
  const userId = useAuthUser()?.id;

  const [profileBits, setProfileBits] = useState<PredictiveProfileBits | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    if (!userId) {
      setProfileBits(null);
      return;
    }
    let cancelled = false;
    fetchPredictiveProfileBits(userId).then((bits) => {
      if (!cancelled) setProfileBits(bits);
    });
    return () => { cancelled = true; };
  }, [userId, refreshCounter]);

  const refresh = useCallback(() => setRefreshCounter((c) => c + 1), []);

  const engineTxns = useMemo(() => mapToEngineTransactions(transactions), [transactions]);

  const value = useMemo<PredictiveContextValue>(() => {
    if (!AI_FEATURES.predictionsEnabled || engineTxns.length === 0) {
      return { ...EMPTY, refresh };
    }
    const state = computePredictiveState({
      transactions: engineTxns,
      currentBalance: getNetBalance(),
      profileFallback: profileBits?.fallback ?? { persona: null, monthlyIncome: null },
      paydayOverride: profileBits?.paydayOverride ?? null,
      plannedGoalContributionsMonthly: savingsGoals.reduce(
        (sum, goal) => sum + getMonthlyFundingAmount(goal),
        0,
      ),
      budgetHistory: cycles.map((c) => ({ monthYear: c.monthYear, monthlyBudget: c.monthlyBudget })),
    });
    return {
      status: 'ready',
      state,
      summary: state.meta.hasMinimumHistory ? summarizeForContext(state) : null,
      refresh,
    };
    // getNetBalance is a stable callback derived from transactions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineTxns, savingsGoals, cycles, profileBits, refresh]);

  // Persistence: reconcile past-horizon predictions once per session, then
  // sync series/baselines/ledger once per local day (re-forced when the
  // cycle rolls over or refresh() is called). The 3s debounce absorbs
  // realtime/refetch bursts; everything is fail-open.
  useEffect(() => {
    const state = value.state;
    if (!userId || !state || !state.meta.hasMinimumHistory) return;
    const timer = setTimeout(async () => {
      try {
        const sessionKey = `rasmalak:predictive:reconciled:${userId}`;
        if (typeof window !== 'undefined' && !window.sessionStorage.getItem(sessionKey)) {
          await reconcileDuePredictions(userId, engineTxns);
          window.sessionStorage.setItem(sessionKey, '1');
        }
        const dayKey = `rasmalak:predictive:syncDay:${userId}`;
        const today = new Date().toISOString().slice(0, 10);
        const stamp = `${today}|${state.cycle.key}|${refreshCounter}`;
        if (typeof window !== 'undefined' && window.localStorage.getItem(dayKey) !== stamp) {
          await syncPredictiveState(userId, state);
          window.localStorage.setItem(dayKey, stamp);
        }
      } catch (e) {
        console.warn('[predictive] persistence pass failed:', e instanceof Error ? e.message : e);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [userId, value.state, engineTxns, refreshCounter]);

  return <PredictiveContext.Provider value={value}>{children}</PredictiveContext.Provider>;
}

export function usePredictiveState(): PredictiveContextValue {
  return useContext(PredictiveContext);
}

// Flag-gated slices for the "Rasmalak يعرفك" UI cards (PR-6+). Each slice is
// null while its AI_FEATURES flag is off, so cards can render-guard on it.
export interface PredictionsView {
  ready: boolean;
  salaryProfile: SalaryProfile | null;
  safeToSpend: SafeToSpendResult | null;
  forecast: CashflowForecast | null;
  behavior: (ComputedBehaviorSignals & { archetype: ArchetypeResult }) | null;
}

export function usePredictions(): PredictionsView {
  const { state } = usePredictiveState();
  return useMemo(() => {
    if (!state || !state.meta.hasMinimumHistory) {
      return { ready: false, salaryProfile: null, safeToSpend: null, forecast: null, behavior: null };
    }
    return {
      ready: true,
      salaryProfile: AI_FEATURES.salaryDetectionUI ? state.salary : null,
      safeToSpend: AI_FEATURES.safeToSpendCard ? state.safeToSpend : null,
      forecast: AI_FEATURES.forecastCard ? state.forecast : null,
      behavior: AI_FEATURES.personalityCard
        ? { ...state.behavior, archetype: state.archetype }
        : null,
    };
  }, [state]);
}

'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useBudgetCycles } from '@/store/budgetCyclesStore';

/**
 * Legacy budget store — now an adapter over `useBudgetCycles`.
 *
 * Historically this held its own single-row copy of the budget in the
 * `budgets` table. That created a split-brain: the Plan page (and
 * onboarding) write to the month-stamped `budget_cycles` table
 * (migration 013), while the dashboard and other legacy consumers read
 * from here. Saved budgets therefore never showed up on the dashboard.
 *
 * To keep a single source of truth without touching every legacy
 * consumer, this provider now projects the current `budget_cycles` row
 * through the same `useBudget()` API. `BudgetCyclesProvider` must be
 * mounted above `BudgetProvider` (see the dashboard layout).
 */

interface BudgetStore {
  monthlyBudget: number;
  categoryBudgets: Record<string, number>;
  // ISO 4217 currency the caps were typed in. Mirrors the current
  // cycle's `currency_native`; display layers convert to base on read.
  currencyNative: string;
  setMonthlyBudget: (amount: number) => void;
  setCategoryBudget: (category: string, limit: number) => void;
  removeCategoryBudget: (category: string) => void;
  saveAll: (monthly: number, categories: Record<string, number>) => void;
}

const BudgetContext = createContext<BudgetStore | null>(null);

export function BudgetProvider({ children }: { children: ReactNode }) {
  const cycles = useBudgetCycles();
  const current = cycles.currentCycle;

  const store: BudgetStore = {
    monthlyBudget: current?.monthlyBudget ?? 0,
    categoryBudgets: current?.categoryBudgets ?? {},
    currencyNative: current?.currencyNative ?? '',
    setMonthlyBudget: (amount) => {
      void cycles.setMonthlyBudget(amount);
    },
    setCategoryBudget: (category, limit) => {
      void cycles.setCategoryBudget(category, limit);
    },
    removeCategoryBudget: (category) => {
      void cycles.removeCategoryBudget(category);
    },
    saveAll: (monthly, categories) => {
      void cycles.saveCurrentCycle(monthly, categories);
    },
  };

  return (
    <BudgetContext.Provider value={store}>{children}</BudgetContext.Provider>
  );
}

export function useBudget(): BudgetStore {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
}

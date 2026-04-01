'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore, getAuthState } from '@/store/authStore';

interface BudgetStore {
  monthlyBudget: number;
  categoryBudgets: Record<string, number>;
  setMonthlyBudget: (amount: number) => void;
  setCategoryBudget: (category: string, limit: number) => void;
  removeCategoryBudget: (category: string) => void;
  saveAll: (monthly: number, categories: Record<string, number>) => void;
}

const BudgetContext = createContext<BudgetStore | null>(null);

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [monthlyBudget, setMonthlyBudgetLocal] = useState(0);
  const [categoryBudgets, setCategoryBudgetsLocal] = useState<Record<string, number>>({});

  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);

  // Fetch budget from Supabase
  useEffect(() => {
    const fetchBudget = async () => {
      if (!initialized || !user) {
        setMonthlyBudgetLocal(0);
        setCategoryBudgetsLocal({});
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setMonthlyBudgetLocal(0);
        setCategoryBudgetsLocal({});
        return;
      }

      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', sessionData.session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is fine for new users
        console.error('[BudgetStore] Error fetching budget:', error.message);
        return;
      }

      if (data) {
        setMonthlyBudgetLocal(Number(data.monthly_budget) || 0);
        setCategoryBudgetsLocal(
          (data.category_budgets as Record<string, number>) ?? {},
        );
      }
    };

    fetchBudget();
  }, [user, initialized]);

  const upsertBudget = useCallback(
    async (monthly: number, categories: Record<string, number>) => {
      const { user, initialized } = getAuthState();
      if (!initialized || !user) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id || user.id;

      const { error } = await supabase.from('budgets').upsert(
        {
          user_id: userId,
          monthly_budget: monthly,
          category_budgets: categories,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

      if (error) {
        console.error('[BudgetStore] Error upserting budget:', error.message);
      }
    },
    [],
  );

  const setMonthlyBudget = useCallback(
    (amount: number) => {
      if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) return;
      setMonthlyBudgetLocal(amount);
      setCategoryBudgetsLocal((prev) => {
        upsertBudget(amount, prev);
        return prev;
      });
    },
    [upsertBudget],
  );

  const setCategoryBudget = useCallback(
    (category: string, limit: number) => {
      if (!Number.isFinite(limit) || limit < 0 || limit > 1_000_000_000) return;
      setCategoryBudgetsLocal((prev) => {
        const next = { ...prev, [category]: limit };
        setMonthlyBudgetLocal((m) => {
          upsertBudget(m, next);
          return m;
        });
        return next;
      });
    },
    [upsertBudget],
  );

  const removeCategoryBudget = useCallback(
    (category: string) => {
      setCategoryBudgetsLocal((prev) => {
        const { [category]: _, ...rest } = prev;
        setMonthlyBudgetLocal((m) => {
          upsertBudget(m, rest);
          return m;
        });
        return rest;
      });
    },
    [upsertBudget],
  );

  const saveAll = useCallback(
    (monthly: number, categories: Record<string, number>) => {
      if (!Number.isFinite(monthly) || monthly < 0) return;
      setMonthlyBudgetLocal(monthly);
      setCategoryBudgetsLocal(categories);
      upsertBudget(monthly, categories);
    },
    [upsertBudget],
  );

  const store: BudgetStore = {
    monthlyBudget,
    categoryBudgets,
    setMonthlyBudget,
    setCategoryBudget,
    removeCategoryBudget,
    saveAll,
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

'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
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

  const monthlyRef = useRef(0);
  const categoriesRef = useRef<Record<string, number>>({});

  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);

  useEffect(() => {
    const fetchBudget = async () => {
      if (!initialized || !user) {
        setMonthlyBudgetLocal(0);
        setCategoryBudgetsLocal({});
        monthlyRef.current = 0;
        categoriesRef.current = {};
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.warn('[BudgetStore] No active session, skipping fetch');
        return;
      }

      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', sessionData.session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[BudgetStore] Error fetching budget:', error.message, error.code);
        return;
      }

      if (data) {
        const m = Number(data.monthly_budget) || 0;
        const c = (data.category_budgets as Record<string, number>) ?? {};
        setMonthlyBudgetLocal(m);
        setCategoryBudgetsLocal(c);
        monthlyRef.current = m;
        categoriesRef.current = c;
      }
    };

    fetchBudget();
  }, [user, initialized]);

  const upsertBudget = useCallback(
    async (monthly: number, categories: Record<string, number>): Promise<boolean> => {
      const { user, initialized } = getAuthState();
      if (!initialized || !user) {
        console.warn('[BudgetStore] Cannot save: auth not ready');
        return false;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.error('[BudgetStore] Cannot save: no active session');
        return false;
      }

      const userId = sessionData.session.user.id;

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
        console.error('[BudgetStore] Error saving budget:', error.message, error.code, error.details);
        return false;
      }

      return true;
    },
    [],
  );

  const setMonthlyBudget = useCallback(
    (amount: number) => {
      if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) return;
      setMonthlyBudgetLocal(amount);
      monthlyRef.current = amount;
      upsertBudget(amount, categoriesRef.current);
    },
    [upsertBudget],
  );

  const setCategoryBudget = useCallback(
    (category: string, limit: number) => {
      if (!Number.isFinite(limit) || limit < 0 || limit > 1_000_000_000) return;
      const next = { ...categoriesRef.current, [category]: limit };
      setCategoryBudgetsLocal(next);
      categoriesRef.current = next;
      upsertBudget(monthlyRef.current, next);
    },
    [upsertBudget],
  );

  const removeCategoryBudget = useCallback(
    (category: string) => {
      const { [category]: _, ...rest } = categoriesRef.current;
      setCategoryBudgetsLocal(rest);
      categoriesRef.current = rest;
      upsertBudget(monthlyRef.current, rest);
    },
    [upsertBudget],
  );

  const saveAll = useCallback(
    (monthly: number, categories: Record<string, number>) => {
      if (!Number.isFinite(monthly) || monthly < 0) return;
      setMonthlyBudgetLocal(monthly);
      setCategoryBudgetsLocal(categories);
      monthlyRef.current = monthly;
      categoriesRef.current = categories;
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

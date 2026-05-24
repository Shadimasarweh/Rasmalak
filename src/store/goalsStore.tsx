'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore, getAuthState } from '@/store/authStore';
import { useStore } from '@/store/useStore';

export type FundingType = 'none' | 'fixed' | 'percentage';

export interface SavingsGoal {
  id: string;
  name: string;
  nameAr: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  color: string;
  fundingType: FundingType;
  fundingValue: number;
  // ISO 4217 currency the user typed the target in. Display layer
  // converts to base when comparing against transactions.
  currencyNative: string;
}

export function getMonthlyFundingAmount(goal: SavingsGoal): number {
  switch (goal.fundingType) {
    case 'fixed':
      return goal.fundingValue;
    case 'percentage':
      return (goal.fundingValue / 100) * goal.targetAmount;
    default:
      return 0;
  }
}

export function goalFundingCategoryId(goalId: string): string {
  return `goal-funding-${goalId}`;
}

interface GoalsStore {
  savingsGoals: SavingsGoal[];
  // currencyNative is optional on input — defaults to the user's
  // current base currency at write time.
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'currencyNative'> & { currencyNative?: string }) => void;
  updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => void;
  deleteSavingsGoal: (id: string) => void;
}

const GoalsContext = createContext<GoalsStore | null>(null);

export function GoalsProvider({ children }: { children: ReactNode }) {
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);

  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const baseCurrency = useStore((s) => s.baseCurrency);

  // Fetch goals from Supabase
  useEffect(() => {
    const fetchGoals = async () => {
      if (!initialized || !user) {
        setSavingsGoals([]);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setSavingsGoals([]);
        return;
      }

      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', sessionData.session.user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[GoalsStore] Error fetching goals:', error.message);
        return;
      }

      if (data) {
        const mapped: SavingsGoal[] = data.map((row) => ({
          id: row.id,
          name: row.name,
          nameAr: row.name_ar,
          targetAmount: Number(row.target_amount),
          currentAmount: Number(row.current_amount),
          deadline: row.deadline ?? undefined,
          color: row.color,
          fundingType: (row.funding_type as FundingType) || 'none',
          fundingValue: Number(row.funding_value) || 0,
          currencyNative: (row.currency_native as string | undefined) ?? baseCurrency,
        }));
        setSavingsGoals(mapped);
      }
    };

    fetchGoals();
  }, [user, initialized, baseCurrency]);

  const addSavingsGoal = useCallback(async (
    goal: Omit<SavingsGoal, 'id' | 'currencyNative'> & { currencyNative?: string },
  ) => {
    const { user, initialized } = getAuthState();
    if (!initialized || !user) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id || user.id;

    const currencyToWrite = goal.currencyNative || baseCurrency;
    const { data, error } = await supabase
      .from('savings_goals')
      .insert({
        user_id: userId,
        name: goal.name,
        name_ar: goal.nameAr,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount,
        deadline: goal.deadline || null,
        color: goal.color,
        funding_type: goal.fundingType || 'none',
        funding_value: goal.fundingValue || 0,
        currency_native: currencyToWrite,
      })
      .select()
      .single();

    if (error) {
      console.error('[GoalsStore] Error adding goal:', error.message);
      return;
    }

    if (data) {
      const newGoal: SavingsGoal = {
        id: data.id,
        name: data.name,
        nameAr: data.name_ar,
        targetAmount: Number(data.target_amount),
        currentAmount: Number(data.current_amount),
        deadline: data.deadline ?? undefined,
        color: data.color,
        fundingType: (data.funding_type as FundingType) || 'none',
        fundingValue: Number(data.funding_value) || 0,
        currencyNative: (data.currency_native as string | undefined) ?? currencyToWrite,
      };
      setSavingsGoals((prev) => [...prev, newGoal]);
    }
  }, [baseCurrency]);

  const updateSavingsGoal = useCallback(
    async (id: string, updates: Partial<SavingsGoal>) => {
      const { user, initialized } = getAuthState();
      if (!initialized || !user) return;

      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.nameAr !== undefined) dbUpdates.name_ar = updates.nameAr;
      if (updates.targetAmount !== undefined) dbUpdates.target_amount = updates.targetAmount;
      if (updates.currentAmount !== undefined) dbUpdates.current_amount = updates.currentAmount;
      if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline || null;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.fundingType !== undefined) dbUpdates.funding_type = updates.fundingType;
      if (updates.fundingValue !== undefined) dbUpdates.funding_value = updates.fundingValue;

      const { error } = await supabase
        .from('savings_goals')
        .update(dbUpdates)
        .eq('id', id);

      if (error) {
        console.error('[GoalsStore] Error updating goal:', error.message);
        return;
      }

      setSavingsGoals((prev) =>
        prev.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      );
    },
    [],
  );

  const deleteSavingsGoal = useCallback(async (id: string) => {
    const { user, initialized } = getAuthState();
    if (!initialized || !user) return;

    const { error } = await supabase
      .from('savings_goals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[GoalsStore] Error deleting goal:', error.message);
      return;
    }

    setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const store: GoalsStore = {
    savingsGoals,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
  };

  return (
    <GoalsContext.Provider value={store}>{children}</GoalsContext.Provider>
  );
}

export function useGoals(): GoalsStore {
  const context = useContext(GoalsContext);
  if (!context) {
    throw new Error('useGoals must be used within a GoalsProvider');
  }
  return context;
}

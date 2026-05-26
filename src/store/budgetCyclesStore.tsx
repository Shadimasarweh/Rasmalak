'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore, getAuthState } from '@/store/authStore';
import { useStore } from '@/store/useStore';

/**
 * Budget Cycles Store
 * ====================
 * Month-stamped budgets per migration 013. Each (user_id,
 * month_year) is a separate row so the user has true history and
 * "auto-renew at the start of the month" can lazy-create a fresh
 * cycle without losing the previous one.
 *
 * The legacy single-row `budgets` table is still around during the
 * transition; this store ignores it and reads/writes `budget_cycles`
 * exclusively. Old code paths that still use `useBudget()` keep
 * working because migration 013 backfilled the current month's row
 * from the legacy table.
 *
 * Lazy-create rule: when the user first hits the Plan page in a new
 * month and the cron hasn't run yet (or this is the user's first
 * ever month), the store creates the new cycle by copying the
 * previous month's caps. This is the safety net for users not
 * online when the server-side cron fires.
 */

export interface BudgetCycle {
  id: string;
  monthYear: string;          // 'YYYY-MM'
  monthlyBudget: number;
  categoryBudgets: Record<string, number>;
  currencyNative: string;
  createdAt: string;
  updatedAt: string;
}

interface BudgetCyclesStore {
  /** All cycles for the user, newest month first. */
  cycles: BudgetCycle[];
  /** The cycle for the current calendar month, lazy-created on mount. */
  currentCycle: BudgetCycle | null;
  loading: boolean;
  /** Update the current cycle's monthly cap. */
  setMonthlyBudget: (amount: number) => Promise<void>;
  /** Update one category cap on the current cycle. */
  setCategoryBudget: (category: string, limit: number) => Promise<void>;
  removeCategoryBudget: (category: string) => Promise<void>;
  /** Save monthly + categories together (used by the Plan page Save button). */
  saveCurrentCycle: (monthly: number, categories: Record<string, number>) => Promise<void>;
}

const BudgetCyclesContext = createContext<BudgetCyclesStore | null>(null);

function currentMonthYear(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function previousMonthYear(now: Date = new Date()): string {
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return currentMonthYear(prev);
}

function mapRow(row: Record<string, unknown>): BudgetCycle {
  return {
    id: row.id as string,
    monthYear: row.month_year as string,
    monthlyBudget: Number(row.monthly_budget) || 0,
    categoryBudgets: (row.category_budgets as Record<string, number>) ?? {},
    currencyNative: (row.currency_native as string | undefined) ?? 'SAR',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function BudgetCyclesProvider({ children }: { children: ReactNode }) {
  const [cycles, setCycles] = useState<BudgetCycle[]>([]);
  const [loading, setLoading] = useState(true);
  // Ref mirror of `cycles` so the upsert callback can read the
  // latest snapshot without listing it as a dependency (which would
  // recreate the callback on every state change). Updated inside
  // an effect so we don't write to the ref during render.
  const cyclesRef = useRef<BudgetCycle[]>([]);
  useEffect(() => {
    cyclesRef.current = cycles;
  }, [cycles]);

  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const baseCurrency = useStore((s) => s.baseCurrency);

  const monthYear = currentMonthYear();
  const prevMonthYear = previousMonthYear();

  useEffect(() => {
    const fetchCycles = async () => {
      if (!initialized || !user) {
        setCycles([]);
        setLoading(false);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setCycles([]);
        setLoading(false);
        return;
      }
      const uid = sessionData.session.user.id;

      const { data, error } = await supabase
        .from('budget_cycles')
        .select('*')
        .eq('user_id', uid)
        .order('month_year', { ascending: false });

      if (error) {
        console.error('[BudgetCycles] fetch failed:', error.message);
        setLoading(false);
        return;
      }

      const list = (data ?? []).map(mapRow);

      // Lazy-create the current month's row when missing. We copy the
      // previous month's caps when available, otherwise start blank.
      if (!list.some((c) => c.monthYear === monthYear)) {
        const prev = list.find((c) => c.monthYear === prevMonthYear);
        const seed = {
          user_id: uid,
          month_year: monthYear,
          monthly_budget: prev?.monthlyBudget ?? 0,
          category_budgets: prev?.categoryBudgets ?? {},
          currency_native: prev?.currencyNative ?? baseCurrency,
        };
        const { data: inserted, error: insertErr } = await supabase
          .from('budget_cycles')
          .upsert(seed, { onConflict: 'user_id,month_year' })
          .select()
          .single();
        if (insertErr) {
          console.error('[BudgetCycles] lazy-create failed:', insertErr.message);
        } else if (inserted) {
          list.unshift(mapRow(inserted));
        }
      }

      setCycles(list);
      setLoading(false);
    };
    fetchCycles();
  }, [user, initialized, baseCurrency, monthYear, prevMonthYear]);

  const currentCycle = useMemo(
    () => cycles.find((c) => c.monthYear === monthYear) ?? null,
    [cycles, monthYear],
  );

  const upsert = useCallback(
    async (
      monthly: number,
      categories: Record<string, number>,
    ): Promise<BudgetCycle | null> => {
      const { user, initialized } = getAuthState();
      if (!initialized || !user) return null;
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id || user.id;

      const existing = cyclesRef.current.find((c) => c.monthYear === monthYear);
      const currencyToWrite = existing?.currencyNative || baseCurrency;

      const { data, error } = await supabase
        .from('budget_cycles')
        .upsert(
          {
            user_id: uid,
            month_year: monthYear,
            monthly_budget: monthly,
            category_budgets: categories,
            currency_native: currencyToWrite,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,month_year' },
        )
        .select()
        .single();

      if (error || !data) {
        console.error('[BudgetCycles] upsert failed:', error?.message);
        return null;
      }
      const next = mapRow(data);
      setCycles((prev) => {
        const without = prev.filter((c) => c.monthYear !== next.monthYear);
        return [next, ...without].sort((a, b) => b.monthYear.localeCompare(a.monthYear));
      });
      return next;
    },
    [baseCurrency, monthYear],
  );

  const setMonthlyBudget = useCallback(
    async (amount: number) => {
      if (!Number.isFinite(amount) || amount < 0) return;
      const c = cyclesRef.current.find((x) => x.monthYear === monthYear);
      await upsert(amount, c?.categoryBudgets ?? {});
    },
    [monthYear, upsert],
  );

  const setCategoryBudget = useCallback(
    async (category: string, limit: number) => {
      if (!Number.isFinite(limit) || limit < 0) return;
      const c = cyclesRef.current.find((x) => x.monthYear === monthYear);
      const next = { ...(c?.categoryBudgets ?? {}), [category]: limit };
      await upsert(c?.monthlyBudget ?? 0, next);
    },
    [monthYear, upsert],
  );

  const removeCategoryBudget = useCallback(
    async (category: string) => {
      const c = cyclesRef.current.find((x) => x.monthYear === monthYear);
      const next = { ...(c?.categoryBudgets ?? {}) };
      delete next[category];
      await upsert(c?.monthlyBudget ?? 0, next);
    },
    [monthYear, upsert],
  );

  const saveCurrentCycle = useCallback(
    async (monthly: number, categories: Record<string, number>) => {
      await upsert(monthly, categories);
    },
    [upsert],
  );

  const store: BudgetCyclesStore = {
    cycles,
    currentCycle,
    loading,
    setMonthlyBudget,
    setCategoryBudget,
    removeCategoryBudget,
    saveCurrentCycle,
  };

  return (
    <BudgetCyclesContext.Provider value={store}>
      {children}
    </BudgetCyclesContext.Provider>
  );
}

export function useBudgetCycles(): BudgetCyclesStore {
  const ctx = useContext(BudgetCyclesContext);
  if (!ctx) throw new Error('useBudgetCycles must be used within BudgetCyclesProvider');
  return ctx;
}

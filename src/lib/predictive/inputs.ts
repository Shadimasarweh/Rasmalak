/**
 * Input mapping for the predictive engine.
 *
 * The deterministic layer consumes plain EngineTransaction data — this is
 * the only place that knows how to produce it from the store's Transaction
 * shape and the Supabase profile.
 */

import { supabase } from '@/lib/supabaseClient';
import type { EngineTransaction } from '@/ai/deterministic/engineTypes';
import type { ProfileFallback } from '@/ai/deterministic/salaryProfile';

// Structural subset of src/store/transactionStore.tsx's Transaction —
// declared locally so this module never imports React code.
export interface StoreTransactionLike {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string | null;
  description?: string;
  subcategory?: string | null;
  amountBase: number;
  isRecurring?: boolean;
  recurringEndDate?: string | null;
}

export function mapToEngineTransactions(txns: StoreTransactionLike[]): EngineTransaction[] {
  return txns.map((t) => ({
    id: t.id,
    date: t.date,
    type: t.type,
    category: t.category,
    subcategory: t.subcategory ?? null,
    description: t.description,
    amountBase: t.amountBase,
    isRecurring: t.isRecurring,
    recurringEndDate: t.recurringEndDate ?? null,
  }));
}

export interface PredictiveProfileBits {
  fallback: ProfileFallback;
  // profiles.payday_day_of_month — the user's explicit setting; wins over
  // detection everywhere in the engine.
  paydayOverride: number | null;
  // profiles.country (migration 012) — feeds the cold-start regional
  // priors (countryPriors.ts) for thin-history users.
  countryCode: string | null;
}

const EMPTY_BITS: PredictiveProfileBits = {
  fallback: { persona: null, monthlyIncome: null },
  paydayOverride: null,
  countryCode: null,
};

// persona + monthly_income exist since migration 014; payday_day_of_month
// arrives with 015 — the legacy retry keeps pre-migration deploys working.
export async function fetchPredictiveProfileBits(userId: string): Promise<PredictiveProfileBits> {
  try {
    let { data, error } = await supabase
      .from('profiles')
      .select('persona, monthly_income, country, payday_day_of_month')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      // country predates 014 (migration 012), so it stays in the legacy
      // retry alongside the 014 columns.
      ({ data, error } = await supabase
        .from('profiles')
        .select('persona, monthly_income, country')
        .eq('id', userId)
        .maybeSingle());
    }
    if (error || !data) return EMPTY_BITS;
    const row = data as Record<string, unknown>;
    const persona = row.persona as ProfileFallback['persona'];
    const income = row.monthly_income == null ? null : Number(row.monthly_income);
    const payday = row.payday_day_of_month == null ? null : Number(row.payday_day_of_month);
    return {
      fallback: {
        persona: persona === 'salaried' || persona === 'variable' || persona === 'student' ? persona : null,
        monthlyIncome: Number.isFinite(income as number) ? income : null,
      },
      paydayOverride: Number.isFinite(payday as number) ? payday : null,
      countryCode: typeof row.country === 'string' && row.country ? row.country : null,
    };
  } catch {
    return EMPTY_BITS;
  }
}

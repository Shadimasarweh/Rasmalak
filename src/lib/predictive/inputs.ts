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
  // profiles.payday_day_of_month — selected only once migration 015 is
  // applied (see PR-7); until then the override is always null.
  paydayOverride: number | null;
}

// persona + monthly_income exist since migration 014 (onboarding fields).
export async function fetchPredictiveProfileBits(userId: string): Promise<PredictiveProfileBits> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('persona, monthly_income')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) {
      return { fallback: { persona: null, monthlyIncome: null }, paydayOverride: null };
    }
    const persona = data.persona as ProfileFallback['persona'];
    const income = data.monthly_income == null ? null : Number(data.monthly_income);
    return {
      fallback: {
        persona: persona === 'salaried' || persona === 'variable' || persona === 'student' ? persona : null,
        monthlyIncome: Number.isFinite(income as number) ? income : null,
      },
      paydayOverride: null,
    };
  } catch {
    return { fallback: { persona: null, monthlyIncome: null }, paydayOverride: null };
  }
}

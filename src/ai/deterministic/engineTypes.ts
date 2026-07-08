/**
 * Shared contracts for the predictive engine (deterministic layer).
 *
 * The engine consumes a structural subset of the store's Transaction so the
 * pure-math modules never import React or Supabase code. Mapping from the
 * store type happens in src/lib/predictive/inputs.ts.
 */

import type { CycleRange } from '@/lib/cycles';

export type { CycleRange };

// Stamped into every persisted row so a future server-side job can
// distinguish (and supersede) client-computed results without schema change.
export const PREDICTIVE_ENGINE_VERSION = '1.0.0-p1';

export interface EngineTransaction {
  id: string;
  date: string; // ISO
  type: 'income' | 'expense';
  category: string | null;
  subcategory?: string | null;
  description?: string;
  // Base-currency value locked at entry — the ONLY monetary field the engine
  // ever sums (currency architecture rule, CLAUDE.md §8).
  amountBase: number;
  isRecurring?: boolean;
  recurringEndDate?: string | null;
}

// Goal-funding transfers are internal moves, not consumption: excluded from
// both discretionary and committed spend, and accounted for via planned goal
// contributions in safe-to-spend instead. Matches goalFundingCategoryId in
// src/store/goalsStore.tsx.
export const GOAL_FUNDING_PREFIX = 'goal-funding-';

export function isGoalFunding(category: string | null | undefined): boolean {
  return !!category && category.startsWith(GOAL_FUNDING_PREFIX);
}

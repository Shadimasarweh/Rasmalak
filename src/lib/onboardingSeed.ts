/**
 * Provider-free seed helpers used by the onboarding wizard.
 *
 * The dashboard layout wraps every page in stores like
 * `EmergencyFundProvider` and `BudgetCyclesProvider`, but the
 * onboarding page lives at `/onboarding` (root level) — outside
 * the dashboard tree. Calling `useEmergencyFund()` or
 * `useBudgetCycles()` from there throws synchronously because
 * the matching context isn't mounted, which trips the global
 * error boundary the moment a fresh signup lands on Step 1.
 *
 * These helpers do the same Supabase writes the providers do,
 * but as pure async functions with no React context coupling.
 * The dashboard refetches on its own once the user lands there,
 * so we don't need to update any in-memory store from here.
 */

import { supabase } from '@/lib/supabaseClient';

/**
 * Insert a fresh emergency fund row for the user. Mirrors
 * `useEmergencyFund().createFund` but doesn't require the
 * provider to be mounted.
 */
export async function seedEmergencyFund(args: {
  userId: string;
  targetAmount: number;
  baseCurrency: string;
}): Promise<boolean> {
  const { userId, targetAmount, baseCurrency } = args;
  if (!userId || !Number.isFinite(targetAmount) || targetAmount <= 0) return false;
  const { error } = await supabase
    .from('emergency_funds')
    .insert({
      user_id: userId,
      target_amount: targetAmount,
      current_amount: 0,
      currency_native: baseCurrency,
    });
  if (error) {
    console.error('[onboardingSeed] seedEmergencyFund failed:', error.message);
    return false;
  }
  return true;
}

/**
 * Upsert the current month's budget cycle row. Mirrors
 * `useBudgetCycles().saveCurrentCycle` but provider-free.
 */
export async function seedCurrentBudgetCycle(args: {
  userId: string;
  monthly: number;
  categoryBudgets?: Record<string, number>;
  baseCurrency: string;
  now?: Date;
}): Promise<boolean> {
  const { userId, monthly, categoryBudgets = {}, baseCurrency, now = new Date() } = args;
  if (!userId) return false;
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const { error } = await supabase
    .from('budget_cycles')
    .upsert(
      {
        user_id: userId,
        month_year: monthYear,
        monthly_budget: monthly,
        category_budgets: categoryBudgets,
        currency_native: baseCurrency,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,month_year' },
    );
  if (error) {
    console.error('[onboardingSeed] seedCurrentBudgetCycle failed:', error.message);
    return false;
  }
  return true;
}

import { supabase } from '@/lib/supabaseClient';
import { getCurrencyForCountry } from '@/lib/countries';

/**
 * Helpers around the `profiles` table introduced in migration 012.
 *
 * Profile data:
 *   - `country` is set once (at onboarding) and is treated as
 *     immutable by this app. The settings UI does not expose a way
 *     to change it.
 *   - `base_currency` is freely editable from Settings. Its initial
 *     value is derived from `country` via `getCurrencyForCountry`.
 *
 * All other layers should call these helpers rather than touching
 * the `profiles` table directly so the country/base-currency
 * invariants stay consistent.
 */

export interface UserProfile {
  id: string;
  country: string | null;
  baseCurrency: string;
  // Migration 015 (payday cycles) — null/'calendar' until the user opts in.
  paydayDayOfMonth: number | null;
  budgetCycleMode: 'calendar' | 'payday';
  paydaySource: 'detected' | 'manual' | null;
}

const PROFILE_COLUMNS = 'id, country, base_currency, payday_day_of_month, budget_cycle_mode, payday_source';
const LEGACY_PROFILE_COLUMNS = 'id, country, base_currency';

export async function getProfile(userId: string): Promise<UserProfile | null> {
  let { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    // Deploy-skew safety: if migration 015 hasn't been applied yet,
    // PostgREST rejects the unknown columns — fall back to the legacy
    // select so currency bootstrap keeps working.
    ({ data, error } = await supabase
      .from('profiles')
      .select(LEGACY_PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle());
  }
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    country: (row.country as string | null) ?? null,
    baseCurrency: row.base_currency as string,
    paydayDayOfMonth: row.payday_day_of_month == null ? null : Number(row.payday_day_of_month),
    budgetCycleMode: row.budget_cycle_mode === 'payday' ? 'payday' : 'calendar',
    paydaySource:
      row.payday_source === 'detected' || row.payday_source === 'manual'
        ? row.payday_source
        : null,
  };
}

/**
 * Persist the A2 budget-cycle preference (settings Save / payday nudge).
 * No-ops gracefully when migration 015 hasn't been applied yet.
 */
export async function updateCyclePrefs(
  userId: string,
  prefs: {
    mode: 'calendar' | 'payday';
    day: number | null;
    source: 'detected' | 'manual' | null;
  },
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({
      budget_cycle_mode: prefs.mode,
      payday_day_of_month: prefs.day,
      payday_source: prefs.source,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) {
    console.warn('[profile] updateCyclePrefs failed (migration 015 applied?):', error.message);
    return false;
  }
  return true;
}

/**
 * Onboarding writes both fields at once. For the dashboard bootstrap
 * path (existing users who never went through the new onboarding)
 * `country` may be empty; in that case we only write `base_currency`
 * and leave `country` null.
 */
export async function initializeProfile(
  userId: string,
  country: string,
  fallbackBaseCurrency = 'SAR',
): Promise<UserProfile | null> {
  const baseCurrency = country
    ? getCurrencyForCountry(country)
    : fallbackBaseCurrency;
  const payload: Record<string, unknown> = {
    id: userId,
    base_currency: baseCurrency,
    updated_at: new Date().toISOString(),
  };
  if (country) payload.country = country;
  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
  if (error || !data) {
    console.error('[profile] initializeProfile failed:', error?.message);
    return null;
  }
  return {
    id: data.id,
    country: data.country,
    baseCurrency: data.base_currency,
    paydayDayOfMonth: null,
    budgetCycleMode: 'calendar',
    paydaySource: null,
  };
}

/**
 * Persist a base-currency change requested from Settings. Note that
 * the recalc API route ALSO writes this field once recalc completes.
 * This client-side write is for the optimistic UI path; if you hit
 * /api/fx/recalc, it overwrites this with the same value once the
 * job finishes.
 */
export async function setBaseCurrency(
  userId: string,
  baseCurrency: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ base_currency: baseCurrency, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) {
    console.error('[profile] setBaseCurrency failed:', error.message);
    return false;
  }
  return true;
}

/**
 * Persist the four onboarding-capture fields added in migration 014
 * (`primary_focuses`, `persona`, `monthly_income`, `expense_preset`)
 * along with country / base_currency in a single upsert. Called on
 * the final step of the onboarding wizard.
 *
 * `monthlyIncome` may be null when the user skipped or entered an
 * invalid number; the column is nullable so we just write through.
 */
export interface OnboardingPayload {
  country: string;
  primaryFocuses: string[];
  persona: 'salaried' | 'variable' | 'student';
  monthlyIncome: number | null;
  expensePreset: 'lean' | 'average' | 'heavy';
}

export async function saveOnboarding(
  userId: string,
  payload: OnboardingPayload,
): Promise<UserProfile | null> {
  const baseCurrency = getCurrencyForCountry(payload.country);
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        country: payload.country,
        base_currency: baseCurrency,
        primary_focuses: payload.primaryFocuses,
        persona: payload.persona,
        monthly_income: payload.monthlyIncome,
        expense_preset: payload.expensePreset,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select()
    .single();
  if (error || !data) {
    console.error('[profile] saveOnboarding failed:', error?.message);
    return null;
  }
  return {
    id: data.id,
    country: data.country,
    baseCurrency: data.base_currency,
    paydayDayOfMonth: null,
    budgetCycleMode: 'calendar',
    paydaySource: null,
  };
}

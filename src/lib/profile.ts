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
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, country, base_currency')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    country: data.country,
    baseCurrency: data.base_currency,
  };
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
  };
}

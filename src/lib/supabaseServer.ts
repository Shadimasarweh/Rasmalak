import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client.
 *
 * Used by API routes that need to read/write tables independent of
 * a logged-in user (e.g. the FX rate cache, which is a global
 * read-only resource for clients but written by the cron route).
 *
 * Falls back to the anon key when SUPABASE_SERVICE_ROLE_KEY is not
 * configured. In that mode RLS still applies, which is fine for
 * fx_rates because the table has a public read policy and writes
 * go through routes that pass user context anyway.
 */
let cachedClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;
  if (!key) {
    throw new Error('No Supabase key configured (SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  }

  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

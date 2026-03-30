import { createClient } from '@supabase/supabase-js';

// SEC-019: Session tokens are stored in localStorage, which is XSS-accessible.
// TODO: Migrate to @supabase/ssr with httpOnly cookies for production hardening.
// This requires server-side session handling and middleware changes.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'rasmalak-auth',
    },
  }
);

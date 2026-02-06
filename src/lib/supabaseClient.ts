import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      // Persist session in localStorage (survives page refresh/reopens)
      persistSession: true,
      // Automatically refresh tokens before they expire
      autoRefreshToken: true,
      // Detect session from URL (for OAuth redirects)
      detectSessionInUrl: true,
      // Storage key for the session
      storageKey: 'rasmalak-auth',
    },
  }
);

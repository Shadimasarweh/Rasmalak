'use client';

import { useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore, useAuthInitialized } from '@/store/authStore';

/* ============================================
   AUTH PROVIDER
   
   Runs once at app root. Responsibilities:
   1. Fetch initial session on mount
   2. Store session/user in auth store
   3. Set initialized = true after first fetch
   4. Subscribe to auth state changes
   5. Clean up subscription on unmount
   
   All auth-dependent features must wait for
   initialized === true before running.
   ============================================ */

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const setSession = useAuthStore((state) => state.setSession);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const initialized = useAuthInitialized();

  useEffect(() => {
    // 1. Fetch initial session
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[AuthProvider] Session:', session ? 'exists' : 'null', 'User ID:', session?.user?.id);
      setSession(session);
      setInitialized(true);
    };

    initializeAuth();

    // 2. Subscribe to auth state changes (login/logout/refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    // 3. Cleanup on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [setSession, setInitialized]);

  // Block rendering until auth is initialized
  // This prevents any auth-dependent logic from running prematurely
  if (!initialized) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          background: '#FAFAFA',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #E5E7EB',
            borderTopColor: '#10B981',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}

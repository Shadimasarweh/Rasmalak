'use client';

import { useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore, useAuthInitialized } from '@/store/authStore';
import { useStore } from '@/store/useStore';
import type { Session } from '@supabase/supabase-js';

/* ============================================
   AUTH PROVIDER
   
   Runs once at app root. Responsibilities:
   1. Fetch initial session on mount
   2. Store session/user in BOTH auth stores (authStore + useStore)
   3. Set initialized = true after first fetch
   4. Subscribe to auth state changes
   5. Clean up subscription on unmount
   
   All auth-dependent features must wait for
   initialized === true before running.
   ============================================ */

interface AuthProviderProps {
  children: ReactNode;
}

// Helper to sync session to both stores
function syncSessionToStores(
  session: Session | null,
  setSession: (session: Session | null) => void
) {
  // 1. Update authStore (for transaction pages)
  setSession(session);
  
  // 2. Update useStore (for AuthGuard and other components)
  if (session?.user) {
    useStore.setState({
      user: {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || '',
      },
      isAuthenticated: true,
      userName: session.user.user_metadata?.name || session.user.email?.split('@')[0] || '',
    });
  } else {
    useStore.setState({
      user: null,
      isAuthenticated: false,
    });
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const setSession = useAuthStore((state) => state.setSession);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const initialized = useAuthInitialized();

  useEffect(() => {
    // 1. Fetch initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthProvider] Error fetching session:', error.message);
        }
        
        console.log('[AuthProvider] Session:', session ? 'exists' : 'null', 'User ID:', session?.user?.id);
        
        // If no session but we have a refresh token, try to refresh
        if (!session) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.log('[AuthProvider] No valid session, user needs to login');
          } else if (refreshData.session) {
            console.log('[AuthProvider] Session refreshed successfully');
            syncSessionToStores(refreshData.session, setSession);
            setInitialized(true);
            return;
          }
        }
        
        syncSessionToStores(session, setSession);
        setInitialized(true);
      } catch (err) {
        console.error('[AuthProvider] Unexpected error:', err);
        syncSessionToStores(null, setSession);
        setInitialized(true);
      }
    };

    initializeAuth();

    // 2. Subscribe to auth state changes (login/logout/refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log('[AuthProvider] Auth state changed:', _event, session?.user?.id);
        syncSessionToStores(session, setSession);
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

'use client';

import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

/* ============================================
   GLOBAL AUTH STORE
   
   Single source of truth for authentication state.
   All services (transactions, AI, profiles, etc.) 
   must read auth from this store, NOT from Supabase directly.
   
   The AuthProvider hydrates this store once at app startup
   and keeps it in sync via onAuthStateChange.
   ============================================ */

interface AuthState {
  // State
  session: Session | null;
  user: User | null;
  initialized: boolean;
  
  // Actions
  setSession: (session: Session | null) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state - not initialized, no session
  session: null,
  user: null,
  initialized: false,
  
  // Set session and derive user from it
  setSession: (session) => set({
    session,
    user: session?.user ?? null,
  }),
  
  // Mark as initialized after first session fetch
  setInitialized: (initialized) => set({ initialized }),
}));

/* ===== SELECTORS ===== */
// Use these for optimized re-renders

export const useAuth = () => useAuthStore((state) => ({
  session: state.session,
  user: state.user,
  initialized: state.initialized,
}));

export const useUser = () => useAuthStore((state) => state.user);
export const useSession = () => useAuthStore((state) => state.session);
export const useAuthInitialized = () => useAuthStore((state) => state.initialized);

/* ===== NON-REACTIVE GETTERS ===== */
// Use these in callbacks/effects where you don't need reactivity

export const getAuthState = () => useAuthStore.getState();
export const getUser = () => useAuthStore.getState().user;
export const getSession = () => useAuthStore.getState().session;

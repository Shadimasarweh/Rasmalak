'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transaction, AuthUser, LoginCredentials, SignupData } from '@/types';
import { generateId } from '@/lib/utils';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { Language } from '@/lib/translations';

export type Theme = 'light' | 'dark';

interface AppState {
  // Authentication
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;

  // Transactions
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  // Settings
  currency: string;
  setCurrency: (currency: string) => void;

  // Language
  language: Language;
  setLanguage: (language: Language) => void;

  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  // User
  userName: string;
  setUserName: (name: string) => void;

  // UI State
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Authentication
      user: null,
      isAuthenticated: false,

      login: async (credentials) => {
        try {
          // Simulate API call - in production, this would call your backend
          // For now, we'll use localStorage to simulate user accounts
          if (typeof window === 'undefined') {
            return { success: false, error: 'Login failed. Please try again.' };
          }

          const storedUsers = JSON.parse(localStorage.getItem('rasmalak-users') || '[]');
          const user = storedUsers.find(
            (u: any) => u.email === credentials.email && u.password === credentials.password
          );

          if (!user) {
            return { success: false, error: 'Invalid email or password' };
          }

          const authUser: AuthUser = {
            id: user.id,
            email: user.email,
            name: user.name,
          };

          set({
            user: authUser,
            isAuthenticated: true,
            userName: user.name,
          });

          return { success: true };
        } catch (error) {
          return { success: false, error: 'Login failed. Please try again.' };
        }
      },

      signup: async (data) => {
        try {
          // Simulate API call
          if (typeof window === 'undefined') {
            return { success: false, error: 'Signup failed. Please try again.' };
          }

          const storedUsers = JSON.parse(localStorage.getItem('rasmalak-users') || '[]');
          
          // Check if user already exists
          if (storedUsers.some((u: any) => u.email === data.email)) {
            return { success: false, error: 'Email already registered' };
          }

          // Validate password length
          if (data.password.length < 6) {
            return { success: false, error: 'Password must be at least 6 characters' };
          }

          const newUser = {
            id: generateId(),
            email: data.email,
            password: data.password, // In production, this should be hashed
            name: data.name,
            createdAt: new Date().toISOString(),
          };

          storedUsers.push(newUser);
          localStorage.setItem('rasmalak-users', JSON.stringify(storedUsers));

          const authUser: AuthUser = {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
          };

          set({
            user: authUser,
            isAuthenticated: true,
            userName: newUser.name,
          });

          return { success: true };
        } catch (error) {
          return { success: false, error: 'Signup failed. Please try again.' };
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          userName: '',
          transactions: [], // Clear transactions on logout
        });
      },

      // Transactions
      transactions: [],

      addTransaction: (transactionData) => {
        const newTransaction: Transaction = {
          ...transactionData,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          transactions: [newTransaction, ...state.transactions],
        }));
      },

      updateTransaction: (id, updates) => {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t
          ),
        }));
      },

      deleteTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }));
      },

      // Settings
      currency: DEFAULT_CURRENCY,
      setCurrency: (currency) => set({ currency }),

      // Language
      language: 'ar',
      setLanguage: (language) => set({ language }),

      // Theme
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

      // User
      userName: '',
      setUserName: (name) => set({ userName: name }),

      // UI State
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'rasmalak-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        transactions: state.transactions,
        currency: state.currency,
        userName: state.userName,
        language: state.language,
        theme: state.theme,
      }),
    }
  )
);

// Selector hooks for better performance
export const useTransactions = () => useStore((state) => state.transactions);
export const useCurrency = () => useStore((state) => state.currency);
export const useUserName = () => useStore((state) => state.userName);
export const useLanguage = () => useStore((state) => state.language);
export const useTheme = () => useStore((state) => state.theme);

// Auth selectors - split to avoid SSR hydration issues
// Use these individual selectors in components instead of a combined hook
export const useUser = () => useStore((state) => state.user);
export const useIsAuthenticated = () => useStore((state) => state.isAuthenticated);
export const useLogin = () => useStore((state) => state.login);
export const useSignup = () => useStore((state) => state.signup);
export const useLogout = () => useStore((state) => state.logout);

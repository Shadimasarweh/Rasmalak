'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transaction, AuthUser, LoginCredentials, SignupData } from '@/types';
import { generateId } from '@/lib/utils';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { Language } from '@/lib/translations';

export type Theme = 'light' | 'dark';

// Budget types
export interface CategoryBudget {
  category: string;
  limit: number;
  spent: number;
}

export interface MonthlyBudget {
  month: string; // Format: 'YYYY-MM'
  totalBudget: number;
  categoryBudgets: CategoryBudget[];
}

export interface SavingsGoal {
  id: string;
  name: string;
  nameAr: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  color: string;
}

// Onboarding types
export interface OnboardingData {
  preferredLanguage: 'ar' | 'en';
  currency: string;
  monthlyIncomeRange: string; // 'under-5k' | '5k-10k' | '10k-20k' | '20k-50k' | 'over-50k'
  primaryGoal: string; // 'save' | 'payoff-debt' | 'emergency-fund' | 'invest' | 'budget'
}

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

  // Budgets
  monthlyBudget: number;
  setMonthlyBudget: (amount: number) => void;
  categoryBudgets: Record<string, number>; // category -> limit
  setCategoryBudget: (category: string, limit: number) => void;
  removeCategoryBudget: (category: string) => void;

  // Savings Goals
  savingsGoals: SavingsGoal[];
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => void;
  deleteSavingsGoal: (id: string) => void;

  // Settings
  currency: string;
  setCurrency: (currency: string) => void;
  baseCurrency: string; // The user's primary/home currency (for legacy transactions)
  setBaseCurrency: (currency: string) => void;

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

  // Onboarding
  hasCompletedOnboarding: boolean;
  onboardingData: OnboardingData | null;
  completeOnboarding: (data: OnboardingData) => void;
  resetOnboarding: () => void;
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
        const state = get();
        const newTransaction: Transaction = {
          ...transactionData,
          id: generateId(),
          currency: transactionData.currency || state.currency, // Use provided currency or current display currency
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

      // Budgets
      monthlyBudget: 0,
      setMonthlyBudget: (amount) => set({ monthlyBudget: amount }),
      
      categoryBudgets: {},
      setCategoryBudget: (category, limit) => {
        set((state) => ({
          categoryBudgets: { ...state.categoryBudgets, [category]: limit },
        }));
      },
      removeCategoryBudget: (category) => {
        set((state) => {
          const { [category]: _, ...rest } = state.categoryBudgets;
          return { categoryBudgets: rest };
        });
      },

      // Savings Goals
      savingsGoals: [],
      addSavingsGoal: (goalData) => {
        const newGoal: SavingsGoal = {
          ...goalData,
          id: generateId(),
        };
        set((state) => ({
          savingsGoals: [...state.savingsGoals, newGoal],
        }));
      },
      updateSavingsGoal: (id, updates) => {
        set((state) => ({
          savingsGoals: state.savingsGoals.map((g) =>
            g.id === id ? { ...g, ...updates } : g
          ),
        }));
      },
      deleteSavingsGoal: (id) => {
        set((state) => ({
          savingsGoals: state.savingsGoals.filter((g) => g.id !== id),
        }));
      },

      // Settings
      currency: DEFAULT_CURRENCY,
      setCurrency: (currency) => set({ currency }),
      baseCurrency: DEFAULT_CURRENCY, // User's primary currency for legacy transactions
      setBaseCurrency: (currency) => set({ baseCurrency: currency }),

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

      // Onboarding
      hasCompletedOnboarding: false,
      onboardingData: null,
      completeOnboarding: (data) => {
        set({
          hasCompletedOnboarding: true,
          onboardingData: data,
          language: data.preferredLanguage,
          currency: data.currency,
          baseCurrency: data.currency,
        });
      },
      resetOnboarding: () => {
        set({
          hasCompletedOnboarding: false,
          onboardingData: null,
        });
      },
    }),
    {
      name: 'rasmalak-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        transactions: state.transactions,
        currency: state.currency,
        baseCurrency: state.baseCurrency,
        userName: state.userName,
        language: state.language,
        theme: state.theme,
        monthlyBudget: state.monthlyBudget,
        categoryBudgets: state.categoryBudgets,
        savingsGoals: state.savingsGoals,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        onboardingData: state.onboardingData,
      }),
    }
  )
);

// Selector hooks for better performance
export const useTransactions = () => useStore((state) => state.transactions);
export const useCurrency = () => useStore((state) => state.currency);
export const useBaseCurrency = () => useStore((state) => state.baseCurrency);
export const useUserName = () => useStore((state) => state.userName);
export const useLanguage = () => useStore((state) => state.language);
export const useTheme = () => useStore((state) => state.theme);

// Budget selectors
export const useMonthlyBudget = () => useStore((state) => state.monthlyBudget);
export const useCategoryBudgets = () => useStore((state) => state.categoryBudgets);
export const useSavingsGoals = () => useStore((state) => state.savingsGoals);

// Auth selectors - split to avoid SSR hydration issues
// Use these individual selectors in components instead of a combined hook
export const useUser = () => useStore((state) => state.user);
export const useIsAuthenticated = () => useStore((state) => state.isAuthenticated);
export const useLogin = () => useStore((state) => state.login);
export const useSignup = () => useStore((state) => state.signup);
export const useLogout = () => useStore((state) => state.logout);

// Onboarding selectors
export const useHasCompletedOnboarding = () => useStore((state) => state.hasCompletedOnboarding);
export const useOnboardingData = () => useStore((state) => state.onboardingData);
export const useCompleteOnboarding = () => useStore((state) => state.completeOnboarding);

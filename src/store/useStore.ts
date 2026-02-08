'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transaction, AuthUser, LoginCredentials, SignupData } from '@/types';
import { generateId } from '@/lib/utils';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { Language } from '@/lib/translations';
import { supabase } from '@/lib/supabaseClient';

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
export type UserSegment = 'individual' | 'self_employed' | 'sme';

export interface OnboardingData {
  segment: UserSegment;
  topics: string[]; // IDs: 'budgeting', 'saving', 'debt', 'investing', 'islamic_finance', 'business_cashflow'
  preferredInsights: string[]; // IDs: 'spending_patterns', 'cashflow', 'debt_payoff', 'savings_plan', 'investment_learning'
}

// Community types
export type CommunityPostType = 'question' | 'collaboration' | 'experience' | 'poll';
export type CommunityVisibility = 'country' | 'industry' | 'all';

export interface CommunityPost {
  id: string;
  type: CommunityPostType;
  title: string;
  content: string;
  authorName: string;
  authorSegment: UserSegment;
  industry: string;
  country: string;
  visibility: CommunityVisibility;
  tags: string[];
  createdAt: string;
  replyCount: number;
  isHelpful?: boolean;
  // For polls
  pollOptions?: { id: string; text: string; votes: number }[];
}

export interface CommunityReply {
  id: string;
  postId: string;
  content: string;
  authorName: string;
  createdAt: string;
  isHelpful: boolean;
}

// Seed data for community posts
export const SEED_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'post-1',
    type: 'question',
    title: 'أفضل طريقة لإدارة التدفق النقدي في موسم الركود؟',
    content: 'نواجه تحديات في إدارة التدفق النقدي خلال أشهر الصيف. ما هي استراتيجياتكم للحفاظ على السيولة؟',
    authorName: 'أحمد م.',
    authorSegment: 'sme',
    industry: 'retail',
    country: 'SA',
    visibility: 'all',
    tags: ['cashflow', 'seasonality'],
    createdAt: '2026-01-20T10:00:00Z',
    replyCount: 5,
  },
  {
    id: 'post-2',
    type: 'collaboration',
    title: 'Looking for logistics partner in UAE',
    content: 'We are an F&B SME based in Dubai looking for a reliable cold-chain logistics partner for distribution across Emirates.',
    authorName: 'Sara K.',
    authorSegment: 'sme',
    industry: 'fnb',
    country: 'AE',
    visibility: 'country',
    tags: ['logistics', 'partnership'],
    createdAt: '2026-01-19T14:30:00Z',
    replyCount: 3,
  },
  {
    id: 'post-3',
    type: 'experience',
    title: 'تجربتي في تسجيل شركة ذات مسؤولية محدودة في المنطقة الحرة',
    content: 'شاركت تجربتي الكاملة من البداية للنهاية، بما في ذلك التكاليف والوقت المستغرق والأوراق المطلوبة.',
    authorName: 'محمد ع.',
    authorSegment: 'self_employed',
    industry: 'services',
    country: 'AE',
    visibility: 'all',
    tags: ['registration', 'freezone', 'legal'],
    createdAt: '2026-01-18T09:15:00Z',
    replyCount: 12,
    isHelpful: true,
  },
  {
    id: 'post-4',
    type: 'poll',
    title: 'Which POS system do you use?',
    content: 'Curious what POS systems work best for small retail businesses in the region.',
    authorName: 'Fatima H.',
    authorSegment: 'sme',
    industry: 'retail',
    country: 'JO',
    visibility: 'industry',
    tags: ['pos', 'technology'],
    createdAt: '2026-01-17T16:45:00Z',
    replyCount: 8,
    pollOptions: [
      { id: 'opt-1', text: 'Foodics', votes: 15 },
      { id: 'opt-2', text: 'Lightspeed', votes: 8 },
      { id: 'opt-3', text: 'Square', votes: 12 },
      { id: 'opt-4', text: 'Other', votes: 5 },
    ],
  },
  {
    id: 'post-5',
    type: 'question',
    title: 'معاملة ضريبة القيمة المضافة للخدمات الرقمية عبر الحدود',
    content: 'هل يوجد من لديه خبرة في معاملة ضريبة القيمة المضافة لخدمات SaaS التي تُقدم لعملاء في السعودية من شركة مسجلة في الأردن؟',
    authorName: 'رامي س.',
    authorSegment: 'self_employed',
    industry: 'tech',
    country: 'JO',
    visibility: 'all',
    tags: ['vat', 'tax', 'cross-border'],
    createdAt: '2026-01-16T11:20:00Z',
    replyCount: 7,
  },
];

interface AppState {
  // Authentication
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUserProfile: (data: { name?: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;

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
  skipOnboarding: () => void;
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
          // Sign in with Supabase Auth
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });

          if (error) {
            return { success: false, error: error.message };
          }

          if (!data.user) {
            return { success: false, error: 'Login failed. Please try again.' };
          }

          const authUser: AuthUser = {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || '',
            phone: data.user.user_metadata?.phone || '',
          };

          set({
            user: authUser,
            isAuthenticated: true,
            userName: authUser.name,
          });

          return { success: true };
        } catch (error) {
          return { success: false, error: 'Login failed. Please try again.' };
        }
      },

      signup: async (data) => {
        try {
          // Validate password length
          if (data.password.length < 6) {
            return { success: false, error: 'Password must be at least 6 characters' };
          }

          // Sign up with Supabase Auth
          const { data: signUpData, error } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
              data: {
                name: data.name,
              },
            },
          });

          if (error) {
            return { success: false, error: error.message };
          }

          if (!signUpData.user) {
            return { success: false, error: 'Signup failed. Please try again.' };
          }

          const authUser: AuthUser = {
            id: signUpData.user.id,
            email: signUpData.user.email || '',
            name: data.name,
          };

          set({
            user: authUser,
            isAuthenticated: true,
            userName: data.name,
            // Reset onboarding for new users
            hasCompletedOnboarding: false,
            onboardingData: null,
            // Reset transactions for new user
            transactions: [],
          });

          return { success: true };
        } catch (error) {
          return { success: false, error: 'Signup failed. Please try again.' };
        }
      },

      logout: async () => {
        // Sign out from Supabase
        await supabase.auth.signOut();
        
        set({
          user: null,
          isAuthenticated: false,
          userName: '',
          transactions: [], // Clear transactions on logout
          hasCompletedOnboarding: false, // Reset onboarding for next user
          onboardingData: null,
        });
      },

      updateUserProfile: async (data) => {
        try {
          const currentUser = get().user;
          if (!currentUser) {
            return { success: false, error: 'Not authenticated' };
          }

          // Update Supabase user metadata
          const { error } = await supabase.auth.updateUser({
            data: {
              name: data.name ?? currentUser.name,
              phone: data.phone ?? currentUser.phone,
            },
          });

          if (error) {
            return { success: false, error: error.message };
          }

          // Update local state
          const updatedUser: AuthUser = {
            ...currentUser,
            name: data.name ?? currentUser.name,
            phone: data.phone ?? currentUser.phone,
          };

          set({
            user: updatedUser,
            userName: updatedUser.name,
          });

          return { success: true };
        } catch (error) {
          return { success: false, error: 'Failed to update profile' };
        }
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
        });
      },
      skipOnboarding: () => {
        set({
          hasCompletedOnboarding: true,
          onboardingData: {
            segment: 'individual',
            topics: [],
            preferredInsights: [],
          },
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
export const useUpdateUserProfile = () => useStore((state) => state.updateUserProfile);

// Onboarding selectors
export const useHasCompletedOnboarding = () => useStore((state) => state.hasCompletedOnboarding);
export const useOnboardingData = () => useStore((state) => state.onboardingData);
export const useCompleteOnboarding = () => useStore((state) => state.completeOnboarding);
export const useSkipOnboarding = () => useStore((state) => state.skipOnboarding);

'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore, getAuthState } from '@/store/authStore';

/* ============================================
   TRANSACTION STORE
   Supabase-backed state management for transactions.
   
   All transactions are persisted to Supabase with user_id
   from the global auth store (NOT from Supabase auth directly).
   
   IMPORTANT: All auth-dependent actions must check:
   1. initialized === true (auth has been hydrated)
   2. user !== null (user is authenticated)
   
   This pattern prevents race conditions where actions
   run before auth state is available.
   ============================================ */

/* ===== TRANSACTION MODEL ===== */
// Per Functional Contract Section 3
export interface Transaction {
  id: string;                          // Unique identifier
  amount: number;                      // Signed numeric (positive for income, negative for expense)
  currency: string;                    // ISO 4217 (e.g., 'JOD', 'USD')
  date: string;                        // ISO 8601 (e.g., '2024-01-25')
  type: 'income' | 'expense';          // Transaction type
  category: string | null;             // Category (nullable per contract)
  description?: string;                // Optional metadata
  user_id?: string;
}

/* ===== STORE INTERFACE ===== */
interface TransactionStore {
  // Data
  transactions: Transaction[];
  
  // Actions
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  
  // Derived (computed on read, not cached independently per contract)
  getTotalIncome: () => number;
  getTotalExpenses: () => number;
  getNetBalance: () => number;
}

/* ===== CONTEXT ===== */
const TransactionContext = createContext<TransactionStore | null>(null);

/* ===== PROVIDER ===== */
export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Subscribe to auth store - re-fetch when user or initialized changes
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);

  // Fetch transactions from Supabase when auth is ready and user changes
  useEffect(() => {
    const fetchTransactions = async () => {
      console.log('[TransactionStore] fetchTransactions called - initialized:', initialized, 'user:', user?.id);
      
      // Wait for auth to be initialized
      if (!initialized) {
        console.log('[TransactionStore] Auth not initialized, skipping fetch');
        return;
      }

      if (!user) {
        // Not authenticated, no transactions to fetch
        console.log('[TransactionStore] No user, clearing transactions');
        setTransactions([]);
        return;
      }

      // Verify Supabase session is valid
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('[TransactionStore] Supabase session for fetch:', sessionData.session?.user?.id);
      
      if (!sessionData.session) {
        console.error('[TransactionStore] No Supabase session - cannot fetch transactions');
        setTransactions([]);
        return;
      }
      
      console.log('[TransactionStore] Fetching transactions for user:', user.id);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', sessionData.session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[TransactionStore] Error fetching transactions:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        return;
      }

      console.log('[TransactionStore] Fetched transactions:', data?.length || 0);
      if (data) {
        // Map Supabase rows to Transaction interface
        const mapped: Transaction[] = data.map((row) => ({
          id: row.id,
          amount: row.amount,
          currency: row.currency,
          date: row.date,
          type: row.type,
          category: row.category,
          description: row.note || row.description,
        }));
        setTransactions(mapped);
      }
    };

    fetchTransactions();
  }, [user, initialized]);

  // Add transaction with user_id from auth store
  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>) => {
    console.log('[TransactionStore] addTransaction called:', transaction);
    
    // Read auth state - check both initialized and user
    const { user, initialized } = getAuthState();
    console.log('[TransactionStore] Auth state:', { initialized, userId: user?.id });

    if (!initialized) {
      console.warn('[TransactionStore] Cannot add transaction: auth not initialized yet');
      return;
    }

    if (!user) {
      console.error('[TransactionStore] Cannot add transaction: user not authenticated');
      return;
    }

    // Double-check by getting the session directly from Supabase
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('[TransactionStore] Supabase session user:', sessionData.session?.user?.id);
    console.log('[TransactionStore] Auth store user:', user.id);
    
    // Use the Supabase session user if available, otherwise fall back to auth store
    const userId = sessionData.session?.user?.id || user.id;
    
    // Insert into Supabase with user_id = user.id
    console.log('[TransactionStore] Inserting transaction for user:', userId);
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        category: transaction.category,
        note: transaction.description || null,
        date: transaction.date,
      })
      .select()
      .single();

    if (error) {
      console.error('[TransactionStore] Error inserting transaction:', error.message, error.code, error.details);
      return;
    }

    console.log('[TransactionStore] Transaction inserted successfully:', data);
    if (data) {
      // Add to local state after successful insert
      const newTransaction: Transaction = {
        id: data.id,
        amount: data.amount,
        currency: data.currency,
        date: data.date,
        type: data.type,
        category: data.category,
        description: data.note,
      };
      setTransactions(prev => [newTransaction, ...prev]);
    }
  }, []);

  // Delete transaction from Supabase
  const deleteTransaction = useCallback(async (id: string) => {
    // Read auth state - check both initialized and user
    const { user, initialized } = getAuthState();

    if (!initialized) {
      console.warn('Cannot delete transaction: auth not initialized yet');
      return;
    }

    if (!user) {
      console.error('Cannot delete transaction: user not authenticated');
      return;
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting transaction:', error);
      return;
    }

    // Remove from local state after successful delete
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  // Derived values - computed on every read per Contract Section 7
  // No caching independent of transaction dataset
  const getTotalIncome = useCallback((): number => {
    return transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [transactions]);

  const getTotalExpenses = useCallback((): number => {
    return transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [transactions]);

  const getNetBalance = useCallback((): number => {
    return getTotalIncome() - getTotalExpenses();
  }, [getTotalIncome, getTotalExpenses]);

  const store: TransactionStore = {
    transactions,
    addTransaction,
    deleteTransaction,
    getTotalIncome,
    getTotalExpenses,
    getNetBalance,
  };

  return (
    <TransactionContext.Provider value={store}>
      {children}
    </TransactionContext.Provider>
  );
}

/* ===== HOOK ===== */
export function useTransactions(): TransactionStore {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
}

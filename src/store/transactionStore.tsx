'use client';

import { createContext, useContext, useMemo, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore, getAuthState } from '@/store/authStore';

const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: unknown[]) => { if (isDev) console.log(...args); };

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
  isRecurring: boolean;
  recurringEndDate: string | null;     // ISO 8601 date or null for indefinite
  // Receipt grouping: when present, this row is one line item from a
  // multi-row receipt insert. The same receipt_id is shared by all
  // sibling rows so the UI can fold them back into one entry.
  receiptId?: string | null;
  // Per-item subcategory id from src/ai/taxonomy.ts (V1: food + bills only).
  subcategory?: string | null;
}

/* ===== RECEIPT INPUT ===== */
// Bulk insert payload used by the chat "Add as expense" chip and the
// receipt scanner modal. One receipt becomes N transaction rows that
// share a generated receipt_id.
export interface AddReceiptInput {
  receiptTotal: number;                // Total on the document (positive)
  currency: string;
  date: string;                        // ISO 8601
  topCategory: string;                 // Parent category (food, bills, ...)
  vendor: string;
  items: Array<{
    description: string;
    amount: number;                    // Per-item amount (positive)
    subcategory: string | null;
  }>;
}

export interface AddReceiptResult {
  receiptId: string;
  rowCount: number;                    // Total rows inserted (incl. remainder)
}

/* ===== STORE INTERFACE ===== */
interface TransactionStore {
  // Data
  transactions: Transaction[];
  
  // Actions
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  // Bulk insert one receipt as N rows sharing a receipt_id. Returns
  // the generated receipt_id so callers can link / undo / show toast.
  addReceipt: (input: AddReceiptInput) => Promise<AddReceiptResult | null>;
  deleteTransaction: (id: string) => void;
  // Delete every row for a given receipt_id (used by the parent-row
  // delete on /money/track).
  deleteReceipt: (receiptId: string) => Promise<void>;
  
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
      devLog('[TransactionStore] fetchTransactions called - initialized:', initialized, 'user:', user?.id);
      
      // Wait for auth to be initialized
      if (!initialized) {
        devLog('[TransactionStore] Auth not initialized, skipping fetch');
        return;
      }

      if (!user) {
        // Not authenticated, no transactions to fetch
        devLog('[TransactionStore] No user, clearing transactions');
        setTransactions([]);
        return;
      }

      // Verify Supabase session is valid
      const { data: sessionData } = await supabase.auth.getSession();
      devLog('[TransactionStore] Supabase session for fetch:', sessionData.session?.user?.id);
      
      if (!sessionData.session) {
        console.error('[TransactionStore] No Supabase session - cannot fetch transactions');
        setTransactions([]);
        return;
      }
      
      devLog('[TransactionStore] Fetching transactions for user:', user.id);
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

      devLog('[TransactionStore] Fetched transactions:', data?.length || 0);
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
          isRecurring: row.is_recurring ?? false,
          recurringEndDate: row.recurring_end_date ?? null,
          receiptId: row.receipt_id ?? null,
          subcategory: row.subcategory ?? null,
        }));
        setTransactions(mapped);
      }
    };

    fetchTransactions();
  }, [user, initialized]);

  // Add transaction with user_id from auth store
  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>) => {
    devLog('[TransactionStore] addTransaction called:', transaction);
    
    // Read auth state - check both initialized and user
    const { user, initialized } = getAuthState();
    devLog('[TransactionStore] Auth state:', { initialized, userId: user?.id });

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
    devLog('[TransactionStore] Supabase session user:', sessionData.session?.user?.id);
    devLog('[TransactionStore] Auth store user:', user.id);
    
    // Use the Supabase session user if available, otherwise fall back to auth store
    const userId = sessionData.session?.user?.id || user.id;
    
    if (!Number.isFinite(transaction.amount) || transaction.amount <= 0 || transaction.amount > 1_000_000_000) {
      console.error('[TransactionStore] Invalid transaction amount');
      return;
    }

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
        is_recurring: transaction.isRecurring ?? false,
        recurring_end_date: transaction.recurringEndDate || null,
        receipt_id: transaction.receiptId ?? null,
        subcategory: transaction.subcategory ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('[TransactionStore] Error inserting transaction:', error.message, error.code, error.details);
      return;
    }

    devLog('[TransactionStore] Transaction inserted successfully:', data);
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
        isRecurring: data.is_recurring ?? false,
        recurringEndDate: data.recurring_end_date ?? null,
        receiptId: data.receipt_id ?? null,
        subcategory: data.subcategory ?? null,
      };
      setTransactions(prev => [newTransaction, ...prev]);
    }
  }, []);

  /* ===== ADD RECEIPT (bulk) =====
     Inserts one row per line item with a shared receipt_id, plus a
     "Tax & adjustments" remainder row when the items don't sum to the
     receipt total. Falls back to a single-row insert when items[] is
     empty so we still capture the receipt total.
  */
  const addReceipt = useCallback(async (input: AddReceiptInput): Promise<AddReceiptResult | null> => {
    const { user, initialized } = getAuthState();
    if (!initialized) {
      console.warn('[TransactionStore] Cannot add receipt: auth not initialized');
      return null;
    }
    if (!user) {
      console.error('[TransactionStore] Cannot add receipt: user not authenticated');
      return null;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id || user.id;

    // Sanitize items: drop entries without a positive amount; we never
    // want to insert a 0-amount row that would just clutter the list.
    const cleanItems = (input.items ?? []).filter(
      (it) => Number.isFinite(it.amount) && it.amount > 0,
    );

    // Empty-items fallback: behave like a single-row add. This keeps
    // the chip useful even if the extractor produced no line items.
    if (cleanItems.length === 0) {
      if (!Number.isFinite(input.receiptTotal) || input.receiptTotal <= 0) {
        console.warn('[TransactionStore] addReceipt: nothing to insert');
        return null;
      }
      const receiptId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'expense',
          amount: input.receiptTotal,
          currency: input.currency,
          category: input.topCategory,
          note: input.vendor,
          date: input.date,
          is_recurring: false,
          recurring_end_date: null,
          receipt_id: receiptId,
          subcategory: null,
        })
        .select()
        .single();
      if (error || !data) {
        console.error('[TransactionStore] addReceipt fallback insert failed:', error?.message);
        return null;
      }
      const row: Transaction = {
        id: data.id,
        amount: data.amount,
        currency: data.currency,
        date: data.date,
        type: data.type,
        category: data.category,
        description: data.note,
        isRecurring: data.is_recurring ?? false,
        recurringEndDate: data.recurring_end_date ?? null,
        receiptId: data.receipt_id ?? null,
        subcategory: data.subcategory ?? null,
      };
      setTransactions((prev) => [row, ...prev]);
      return { receiptId, rowCount: 1 };
    }

    const receiptId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    // Build the per-item rows. Description is `vendor — item` so the
    // grouped view still shows the vendor on each child without an
    // extra join.
    const rows = cleanItems.map((it) => ({
      user_id: userId,
      type: 'expense' as const,
      amount: it.amount,
      currency: input.currency,
      category: input.topCategory,
      note: `${input.vendor} — ${it.description}`,
      date: input.date,
      is_recurring: false,
      recurring_end_date: null,
      receipt_id: receiptId,
      subcategory: it.subcategory ?? null,
    }));

    // Tolerance is intentionally loose (0.5 of the currency unit). VAT,
    // rounding, and tip lines all conspire to create small deltas that
    // we'd rather book honestly than hide.
    const itemsSum = cleanItems.reduce((s, it) => s + it.amount, 0);
    const delta = input.receiptTotal - itemsSum;
    if (Number.isFinite(input.receiptTotal) && Math.abs(delta) > 0.5) {
      rows.push({
        user_id: userId,
        type: 'expense' as const,
        amount: Math.abs(delta),
        currency: input.currency,
        category: input.topCategory,
        note: `${input.vendor} — Tax & adjustments`,
        date: input.date,
        is_recurring: false,
        recurring_end_date: null,
        receipt_id: receiptId,
        subcategory: null,
      });
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert(rows)
      .select();

    if (error) {
      console.error('[TransactionStore] addReceipt insert failed:', error.message);
      return null;
    }

    if (data) {
      const inserted: Transaction[] = data.map((row) => ({
        id: row.id,
        amount: row.amount,
        currency: row.currency,
        date: row.date,
        type: row.type,
        category: row.category,
        description: row.note,
        isRecurring: row.is_recurring ?? false,
        recurringEndDate: row.recurring_end_date ?? null,
        receiptId: row.receipt_id ?? null,
        subcategory: row.subcategory ?? null,
      }));
      setTransactions((prev) => [...inserted, ...prev]);
      return { receiptId, rowCount: inserted.length };
    }

    return { receiptId, rowCount: rows.length };
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

  // Delete every row for a given receipt_id. Used when the user
  // collapses a grouped row on /money/track and clicks "delete" — they
  // expect the whole receipt (parent + children) to disappear.
  const deleteReceipt = useCallback(async (receiptId: string) => {
    const { user, initialized } = getAuthState();
    if (!initialized || !user) {
      console.warn('Cannot delete receipt: auth not ready');
      return;
    }
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('receipt_id', receiptId);
    if (error) {
      console.error('Error deleting receipt:', error);
      return;
    }
    setTransactions((prev) => prev.filter((t) => t.receiptId !== receiptId));
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
    addReceipt,
    deleteTransaction,
    deleteReceipt,
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

/* ============================================
   MONTHLY SPENDING AGGREGATION HELPERS
   Shared by Plan, Track, and Compare so they
   never disagree on what "actual" means.
   ============================================ */

export interface MonthRange {
  start: Date;
  end: Date;
}

// MonthOffset: 0 = current month, -1 = previous month, etc.
export function getMonthRange(monthOffset: number = 0, now: Date = new Date()): MonthRange {
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function aggregateExpensesByCategory(
  transactions: Transaction[],
  range: MonthRange,
): Record<string, number> {
  const map: Record<string, number> = {};
  transactions.forEach((tx) => {
    if (tx.type !== 'expense') return;
    const d = new Date(tx.date);
    if (d >= range.start && d <= range.end) {
      const cat = tx.category || 'other-expense';
      map[cat] = (map[cat] || 0) + Math.abs(tx.amount);
    }
  });
  return map;
}

// Hook that returns spend-by-category for a given month offset (default current month).
export function useMonthlySpendByCategory(monthOffset: number = 0): Record<string, number> {
  const { transactions } = useTransactions();
  return useMemo(() => {
    const range = getMonthRange(monthOffset);
    return aggregateExpensesByCategory(transactions, range);
  }, [transactions, monthOffset]);
}

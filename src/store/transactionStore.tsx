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

/* ===== TRANSACTION MODEL =====
 *
 * Multi-currency dual-layer model (per migration 012):
 *   - `amount` / `currency` are the NATIVE values the user entered.
 *     They never change after insert.
 *   - `amountBase` is the value expressed in the user's base currency
 *     at the time of entry, locked via `exchangeRateApplied`. This is
 *     the ONLY field analytics, budgets, AI, and aggregations may sum.
 *   - `baseCurrencyAtEntry` records which base currency was active
 *     when the row was written. The recalc job rewrites both
 *     `amountBase` and `baseCurrencyAtEntry` when the user changes
 *     their base currency in Settings.
 *   - `rateSource` is provenance for audit — never displayed.
 *
 * Components rendering a row can show `amount`+`currency` for the
 * native view and read `amountBase` for sums.
 */
export interface Transaction {
  id: string;
  amount: number;                      // Native amount (alias of amount_native)
  currency: string;                    // Native currency (alias of currency_native)
  amountBase: number;                  // Base-currency value, LOCKED at entry
  exchangeRateApplied: number;         // native -> base rate at entry
  baseCurrencyAtEntry: string;         // Base currency this row is normalized into
  rateSource: 'central_bank' | 'aggregator' | 'manual' | 'cached' | 'backfill';
  date: string;
  type: 'income' | 'expense';
  category: string | null;
  description?: string;
  user_id?: string;
  isRecurring: boolean;
  recurringEndDate: string | null;
  receiptId?: string | null;
  subcategory?: string | null;
}

/* ===== RECEIPT INPUT ===== */
// Bulk insert payload used by the chat "Add as expense" chip and the
// receipt scanner modal. One receipt becomes N transaction rows that
// share a generated receipt_id.
//
// All line items share the same currency, exchange rate, and base
// currency. The caller is responsible for resolving the rate (via
// /api/fx/quote) before invoking addReceipt; if omitted we treat
// the receipt as already in the user's base currency.
export interface AddReceiptInput {
  receiptTotal: number;
  currency: string;
  date: string;
  topCategory: string;
  vendor: string;
  items: Array<{
    description: string;
    amount: number;
    subcategory: string | null;
  }>;
  exchangeRateApplied?: number;
  baseCurrency?: string;
  rateSource?: Transaction['rateSource'];
}

export interface AddReceiptResult {
  receiptId: string;
  rowCount: number;                    // Total rows inserted (incl. remainder)
}

/* ===== STORE INTERFACE =====
 * `addTransaction` accepts a relaxed payload: callers must always
 * supply the native amount + currency, and SHOULD supply the rate
 * fields. When omitted (single-currency callers, legacy code paths)
 * we default to: rate=1, amountBase=amount, baseCurrencyAtEntry=
 * currency_native, rateSource='backfill'. The strict path goes
 * through the entry form which calls /api/fx/quote first.
 */
export type AddTransactionInput = Omit<
  Transaction,
  'id' | 'amountBase' | 'exchangeRateApplied' | 'baseCurrencyAtEntry' | 'rateSource'
> & {
  amountBase?: number;
  exchangeRateApplied?: number;
  baseCurrencyAtEntry?: string;
  rateSource?: Transaction['rateSource'];
};

interface TransactionStore {
  // Data
  transactions: Transaction[];

  // Actions
  addTransaction: (transaction: AddTransactionInput) => void;
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

/* ===== ROW MAPPER =====
 * Converts a Supabase row into the Transaction interface. Falls
 * back to legacy `amount`/`currency` columns when `amount_native`
 * is missing (which only happens if the migration hasn't run yet).
 */
function mapRowToTransaction(row: Record<string, unknown>): Transaction {
  const amountNative = (row.amount_native ?? row.amount) as number;
  const currencyNative = (row.currency_native ?? row.currency) as string;
  const amountBase = (row.amount_base ?? row.amount) as number;
  const exchangeRate = (row.exchange_rate_applied ?? 1) as number;
  const baseAtEntry = (row.base_currency_at_entry ?? currencyNative) as string;
  const rateSource = (row.rate_source ?? 'backfill') as Transaction['rateSource'];
  return {
    id: row.id as string,
    amount: amountNative,
    currency: currencyNative,
    amountBase,
    exchangeRateApplied: exchangeRate,
    baseCurrencyAtEntry: baseAtEntry,
    rateSource,
    date: row.date as string,
    type: row.type as 'income' | 'expense',
    category: (row.category ?? null) as string | null,
    description: ((row.note ?? row.description) ?? undefined) as string | undefined,
    isRecurring: (row.is_recurring ?? false) as boolean,
    recurringEndDate: (row.recurring_end_date ?? null) as string | null,
    receiptId: (row.receipt_id ?? null) as string | null,
    subcategory: (row.subcategory ?? null) as string | null,
  };
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
        const mapped: Transaction[] = data.map((row) => mapRowToTransaction(row));
        setTransactions(mapped);
      }
    };

    fetchTransactions();
  }, [user, initialized]);

  // Add transaction with user_id from auth store
  const addTransaction = useCallback(async (transaction: AddTransactionInput) => {
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

    const exchangeRate = transaction.exchangeRateApplied != null
      && Number.isFinite(transaction.exchangeRateApplied)
      && transaction.exchangeRateApplied > 0
        ? transaction.exchangeRateApplied
        : 1;
    const amountBase = transaction.amountBase != null && Number.isFinite(transaction.amountBase)
      ? transaction.amountBase
      : transaction.amount * exchangeRate;
    const baseAtEntry = transaction.baseCurrencyAtEntry || transaction.currency;
    const rateSource = transaction.rateSource ?? 'backfill';

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: transaction.type,
        // Legacy columns kept in lockstep with native for any
        // consumer still reading them.
        amount: transaction.amount,
        currency: transaction.currency,
        amount_native: transaction.amount,
        currency_native: transaction.currency,
        exchange_rate_applied: exchangeRate,
        amount_base: amountBase,
        base_currency_at_entry: baseAtEntry,
        rate_source: rateSource,
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
      const newTransaction = mapRowToTransaction(data);
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

    // Resolve native -> base context for the receipt. When the caller
    // didn't provide a rate, treat the receipt currency as the base.
    const exchangeRate = input.exchangeRateApplied && input.exchangeRateApplied > 0
      ? input.exchangeRateApplied
      : 1;
    const baseAtEntry = input.baseCurrency || input.currency;
    const rateSource: Transaction['rateSource'] = input.rateSource
      ?? (input.exchangeRateApplied != null ? 'cached' : 'backfill');

    const buildBaseRow = (nativeAmount: number) => ({
      amount: nativeAmount,
      currency: input.currency,
      amount_native: nativeAmount,
      currency_native: input.currency,
      exchange_rate_applied: exchangeRate,
      amount_base: nativeAmount * exchangeRate,
      base_currency_at_entry: baseAtEntry,
      rate_source: rateSource,
    });

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
          ...buildBaseRow(input.receiptTotal),
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
      setTransactions((prev) => [mapRowToTransaction(data), ...prev]);
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
      ...buildBaseRow(it.amount),
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
        ...buildBaseRow(Math.abs(delta)),
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
      const inserted: Transaction[] = data.map((row) => mapRowToTransaction(row));
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

  // Derived values - computed on every read per Contract Section 7.
  // Sums use amountBase exclusively — that's the architectural rule
  // from the Currency Architecture document. The native `amount`
  // field is for row display only.
  const getTotalIncome = useCallback((): number => {
    return transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.amountBase), 0);
  }, [transactions]);

  const getTotalExpenses = useCallback((): number => {
    return transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amountBase), 0);
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
      // amountBase only — see architectural rule above.
      map[cat] = (map[cat] || 0) + Math.abs(tx.amountBase);
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

'use client';

import { createContext, useContext, useMemo, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore, getAuthState } from '@/store/authStore';
import { showError } from '@/store/toastStore';

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

/**
 * Detect "column does not exist" errors from Supabase / PostgREST.
 * Triggered when migration 012 hasn't been applied yet — the new
 * multi-currency columns (`amount_native`, `amount_base`, ...) are
 * referenced by the insert payload but missing from the actual
 * table. We use this to fall back to a legacy-shape insert so the
 * row still saves on un-migrated databases.
 *
 * Postgres returns SQLSTATE `42703` ("undefined_column"); PostgREST
 * surfaces schema-cache misses as code `PGRST204`. We also match
 * the message text as a belt-and-suspenders safety net for
 * different Supabase versions.
 */
function isMissingColumnError(error: { message?: string; code?: string }): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  if (code === '42703' || code === 'PGRST204') return true;
  const msg = (error.message ?? '').toLowerCase();
  return /column .* (does not exist|not found in schema cache|of relation .* does not exist)/.test(msg);
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

  // Hard fetch from Supabase. Used on mount + on window focus +
  // after a failed insert so we always converge with the server.
  const fetchTransactions = useCallback(async (): Promise<void> => {
    if (!initialized) return;
    if (!user) {
      setTransactions([]);
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setTransactions([]);
      return;
    }
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', sessionData.session.user.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[TransactionStore] fetch failed:', error.message);
      return;
    }
    if (data) {
      const mapped: Transaction[] = data.map((row) => mapRowToTransaction(row));
      setTransactions(mapped);
    }
  }, [user, initialized]);

  // Mount-time fetch. Deferred via microtask so the lint rule
  // doesn't flag this as a synchronous setState-in-effect (the
  // actual setState happens later inside the async fetch body).
  useEffect(() => {
    void Promise.resolve().then(() => fetchTransactions());
  }, [fetchTransactions]);

  // Realtime subscription scoped to the user. Catches inserts /
  // updates / deletes from this tab AND any other tab the user has
  // open. Idempotent: we de-dupe by id when applying. Cleanup on
  // unmount or user change.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`transactions:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = mapRowToTransaction(payload.new as Record<string, unknown>);
            setTransactions((prev) => {
              if (prev.some((t) => t.id === row.id)) return prev;
              return [row, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const row = mapRowToTransaction(payload.new as Record<string, unknown>);
            setTransactions((prev) => prev.map((t) => (t.id === row.id ? row : t)));
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id?: string } | null)?.id;
            if (oldId) {
              setTransactions((prev) => prev.filter((t) => t.id !== oldId));
            }
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  // Refetch when the tab regains focus. Final backstop for the
  // "I added an expense and it didn't show up" symptom: even when
  // realtime drops or the network blips, refocusing the tab pulls
  // a fresh server snapshot.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onFocus = () => { void fetchTransactions(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchTransactions]);

  // Add transaction with user_id from auth store.
  //
  // Strategy:
  //   1. Validate inputs locally — bad input never hits the network.
  //   2. Try the FULL payload (legacy + multi-currency columns).
  //   3. If Supabase rejects with a "column does not exist" error
  //      (migration 012 not applied to this DB), retry with just
  //      the legacy columns so the row still saves. The user only
  //      loses multi-currency precision until they run the migration.
  //   4. On any other error, surface the actual message in a toast
  //      so the user knows what's wrong instead of seeing a generic
  //      "please try again". Realtime + focus-refetch handle UI sync.
  //
  // Note: we deliberately do NOT do an optimistic local insert. The
  // earlier optimistic flow created confusing edge cases when the
  // server rejected after we'd already shown the row. Keeping it
  // simple: insert, then update local state with the returned row.
  const addTransaction = useCallback(async (transaction: AddTransactionInput) => {
    devLog('[TransactionStore] addTransaction called:', transaction);

    const { user, initialized } = getAuthState();
    if (!initialized) {
      console.warn('[TransactionStore] Cannot add transaction: auth not initialized yet');
      return;
    }
    if (!user) {
      console.error('[TransactionStore] Cannot add transaction: user not authenticated');
      showError('Cannot save: not signed in');
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id || user.id;

    if (!Number.isFinite(transaction.amount) || transaction.amount <= 0 || transaction.amount > 1_000_000_000) {
      console.error('[TransactionStore] Invalid transaction amount');
      showError('Invalid amount');
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

    // Legacy-shape payload. Always succeeds against any historical
    // schema this app has shipped.
    const legacyPayload: Record<string, unknown> = {
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
    };
    // Full payload adds the migration-012 multi-currency columns.
    const fullPayload: Record<string, unknown> = {
      ...legacyPayload,
      amount_native: transaction.amount,
      currency_native: transaction.currency,
      exchange_rate_applied: exchangeRate,
      amount_base: amountBase,
      base_currency_at_entry: baseAtEntry,
      rate_source: rateSource,
    };

    let { data, error } = await supabase
      .from('transactions')
      .insert(fullPayload)
      .select()
      .single();

    // Schema fallback: if the new columns don't exist, retry with
    // legacy columns only. Supabase returns either PGRST204 (column
    // not found in schema cache) or 42703 (undefined column).
    if (error && isMissingColumnError(error)) {
      console.warn('[TransactionStore] Schema mismatch — retrying without multi-currency columns. Run migration 012 to fix.');
      const result = await supabase
        .from('transactions')
        .insert(legacyPayload)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('[TransactionStore] Insert failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      // Surface the actual database error so debugging is possible
      // without DevTools. We trim long messages to keep the toast
      // readable.
      const reason = (error.message || error.code || 'unknown error').slice(0, 160);
      showError(`Couldn't save: ${reason}`);
      return;
    }

    if (data) {
      devLog('[TransactionStore] Transaction inserted successfully:', data);
      const newTransaction = mapRowToTransaction(data);
      setTransactions(prev => {
        if (prev.some((t) => t.id === newTransaction.id)) return prev;
        return [newTransaction, ...prev];
      });
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

    // Two payload shapes — same trick as addTransaction. We try the
    // full multi-currency shape first, fall back to legacy on
    // missing-column errors so old DBs still save the row.
    const buildLegacyRow = (nativeAmount: number) => ({
      amount: nativeAmount,
      currency: input.currency,
    });
    const buildBaseRow = (nativeAmount: number) => ({
      ...buildLegacyRow(nativeAmount),
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
      const commonFields = {
        user_id: userId,
        type: 'expense' as const,
        category: input.topCategory,
        note: input.vendor,
        date: input.date,
        is_recurring: false,
        recurring_end_date: null,
        receipt_id: receiptId,
        subcategory: null,
      };
      let { data, error } = await supabase
        .from('transactions')
        .insert({ ...commonFields, ...buildBaseRow(input.receiptTotal) })
        .select()
        .single();
      if (error && isMissingColumnError(error)) {
        const result = await supabase
          .from('transactions')
          .insert({ ...commonFields, ...buildLegacyRow(input.receiptTotal) })
          .select()
          .single();
        data = result.data;
        error = result.error;
      }
      if (error || !data) {
        console.error('[TransactionStore] addReceipt fallback insert failed:', error?.message, error?.code);
        const reason = (error?.message || error?.code || 'unknown error').slice(0, 160);
        showError(`Couldn't save the receipt: ${reason}`);
        return null;
      }
      setTransactions((prev) => [mapRowToTransaction(data), ...prev]);
      return { receiptId, rowCount: 1 };
    }

    const receiptId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    // Build per-item rows for both shapes. We choose which to send
    // based on the schema-fallback retry below.
    const baseRowCommon = (it: { amount: number; description: string; subcategory: string | null }) => ({
      user_id: userId,
      type: 'expense' as const,
      category: input.topCategory,
      note: `${input.vendor} — ${it.description}`,
      date: input.date,
      is_recurring: false,
      recurring_end_date: null,
      receipt_id: receiptId,
      subcategory: it.subcategory ?? null,
    });
    const fullRows: Record<string, unknown>[] = cleanItems.map((it) => ({
      ...baseRowCommon(it),
      ...buildBaseRow(it.amount),
    }));
    const legacyRows: Record<string, unknown>[] = cleanItems.map((it) => ({
      ...baseRowCommon(it),
      ...buildLegacyRow(it.amount),
    }));

    // Tolerance is intentionally loose (0.5 of the currency unit). VAT,
    // rounding, and tip lines all conspire to create small deltas that
    // we'd rather book honestly than hide.
    const itemsSum = cleanItems.reduce((s, it) => s + it.amount, 0);
    const delta = input.receiptTotal - itemsSum;
    if (Number.isFinite(input.receiptTotal) && Math.abs(delta) > 0.5) {
      const adj = {
        user_id: userId,
        type: 'expense' as const,
        category: input.topCategory,
        note: `${input.vendor} — Tax & adjustments`,
        date: input.date,
        is_recurring: false,
        recurring_end_date: null,
        receipt_id: receiptId,
        subcategory: null,
      };
      fullRows.push({ ...adj, ...buildBaseRow(Math.abs(delta)) });
      legacyRows.push({ ...adj, ...buildLegacyRow(Math.abs(delta)) });
    }

    let { data, error } = await supabase
      .from('transactions')
      .insert(fullRows)
      .select();

    if (error && isMissingColumnError(error)) {
      const result = await supabase
        .from('transactions')
        .insert(legacyRows)
        .select();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('[TransactionStore] addReceipt insert failed:', error.message, error.code);
      const reason = (error.message || error.code || 'unknown error').slice(0, 160);
      showError(`Couldn't save the receipt: ${reason}`);
      return null;
    }

    if (data) {
      const inserted: Transaction[] = data.map((row) => mapRowToTransaction(row));
      setTransactions((prev) => [...inserted, ...prev]);
      return { receiptId, rowCount: inserted.length };
    }

    return { receiptId, rowCount: fullRows.length };
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
      showError("Couldn't delete the entry. Please try again.");
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
      showError("Couldn't delete the receipt. Please try again.");
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

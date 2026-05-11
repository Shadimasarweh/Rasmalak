/**
 * Document Action Builder
 * ========================
 * Maps an extracted document + bill analysis into a small list of
 * `SuggestedAction` chips for the chat UI. The chip click is handled
 * client-side and writes directly to the existing stores
 * (transactionStore, etc.) — no extra LLM call.
 */

import type {
  ExtractedDocument,
  SuggestedAction,
  CreateTransactionPayload,
  SetReminderPayload,
  MarkRecurringPayload,
} from './types';
import type { BillAnalysis } from './deterministic/billAnalysis';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Build the suggested-action list for a parsed document. We keep V1
 * narrow: at most 3 chips per reply.
 */
export function buildSuggestedActionsForBill(
  doc: ExtractedDocument,
  analysis: BillAnalysis,
  language: 'ar' | 'en',
): SuggestedAction[] {
  const out: SuggestedAction[] = [];
  if (doc.amount == null || doc.amount <= 0) return out;

  const currency = doc.currency || 'JOD';
  const fallbackCategory = analysis.recurring.isRecurring ? 'bills' : 'other';
  const category = doc.category ?? fallbackCategory;
  const description = doc.vendorCanonical || doc.vendor || (language === 'ar' ? 'مستند' : 'Document');
  const date = doc.date || todayIso();

  // ── 1. Add as expense (always present when we have an amount) ─────
  const txPayload: CreateTransactionPayload = {
    type: 'expense',
    amount: doc.amount,
    currency,
    category,
    description,
    date,
  };
  out.push({
    id: `add_expense_${doc.amount}_${currency}`,
    label: `Add ${doc.amount} ${currency} as expense`,
    labelAr: `أضف ${doc.amount} ${currency} كمصروف`,
    action: 'create_transaction',
    payload: `${doc.amount} ${currency} • ${description}`,
    payloadData: txPayload,
  });

  // ── 2. Set reminder for due date (only invoices/utilities) ────────
  if (doc.dueDate) {
    const reminder: SetReminderPayload = {
      title: description,
      amount: doc.amount,
      currency,
      dueDate: doc.dueDate,
      vendor: doc.vendor || undefined,
    };
    out.push({
      id: `reminder_${doc.dueDate}`,
      label: `Remind me before ${doc.dueDate}`,
      labelAr: `ذكّرني قبل ${doc.dueDate}`,
      action: 'set_reminder',
      payload: doc.dueDate,
      payloadData: reminder,
    });
  }

  // ── 3. Mark as recurring (utility / subscription pattern) ─────────
  if (analysis.recurring.isRecurring && doc.vendor) {
    const rec: MarkRecurringPayload = {
      vendor: doc.vendorCanonical || doc.vendor,
      amount: doc.amount,
      currency,
      frequency: 'monthly',
      category: doc.category || 'bills',
    };
    out.push({
      id: `recurring_${rec.vendor}`,
      label: 'Track as recurring',
      labelAr: 'تتبّعها كمتكررة',
      action: 'mark_recurring',
      payload: rec.vendor,
      payloadData: rec,
    });
  }

  return out.slice(0, 3);
}

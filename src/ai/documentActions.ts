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
  ExtractedDocumentLineItem,
  SuggestedAction,
  CreateTransactionPayload,
  CreateReceiptPayload,
  SetReminderPayload,
  MarkRecurringPayload,
} from './types';
import type { BillAnalysis } from './deterministic/billAnalysis';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Latin-digit → Arabic-Indic for the "+N more" tail in Arabic mode.
function toArabicNumerals(input: string): string {
  return input.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}

/**
 * Build a short, comma-separated summary of the most identifying line
 * items on a receipt — used to enrich the transaction description so
 * "add as expense" captures what's actually on the receipt instead of
 * just the vendor name.
 *
 * Returns an empty string when there are no usable line items.
 */
export function summarizeLineItems(
  items: ExtractedDocumentLineItem[],
  language: 'ar' | 'en',
  maxNamed: number = 3,
): string {
  const named = items
    .map((it) => (it.description || '').trim())
    .filter((s) => s.length > 0);
  if (named.length === 0) return '';

  const head = named.slice(0, maxNamed);
  const overflow = named.length - head.length;

  if (language === 'ar') {
    const joined = head.join('، ');
    if (overflow <= 0) return joined;
    return `${joined} +${toArabicNumerals(String(overflow))} آخر`;
  }

  const joined = head.join(', ');
  if (overflow <= 0) return joined;
  return `${joined} +${overflow} more`;
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
  const vendorName = doc.vendorCanonical || doc.vendor || (language === 'ar' ? 'مستند' : 'Document');
  // When the receipt has line items, fold a short summary of them into
  // the transaction description so "add as expense" preserves what was
  // actually purchased instead of just the vendor name.
  const itemsSummary = summarizeLineItems(doc.lineItems, language);
  const description = itemsSummary ? `${vendorName} — ${itemsSummary}` : vendorName;
  const date = doc.date || todayIso();

  // ── 1. Add as expense (always present when we have an amount) ─────
  // When the receipt has at least one priced line item we emit a
  // bulk `CreateReceiptPayload` so the chip click writes N rows that
  // share a receipt_id (each tagged with its own subcategory). When
  // it doesn't, we fall back to the original single-row payload —
  // utility bills, fuel receipts, etc. don't benefit from line-item
  // splitting and would otherwise lose the total.
  const pricedItems = doc.lineItems.filter(
    (it) => Number.isFinite(it.amount) && (it.amount as number) > 0,
  );

  if (pricedItems.length > 0) {
    const receiptPayload: CreateReceiptPayload = {
      kind: 'receipt',
      topCategory: category,
      vendor: vendorName,
      currency,
      date,
      receiptTotal: doc.amount,
      items: pricedItems.map((it) => ({
        description: it.description || vendorName,
        amount: it.amount as number,
        subcategory: it.subcategory ?? null,
      })),
    };
    const itemCount = pricedItems.length;
    const itemCountLabelAr = toArabicNumerals(String(itemCount));
    out.push({
      id: `add_receipt_${doc.amount}_${currency}_${itemCount}`,
      label: `Add ${itemCount} items as expenses (${doc.amount} ${currency})`,
      labelAr: `أضف ${itemCountLabelAr} بنداً كمصروفات (${doc.amount} ${currency})`,
      action: 'create_transaction',
      payload: `${itemCount} items • ${doc.amount} ${currency} • ${description}`,
      payloadData: receiptPayload,
    });
  } else {
    const txPayload: CreateTransactionPayload = {
      kind: 'single',
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
  }

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

'use client';

/**
 * Receipt Scanner Modal
 * =====================
 * Lives on /money/track. Lets the user upload a receipt image (file
 * picker, camera capture, or drag-drop), runs the same extractor pipeline
 * the chatbot uses, then surfaces an editable review form.
 *
 * In V1 (per-item rows + food/bills taxonomy) the review step shows an
 * editable line-items table with per-item subcategory dropdowns and a
 * subtotal panel grouped by subcategory. Confirming writes N
 * transaction rows under one shared receipt_id via `addReceipt`. When
 * the receipt has no usable line items we fall back to a single-row
 * insert so the total is still captured.
 *
 * The modal is self-contained: it owns its own state machine
 * (upload / extracting / review / saving / error) and never talks to the
 * chat orchestrator directly — it calls /api/extract-document.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useTransactions } from '@/store/transactionStore';
import { useSession } from '@/store/authStore';
import { useLanguage } from '@/store/useStore';
import {
  ALL_CATEGORIES,
  CURRENCIES,
  DEFAULT_EXPENSE_CATEGORIES,
} from '@/lib/constants';
import {
  SUBCATEGORIES_BY_PARENT,
  SUBCATEGORY_LABELS,
  hasSubcategories,
  classifySubcategory,
  type Subcategory,
} from '@/ai/taxonomy';
import type { ExtractedDocument, MessageAttachment } from '@/ai/types';
import type { BillAnalysis } from '@/ai/deterministic/billAnalysis';

type Stage = 'upload' | 'extracting' | 'review' | 'saving' | 'error';

interface ReceiptScannerModalProps {
  open: boolean;
  onClose: () => void;
}

interface ReviewItem {
  description: string;
  amount: string;          // Kept as string so users can clear/retype.
  subcategory: string | null;
}

interface ReviewState {
  vendor: string;
  amount: string;          // Receipt total
  currency: string;
  date: string;
  category: string;        // Top-level (food / bills / shopping / ...)
  description: string;
  items: ReviewItem[];
}

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
  });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function inferCategory(extracted: ExtractedDocument): string {
  const valid = new Set(ALL_CATEGORIES.map((c) => c.id));
  if (extracted.category && valid.has(extracted.category)) return extracted.category;
  if (extracted.isRecurring) return 'bills';
  return 'other-expense';
}

function buildReviewState(
  extracted: ExtractedDocument,
  language: 'ar' | 'en',
): ReviewState {
  const vendor =
    extracted.vendorCanonical ||
    extracted.vendor ||
    (language === 'ar' ? 'مستند' : 'Receipt');
  const category = inferCategory(extracted);

  // Pre-classify each item against the resolved top category so the
  // dropdowns land on something sensible even if the extractor missed
  // (or guessed) a few. The user can still override.
  const items: ReviewItem[] = (extracted.lineItems ?? [])
    .filter(
      (it) =>
        (it.description || '').trim().length > 0 &&
        (it.amount == null || (Number.isFinite(it.amount) && it.amount > 0)),
    )
    .map((it) => ({
      description: it.description || '',
      amount: it.amount != null ? String(it.amount) : '',
      subcategory: classifySubcategory(
        it.description ?? '',
        category,
        it.subcategory ?? null,
      ),
    }));

  return {
    vendor,
    amount: extracted.amount != null ? String(extracted.amount) : '',
    currency: extracted.currency || 'JOD',
    date: extracted.date || todayIso(),
    category,
    description: vendor,
    items,
  };
}

export default function ReceiptScannerModal({ open, onClose }: ReceiptScannerModalProps) {
  const intl = useIntl();
  const language = useLanguage();
  const session = useSession();
  const { addTransaction, addReceipt } = useTransactions();
  const isRtl = language === 'ar';

  const [stage, setStage] = useState<Stage>('upload');
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedDocument | null>(null);
  const [, setAnalysis] = useState<BillAnalysis | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const reset = useCallback(() => {
    setStage('upload');
    setError(null);
    setExtracted(null);
    setAnalysis(null);
    setPreviewUrl(null);
    setReview(null);
    setDragActive(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const runExtract = useCallback(
    async (file: File) => {
      setError(null);

      if (!ALLOWED_TYPES.has(file.type)) {
        setStage('error');
        setError(intl.formatMessage({ id: 'transactions.scan_error_type' }));
        return;
      }
      if (file.size > MAX_BYTES) {
        setStage('error');
        setError(intl.formatMessage({ id: 'transactions.scan_error_too_large' }));
        return;
      }

      let base64: string;
      try {
        base64 = await fileToBase64(file);
      } catch {
        setStage('error');
        setError(intl.formatMessage({ id: 'transactions.scan_error_unreadable' }));
        return;
      }

      setPreviewUrl(file.type.startsWith('image/') ? base64 : null);
      setStage('extracting');

      const attachment: MessageAttachment = {
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        type: file.type === 'application/pdf' ? 'pdf' : 'image',
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        content: base64,
      };

      try {
        const response = await fetch('/api/extract-document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token && {
              Authorization: `Bearer ${session.access_token}`,
            }),
          },
          body: JSON.stringify({ attachment, language }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          setStage('error');
          setError(
            data?.error ||
              intl.formatMessage({ id: 'transactions.scan_error_unreadable' }),
          );
          return;
        }

        const ex = data.extracted as ExtractedDocument;
        setExtracted(ex);
        setAnalysis(data.analysis as BillAnalysis);
        setReview(buildReviewState(ex, language));
        setStage('review');
      } catch {
        setStage('error');
        setError(intl.formatMessage({ id: 'transactions.scan_error_network' }));
      }
    },
    [intl, language, session?.access_token],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    void runExtract(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void runExtract(file);
  };

  const handleSave = async () => {
    if (!review) return;
    const totalNum = parseFloat(review.amount);
    if (!Number.isFinite(totalNum) || totalNum <= 0) {
      setError(intl.formatMessage({ id: 'transactions.error_amount_required' }));
      return;
    }
    if (!review.category) {
      setError(intl.formatMessage({ id: 'transactions.error_category_required' }));
      return;
    }

    // Coerce per-item amounts; drop empty rows so they don't become 0s.
    const cleanItems = review.items
      .map((it) => ({
        description: it.description.trim(),
        amount: parseFloat(it.amount),
        subcategory: it.subcategory ?? null,
      }))
      .filter(
        (it) =>
          it.description.length > 0 &&
          Number.isFinite(it.amount) &&
          it.amount > 0,
      );

    setError(null);
    setStage('saving');

    try {
      if (cleanItems.length > 0) {
        // Bulk path: N rows under one receipt_id.
        const result = await addReceipt({
          receiptTotal: totalNum,
          currency: review.currency,
          date: review.date,
          topCategory: review.category,
          vendor: review.vendor || review.description,
          items: cleanItems,
        });
        if (!result) {
          setStage('review');
          setError(intl.formatMessage({ id: 'transactions.scan_error_save' }));
          return;
        }
      } else {
        // Fallback: no usable items, behave like a single-row insert.
        await addTransaction({
          type: 'expense',
          amount: totalNum,
          currency: review.currency,
          category: review.category,
          description: review.description.trim() || review.vendor,
          date: review.date,
          isRecurring: false,
          recurringEndDate: null,
        });
      }
      handleClose();
    } catch {
      setStage('review');
      setError(intl.formatMessage({ id: 'transactions.scan_error_save' }));
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
        direction: isRtl ? 'rtl' : 'ltr',
      }}
      onClick={handleClose}
    >
      <div
        className="ds-card"
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '0.5px solid var(--ds-border)',
          }}
        >
          <div>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--ds-text-heading)',
                margin: 0,
              }}
            >
              {intl.formatMessage({ id: 'transactions.scan_receipt_title' })}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', margin: '2px 0 0 0' }}>
              {intl.formatMessage({ id: 'transactions.scan_receipt_subtitle' })}
            </p>
          </div>
          <button
            type="button"
            aria-label={intl.formatMessage({ id: 'transactions.cancel' })}
            onClick={handleClose}
            style={{
              padding: '6px',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--ds-text-muted)',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {stage === 'upload' && (
            <div>
              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(false);
                }}
                onDrop={handleDrop}
                style={{
                  border: dragActive
                    ? '1.5px dashed var(--ds-primary)'
                    : '1.5px dashed var(--ds-border)',
                  background: dragActive
                    ? 'var(--ds-primary-light, #F0F7F4)'
                    : 'var(--ds-bg-tinted, #F5F0EB)',
                  borderRadius: '14px',
                  padding: '28px 16px',
                  textAlign: 'center',
                  transition: 'all 150ms ease',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--ds-bg-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    color: 'var(--ds-primary)',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="9" y1="13" x2="15" y2="13" />
                    <line x1="9" y1="17" x2="13" y2="17" />
                  </svg>
                </div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)', margin: '0 0 4px 0' }}>
                  {intl.formatMessage({ id: 'transactions.scan_upload_hint' })}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', margin: 0 }}>
                  {intl.formatMessage({ id: 'transactions.scan_upload_formats' })}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="ds-btn ds-btn-primary"
                  style={{ flex: 1, minWidth: '140px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {intl.formatMessage({ id: 'transactions.scan_choose_file' })}
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  style={{
                    flex: 1,
                    minWidth: '140px',
                    padding: '9px 18px',
                    background: 'transparent',
                    color: 'var(--ds-primary)',
                    border: '1.5px solid var(--ds-btn-secondary-border)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  {intl.formatMessage({ id: 'transactions.scan_use_camera' })}
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          )}

          {stage === 'extracting' && (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ display: 'inline-block', marginBottom: '12px' }}>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--ds-primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ animation: 'spin 1s linear infinite' }}
                >
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                </svg>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--ds-text-heading)', margin: 0 }}>
                {intl.formatMessage({ id: 'transactions.scan_extracting' })}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', margin: '4px 0 0 0' }}>
                {intl.formatMessage({ id: 'transactions.scan_extracting_hint' })}
              </p>
            </div>
          )}

          {(stage === 'review' || stage === 'saving') && review && (
            <ReviewBody
              review={review}
              setReview={setReview}
              extracted={extracted}
              previewUrl={previewUrl}
              isRtl={isRtl}
              language={language}
              error={error}
              saving={stage === 'saving'}
              onCancel={handleClose}
              onSave={handleSave}
              intl={intl}
            />
          )}

          {stage === 'error' && (
            <div style={{ textAlign: 'center', padding: '24px 8px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--ds-error-bg)',
                  border: '0.5px solid var(--ds-error-border)',
                  color: 'var(--ds-error-text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)', margin: '0 0 4px 0' }}>
                {intl.formatMessage({ id: 'transactions.scan_error_title' })}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', margin: '0 0 16px 0' }}>
                {error || intl.formatMessage({ id: 'transactions.scan_error_unreadable' })}
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setStage('upload')} className="ds-btn ds-btn-primary">
                  {intl.formatMessage({ id: 'transactions.scan_retry' })}
                </button>
                <a
                  href="/money/track/new"
                  onClick={handleClose}
                  style={{
                    padding: '9px 18px',
                    background: 'transparent',
                    color: 'var(--ds-primary)',
                    border: '1.5px solid var(--ds-btn-secondary-border)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                >
                  {intl.formatMessage({ id: 'transactions.scan_enter_manually' })}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Review form ─────────────────────────────────────────────────────

interface ReviewBodyProps {
  review: ReviewState;
  setReview: React.Dispatch<React.SetStateAction<ReviewState | null>>;
  extracted: ExtractedDocument | null;
  previewUrl: string | null;
  isRtl: boolean;
  language: 'ar' | 'en';
  error: string | null;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
  intl: ReturnType<typeof useIntl>;
}

function ReviewBody({
  review,
  setReview,
  extracted,
  previewUrl,
  isRtl,
  language,
  error,
  saving,
  onCancel,
  onSave,
  intl,
}: ReviewBodyProps) {
  const expenseCategories = useMemo(() => DEFAULT_EXPENSE_CATEGORIES, []);
  const lowConfidence = extracted?.confidence === 'low';
  const showSubcats = hasSubcategories(review.category);
  const allowedSubcats = useMemo(
    () => SUBCATEGORIES_BY_PARENT[review.category] ?? [],
    [review.category],
  );

  // Subcategory subtotal panel: groups item amounts by their subcategory
  // so the user can sanity-check totals before saving. Numbers are
  // formatted via react-intl so Arabic gets Arabic-Indic digits.
  const subtotals = useMemo(() => {
    if (!showSubcats) return [];
    const map = new Map<string | null, number>();
    for (const it of review.items) {
      const amt = parseFloat(it.amount);
      if (!Number.isFinite(amt) || amt <= 0) continue;
      const key = it.subcategory ?? null;
      map.set(key, (map.get(key) ?? 0) + amt);
    }
    return Array.from(map.entries()).map(([sub, total]) => ({
      sub,
      total,
      label: sub
        ? SUBCATEGORY_LABELS[sub as Subcategory]?.[language] ?? sub
        : intl.formatMessage({ id: 'transactions.scan_subcategory_unset' }),
    }));
  }, [showSubcats, review.items, language, intl]);

  const itemsSum = useMemo(() => {
    return review.items.reduce((acc, it) => {
      const n = parseFloat(it.amount);
      return acc + (Number.isFinite(n) && n > 0 ? n : 0);
    }, 0);
  }, [review.items]);

  const totalNum = parseFloat(review.amount);
  const delta = Number.isFinite(totalNum) ? totalNum - itemsSum : 0;
  const showDeltaWarning =
    review.items.length > 0 && Math.abs(delta) > 0.5;

  const updateItem = (
    index: number,
    patch: Partial<ReviewItem>,
  ) => {
    setReview((r) => {
      if (!r) return r;
      const next = r.items.slice();
      next[index] = { ...next[index], ...patch };
      return { ...r, items: next };
    });
  };

  const removeItem = (index: number) => {
    setReview((r) => {
      if (!r) return r;
      const next = r.items.slice();
      next.splice(index, 1);
      return { ...r, items: next };
    });
  };

  const addBlankItem = () => {
    setReview((r) => {
      if (!r) return r;
      return {
        ...r,
        items: [
          ...r.items,
          { description: '', amount: '', subcategory: null },
        ],
      };
    });
  };

  // When the user changes the top-level category we re-classify each
  // existing item (LLM proposals scoped to the old parent are no longer
  // valid). Cheap to recompute since item count is bounded at 20.
  const onCategoryChange = (next: string) => {
    setReview((r) => {
      if (!r) return r;
      const reclassified = r.items.map((it) => ({
        ...it,
        subcategory: classifySubcategory(it.description, next, null),
      }));
      return { ...r, category: next, items: reclassified };
    });
  };

  const itemCount = review.items.length;
  const saveLabel = saving
    ? intl.formatMessage({ id: 'transactions.scan_saving' })
    : itemCount > 0
      ? intl.formatMessage(
          { id: 'transactions.scan_save_items' },
          { count: itemCount },
        )
      : intl.formatMessage({ id: 'transactions.scan_save_expense' });

  return (
    <div>
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Receipt preview"
          style={{
            display: 'block',
            width: '100%',
            maxHeight: '160px',
            objectFit: 'contain',
            borderRadius: '12px',
            border: '0.5px solid var(--ds-border)',
            marginBottom: '12px',
            background: 'var(--ds-bg-tinted)',
          }}
        />
      )}

      {lowConfidence && (
        <div
          style={{
            padding: '8px 12px',
            background: 'var(--ds-warning-bg)',
            border: '0.5px solid var(--ds-warning-border)',
            color: 'var(--ds-warning-text)',
            borderRadius: '8px',
            fontSize: '12px',
            marginBottom: '12px',
          }}
        >
          {intl.formatMessage({ id: 'transactions.scan_low_confidence' })}
        </div>
      )}

      <div style={{ display: 'grid', gap: '10px' }}>
        <Field label={intl.formatMessage({ id: 'transactions.scan_field_vendor' })}>
          <input
            type="text"
            value={review.vendor}
            onChange={(e) => setReview((r) => (r ? { ...r, vendor: e.target.value } : r))}
            style={inputStyle()}
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
          <Field label={intl.formatMessage({ id: 'transactions.amount' })}>
            <input
              type="text"
              inputMode="decimal"
              value={review.amount}
              onChange={(e) =>
                setReview((r) => (r ? { ...r, amount: e.target.value.replace(/[^0-9.,]/g, '') } : r))
              }
              style={inputStyle()}
            />
          </Field>
          <Field label={intl.formatMessage({ id: 'transactions.scan_field_currency' })}>
            <select
              value={review.currency}
              onChange={(e) => setReview((r) => (r ? { ...r, currency: e.target.value } : r))}
              style={inputStyle()}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <Field label={intl.formatMessage({ id: 'transactions.date' })}>
            <input
              type="date"
              value={review.date}
              onChange={(e) => setReview((r) => (r ? { ...r, date: e.target.value } : r))}
              style={inputStyle()}
            />
          </Field>
          <Field label={intl.formatMessage({ id: 'transactions.category' })}>
            <select
              value={review.category}
              onChange={(e) => onCategoryChange(e.target.value)}
              style={inputStyle()}
            >
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {isRtl ? c.nameAr : c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* ── Editable line items ───────────────────────────────────── */}
      <div style={{ marginTop: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '6px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--ds-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {intl.formatMessage({ id: 'transactions.scan_line_items_heading' })}
          </span>
          <button
            type="button"
            onClick={addBlankItem}
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--ds-primary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            + {intl.formatMessage({ id: 'transactions.scan_line_items_add' })}
          </button>
        </div>

        {review.items.length === 0 ? (
          <div
            style={{
              padding: '12px',
              border: '0.5px dashed var(--ds-border)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--ds-text-muted)',
              textAlign: 'center',
            }}
          >
            {intl.formatMessage({ id: 'transactions.scan_line_items_empty' })}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '6px',
              maxHeight: '260px',
              overflowY: 'auto',
              padding: '4px',
            }}
          >
            {review.items.map((it, i) => (
              <div
                key={`item-${i}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: showSubcats
                    ? '2fr 1fr 1.4fr auto'
                    : '2fr 1fr auto',
                  gap: '6px',
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  value={it.description}
                  placeholder={intl.formatMessage({
                    id: 'transactions.scan_item_description_placeholder',
                  })}
                  onChange={(e) => updateItem(i, { description: e.target.value })}
                  style={{ ...inputStyle(), padding: '6px 8px', fontSize: '12px' }}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={it.amount}
                  placeholder="0"
                  onChange={(e) =>
                    updateItem(i, {
                      amount: e.target.value.replace(/[^0-9.,]/g, ''),
                    })
                  }
                  style={{
                    ...inputStyle(),
                    padding: '6px 8px',
                    fontSize: '12px',
                    textAlign: 'end',
                  }}
                />
                {showSubcats && (
                  <select
                    value={it.subcategory ?? ''}
                    onChange={(e) =>
                      updateItem(i, {
                        subcategory: e.target.value ? e.target.value : null,
                      })
                    }
                    style={{ ...inputStyle(), padding: '6px 8px', fontSize: '12px' }}
                  >
                    <option value="">
                      {intl.formatMessage({ id: 'transactions.scan_subcategory_unset' })}
                    </option>
                    {allowedSubcats.map((sub) => (
                      <option key={sub} value={sub}>
                        {SUBCATEGORY_LABELS[sub][language]}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  aria-label={intl.formatMessage({ id: 'transactions.cancel' })}
                  style={{
                    width: '28px',
                    height: '28px',
                    background: 'transparent',
                    border: '0.5px solid var(--ds-border)',
                    borderRadius: '6px',
                    color: 'var(--ds-text-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Subcategory subtotal panel ───────────────────────────── */}
      {showSubcats && subtotals.length > 0 && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            background: 'var(--ds-bg-tinted)',
            border: '0.5px solid var(--ds-border)',
            borderRadius: '10px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px 12px',
          }}
        >
          {subtotals.map((s) => (
            <div
              key={String(s.sub)}
              style={{
                fontSize: '12px',
                color: 'var(--ds-text-body)',
              }}
            >
              <span style={{ fontWeight: 500, color: 'var(--ds-text-heading)' }}>
                {s.label}
              </span>
              <span style={{ marginInlineStart: '4px', color: 'var(--ds-text-muted)' }}>
                {intl.formatNumber(s.total, {
                  maximumFractionDigits: 2,
                })}{' '}
                {review.currency}
              </span>
            </div>
          ))}
        </div>
      )}

      {showDeltaWarning && (
        <p
          style={{
            marginTop: '8px',
            fontSize: '11px',
            color: 'var(--ds-text-muted)',
          }}
        >
          {intl.formatMessage(
            { id: 'transactions.scan_delta_hint' },
            {
              delta: `${intl.formatNumber(Math.abs(delta), { maximumFractionDigits: 2 })} ${review.currency}`,
            },
          )}
        </p>
      )}

      {error && (
        <p style={{ color: 'var(--ds-error)', fontSize: '12px', marginTop: '10px' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          style={{
            padding: '9px 18px',
            background: 'transparent',
            color: 'var(--ds-text-body)',
            border: '0.5px solid var(--ds-border)',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {intl.formatMessage({ id: 'transactions.cancel' })}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="ds-btn ds-btn-primary"
          style={{ minWidth: '160px', opacity: saving ? 0.7 : 1 }}
        >
          {saveLabel}
        </button>
      </div>

      <span style={{ display: 'none' }}>{language}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--ds-bg-card)',
    border: '0.5px solid var(--ds-border)',
    borderRadius: '8px',
    fontSize: '13px',
    color: 'var(--ds-text-heading)',
    outline: 'none',
    fontFamily: 'inherit',
  };
}

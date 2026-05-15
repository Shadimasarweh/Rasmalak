/**
 * Receipt / Bill Extraction API
 * ==============================
 * Standalone endpoint for the Receipt Scanner modal on /money/track.
 *
 * Same model + JSON schema as the chat orchestrator's extractor pass —
 * we deliberately reuse `extractDocument()` and `analyzeBill()` so the
 * scanner UI and the chatbot agree on the parsed bill, including the
 * cached extraction when the same image was just uploaded in chat.
 *
 * POST /api/extract-document
 * Body: { attachment: MessageAttachment, language: 'ar'|'en', recentTransactions? }
 * Returns: { success: true, extracted: ExtractedDocument, analysis: BillAnalysis }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractDocument } from '@/ai/extractDocument';
import { analyzeBill } from '@/ai/deterministic/billAnalysis';
import { buildEmptyContext } from '@/ai/context';
import type { MessageAttachment } from '@/ai/types';
import type { HistoricalTransaction } from '@/ai/deterministic/billAnalysis';
import { AI_FEATURES } from '@/ai/config';

// ── Auth ────────────────────────────────────────────────────────────

async function authenticateRequest(
  request: NextRequest,
): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  return { userId: user.id };
}

// ── Rate limit ──────────────────────────────────────────────────────
// Cheaper than /api/chat (single LLM call, no chat retries) but we still
// want a per-user ceiling because every call is a billable Vision request.

const MAX_RATE_LIMIT_ENTRIES = 10_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const limit = 30; // 30 receipts/minute is generous for a real user

  const existing = rateLimitMap.get(userId);

  if (!existing || now > existing.resetAt) {
    if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
      const firstKey = rateLimitMap.keys().next().value;
      if (firstKey) rateLimitMap.delete(firstKey);
    }
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) return false;
  existing.count++;
  return true;
}

// ── Validation ──────────────────────────────────────────────────────

interface ExtractRequestBody {
  attachment: MessageAttachment;
  language: 'ar' | 'en';
  recentTransactions?: HistoricalTransaction[];
}

function validateRequest(
  body: unknown,
): { valid: true; data: ExtractRequestBody } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const data = body as Record<string, unknown>;
  const attachment = data.attachment as MessageAttachment | undefined;

  if (!attachment || typeof attachment !== 'object') {
    return { valid: false, error: 'Attachment is required' };
  }
  if (!attachment.type || !attachment.content || !attachment.filename) {
    return { valid: false, error: 'Invalid attachment format' };
  }
  if (attachment.type !== 'image' && attachment.type !== 'pdf') {
    return { valid: false, error: 'Only image or PDF attachments are supported' };
  }

  // Same 4 MB cap as /api/chat — keeps token costs and latency in check.
  if (attachment.content.length > 4 * 1024 * 1024) {
    return { valid: false, error: 'Attachment too large. Maximum 4MB' };
  }

  // Filename safety mirrors /api/chat so the scanner doesn't introduce
  // a new attack surface for path/header injection.
  const SAFE_FILENAME = /^[\p{L}\p{N}_\-][\p{L}\p{N}_\-. ]{0,254}$/u;
  if (!SAFE_FILENAME.test(attachment.filename) || attachment.filename.includes('..')) {
    return { valid: false, error: 'Invalid attachment filename' };
  }

  const language = (data.language as string) || 'ar';
  if (language !== 'ar' && language !== 'en') {
    return { valid: false, error: 'Language must be "ar" or "en"' };
  }

  let recentTransactions: HistoricalTransaction[] | undefined;
  if (Array.isArray(data.recentTransactions)) {
    const raw = data.recentTransactions as HistoricalTransaction[];
    recentTransactions = raw.slice(0, 200).filter((t) => {
      return (
        typeof t === 'object' &&
        t !== null &&
        Number.isFinite(t.amount) &&
        typeof t.date === 'string' &&
        t.date.length <= 32
      );
    });
  }

  return {
    valid: true,
    data: {
      attachment,
      language: language as 'ar' | 'en',
      recentTransactions,
    },
  };
}

// ── CORS ────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = new Set([
  'https://rasmalak.vercel.app',
  'http://localhost:3000',
]);

function getCorsOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin') || '';
  return ALLOWED_ORIGINS.has(origin) ? origin : '';
}

// ── Handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!AI_FEATURES.chatEnabled) {
    return NextResponse.json(
      { success: false, error: 'AI features are currently disabled' },
      { status: 503 },
    );
  }

  const authResult = await authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 },
      );
    }

    const { attachment, language, recentTransactions } = validation.data;

    if (!checkRateLimit(authResult.userId)) {
      return NextResponse.json(
        {
          success: false,
          error:
            language === 'ar'
              ? 'الكثير من الطلبات. الرجاء الانتظار قليلاً.'
              : 'Too many requests. Please wait a moment.',
        },
        { status: 429 },
      );
    }

    // Single Vision call. Wrap in an AbortController-ish budget by
    // letting the platform 60s function timeout enforce the ceiling —
    // extractDocument itself returns null on provider failure.
    const extracted = await extractDocument(attachment, language);
    if (!extracted) {
      return NextResponse.json(
        {
          success: false,
          error:
            language === 'ar'
              ? 'تعذر قراءة الإيصال. حاول بصورة أوضح أو أدخل المصروف يدوياً.'
              : "Couldn't read this receipt. Try a clearer image or enter the expense manually.",
        },
        { status: 422 },
      );
    }

    // The scanner doesn't surface budget impact / duplicate warnings
    // in V1, but we still run analyzeBill so the response shape matches
    // the chat orchestrator and the modal can light up these signals
    // later without an API change.
    const context = buildEmptyContext('JOD', language);
    const analysis = analyzeBill(extracted, recentTransactions ?? [], context);

    return NextResponse.json({
      success: true,
      extracted,
      analysis,
    });
  } catch (error) {
    console.error('[Extract Document API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 },
    );
  }
}

// ── OPTIONS ─────────────────────────────────────────────────────────

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  const origin = getCorsOrigin(request);
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...(origin && { 'Access-Control-Allow-Origin': origin }),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      Vary: 'Origin',
    },
  });
}

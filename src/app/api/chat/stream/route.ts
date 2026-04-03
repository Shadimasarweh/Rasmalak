/**
 * Rasmalak Streaming Chat API Route
 * ===================================
 * Same orchestration as /api/chat but streams tokens back via SSE.
 * Post-processing (memory, logging) runs fire-and-forget after the stream.
 *
 * POST /api/chat/stream
 * Body: { message, conversationId?, language, context? }
 * Returns: text/event-stream   data: {"text":"..."}\n\n  …  data: [DONE]\n\n
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { classifyIntent } from '@/ai/orchestrator/intentClassifier';
import { findAgentForIntent } from '@/ai/agents/registry';
import { composePrompt } from '@/ai/orchestrator/promptComposer';
import { selectContext } from '@/ai/context/contextSelector';
import { readMemoryFields } from '@/ai/memory/memoryService';
import { computeDeterministicFromContext } from '@/ai/orchestrator';
import {
  sendStreamingChatCompletion,
  formatMessagesForProvider,
} from '@/ai/providers/gemini';
import { updateMemoryFromSignals } from '@/ai/memory/updateRules';
import { writeAuditLog } from '@/ai/validation/auditLogger';
import { logFinancialAdvice } from '@/ai/adviceLogger';
import { computeContextHash } from '@/ai/contextHash';
import { buildEmptyContext } from '@/ai/context';
import { AI_SAFETY, AI_CONFIG, API_CONFIG } from '@/ai/config';
import type { UserFinancialContext } from '@/ai/types';

// ============================================
// AUTH
// ============================================

async function authenticateRequest(request: NextRequest): Promise<{ userId: string } | null> {
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

// ============================================
// RATE LIMITING
// ============================================

const MAX_RATE_LIMIT_ENTRIES = 10_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const existing = rateLimitMap.get(userId);

  if (!existing || now > existing.resetAt) {
    if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
      const firstKey = rateLimitMap.keys().next().value;
      if (firstKey) rateLimitMap.delete(firstKey);
    }
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (existing.count >= API_CONFIG.rateLimitPerMinute) return false;
  existing.count++;
  return true;
}

// ============================================
// OUTPUT SANITIZATION
// ============================================

function sanitize(text: string): string {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/?(?:script|iframe|object|embed|form|input|button|link|meta|style)\b[^>]*>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript\s*:/gi, '');
}

// ============================================
// MODEL TIERING (mirrors orchestrator)
// ============================================

const FLASH_INTENTS = new Set([
  'greeting', 'gratitude', 'unclear', 'out_of_scope',
  'explain_concept', 'learning_recommendation',
]);

// ============================================
// ACTIONABLE INTENTS (for advice logging)
// ============================================

const ACTIONABLE_INTENTS = new Set([
  'analyze_spending', 'category_breakdown', 'compare_periods',
  'savings_advice', 'goal_progress', 'goal_planning',
  'budget_status', 'budget_advice', 'overspending_alert',
  'predict_end_of_month', 'simulate_scenario', 'forecast_savings',
]);

function intentToMetric(intent: string): string {
  if (['savings_advice', 'goal_progress', 'goal_planning', 'forecast_savings'].includes(intent)) return 'savings';
  if (['budget_status', 'budget_advice', 'overspending_alert'].includes(intent)) return 'budget';
  if (['predict_end_of_month', 'simulate_scenario'].includes(intent)) return 'cashflow';
  return 'spending';
}

// ============================================
// SSE HELPERS
// ============================================

const encoder = new TextEncoder();

function sseChunk(text: string): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify({ text })}\n\n`);
}

function sseError(msg: string): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`);
}

const sseDone = encoder.encode('data: [DONE]\n\n');

// ============================================
// PROMPT INJECTION ESCAPE
// ============================================

function escapeUserInput(input: string): string {
  return input
    .replace(/^(#{1,6})\s/gm, '\\$1 ')
    .replace(/^---+$/gm, '—')
    .replace(/```/g, '\\`\\`\\`')
    .replace(/\[INST\]/gi, '[inst]')
    .replace(/\[\/INST\]/gi, '[/inst]')
    .replace(/<\|[^|]*\|>/g, '')
    .replace(/<<SYS>>|<\/SYS>>/gi, '');
}

// ============================================
// MAIN HANDLER
// ============================================

export async function POST(request: NextRequest) {
  const jsonErr = (msg: string, status: number) =>
    Response.json({ success: false, error: msg }, { status });

  // Auth
  const authResult = await authenticateRequest(request);
  if (!authResult) return jsonErr('Authentication required', 401);

  // Parse body
  let body: { message?: string; conversationId?: string; language?: string; context?: UserFinancialContext };
  try {
    body = await request.json();
  } catch {
    return jsonErr('Invalid request body', 400);
  }

  const { message = '', conversationId, language = 'ar', context } = body;

  if (!message || message.trim().length === 0) return jsonErr('Message is required', 400);
  if (message.length > AI_SAFETY.maxInputLength) return jsonErr(`Message too long. Maximum ${AI_SAFETY.maxInputLength} characters.`, 400);

  const lang = (language === 'en' ? 'en' : 'ar') as 'ar' | 'en';

  if (!checkRateLimit(authResult.userId)) {
    return jsonErr(lang === 'ar' ? 'الكثير من الطلبات. الرجاء الانتظار قليلاً.' : 'Too many requests. Please wait a moment.', 429);
  }

  const userId = authResult.userId;
  const convId = conversationId || `conv_${crypto.randomUUID()}`;
  const userContext = context || buildEmptyContext('JOD', lang);

  // ── Sync pipeline (fast, no I/O) ──
  const sanitizedMessage = escapeUserInput(message.trim());
  const intentResult = classifyIntent(sanitizedMessage);
  const agent = findAgentForIntent(intentResult.intent);

  // ── Memory read (async, non-blocking for deterministic layer) ──
  const memoryPromise = userId && agent.requiredMemoryFields.length > 0
    ? readMemoryFields(userId, agent.requiredMemoryFields).catch(() => ({}))
    : Promise.resolve({});

  // ── Deterministic layer (sync) ──
  const deterministic = agent.needsDeterministicLayer
    ? computeDeterministicFromContext(userContext)
    : null;

  const memoryFields = await memoryPromise;

  const contextSelection = selectContext(intentResult, agent, userContext, memoryFields);

  const composed = composePrompt(agent, {
    language: lang,
    contextSlices: contextSelection.financialSlices,
    memoryFields: contextSelection.memoryFields,
    deterministic,
    userMessage: sanitizedMessage,
    conversationHistory: [],
    attachments: undefined,
  });

  const messages = formatMessagesForProvider(
    composed.systemPrompt,
    [],
    sanitizedMessage,
    undefined,
  );

  // Model tiering: Flash for simple intents, Pro for financial analysis
  const model = FLASH_INTENTS.has(intentResult.intent)
    ? (AI_CONFIG.flashModel ?? AI_CONFIG.model)
    : AI_CONFIG.model;

  // ── Build the SSE stream ──
  let fullText = '';

  const stream = new ReadableStream({
    async start(controller) {
      const abort = new AbortController();

      // Client disconnect → abort the Gemini stream
      request.signal.addEventListener('abort', () => abort.abort());

      try {
        for await (const chunk of sendStreamingChatCompletion(
          messages,
          { model, temperature: AI_CONFIG.temperature },
          abort.signal,
        )) {
          const safe = sanitize(chunk);
          fullText += safe;
          controller.enqueue(sseChunk(safe));
        }

        controller.enqueue(sseDone);
      } catch {
        controller.enqueue(sseError(
          lang === 'ar'
            ? 'انقطع الاتصال. الرجاء المحاولة مرة أخرى.'
            : 'Connection interrupted. Please try again.'
        ));
      } finally {
        controller.close();

        // Fire-and-forget post-processing — does not block the client
        void (async () => {
          try {
            if (userId && deterministic) {
              await updateMemoryFromSignals(userId, deterministic, agent.id);
            }
          } catch { /* non-fatal */ }

          try {
            if (userId && ACTIONABLE_INTENTS.has(intentResult.intent) && fullText) {
              const contextHash = await computeContextHash(userContext);
              await logFinancialAdvice({
                user_id: userId,
                source: 'ai',
                advice_text: fullText,
                target_metric: intentToMetric(intentResult.intent),
                confidence: intentResult.confidence,
                conversation_id: convId,
                context_hash: contextHash,
              });
            }
          } catch { /* non-fatal */ }

          try {
            if (userId) {
              await writeAuditLog(userId, {
                intent: intentResult.intent,
                intentConfidence: intentResult.confidence,
                agentId: agent.id,
                memoryFieldsUsed: Object.keys(contextSelection.memoryFields),
                memoryFieldsWritten: [],
                deterministicValues: deterministic ? {
                  healthScore: deterministic.financialHealth.score,
                  healthBand: deterministic.financialHealth.band,
                  savingsRate: deterministic.signals.savingsRate ?? null,
                  incomeStability: deterministic.signals.incomeStability ?? null,
                } : {},
                contextSlicesUsed: contextSelection.financialSlices.map(s => s.type),
                validationResults: [],
                confidenceScore: intentResult.confidenceScore,
                processingTimeMs: 0,
                retried: false,
                timestamp: new Date().toISOString(),
              });
            }
          } catch { /* non-fatal */ }
        })();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Conversation-Id': convId,
    },
  });
}

// ============================================
// OPTIONS (CORS)
// ============================================

const ALLOWED_ORIGINS = new Set([
  'https://rasmalak.vercel.app',
  'http://localhost:3000',
]);

export async function OPTIONS(request: NextRequest): Promise<Response> {
  const origin = request.headers.get('origin') || '';
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : '';
  return new Response(null, {
    status: 200,
    headers: {
      ...(allowed && { 'Access-Control-Allow-Origin': allowed }),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Vary': 'Origin',
    },
  });
}

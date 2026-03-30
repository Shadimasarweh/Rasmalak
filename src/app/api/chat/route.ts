/**
 * Rasmalak Chat API Route
 * =======================
 * Handles chat messages through the AI Orchestrator.
 * 
 * POST /api/chat
 * Body: { message: string, conversationId?: string, context: UserFinancialContext }
 * Returns: { success: boolean, response?: AIResponse, conversationId: string, error?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { orchestrator } from '@/ai/orchestrator';
import { ChatResponse, UserFinancialContext, MessageAttachment } from '@/ai/types';
import { AI_SAFETY, AI_FEATURES } from '@/ai/config';
import { buildEmptyContext } from '@/ai/context';

// ============================================
// AUTH HELPERS
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
// CORS
// ============================================

const ALLOWED_ORIGINS = new Set([
  'https://rasmalak.vercel.app',
  'http://localhost:3000',
]);

function getCorsOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin') || '';
  return ALLOWED_ORIGINS.has(origin) ? origin : '';
}

// ============================================
// RATE LIMITING (In-memory with bounded size)
// Limitation: resets on server restart, per-instance only.
// TODO: migrate to Redis or Supabase for distributed rate limiting.
// ============================================

const MAX_RATE_LIMIT_ENTRIES = 10_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const limit = 20;
  
  const existing = rateLimitMap.get(userId);
  
  if (!existing || now > existing.resetAt) {
    if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
      const firstKey = rateLimitMap.keys().next().value;
      if (firstKey) rateLimitMap.delete(firstKey);
    }
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (existing.count >= limit) {
    return false;
  }
  
  existing.count++;
  return true;
}

// ============================================
// OUTPUT SANITIZATION
// ============================================

function sanitizeLLMOutput(text: string): string {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/?(?:script|iframe|object|embed|form|input|button|link|meta|style)\b[^>]*>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript\s*:/gi, '');
}

// ============================================
// REQUEST VALIDATION
// ============================================

interface ChatRequestBody {
  message: string;
  conversationId?: string;
  language: 'ar' | 'en';
  context?: UserFinancialContext;
  attachments?: MessageAttachment[];
}

function validateRequest(body: unknown): { valid: true; data: ChatRequestBody } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }
  
  const data = body as Record<string, unknown>;
  const attachments = data.attachments as MessageAttachment[] | undefined;
  const hasAttachments = attachments && attachments.length > 0;
  
  if (!data.message || typeof data.message !== 'string') {
    if (!hasAttachments) {
      return { valid: false, error: 'Message is required' };
    }
  }
  
  const message = (data.message as string) || '';
  
  if (message.length === 0 && !hasAttachments) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  
  if (message.length > AI_SAFETY.maxInputLength) {
    return { valid: false, error: `Message too long. Maximum ${AI_SAFETY.maxInputLength} characters.` };
  }
  
  if (hasAttachments) {
    if (attachments.length > 5) {
      return { valid: false, error: 'Maximum 5 attachments allowed' };
    }
    const SAFE_FILENAME = /^[a-zA-Z0-9_\-][a-zA-Z0-9_\-. ]{0,254}$/;
    for (const att of attachments) {
      if (!att.type || !att.content || !att.filename) {
        return { valid: false, error: 'Invalid attachment format' };
      }
      if (!SAFE_FILENAME.test(att.filename) || att.filename.includes('..')) {
        return { valid: false, error: 'Invalid attachment filename' };
      }
      if (att.content.length > 10 * 1024 * 1024) {
        return { valid: false, error: 'Attachment too large. Maximum 10MB' };
      }
    }
  }
  
  const language = data.language as string || 'ar';
  if (language !== 'ar' && language !== 'en') {
    return { valid: false, error: 'Language must be "ar" or "en"' };
  }
  
  return {
    valid: true,
    data: {
      message,
      conversationId: data.conversationId as string | undefined,
      language: language as 'ar' | 'en',
      context: data.context as UserFinancialContext | undefined,
      attachments,
    },
  };
}

// ============================================
// MAIN HANDLER
// ============================================

export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse>> {
  if (!AI_FEATURES.chatEnabled) {
    return NextResponse.json({
      success: false,
      conversationId: '',
      error: 'Chat is currently disabled',
    }, { status: 503 });
  }
  
  const authResult = await authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({
      success: false,
      conversationId: '',
      error: 'Authentication required',
    }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    
    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        conversationId: '',
        error: validation.error,
      }, { status: 400 });
    }
    
    const { message, conversationId, language, context, attachments } = validation.data;
    const userId = authResult.userId;
    
    if (!checkRateLimit(userId)) {
      return NextResponse.json({
        success: false,
        conversationId: conversationId || '',
        error: language === 'ar' 
          ? 'الكثير من الطلبات. الرجاء الانتظار قليلاً.'
          : 'Too many requests. Please wait a moment.',
      }, { status: 429 });
    }
    
    const convId = conversationId || `conv_${crypto.randomUUID()}`;
    const userContext = context || buildEmptyContext('JOD', language);
    
    if (AI_SAFETY.enableLogging) {
      console.log('[Chat API] Request:', {
        userId,
        conversationId: convId,
        messageLength: message.length,
        language,
        hasContext: !!context,
        attachmentCount: attachments?.length || 0,
      });
    }
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35_000);

    let result;
    try {
      result = await orchestrator.process({
        message,
        context: userContext,
        conversationId: convId,
        language,
        userId,
        attachments,
      });
    } finally {
      clearTimeout(timeout);
    }
    
    if (AI_SAFETY.enableLogging) {
      console.log('[Chat API] Response:', {
        conversationId: convId,
        intent: result.trace.intent,
        agent: result.trace.agentId,
        confidence: result.trace.intentConfidence,
        processingTime: result.trace.processingTimeMs,
        retried: result.trace.retried,
        validationStages: result.trace.validationResults.length,
      });
    }
    
    const sanitizedResponse = {
      ...result.response,
      message: sanitizeLLMOutput(result.response.message),
      ...(result.response.messageAr && { messageAr: sanitizeLLMOutput(result.response.messageAr) }),
    };

    return NextResponse.json({
      success: true,
      response: sanitizedResponse,
      conversationId: convId,
    });
    
  } catch (error) {
    console.error('[Chat API] Error:', error);
    
    return NextResponse.json({
      success: false,
      conversationId: '',
      error: 'An unexpected error occurred. Please try again.',
    }, { status: 500 });
  }
}

// ============================================
// OPTIONS (CORS)
// ============================================

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  const origin = getCorsOrigin(request);
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...(origin && { 'Access-Control-Allow-Origin': origin }),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Vary': 'Origin',
    },
  });
}

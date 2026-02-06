/**
 * Rasmalak Chat API Route
 * =======================
 * Handles chat messages and returns AI responses.
 * 
 * POST /api/chat
 * Body: { message: string, conversationId?: string, context: UserFinancialContext }
 * Returns: { success: boolean, response?: AIResponse, conversationId: string, error?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/ai/service';
import { ChatRequest, ChatResponse, UserFinancialContext } from '@/ai/types';
import { AI_SAFETY, AI_FEATURES } from '@/ai/config';
import { buildEmptyContext } from '@/ai/context';

// ============================================
// RATE LIMITING (Simple in-memory)
// ============================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const limit = 20; // 20 requests per minute
  
  const existing = rateLimitMap.get(userId);
  
  if (!existing || now > existing.resetAt) {
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
// REQUEST VALIDATION
// ============================================

interface ChatRequestBody extends ChatRequest {
  context?: UserFinancialContext;
  userId?: string;
}

function validateRequest(body: unknown): { valid: true; data: ChatRequestBody } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }
  
  const data = body as Record<string, unknown>;
  
  // Check message
  if (!data.message || typeof data.message !== 'string') {
    return { valid: false, error: 'Message is required' };
  }
  
  if (data.message.length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  
  if (data.message.length > AI_SAFETY.maxInputLength) {
    return { valid: false, error: `Message too long. Maximum ${AI_SAFETY.maxInputLength} characters.` };
  }
  
  // Check language
  const language = data.language as string || 'ar';
  if (language !== 'ar' && language !== 'en') {
    return { valid: false, error: 'Language must be "ar" or "en"' };
  }
  
  return {
    valid: true,
    data: {
      message: data.message as string,
      conversationId: data.conversationId as string | undefined,
      language: language as 'ar' | 'en',
      context: data.context as UserFinancialContext | undefined,
      userId: data.userId as string | undefined,
    },
  };
}

// ============================================
// MAIN HANDLER
// ============================================

export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse>> {
  // Check if chat is enabled
  if (!AI_FEATURES.chatEnabled) {
    return NextResponse.json({
      success: false,
      conversationId: '',
      error: 'Chat is currently disabled',
    }, { status: 503 });
  }
  
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request
    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        conversationId: '',
        error: validation.error,
      }, { status: 400 });
    }
    
    const { message, conversationId, language, context, userId } = validation.data;
    
    // Rate limiting
    const userKey = userId || request.headers.get('x-forwarded-for') || 'anonymous';
    if (!checkRateLimit(userKey)) {
      return NextResponse.json({
        success: false,
        conversationId: conversationId || '',
        error: language === 'ar' 
          ? 'الكثير من الطلبات. الرجاء الانتظار قليلاً.'
          : 'Too many requests. Please wait a moment.',
      }, { status: 429 });
    }
    
    // Generate or use existing conversation ID
    const convId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Use provided context or build empty one
    const userContext = context || buildEmptyContext('JOD', language);
    
    // Log request (if enabled)
    if (AI_SAFETY.enableLogging) {
      console.log('[Chat API] Request:', {
        userId: userKey,
        conversationId: convId,
        messageLength: message.length,
        language,
        hasContext: !!context,
      });
    }
    
    // Call AI service
    const response = await aiService.chat(message, userContext, convId, language);
    
    // Log response (if enabled)
    if (AI_SAFETY.enableLogging) {
      console.log('[Chat API] Response:', {
        conversationId: convId,
        intent: response.intent,
        confidence: response.confidence,
        processingTime: response.processingTime,
      });
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      response,
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

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}



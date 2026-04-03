/**
 * Rasmalak Course Tutor API Route
 * ================================
 * Dedicated endpoint for the in-course tutor chat.
 * Bypasses the financial orchestrator entirely — answers only from course material.
 *
 * POST /api/tutor
 * Body: { message, courseId, language, conversationHistory? }
 * Returns: { success, content?, error? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCourse } from '@/data/courses';
import { sendChatCompletionWithRetry } from '@/ai/providers/gemini';
import { AI_SAFETY, AI_CONFIG } from '@/ai/config';
import type {
  CourseData, Lesson, Section,
  ParagraphBlock, ListBlock, KeyInsightBlock, ExampleBlock,
  ComparisonBlock, ActionPromptBlock, CheckpointBlock,
} from '@/types/course';

type Block = ParagraphBlock | ListBlock | KeyInsightBlock | ExampleBlock | ComparisonBlock | ActionPromptBlock | CheckpointBlock;

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
// RATE LIMITING (shared with /api/chat)
// ============================================

const MAX_RATE_LIMIT_ENTRIES = 10_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const limit = 30; // slightly higher than chat since tutor calls are shorter

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

// ============================================
// COURSE CONTENT SERIALIZER
// ============================================

function blockToText(block: Block): string {
  switch (block.type) {
    case 'p':
      return block.text;
    case 'ul':
      return block.items.map((item) => `• ${item}`).join('\n');
    case 'key_insight':
      return `Key insight — ${block.title}: ${block.text}`;
    case 'example': {
      const rows = block.rows.map((r) => `${r.label}: ${r.value}`).join(', ');
      return `Example${block.title ? ` (${block.title})` : ''}: ${rows}`;
    }
    case 'comparison':
      return [
        `${block.leftTitle}: ${block.leftItems.join(', ')}`,
        `${block.rightTitle}: ${block.rightItems.join(', ')}`,
      ].join(' | ');
    case 'action_prompt':
      return `Action: ${block.text}`;
    case 'checkpoint':
      return `Checkpoint${block.title ? ` — ${block.title}` : ''}: ${block.items.join('; ')}`;
    default:
      return '';
  }
}

function sectionToText(section: Section): string {
  const blocks = (section.blocks || []).map(blockToText).filter(Boolean).join('\n');
  return `### ${section.title}\n${blocks}`;
}

function lessonToText(lesson: Lesson): string {
  const sections = (lesson.sections || []).map(sectionToText).join('\n\n');
  return `## Lesson ${lesson.order}: ${lesson.title}\n${sections}`;
}

function courseToText(course: CourseData): string {
  const lessons = (course.lessons || []).map(lessonToText).join('\n\n');
  return `# ${course.title}\n\n${course.description}\n\n${lessons}`;
}

// ============================================
// SYSTEM PROMPT
// ============================================

function buildSystemPrompt(course: CourseData, language: 'ar' | 'en'): string {
  const courseText = courseToText(course);

  if (language === 'ar') {
    return `أنت مساعد تعليمي متخصص في هذه الدورة فقط: "${course.title}".

محتوى الدورة الكامل:
${courseText}

قواعد صارمة:
- أجب فقط عن أسئلة تتعلق بمحتوى هذه الدورة.
- إذا سأل المستخدم عن موضوع خارج الدورة، أخبره بلطف أن هذا خارج نطاق الدورة واقترح العودة للموضوع.
- لا تقدم نصائح مالية شخصية أو تحليل إنفاق أو توصيات استثمار.
- اشرح المفاهيم بوضوح وبأمثلة عملية من محتوى الدورة.
- استخدم اللغة العربية دائماً.`;
  }

  return `You are a course tutor for this specific course: "${course.title}".

Full course content:
${courseText}

Strict rules:
- Answer only questions about the content of this course.
- If the user asks about something outside the course, politely let them know it's out of scope and redirect them back to the course material.
- Do not provide personal financial advice, spending analysis, or investment recommendations.
- Explain concepts clearly with practical examples drawn from the course content.
- Always respond in English.`;
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
// REQUEST BODY TYPE
// ============================================

interface TutorRequestBody {
  message: string;
  courseId: string;
  language: 'ar' | 'en';
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

// ============================================
// MAIN HANDLER
// ============================================

export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  let body: TutorRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const { message, courseId, language = 'ar', conversationHistory = [] } = body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
  }

  if (message.length > AI_SAFETY.maxInputLength) {
    return NextResponse.json({
      success: false,
      error: `Message too long. Maximum ${AI_SAFETY.maxInputLength} characters.`,
    }, { status: 400 });
  }

  if (!courseId || typeof courseId !== 'string') {
    return NextResponse.json({ success: false, error: 'courseId is required' }, { status: 400 });
  }

  if (!checkRateLimit(authResult.userId)) {
    return NextResponse.json({
      success: false,
      error: language === 'ar'
        ? 'الكثير من الطلبات. الرجاء الانتظار قليلاً.'
        : 'Too many requests. Please wait a moment.',
    }, { status: 429 });
  }

  // Load course content server-side
  const course = getCourse(courseId);
  if (!course) {
    return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });
  }

  // Build messages for Gemini: system + conversation history + new message
  const systemPrompt = buildSystemPrompt(course, language);

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-10), // cap history to keep tokens reasonable
    { role: 'user', content: message.trim() },
  ];

  const result = await sendChatCompletionWithRetry(messages, {
    model: AI_CONFIG.flashModel ?? AI_CONFIG.model,
    temperature: 0.4,
    max_tokens: 1024,
  });

  if (!result.success) {
    return NextResponse.json({
      success: false,
      error: language === 'ar'
        ? 'حدث خطأ في الاتصال بالمساعد. الرجاء المحاولة مرة أخرى.'
        : 'Could not reach the tutor. Please try again.',
    }, { status: 502 });
  }

  return NextResponse.json({
    success: true,
    content: sanitize(result.content),
  });
}

// ============================================
// OPTIONS (CORS)
// ============================================

const ALLOWED_ORIGINS = new Set([
  'https://rasmalak.vercel.app',
  'http://localhost:3000',
]);

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : '';
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Vary': 'Origin',
    },
  });
}

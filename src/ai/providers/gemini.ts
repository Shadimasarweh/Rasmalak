/**
 * Gemini Provider Adapter
 * =======================
 * Handles communication with Google's Gemini API.
 * Drop-in replacement for the OpenAI adapter — same exported interface.
 */

import { AI_CONFIG, getProviderApiKey, API_CONFIG } from '../config';
import { MessageAttachment } from '../types';
import type { StructuredOutputSchema, ChatCompletionOptions } from './openai';

// Re-export shared types so service.ts can import from either provider
export type { StructuredOutputSchema, ChatCompletionOptions };

// ============================================
// TYPES
// ============================================

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface GeminiRequest {
  contents: GeminiContent[];
  systemInstruction?: { parts: GeminiPart[] };
  generationConfig: {
    maxOutputTokens: number;
    temperature: number;
    responseMimeType?: string;
    responseSchema?: Record<string, unknown>;
  };
}

interface GeminiCandidate {
  content: { parts: GeminiPart[]; role: string };
  finishReason: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  error?: { message: string; code: number; status: string };
}

type UsageInfo = { prompt_tokens: number; completion_tokens: number; total_tokens: number };

// ============================================
// HELPERS
// ============================================

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function buildUrl(model: string, apiKey: string): string {
  return `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
}

/**
 * Strip OpenAI-style additionalProperties / strict fields that Gemini
 * doesn't understand, and convert `anyOf: [{type:T},{type:"null"}]` to
 * `{ type: T, nullable: true }`.
 */
function convertSchemaForGemini(schema: Record<string, unknown>): Record<string, unknown> {
  if (typeof schema !== 'object' || schema === null) return schema;

  const out: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(schema)) {
    if (key === 'additionalProperties' || key === 'strict') continue;

    if (key === 'anyOf' && Array.isArray(val)) {
      const nonNull = val.filter(
        (v: Record<string, unknown>) => !(v.type === 'null')
      );
      const hasNull = val.some((v: Record<string, unknown>) => v.type === 'null');
      if (nonNull.length === 1) {
        const inner = convertSchemaForGemini(nonNull[0] as Record<string, unknown>);
        Object.assign(out, inner);
        if (hasNull) out.nullable = true;
        continue;
      }
    }

    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      out[key] = convertSchemaForGemini(val as Record<string, unknown>);
    } else if (Array.isArray(val)) {
      out[key] = val.map((item) =>
        typeof item === 'object' && item !== null
          ? convertSchemaForGemini(item as Record<string, unknown>)
          : item
      );
    } else {
      out[key] = val;
    }
  }

  return out;
}

// ============================================
// GEMINI CLIENT
// ============================================

export async function sendChatCompletion(
  messages: Array<{ role: string; content: string | unknown[] }>,
  options?: ChatCompletionOptions
): Promise<{ success: true; content: string; usage: UsageInfo } | { success: false; error: string }> {
  const apiKey = getProviderApiKey();

  if (!apiKey) {
    return {
      success: false,
      error: 'AI service is not configured. Please contact support.',
    };
  }

  const model = options?.model ?? AI_CONFIG.model;

  // Convert OpenAI-style messages → Gemini format
  let systemInstruction: GeminiRequest['systemInstruction'] | undefined;
  const contents: GeminiContent[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = {
        parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }],
      };
      continue;
    }

    const geminiRole = msg.role === 'assistant' ? 'model' : 'user';
    const parts: GeminiPart[] = [];

    if (typeof msg.content === 'string') {
      parts.push({ text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content as Array<Record<string, unknown>>) {
        if (part.type === 'text') {
          parts.push({ text: part.text as string });
        } else if (part.type === 'image_url') {
          const imageUrl = part.image_url as { url: string };
          const dataMatch = imageUrl.url.match(/^data:([^;]+);base64,(.+)$/);
          if (dataMatch) {
            parts.push({
              inlineData: { mimeType: dataMatch[1], data: dataMatch[2] },
            });
          } else {
            parts.push({ text: `[Image: ${imageUrl.url}]` });
          }
        }
      }
    }

    if (parts.length > 0) {
      contents.push({ role: geminiRole, parts });
    }
  }

  const generationConfig: GeminiRequest['generationConfig'] = {
    maxOutputTokens: options?.max_tokens ?? AI_CONFIG.maxTokens,
    temperature: options?.temperature ?? AI_CONFIG.temperature,
  };

  if (options?.responseSchema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = convertSchemaForGemini(options.responseSchema.schema);
  }

  const requestBody: GeminiRequest = {
    contents,
    generationConfig,
  };

  if (systemInstruction) {
    requestBody.systemInstruction = systemInstruction;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    const response = await fetch(buildUrl(model, apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = (await response.json()) as GeminiResponse;

    if (!response.ok || data.error) {
      return {
        success: false,
        error: 'AI service error. Please try again later.',
      };
    }

    if (!data.candidates || data.candidates.length === 0) {
      return { success: false, error: 'No response from AI service.' };
    }

    const candidate = data.candidates[0];

    if (candidate.finishReason === 'SAFETY') {
      return { success: false, error: 'Response blocked by safety filters.' };
    }

    const text = candidate.content?.parts
      ?.map((p) => p.text ?? '')
      .join('')
      .trim();

    if (!text) {
      return { success: false, error: 'Empty response from AI service.' };
    }

    const usage: UsageInfo = {
      prompt_tokens: data.usageMetadata?.promptTokenCount ?? 0,
      completion_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      total_tokens: data.usageMetadata?.totalTokenCount ?? 0,
    };

    return { success: true, content: text, usage };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'Request timed out. Please try again.' };
      }
      return { success: false, error: `Network error: ${error.message}` };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

export async function sendChatCompletionWithRetry(
  messages: Array<{ role: string; content: string | unknown[] }>,
  options?: ChatCompletionOptions
): Promise<{ success: true; content: string; usage: UsageInfo } | { success: false; error: string }> {
  let lastError = '';

  for (let attempt = 0; attempt <= API_CONFIG.retryAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, API_CONFIG.retryDelay));
    }

    const result = await sendChatCompletion(messages, options);

    if (result.success) return result;

    lastError = result.error;

    if (result.error.includes('API key') || result.error.includes('401') || result.error.includes('403')) {
      break;
    }
  }

  return { success: false, error: lastError };
}

// ============================================
// HELPER FUNCTIONS (same interface as openai.ts)
// ============================================

export function formatMessagesForProvider(
  systemPrompt: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  newMessage: string,
  attachments?: MessageAttachment[]
): Array<{ role: string; content: string | unknown[] }> {
  const messages: Array<{ role: string; content: string | unknown[] }> = [
    { role: 'system', content: systemPrompt },
  ];

  for (const msg of conversationHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  if (attachments && attachments.length > 0) {
    const contentParts: unknown[] = [];

    if (newMessage.trim()) {
      contentParts.push({ type: 'text', text: newMessage });
    }

    for (const attachment of attachments) {
      if (attachment.type === 'image') {
        contentParts.push({ type: 'image_url', image_url: { url: attachment.content } });
      } else if (attachment.type === 'document' || attachment.type === 'pdf') {
        contentParts.push({
          type: 'text',
          text: `\n\n--- Document: ${attachment.filename} ---\n${attachment.content}\n--- End Document ---`,
        });
      }
    }

    messages.push({ role: 'user', content: contentParts });
  } else {
    messages.push({ role: 'user', content: newMessage });
  }

  return messages;
}

export function getModelForAttachments(attachments?: MessageAttachment[]): string {
  // Gemini Flash handles vision natively -- no model switch needed
  return AI_CONFIG.model;
}

export function estimateTokenCount(text: string): number {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const otherChars = text.length - arabicChars;
  return Math.ceil(arabicChars * 2 + otherChars * 0.35);
}

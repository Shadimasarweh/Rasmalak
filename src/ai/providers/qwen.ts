/**
 * Qwen VL Provider Adapter (self-hosted, OpenAI-compatible)
 * ==========================================================
 * Talks to a locally or privately hosted Qwen vision model served through
 * an OpenAI-compatible endpoint (Ollama `/v1`, LM Studio, vLLM). Used ONLY
 * for document extraction (receipts / bills / statements) — chat and all
 * other agents stay on the configured cloud provider.
 *
 * Why a separate adapter instead of reusing openai.ts:
 *   - Different base URL + optional auth (local servers accept any key).
 *   - Local servers sometimes reject OpenAI `response_format: json_schema`;
 *     this adapter degrades to a plain request and lets the caller's
 *     JSON-fence stripping handle the output.
 *   - Longer default timeout — a 30B VLM on consumer hardware is slower
 *     than a cloud Flash model.
 *
 * Enabled purely by environment: set QWEN_BASE_URL and the extraction
 * pipeline tries Qwen first, falling back to the cloud provider when this
 * endpoint is unreachable (e.g. on Vercel where localhost doesn't exist).
 */

import { MessageAttachment } from '../types';

// ============================================
// CONFIG (env-driven, never hardcoded)
// ============================================

export interface QwenConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  timeoutMs: number;
}

/** Returns null when Qwen is not configured — callers treat that as "disabled". */
export function getQwenConfig(): QwenConfig | null {
  const baseUrl = process.env.QWEN_BASE_URL;
  if (!baseUrl) return null;

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    // Ollama tag / LM Studio identifier, e.g. 'qwen2.5vl:32b' or
    // 'qwen/qwen3-vl-30b'. No default model name — the operator must be
    // explicit so a mismatched tag fails loudly at config time, not silently
    // mid-extraction.
    model: process.env.QWEN_MODEL ?? '',
    // Local servers ignore auth but vLLM behind a proxy may require it.
    apiKey: process.env.QWEN_API_KEY ?? 'not-needed',
    timeoutMs: Number(process.env.QWEN_TIMEOUT_MS) || 45_000,
  };
}

export function isQwenConfigured(): boolean {
  const config = getQwenConfig();
  return config !== null && config.model.length > 0;
}

// ============================================
// TYPES — mirror openai.ts so extractDocument's
// dispatch stays structurally compatible
// ============================================

type QwenContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

interface QwenMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | QwenContentPart[];
}

export interface QwenStructuredOutputSchema {
  name: string;
  schema: Record<string, unknown>;
}

export type QwenChatCompletionOptions = {
  model?: string;
  max_tokens?: number;
  temperature?: number;
  responseSchema?: QwenStructuredOutputSchema;
  /** Accepted for signature parity with the cloud adapters; Qwen ignores it. */
  thinkingBudget?: number;
};

interface QwenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

type QwenResult =
  | { success: true; content: string; usage: QwenUsage }
  | { success: false; error: string };

// ============================================
// CLIENT
// ============================================

async function requestOnce(
  config: QwenConfig,
  messages: QwenMessage[],
  options: QwenChatCompletionOptions | undefined,
  includeSchema: boolean,
): Promise<QwenResult & { schemaRejected?: boolean }> {
  const body: Record<string, unknown> = {
    model: options?.model ?? config.model,
    messages,
    max_tokens: options?.max_tokens ?? 1500,
    temperature: options?.temperature ?? 0.1,
  };

  if (includeSchema && options?.responseSchema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: options.responseSchema.name,
        schema: options.responseSchema.schema,
        strict: true,
      },
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      // Ollama / LM Studio versions that don't support json_schema return
      // a 400 mentioning response_format — signal the caller to retry bare.
      const schemaRejected =
        response.status === 400 && /response_format|json_schema/i.test(errorText);
      return {
        success: false,
        error: `Qwen endpoint error (${response.status})`,
        schemaRejected,
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
      usage?: QwenUsage;
    };

    const content = data.choices?.[0]?.message?.content;
    if (content == null || content === '') {
      return { success: false, error: 'Empty response from Qwen endpoint' };
    }

    return {
      success: true,
      content,
      usage: data.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'Qwen endpoint timed out' };
    }
    // fetch throws TypeError when the host is unreachable — the expected
    // case on Vercel when QWEN_BASE_URL points at a dev machine.
    return {
      success: false,
      error: `Qwen endpoint unreachable: ${error instanceof Error ? error.message : 'unknown'}`,
    };
  }
}

/**
 * Single-attempt-with-schema-degrade completion. No multi-retry loop here:
 * the extraction caller treats any failure as "fall back to cloud provider",
 * and retrying a slow local model burns the serverless time budget.
 */
export async function sendChatCompletionWithRetry(
  messages: QwenMessage[],
  options?: QwenChatCompletionOptions,
): Promise<QwenResult> {
  const config = getQwenConfig();
  if (!config || !config.model) {
    return { success: false, error: 'Qwen provider not configured' };
  }

  const first = await requestOnce(config, messages, options, true);
  if (first.success) return first;

  if (first.schemaRejected) {
    return requestOnce(config, messages, options, false);
  }

  return first;
}

// ============================================
// MESSAGE FORMATTING
// ============================================

/**
 * Same shape as formatMessagesForOpenAI — Qwen served via an
 * OpenAI-compatible endpoint accepts base64 data URLs for images.
 */
export function formatMessagesForProvider(
  systemPrompt: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  newMessage: string,
  attachments?: MessageAttachment[],
): QwenMessage[] {
  const messages: QwenMessage[] = [{ role: 'system', content: systemPrompt }];

  for (const msg of conversationHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  if (attachments && attachments.length > 0) {
    const contentParts: QwenContentPart[] = [];

    if (newMessage.trim()) {
      contentParts.push({ type: 'text', text: newMessage });
    }

    for (const attachment of attachments) {
      if (attachment.type === 'image') {
        contentParts.push({
          type: 'image_url',
          image_url: { url: attachment.content, detail: 'auto' },
        });
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

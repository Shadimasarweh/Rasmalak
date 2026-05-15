/**
 * Document Extraction Helper
 * ===========================
 * Single-shot vision-mode JSON extraction for an uploaded bill / receipt /
 * invoice / utility statement. Used by:
 *
 *   1. The chat orchestrator (when a user attaches a financial document).
 *   2. The dedicated /api/extract-document endpoint that powers the
 *      Receipt Scanner modal on /money/track.
 *
 * Both callers want exactly the same behavior: Flash model, no thinking
 * budget, JSON-fence stripping, server-side vendor normalization, and a
 * SHA-256 content cache so the same image isn't re-extracted twice in a
 * single session.
 *
 * Returning `null` (instead of throwing) keeps fallbacks simple — the
 * orchestrator falls through to plain chat with the image, the modal
 * shows a "couldn't read this receipt" state.
 */

import type { ExtractedDocument, MessageAttachment } from './types';
import { getAgent } from './agents/registry';
import { lookupVendor } from './vendors/menaVendors';
import { classifySubcategory } from './taxonomy';
import { AI_CONFIG } from './config';
import {
  sendChatCompletionWithRetry as openaiSendCompletionWithRetry,
  formatMessagesForOpenAI,
} from './providers/openai';
import {
  sendChatCompletionWithRetry as geminiSendCompletionWithRetry,
  formatMessagesForProvider as geminiFormatMessages,
} from './providers/gemini';

const isGemini = AI_CONFIG.provider === 'gemini';

function sendChatCompletionWithRetry(
  ...args: Parameters<typeof openaiSendCompletionWithRetry>
) {
  return isGemini
    ? geminiSendCompletionWithRetry(...args)
    : openaiSendCompletionWithRetry(...args);
}

function formatMessages(...args: Parameters<typeof formatMessagesForOpenAI>) {
  return isGemini ? geminiFormatMessages(...args) : formatMessagesForOpenAI(...args);
}

// Bounded so the cache can never grow unbounded across long-lived dynos.
const EXTRACTION_CACHE_MAX_ENTRIES = 200;
const extractionCache = new Map<string, ExtractedDocument>();

async function hashAttachmentContent(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function setExtractionCache(key: string, value: ExtractedDocument): void {
  if (extractionCache.size >= EXTRACTION_CACHE_MAX_ENTRIES) {
    const first = extractionCache.keys().next().value;
    if (first) extractionCache.delete(first);
  }
  extractionCache.set(key, value);
}

/**
 * Run a single-shot vision-mode JSON extraction on an uploaded document.
 * Returns null when the extractor fails so callers can fall back without
 * needing to handle thrown errors.
 */
export async function extractDocument(
  attachment: MessageAttachment,
  language: 'ar' | 'en',
): Promise<ExtractedDocument | null> {
  const extractor = getAgent('document_extractor');
  if (!extractor) return null;

  if (attachment.type !== 'image' && attachment.type !== 'pdf') return null;

  const cacheKey = await hashAttachmentContent(attachment.content);
  const cached = extractionCache.get(cacheKey);
  if (cached) return cached;

  const systemPrompt = extractor.systemPromptBuilder({
    language,
    contextSlices: [],
    memoryFields: {},
    deterministic: null,
    userMessage: '',
    conversationHistory: [],
  });

  const messages = formatMessages(
    systemPrompt,
    [],
    'Extract the document fields per schema.',
    [attachment],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any;

  // Flash + zero thinking budget here: bill JSON extraction does not
  // benefit from a reasoning model and the heavier Pro model is what
  // pushed total turn time near the request budget on chat replies.
  const fastModel = AI_CONFIG.flashModel ?? AI_CONFIG.model;
  const result = await sendChatCompletionWithRetry(messages, {
    model: fastModel,
    max_tokens: 1500,
    temperature: 0.1,
    thinkingBudget: 0,
    responseSchema: extractor.outputSchema
      ? { name: 'ExtractedDocument', schema: extractor.outputSchema }
      : undefined,
  });

  if (!result.success) return null;

  // Flash models occasionally wrap JSON in ```json … ``` fences or add a
  // leading/trailing prose line even when JSON mode is requested. Strip
  // those before parsing instead of failing the extraction.
  const cleaned = result.content
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const jsonText =
    firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;

  let parsed: ExtractedDocument;
  try {
    parsed = JSON.parse(jsonText) as ExtractedDocument;
  } catch {
    return null;
  }

  // Vendor normalization runs server-side so canonical names stay
  // deterministic and out of the model's creative reach.
  const lookup = lookupVendor(parsed.vendor);
  parsed.vendorCanonical = lookup.matched ? lookup.canonical : null;
  if (!parsed.category && lookup.matched) {
    parsed.category = lookup.category;
  }
  if (!parsed.isRecurring && lookup.isRecurring) {
    parsed.isRecurring = true;
  }

  // Subcategory normalization. The LLM may have proposed values; we
  // validate each against the canonical enum and fall back to the
  // keyword classifier so the UI can rely on stable ids without having
  // to defend against hallucinated labels.
  if (Array.isArray(parsed.lineItems) && parsed.category) {
    parsed.lineItems = parsed.lineItems.map((item) => ({
      ...item,
      subcategory: classifySubcategory(
        item.description ?? '',
        parsed.category as string,
        item.subcategory ?? null,
      ),
    }));
  }

  setExtractionCache(cacheKey, parsed);
  return parsed;
}

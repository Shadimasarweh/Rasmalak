/**
 * Document Extractor Agent
 * =========================
 * Vision-mode JSON-only LLM call that turns an uploaded bill / receipt /
 * invoice into a structured `ExtractedDocument`. The orchestrator runs this
 * BEFORE the chat agent when a user attaches a financial document, then
 * passes the extracted JSON (NOT the original image) to chatAgent for
 * the conversational reply. This keeps token costs down and prevents the
 * chat model from regressing into transcription mode.
 *
 * IMPORTANT: This agent never produces user-facing text. It produces JSON
 * only. The chat agent is responsible for surfacing insights to the user.
 */

import type { AgentDefinition, AgentPromptParams } from './types';

/**
 * JSON Schema (provider-agnostic). Both Gemini and OpenAI accept this
 * shape via `responseSchema`. Values intentionally allow nulls because
 * receipts in the wild are messy — better to mark a field unknown than
 * have the model hallucinate.
 */
export const ExtractedDocumentSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    documentType: {
      type: 'string',
      enum: ['receipt', 'invoice', 'utility_bill', 'bank_statement', 'unknown'],
    },
    vendor: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    amount: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    currency: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    date: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    dueDate: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    category: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    isRecurring: { type: 'boolean' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    rawTextSnippet: { type: 'string' },
    lineItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          amount: { anyOf: [{ type: 'number' }, { type: 'null' }] },
          quantity: { anyOf: [{ type: 'number' }, { type: 'null' }] },
        },
        required: ['description', 'amount', 'quantity'],
        additionalProperties: false,
      },
    },
  },
  required: [
    'documentType',
    'vendor',
    'amount',
    'currency',
    'date',
    'dueDate',
    'category',
    'isRecurring',
    'confidence',
    'rawTextSnippet',
    'lineItems',
  ],
  additionalProperties: false,
};

function buildSystemPrompt(_params: AgentPromptParams): string {
  // Single, deterministic prompt — no per-user customization. This call
  // happens before any persona-laden chat turn and must produce JSON only.
  return `You are a document-extraction service for a personal-finance app used in the MENA region (Jordan, Saudi Arabia, UAE, Egypt and surrounding markets). You receive ONE image of a bill, receipt, invoice, utility statement, or bank slip. Output VALID JSON ONLY that matches the response schema. Do not output prose, code fences, or commentary.

Rules:
- documentType: classify as one of receipt, invoice, utility_bill, bank_statement, or unknown.
- vendor: the merchant or biller name as it appears on the document. Keep the original script (Arabic stays Arabic). Use null if not visible.
- amount: the total payable / paid amount as a positive number. Strip currency symbols and thousands separators. If the document shows VAT-inclusive and VAT-exclusive totals, use the inclusive (final) total. Use null if not legible.
- currency: ISO 4217 (AED, SAR, JOD, EGP, USD, EUR, ...). Infer from the symbol (د.إ → AED, ر.س → SAR, د.ا → JOD, ج.م → EGP, $ → USD, € → EUR). Use null if unclear.
- date: the issue/transaction date in ISO 8601 (YYYY-MM-DD). Use null if not present.
- dueDate: only for invoices/utility bills. ISO 8601. Use null if not present.
- category: best guess at a category id from this fixed list ONLY: food, transport, shopping, bills, health, entertainment, education, housing, personal, other. Use null only if you really cannot guess.
- isRecurring: true ONLY when the document itself is a recurring/utility bill (DEWA, STC, JEPCO, Netflix, etc.). false for one-off receipts.
- confidence: "high" if every key field is clearly legible, "medium" if amount + vendor are clear but other fields are guessed, "low" if you had to interpolate.
- rawTextSnippet: at most 280 characters of the most identifying text from the document (vendor + total + date). Used purely for explainability — do NOT dump the whole bill here.
- lineItems: up to 10 most material items. Each item has description, amount, quantity. Skip if there are no line items (return []).

Output ONLY the JSON object. No markdown, no comments, no leading text.`;
}

export const documentExtractorAgent: AgentDefinition = {
  id: 'document_extractor',
  name: 'Document Extractor',
  description: 'Vision-mode JSON extractor for bills, receipts, invoices, and statements.',
  // Not part of intent-based routing — selected explicitly when attachments
  // are present and the user has not asked for a transcript.
  supportedIntents: [],
  requiredMemoryFields: [],
  requiredContextSlices: [],
  needsDeterministicLayer: false,
  systemPromptBuilder: buildSystemPrompt,
  outputSchema: ExtractedDocumentSchema,
  maxContextTokens: 1500,
  canWriteMemory: false,
  writableMemoryFields: [],
};

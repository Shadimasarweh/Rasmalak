/**
 * Conversation Document Memory
 * =============================
 * In-memory map of `conversationId -> last extracted document + analysis`.
 * Lets the orchestrator handle "yes, add it" / "اضفها" follow-ups without
 * a second LLM call: the chip payload is rebuilt from the stored entry.
 *
 * Scope: per server instance, TTL-bounded. This is intentionally NOT
 * persisted to Supabase — the document is referenced for at most a few
 * minutes after upload. Cold restarts are fine; the user simply won't be
 * able to confirm an upload from a previous deploy.
 */

import type { ExtractedDocument } from './types';
import type { BillAnalysis } from './deterministic/billAnalysis';

interface DocMemoryEntry {
  extracted: ExtractedDocument;
  analysis: BillAnalysis;
  createdAt: number;
}

const TTL_MS = 10 * 60 * 1000;          // 10 minutes
const MAX_ENTRIES = 500;                // bounded to avoid unbounded growth

const docMemory = new Map<string, DocMemoryEntry>();

function evictOldest(): void {
  const oldest = docMemory.keys().next().value;
  if (oldest) docMemory.delete(oldest);
}

/**
 * Store the most recently extracted document for a conversation.
 * Replaces any previous entry for the same conversation.
 */
export function rememberConversationDoc(
  conversationId: string,
  extracted: ExtractedDocument,
  analysis: BillAnalysis,
): void {
  if (docMemory.size >= MAX_ENTRIES) evictOldest();
  docMemory.set(conversationId, {
    extracted,
    analysis,
    createdAt: Date.now(),
  });
}

/**
 * Retrieve the most recently extracted document for a conversation, or
 * null if there is no entry within the TTL window.
 */
export function recallConversationDoc(
  conversationId: string,
): DocMemoryEntry | null {
  const entry = docMemory.get(conversationId);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    docMemory.delete(conversationId);
    return null;
  }
  return entry;
}

export function forgetConversationDoc(conversationId: string): void {
  docMemory.delete(conversationId);
}

export function clearAllConversationDocs(): void {
  docMemory.clear();
}

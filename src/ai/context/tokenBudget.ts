/**
 * Token Budget Manager
 * ====================
 * Ensures context never exceeds 70% of the model's context window.
 * Provides token estimation for Arabic and English text.
 */

const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  'gemini-2.0-flash': 1_048_576,
  'gemini-2.0-pro': 1_048_576,
  'gemini-1.5-flash': 1_048_576,
  'gpt-4o': 128_000,
  'gpt-4o-mini': 128_000,
  'gpt-4-turbo': 128_000,
};

const CONTEXT_CEILING_RATIO = 0.7;

/**
 * Get the maximum tokens allowed for context injection.
 */
export function getMaxContextTokens(model: string): number {
  const window = MODEL_CONTEXT_WINDOWS[model] || 128_000;
  return Math.floor(window * CONTEXT_CEILING_RATIO);
}

/**
 * Estimate token count for a string.
 * Arabic text averages ~2 chars/token, Latin ~4 chars/token.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
  const otherChars = text.length - arabicChars;
  return Math.ceil(arabicChars / 2 + otherChars / 4);
}

/**
 * Check if adding content would exceed the token budget.
 */
export function wouldExceedBudget(
  currentTokens: number,
  additionalTokens: number,
  maxTokens: number,
): boolean {
  return (currentTokens + additionalTokens) > maxTokens;
}

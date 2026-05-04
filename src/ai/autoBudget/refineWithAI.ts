/**
 * AI refinement layer for auto-budget suggestions.
 *
 * The deterministic engine in src/lib/autoBudget.ts is the source of truth.
 * This wrapper optionally re-asks an LLM to produce a one-sentence rationale
 * per category that explains *why* the suggested number makes sense, given
 * recent trends and the user's savings goals.
 *
 * Architecture:
 *   - Always returns a valid result, even when the LLM is unavailable, the
 *     feature flag is off, or the API key is missing. This is the
 *     "fail open" contract that lets the Plan page render instantly while
 *     refinement happens in the background.
 *   - Lives server-side. The Plan page reaches it through
 *     /api/auto-budget/refine, never via direct LLM imports.
 *   - Intentionally minimal: we re-use the recommendation agent's prompt
 *     style (concise, grounded, no invented numbers) but call the provider
 *     directly so we don't have to fabricate an OrchestratorInput just to
 *     produce per-category strings.
 */

import { AI_CONFIG, AI_FEATURES, getProviderApiKey } from '../config';
import {
  AutoBudgetResult,
  AutoBudgetCategorySuggestion,
} from '@/lib/autoBudget';

export interface AIRationaleMap {
  [categoryId: string]: string;
}

export interface RefineRequest {
  baseline: AutoBudgetResult;
  language: 'en' | 'ar';
  // Optional context the model can use to write a sharper rationale.
  monthlyIncome?: number;
  activeSavingsGoals?: Array<{ name: string; monthlyContribution: number }>;
}

export interface RefineResponse {
  baseline: AutoBudgetResult;
  rationales: AIRationaleMap; // empty when refinement is unavailable
  source: 'deterministic' | 'ai';
}

function isFlagOn(): boolean {
  return AI_FEATURES.aiAutoBudget === true && !!getProviderApiKey();
}

/**
 * Build a tightly-scoped prompt that asks for ONE sentence per category id.
 * Constraint: the model may only use numbers we provide; it cannot invent.
 */
function buildPrompt(req: RefineRequest): string {
  const isAr = req.language === 'ar';
  const cats = Object.values(req.baseline.byCategory);
  const lines = cats.map((c) =>
    `- ${c.categoryId}: avg ${c.monthlyAverage}, max ${c.monthlyMax}, suggested ${c.suggestedAmount} (${c.basedOnMonths} mo, conf=${c.confidence})`,
  );
  const goalsBlock = req.activeSavingsGoals?.length
    ? '\nActive savings goals:\n' +
      req.activeSavingsGoals
        .map((g) => `- ${g.name}: ${g.monthlyContribution}/mo`)
        .join('\n')
    : '';

  const header = isAr
    ? 'لكل فئة، اكتب جملة واحدة قصيرة (10-15 كلمة) تشرح لماذا هذا المبلغ منطقي. لا تخترع أرقاماً.'
    : 'For each category, write ONE short sentence (10-15 words) explaining why the suggested amount makes sense. Do not invent numbers.';
  const incomeLine = req.monthlyIncome
    ? `\nMonthly income reference: ${req.monthlyIncome}`
    : '';

  return `${header}

Output ONLY a JSON object of the form { "categoryId": "rationale string" }, no extra commentary, no code fences.

Per-category baseline:
${lines.join('\n')}${incomeLine}${goalsBlock}`;
}

/**
 * Call the configured provider directly with a single, deterministic prompt.
 * We do NOT route through the chat orchestrator because there's no
 * conversation, no audit-relevant advice, and no schema validation needs
 * here beyond "JSON object of strings".
 */
async function callProviderForRationales(prompt: string): Promise<AIRationaleMap> {
  const apiKey = getProviderApiKey();
  if (!apiKey) return {};

  // Lazy-import the provider so the client-side bundle never accidentally
  // pulls server-only code in.
  if (AI_CONFIG.provider === 'gemini') {
    const { sendChatCompletion } = await import('../providers/gemini');
    const res = await sendChatCompletion(
      [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ] as unknown as Parameters<typeof sendChatCompletion>[0],
      { temperature: 0.3, max_tokens: 1024 },
    );
    if (!res.success) return {};
    return safeParseJSON(res.content);
  }

  if (AI_CONFIG.provider === 'openai') {
    const { sendChatCompletion } = await import('../providers/openai');
    const res = await sendChatCompletion(
      [
        { role: 'system', content: 'Return only a JSON object.' },
        { role: 'user', content: prompt },
      ] as unknown as Parameters<typeof sendChatCompletion>[0],
      { temperature: 0.3, max_tokens: 1024 },
    );
    if (!res.success) return {};
    return safeParseJSON(res.content);
  }

  return {};
}

function safeParseJSON(raw: string): AIRationaleMap {
  if (!raw) return {};
  // Strip code fences if present.
  const cleaned = raw.replace(/```json\s*|```\s*/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object') {
      const out: AIRationaleMap = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string' && v.length < 280) out[k] = v;
      }
      return out;
    }
  } catch {
    // Provider returned non-JSON. We fail open.
  }
  return {};
}

/**
 * Public entry point. Always returns a usable response.
 */
export async function refineAutoBudget(req: RefineRequest): Promise<RefineResponse> {
  if (!isFlagOn() || Object.keys(req.baseline.byCategory).length === 0) {
    return { baseline: req.baseline, rationales: {}, source: 'deterministic' };
  }

  try {
    const prompt = buildPrompt(req);
    const rationales = await callProviderForRationales(prompt);
    return {
      baseline: req.baseline,
      rationales,
      source: Object.keys(rationales).length > 0 ? 'ai' : 'deterministic',
    };
  } catch {
    // Network or provider error — fail open with the deterministic baseline.
    return { baseline: req.baseline, rationales: {}, source: 'deterministic' };
  }
}

/**
 * Synchronous helper used by tests and by callers that want to know whether
 * a refinement attempt would even be made before paying the round-trip cost.
 */
export function isAutoBudgetRefinementEnabled(): boolean {
  return isFlagOn();
}

// Re-export for callers that want the suggestion shape together with the map.
export type { AutoBudgetCategorySuggestion };

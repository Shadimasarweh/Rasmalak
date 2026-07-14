/**
 * Rasmalak AI Configuration
 * =========================
 * Central configuration for the AI layer.
 * Change provider here to switch between Gemini, OpenAI, etc.
 */

import { AIProvider, AIProviderConfig } from './types';

// ============================================
// PROVIDER CONFIGURATION
// ============================================

export const AI_CONFIG: AIProviderConfig = {
  // Which provider to use
  // Options: 'gemini' | 'openai' | 'vertex' | 'local'
  provider: 'gemini' as AIProvider,

  // Which model to use for complex financial analysis
  // Gemini: 'gemini-3.1-pro-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'
  // OpenAI: 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'
  model: 'gemini-3.1-pro-preview',

  // Fast model for simple intents (greetings, explanations, out-of-scope)
  flashModel: 'gemini-2.5-flash',

  // Fallback model used if the primary model fails or returns an error
  fallbackModel: 'gemini-3-pro-preview',

  // Maximum tokens in response.
  // Thinking models (Gemini 2.5+ / 3.x) bill internal reasoning against this budget,
  // so 4096 leaves room for both reasoning and a complete visible answer.
  maxTokens: 4096,

  // Temperature (creativity)
  // 0.0 = deterministic, 0.7 = balanced (recommended for finance), 1.0 = very creative
  temperature: 0.7,
};

// ============================================
// THINKING / REASONING SETTINGS
// ============================================
// Caps reasoning tokens on Gemini thinking models so they don't eat the
// visible output budget, and forbids the API from returning thought
// summaries (which were leaking into chat replies).
export const AI_THINKING = {
  // Max tokens the model is allowed to spend on internal reasoning.
  // 0 disables thinking entirely; 256 is enough for short financial reasoning chains.
  thinkingBudget: 256,
  // Never expose internal thought summaries to the client.
  includeThoughts: false,
};

// ============================================
// FEATURE FLAGS
// ============================================

export const AI_FEATURES = {
  chatEnabled: true,
  // When true AND QWEN_BASE_URL + QWEN_MODEL are set in the environment,
  // document extraction (receipt scanner + chat attachments) tries the
  // self-hosted Qwen VL endpoint FIRST and silently falls back to the
  // cloud provider on any failure — so deployments without a reachable
  // Qwen endpoint (e.g. Vercel while the model runs on a dev machine)
  // behave exactly as before. See src/ai/providers/qwen.ts.
  qwenDocumentExtraction: true,
  insightsEnabled: true,
  predictionsEnabled: true,
  learningEnabled: true,
  dialectDetectionEnabled: true,
  requireConfirmation: true,
  // When true, the deterministic auto-budget suggestion is wrapped with an
  // LLM refinement call (see src/ai/autoBudget/refineWithAI.ts). Off by
  // default so the Plan tab always works without a network round-trip.
  aiAutoBudget: false,
  // Predictive engine surfaces ("Rasmalak يعرفك" release). Live since
  // 2026-07-08: migration 015 applied, Arabic copy reviewed.
  salaryDetectionUI: true,    // A1: detected-payday captions, nudge, smarter salary_missing
  paydayCycleBudgeting: true, // A2: payday-to-payday budget windows
  safeToSpendCard: true,      // A3: dashboard hero
  forecastCard: true,         // end-of-cycle P25–P75 band card
  personalityCard: true,      // B1: spending archetype card
  // Phase 2 surfaces (behaviour engine + Hijri seasonality). All off
  // until the release step: Arabic copy review + manual RTL/LTR pass.
  ramadanMode: false,       // C2: pre-Ramadan budget adjustments + Eid envelope
  habitInsights: false,     // B2: behaviour-signal insight cards + course links
  coolingOffNudge: false,   // B4: opt-in post-payday large-purchase pause
  // Phase 3 surfaces. Off until: migration 016 (peer stats) applied +
  // Arabic review + RTL/LTR pass.
  goalRiskCard: false,      // item 10: Monte Carlo per-goal odds + 90% delta
  peerBenchmark: false,     // item 12: cohort percentile card (volume-gated)
  alertLearning: false,     // item 13: dismissal-driven alert suppression
  // Phase 4 (individual roadmap tail). Off until Arabic review + RTL pass.
  paydayRitual: false,      // B3: payday report card + pay-yourself-first
  hajjGoalTemplate: false,  // C4: prefilled Hajj goal w/ hijri deadline
  zakatPlanner: false,      // C3: zakat anniversary set-aside planner
  schoolFeesPlanner: false, // C5: annual education pulse sinking fund
  remittanceInsight: false, // C1: recurring-transfer awareness + FX context
  lifeEventCheckin: false,  // Pillar E: confirm-first re-planning nudge
};

// ============================================
// SAFETY SETTINGS
// ============================================

export const AI_SAFETY = {
  maxHistoryMessages: 10,
  maxInputLength: 2000,
  blockedTopics: [
    'specific investment advice',
    'stock picks',
    'cryptocurrency recommendations',
    'legal advice',
    'tax evasion',
  ],
  showDisclaimer: true,
  enableLogging: process.env.NODE_ENV === 'development',
};

// ============================================
// API CONFIGURATION
// ============================================

export const API_CONFIG = {
  timeout: 30000,
  retryAttempts: 2,
  retryDelay: 1000,
  rateLimitPerMinute: 20,
};

// ============================================
// ENVIRONMENT VARIABLES
// ============================================

export function getProviderApiKey(): string {
  const provider = AI_CONFIG.provider;

  switch (provider) {
    case 'gemini':
      return process.env.GOOGLE_AI_API_KEY || '';
    case 'openai':
      return process.env.OPENAI_API_KEY || '';
    case 'vertex':
      return process.env.GOOGLE_AI_API_KEY || '';
    default:
      return '';
  }
}

export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const apiKey = getProviderApiKey();
  if (!apiKey && AI_CONFIG.provider !== 'local') {
    errors.push(`Missing API key for provider: ${AI_CONFIG.provider}`);
  }

  if (!AI_CONFIG.model) {
    errors.push('AI model not specified in config');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}


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

  // Which model to use
  // Gemini: 'gemini-2.5-flash', 'gemini-3-flash-preview'
  // OpenAI: 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'
  model: 'gemini-2.5-flash',

  // Maximum tokens in response
  maxTokens: 1000,

  // Temperature (creativity)
  // 0.0 = deterministic, 0.7 = balanced (recommended for finance), 1.0 = very creative
  temperature: 0.7,
};

// ============================================
// FEATURE FLAGS
// ============================================

export const AI_FEATURES = {
  chatEnabled: true,
  insightsEnabled: true,
  predictionsEnabled: true,
  learningEnabled: true,
  dialectDetectionEnabled: true,
  requireConfirmation: true,
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

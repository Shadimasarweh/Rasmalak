/**
 * Rasmalak AI Configuration
 * =========================
 * Central configuration for the AI layer.
 * Change provider here to switch between OpenAI, Arabot, etc.
 */

import { AIProvider, AIProviderConfig } from './types';

// ============================================
// PROVIDER CONFIGURATION
// ============================================
// Change this to switch AI providers

export const AI_CONFIG: AIProviderConfig = {
  // Which provider to use
  // Options: 'openai' | 'arabot' | 'vertex' | 'local'
  provider: 'openai' as AIProvider,
  
  // Which model to use
  // OpenAI: 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'
  // Arabot: (their model names)
  // Local: 'llama-3', 'jais-13b'
  model: 'gpt-4o-mini',
  
  // Maximum tokens in response
  // Lower = faster & cheaper, higher = more detailed
  // 1000 tokens ≈ 750 words
  maxTokens: 1000,
  
  // Temperature (creativity)
  // 0.0 = deterministic, same input = same output
  // 0.7 = balanced (recommended for finance)
  // 1.0 = very creative, may hallucinate
  temperature: 0.7,
};

// ============================================
// FEATURE FLAGS
// ============================================
// Enable/disable specific AI features

export const AI_FEATURES = {
  // Enable chat functionality
  chatEnabled: true,
  
  // Enable automatic insight generation
  insightsEnabled: true,
  
  // Enable predictive features (forecasting)
  predictionsEnabled: true,
  
  // Enable learning recommendations
  learningEnabled: true,
  
  // Enable Arabic dialect detection
  dialectDetectionEnabled: true,
  
  // Require confirmation before AI-suggested changes
  requireConfirmation: true,
};

// ============================================
// SAFETY SETTINGS
// ============================================
// Guardrails to prevent bad AI behavior

export const AI_SAFETY = {
  // Maximum messages in conversation history sent to AI
  // More = better context, but more expensive
  maxHistoryMessages: 10,
  
  // Maximum user message length (characters)
  maxInputLength: 2000,
  
  // Topics the AI should refuse to discuss
  blockedTopics: [
    'specific investment advice',
    'stock picks',
    'cryptocurrency recommendations',
    'legal advice',
    'tax evasion',
  ],
  
  // Require disclaimer for financial advice
  showDisclaimer: true,
  
  // Log all AI interactions (for debugging/audit)
  enableLogging: process.env.NODE_ENV === 'development',
};

// ============================================
// API CONFIGURATION
// ============================================
// API-specific settings

export const API_CONFIG = {
  // Timeout for AI requests (milliseconds)
  timeout: 30000, // 30 seconds
  
  // Retry failed requests
  retryAttempts: 2,
  retryDelay: 1000, // 1 second between retries
  
  // Rate limiting (requests per minute per user)
  rateLimitPerMinute: 20,
};

// ============================================
// ENVIRONMENT VARIABLES
// ============================================
// These should be set in .env.local

export function getProviderApiKey(): string {
  const provider = AI_CONFIG.provider;
  
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY || '';
    case 'vertex':
      return process.env.GOOGLE_AI_API_KEY || '';
    // Add more providers as needed
    default:
      return '';
  }
}

export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check API key is set
  const apiKey = getProviderApiKey();
  if (!apiKey && AI_CONFIG.provider !== 'local') {
    errors.push(`Missing API key for provider: ${AI_CONFIG.provider}`);
  }
  
  // Check model is specified
  if (!AI_CONFIG.model) {
    errors.push('AI model not specified in config');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}




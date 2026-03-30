/**
 * OpenAI Provider Adapter
 * =======================
 * Handles communication with OpenAI's API.
 * This is the only file that knows about OpenAI's specific API format.
 * 
 * To switch providers, you create a new adapter with the same interface.
 */

import { AI_CONFIG, getProviderApiKey, API_CONFIG } from '../config';
import { MessageAttachment } from '../types';

// ============================================
// TYPES
// ============================================

// Content can be text or multi-part (for vision)
type OpenAIContentPart = 
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenAIContentPart[];
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens: number;
  temperature: number;
  response_format?: {
    type: 'json_schema';
    json_schema: {
      name: string;
      schema: Record<string, unknown>;
      strict: boolean;
    };
  };
}

/** Passed by callers to request structured JSON output. */
export interface StructuredOutputSchema {
  name: string;
  schema: Record<string, unknown>;
}

interface OpenAIChoice {
  message: {
    role: string;
    content: string | null;
    refusal?: string | null;
  };
  finish_reason: string;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIError {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

// ============================================
// OPENAI CLIENT
// ============================================

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/** Options accepted by sendChatCompletion / sendChatCompletionWithRetry. */
export type ChatCompletionOptions = Partial<Pick<OpenAIRequest, 'max_tokens' | 'temperature'>> & {
  model?: string;
  /** When provided, the request uses OpenAI Structured Outputs (json_schema). */
  responseSchema?: StructuredOutputSchema;
};

/**
 * Send a chat completion request to OpenAI.
 * When `options.responseSchema` is supplied the request includes
 * `response_format: { type: "json_schema", ... }` so the API is
 * guaranteed to return schema-valid JSON.
 */
export async function sendChatCompletion(
  messages: OpenAIMessage[],
  options?: ChatCompletionOptions
): Promise<{ success: true; content: string; usage: OpenAIResponse['usage'] } | { success: false; error: string }> {
  const apiKey = getProviderApiKey();
  
  if (!apiKey) {
    return {
      success: false,
      error: 'AI service is not configured. Please contact support.',
    };
  }

  const requestBody: OpenAIRequest = {
    model: options?.model ?? AI_CONFIG.model,
    messages,
    max_tokens: options?.max_tokens ?? AI_CONFIG.maxTokens,
    temperature: options?.temperature ?? AI_CONFIG.temperature,
  };

  if (options?.responseSchema) {
    requestBody.response_format = {
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
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json() as OpenAIError;
      return {
        success: false,
        error: `AI service error. Please try again later.`,
      };
    }

    const data = await response.json() as OpenAIResponse;
    
    if (!data.choices || data.choices.length === 0) {
      return {
        success: false,
        error: 'No response from OpenAI',
      };
    }

    const choice = data.choices[0];

    // Handle structured-output refusal
    if (choice.message.refusal) {
      return {
        success: false,
        error: `Model refused: ${choice.message.refusal}`,
      };
    }

    if (choice.message.content == null) {
      return {
        success: false,
        error: 'Empty response content from OpenAI',
      };
    }

    return {
      success: true,
      content: choice.message.content,
      usage: data.usage,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timed out. Please try again.',
        };
      }
      return {
        success: false,
        error: `Network error: ${error.message}`,
      };
    }
    return {
      success: false,
      error: 'Unknown error occurred',
    };
  }
}

/**
 * Send a chat completion with retry logic
 */
export async function sendChatCompletionWithRetry(
  messages: OpenAIMessage[],
  options?: ChatCompletionOptions
): Promise<{ success: true; content: string; usage: OpenAIResponse['usage'] } | { success: false; error: string }> {
  let lastError = '';
  
  for (let attempt = 0; attempt <= API_CONFIG.retryAttempts; attempt++) {
    if (attempt > 0) {
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));
    }
    
    const result = await sendChatCompletion(messages, options);
    
    if (result.success) {
      return result;
    }
    
    lastError = result.error;
    
    // Don't retry on certain errors
    if (result.error.includes('API key') || result.error.includes('401')) {
      break; // Auth error, no point retrying
    }
  }
  
  return {
    success: false,
    error: lastError,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format messages for OpenAI API
 */
export function formatMessagesForOpenAI(
  systemPrompt: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  newMessage: string,
  attachments?: MessageAttachment[]
): OpenAIMessage[] {
  const messages: OpenAIMessage[] = [
    { role: 'system', content: systemPrompt },
  ];
  
  // Add conversation history
  for (const msg of conversationHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }
  
  // Build user message content
  if (attachments && attachments.length > 0) {
    // Multi-part message with text and attachments
    const contentParts: OpenAIContentPart[] = [];
    
    // Add text first
    if (newMessage.trim()) {
      contentParts.push({ type: 'text', text: newMessage });
    }
    
    // Add images
    for (const attachment of attachments) {
      if (attachment.type === 'image') {
        contentParts.push({
          type: 'image_url',
          image_url: {
            url: attachment.content, // base64 data URL
            detail: 'auto',
          },
        });
      } else if (attachment.type === 'document' || attachment.type === 'pdf') {
        // For documents/PDFs, include the extracted text content
        contentParts.push({
          type: 'text',
          text: `\n\n--- Document: ${attachment.filename} ---\n${attachment.content}\n--- End Document ---`,
        });
      }
    }
    
    messages.push({
      role: 'user',
      content: contentParts,
    });
  } else {
    // Simple text message
    messages.push({
      role: 'user',
      content: newMessage,
    });
  }
  
  return messages;
}

/**
 * Get the appropriate model for messages with attachments
 * GPT-4 Vision is needed for image analysis
 */
export function getModelForAttachments(attachments?: MessageAttachment[]): string {
  const hasImages = attachments?.some(a => a.type === 'image');
  // Use GPT-4 Vision for images, otherwise use configured model
  if (hasImages) {
    return 'gpt-4o'; // GPT-4o supports vision
  }
  return AI_CONFIG.model;
}

/**
 * Estimate token count (rough approximation)
 * Arabic text typically uses more tokens than English
 */
export function estimateTokenCount(text: string): number {
  // Arabic characters typically = 2-3 tokens each
  // English words typically = 1-2 tokens each
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const otherChars = text.length - arabicChars;
  
  return Math.ceil(arabicChars * 2.5 + otherChars * 0.4);
}

/**
 * Check if we're within token limits
 */
export function isWithinTokenLimits(messages: OpenAIMessage[], maxTokens: number = 4000): boolean {
  const totalText = messages.map(m => m.content).join(' ');
  const estimatedTokens = estimateTokenCount(totalText);
  return estimatedTokens < maxTokens;
}



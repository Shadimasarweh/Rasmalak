/**
 * OpenAI Provider Adapter
 * =======================
 * Handles communication with OpenAI's API.
 * This is the only file that knows about OpenAI's specific API format.
 * 
 * To switch providers, you create a new adapter with the same interface.
 */

import { AI_CONFIG, getProviderApiKey, API_CONFIG } from '../config';

// ============================================
// TYPES
// ============================================

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens: number;
  temperature: number;
}

interface OpenAIChoice {
  message: {
    role: string;
    content: string;
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

/**
 * Send a chat completion request to OpenAI
 */
export async function sendChatCompletion(
  messages: OpenAIMessage[],
  options?: Partial<Pick<OpenAIRequest, 'max_tokens' | 'temperature'>>
): Promise<{ success: true; content: string; usage: OpenAIResponse['usage'] } | { success: false; error: string }> {
  const apiKey = getProviderApiKey();
  
  if (!apiKey) {
    return {
      success: false,
      error: 'OpenAI API key not configured. Set OPENAI_API_KEY in .env.local',
    };
  }

  const requestBody: OpenAIRequest = {
    model: AI_CONFIG.model,
    messages,
    max_tokens: options?.max_tokens ?? AI_CONFIG.maxTokens,
    temperature: options?.temperature ?? AI_CONFIG.temperature,
  };

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
        error: errorData.error?.message || `OpenAI API error: ${response.status}`,
      };
    }

    const data = await response.json() as OpenAIResponse;
    
    if (!data.choices || data.choices.length === 0) {
      return {
        success: false,
        error: 'No response from OpenAI',
      };
    }

    return {
      success: true,
      content: data.choices[0].message.content,
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
  options?: Partial<Pick<OpenAIRequest, 'max_tokens' | 'temperature'>>
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
  newMessage: string
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
  
  // Add new user message
  messages.push({
    role: 'user',
    content: newMessage,
  });
  
  return messages;
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



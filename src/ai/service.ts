/**
 * Rasmalak AI Service
 * ===================
 * The main interface your app uses to interact with AI.
 * This abstracts away the provider details.
 * 
 * Usage:
 *   import { aiService } from '@/ai/service';
 *   const response = await aiService.chat(message, context);
 */

import {
  AIResponse,
  AIMessage,
  UserFinancialContext,
  ConfidenceLevel,
  AIIntent,
  SuggestedAction,
  InsightCard,
  MessageAttachment,
} from './types';
import { AI_CONFIG, AI_SAFETY, AI_FEATURES } from './config';
import { sendChatCompletionWithRetry, formatMessagesForOpenAI, getModelForAttachments } from './providers/openai';
import { getSystemPrompt, getInsightPrompt } from './prompts';

// ============================================
// AI SERVICE CLASS
// ============================================

class RasmalakAIService {
  private conversationHistories: Map<string, AIMessage[]> = new Map();

  /**
   * Send a chat message and get AI response
   * @param attachments - Optional file attachments (images, documents)
   */
  async chat(
    message: string,
    context: UserFinancialContext,
    conversationId: string,
    language: 'ar' | 'en' = 'ar',
    attachments?: MessageAttachment[]
  ): Promise<AIResponse> {
    const startTime = Date.now();

    // Validate input - allow empty message if there are attachments
    const hasAttachments = attachments && attachments.length > 0;
    if ((!message || message.trim().length === 0) && !hasAttachments) {
      return this.createErrorResponse('الرجاء إدخال رسالة', startTime);
    }

    if (message.length > AI_SAFETY.maxInputLength) {
      return this.createErrorResponse(
        'الرسالة طويلة جداً. الرجاء اختصارها.',
        startTime
      );
    }

    // Get conversation history
    const history = this.getConversationHistory(conversationId);

    // Build the system prompt with user context
    // Add attachment handling instructions if files are present
    let systemPrompt = getSystemPrompt(context, language);
    if (hasAttachments) {
      const attachmentInstructions = language === 'ar'
        ? '\n\nالمستخدم أرفق ملف/صورة. قم بتحليل المحتوى المرفق ونفذ طلب المستخدم (ترجمة، شرح، تحليل، استخراج بيانات مالية، إلخ). إذا كان هناك نص عربي، احترم اللغة.'
        : '\n\nThe user has attached a file/image. Analyze the attached content and perform the requested task (translation, explanation, analysis, extract financial data, etc.). Respect the language used.';
      systemPrompt += attachmentInstructions;
    }

    // Format for OpenAI
    const formattedHistory = history.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const messages = formatMessagesForOpenAI(
      systemPrompt,
      formattedHistory,
      message,
      attachments
    );

    // Get appropriate model (GPT-4 Vision for images)
    const model = getModelForAttachments(attachments);

    // Call AI provider with potentially different model
    const result = await sendChatCompletionWithRetry(messages, {
      // Override model if needed for vision
      ...(model !== AI_CONFIG.model && { model }),
    });

    if (!result.success) {
      return this.createErrorResponse(result.error, startTime);
    }

    // Parse the response
    const aiResponse = this.parseAIResponse(result.content, startTime, language);

    // Save to conversation history
    const messageContent = hasAttachments 
      ? `${message} [+${attachments!.length} ${language === 'ar' ? 'مرفق' : 'attachment(s)'}]`
      : message;
    this.addToHistory(conversationId, 'user', messageContent);
    this.addToHistory(conversationId, 'assistant', aiResponse.message);

    return aiResponse;
  }

  /**
   * Generate insights for the dashboard (no user message, just analysis)
   */
  async generateInsights(
    context: UserFinancialContext,
    language: 'ar' | 'en' = 'ar'
  ): Promise<InsightCard[]> {
    if (!AI_FEATURES.insightsEnabled) {
      return [];
    }

    const prompt = getInsightPrompt(context, language);
    
    const messages = formatMessagesForOpenAI(prompt, [], 'Generate insights');

    const result = await sendChatCompletionWithRetry(messages, {
      max_tokens: 500,
      temperature: 0.5, // More consistent for insights
    });

    if (!result.success) {
      console.error('[AI] Failed to generate insights:', result.error);
      return [];
    }

    return this.parseInsightsResponse(result.content, language);
  }

  /**
   * Classify user intent (for routing/analytics)
   */
  async classifyIntent(
    message: string,
    language: 'ar' | 'en' = 'ar'
  ): Promise<{ intent: AIIntent; confidence: ConfidenceLevel }> {
    // For now, use simple keyword matching
    // This can be enhanced with a dedicated classification call
    const intent = this.detectIntentLocally(message);
    
    return {
      intent,
      confidence: 'medium',
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private getConversationHistory(conversationId: string): AIMessage[] {
    const history = this.conversationHistories.get(conversationId) || [];
    // Limit history to prevent token overflow
    return history.slice(-AI_SAFETY.maxHistoryMessages);
  }

  private addToHistory(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string
  ): void {
    const history = this.conversationHistories.get(conversationId) || [];
    history.push({
      id: `msg_${Date.now()}`,
      role,
      content,
      timestamp: new Date().toISOString(),
    });
    this.conversationHistories.set(conversationId, history);
  }

  private parseAIResponse(
    content: string,
    startTime: number,
    language: 'ar' | 'en'
  ): AIResponse {
    // Try to parse structured response if AI returned JSON
    try {
      // Check if response contains JSON block
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          message: parsed.message || content,
          messageAr: language === 'ar' ? parsed.message : undefined,
          intent: parsed.intent || 'unclear',
          confidence: parsed.confidence || 'medium',
          entities: parsed.entities || [],
          suggestedActions: parsed.suggestedActions || this.getDefaultSuggestions(language),
          insights: parsed.insights || [],
          needsClarification: parsed.needsClarification || false,
          processingTime: Date.now() - startTime,
          model: AI_CONFIG.model,
        };
      }
    } catch {
      // Not JSON, treat as plain text
    }

    // Plain text response
    return {
      message: content,
      messageAr: language === 'ar' ? content : undefined,
      intent: this.detectIntentLocally(content),
      confidence: 'medium',
      entities: [],
      suggestedActions: this.getDefaultSuggestions(language),
      insights: [],
      needsClarification: false,
      processingTime: Date.now() - startTime,
      model: AI_CONFIG.model,
    };
  }

  private parseInsightsResponse(content: string, language: 'ar' | 'en'): InsightCard[] {
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        if (Array.isArray(parsed.insights)) {
          return parsed.insights;
        }
      }
    } catch {
      // Failed to parse, return empty
    }
    return [];
  }

  private createErrorResponse(error: string, startTime: number): AIResponse {
    return {
      message: error,
      intent: 'unclear',
      confidence: 'low',
      entities: [],
      suggestedActions: [],
      insights: [],
      needsClarification: false,
      processingTime: Date.now() - startTime,
      model: AI_CONFIG.model,
    };
  }

  private detectIntentLocally(text: string): AIIntent {
    const lowerText = text.toLowerCase();
    
    // Spending analysis
    if (
      lowerText.includes('صرف') ||
      lowerText.includes('مصاريف') ||
      lowerText.includes('فلوس') ||
      lowerText.includes('spend') ||
      lowerText.includes('expense')
    ) {
      return 'analyze_spending';
    }
    
    // Savings
    if (
      lowerText.includes('وفر') ||
      lowerText.includes('ادخر') ||
      lowerText.includes('save') ||
      lowerText.includes('saving')
    ) {
      return 'savings_advice';
    }
    
    // Budget
    if (
      lowerText.includes('ميزانية') ||
      lowerText.includes('budget')
    ) {
      return 'budget_status';
    }
    
    // Greeting
    if (
      lowerText.includes('مرحبا') ||
      lowerText.includes('السلام') ||
      lowerText.includes('هلا') ||
      lowerText.includes('hello') ||
      lowerText.includes('hi')
    ) {
      return 'greeting';
    }
    
    // Gratitude
    if (
      lowerText.includes('شكر') ||
      lowerText.includes('thank')
    ) {
      return 'gratitude';
    }
    
    return 'unclear';
  }

  private getDefaultSuggestions(language: 'ar' | 'en'): SuggestedAction[] {
    if (language === 'ar') {
      return [
        {
          id: 'analyze',
          label: 'Analyze my spending',
          labelAr: 'حلل مصاريفي',
          action: 'send_message',
          payload: 'حلل مصاريفي لهذا الشهر',
        },
        {
          id: 'save',
          label: 'How to save more?',
          labelAr: 'كيف أوفر أكثر؟',
          action: 'send_message',
          payload: 'كيف أوفر أكثر؟',
        },
        {
          id: 'budget',
          label: 'Check my budget',
          labelAr: 'تحقق من ميزانيتي',
          action: 'send_message',
          payload: 'هل أنا ماشي صح بالميزانية؟',
        },
      ];
    }
    
    return [
      {
        id: 'analyze',
        label: 'Analyze my spending',
        labelAr: 'حلل مصاريفي',
        action: 'send_message',
        payload: 'Analyze my spending this month',
      },
      {
        id: 'save',
        label: 'How to save more?',
        labelAr: 'كيف أوفر أكثر؟',
        action: 'send_message',
        payload: 'How can I save more money?',
      },
      {
        id: 'budget',
        label: 'Check my budget',
        labelAr: 'تحقق من ميزانيتي',
        action: 'send_message',
        payload: 'Am I on track with my budget?',
      },
    ];
  }

  /**
   * Clear conversation history (e.g., when user logs out)
   */
  clearConversation(conversationId: string): void {
    this.conversationHistories.delete(conversationId);
  }

  /**
   * Clear all conversations
   */
  clearAllConversations(): void {
    this.conversationHistories.clear();
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const aiService = new RasmalakAIService();



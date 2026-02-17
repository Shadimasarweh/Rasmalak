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
import { computeContextHash } from './contextHash';
import { logFinancialAdvice } from './adviceLogger';

// ============================================
// ACTIONABLE INTENT CLASSIFICATION
// ============================================
// Intents that constitute financial advice requiring an audit trail.
// Greetings, gratitude, explanations, and unclear/out-of-scope are excluded.

const ACTIONABLE_INTENTS = new Set<AIIntent>([
  'analyze_spending',
  'category_breakdown',
  'compare_periods',
  'savings_advice',
  'goal_progress',
  'goal_planning',
  'budget_status',
  'budget_advice',
  'overspending_alert',
  'predict_end_of_month',
  'simulate_scenario',
  'forecast_savings',
]);

/** Map an actionable intent to the financial metric it addresses. */
function intentToMetric(intent: AIIntent): string {
  switch (intent) {
    case 'analyze_spending':
    case 'category_breakdown':
    case 'compare_periods':
      return 'spending';
    case 'savings_advice':
    case 'goal_progress':
    case 'goal_planning':
    case 'forecast_savings':
      return 'savings';
    case 'budget_status':
    case 'budget_advice':
    case 'overspending_alert':
      return 'budget';
    case 'predict_end_of_month':
    case 'simulate_scenario':
      return 'cashflow';
    default:
      return 'general';
  }
}

// ============================================
// AI SERVICE CLASS
// ============================================

class RasmalakAIService {
  private conversationHistories: Map<string, AIMessage[]> = new Map();

  /**
   * Send a chat message and get AI response.
   * When the response constitutes actionable financial advice, a row is
   * inserted into the financial_advice table before the response is returned.
   *
   * @param userId - Authenticated Supabase user ID. Required for advice logging.
   * @param attachments - Optional file attachments (images, documents)
   */
  async chat(
    message: string,
    context: UserFinancialContext,
    conversationId: string,
    language: 'ar' | 'en' = 'ar',
    attachments?: MessageAttachment[],
    userId?: string
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

    // Parse the response (pass user message for intent-aware suggestions)
    const aiResponse = this.parseAIResponse(result.content, startTime, language, message);

    // Save to conversation history
    const messageContent = hasAttachments 
      ? `${message} [+${attachments!.length} ${language === 'ar' ? 'مرفق' : 'attachment(s)'}]`
      : message;
    this.addToHistory(conversationId, 'user', messageContent);
    this.addToHistory(conversationId, 'assistant', aiResponse.message);

    // Log actionable financial advice before returning to the UI.
    // Greetings, explanations, and unclear intents are not logged.
    if (userId && ACTIONABLE_INTENTS.has(aiResponse.intent)) {
      try {
        const contextHash = await computeContextHash(context);
        await logFinancialAdvice({
          user_id: userId,
          source: 'ai',
          advice_text: aiResponse.message,
          target_metric: intentToMetric(aiResponse.intent),
          confidence: aiResponse.confidence,
          conversation_id: conversationId,
          context_hash: contextHash,
        });
      } catch (err) {
        console.error('[AI Service] Failed to log advice:', err);
      }
    }

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
      max_tokens: 1024,
      temperature: 0.6, // Slightly creative for richer insights while staying consistent
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
    language: 'ar' | 'en',
    userMessage?: string
  ): AIResponse {
    // Detect intent from the user's original message (not the AI response)
    const detectedIntent = userMessage
      ? this.detectIntentLocally(userMessage)
      : this.detectIntentLocally(content);

    // Try to parse structured response if AI returned JSON
    try {
      // Check if response contains JSON block
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        const intent = parsed.intent || detectedIntent;
        return {
          message: parsed.message || content,
          messageAr: language === 'ar' ? parsed.message : undefined,
          intent,
          confidence: parsed.confidence || 'medium',
          entities: parsed.entities || [],
          suggestedActions: parsed.suggestedActions || this.getDefaultSuggestions(language, intent),
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
      intent: detectedIntent,
      confidence: 'medium',
      entities: [],
      suggestedActions: this.getDefaultSuggestions(language, detectedIntent),
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
    
    // Educational / Concept explanation — check first since "ما هي" / "شو يعني" / "what is"
    // questions should be caught before keyword matches on financial terms
    if (
      lowerText.includes('ما هي') ||
      lowerText.includes('ما هو') ||
      lowerText.includes('ما معنى') ||
      lowerText.includes('شو يعني') ||
      lowerText.includes('ايش يعني') ||
      lowerText.includes('يعني ايه') ||
      lowerText.includes('يعني إيه') ||
      lowerText.includes('شو هو') ||
      lowerText.includes('شو هي') ||
      lowerText.includes('عرّفني') ||
      lowerText.includes('اشرحلي') ||
      lowerText.includes('اشرح لي') ||
      lowerText.includes('فسّرلي') ||
      lowerText.includes('what is') ||
      lowerText.includes('what are') ||
      lowerText.includes('what does') ||
      lowerText.includes('explain') ||
      lowerText.includes('define') ||
      lowerText.includes('meaning of') ||
      lowerText.includes('tell me about')
    ) {
      return 'explain_concept';
    }

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
    
    // Predictions / End of month
    if (
      lowerText.includes('يكفي') ||
      lowerText.includes('آخر الشهر') ||
      lowerText.includes('نهاية الشهر') ||
      lowerText.includes('end of month') ||
      lowerText.includes('last me') ||
      lowerText.includes('will my money')
    ) {
      return 'predict_end_of_month';
    }

    // Goals
    if (
      lowerText.includes('هدف') ||
      lowerText.includes('أهداف') ||
      lowerText.includes('goal') ||
      lowerText.includes('target')
    ) {
      return 'goal_progress';
    }

    // Savings
    if (
      lowerText.includes('وفر') ||
      lowerText.includes('ادخر') ||
      lowerText.includes('توفير') ||
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
      lowerText.includes('أهلا') ||
      lowerText.includes('hello') ||
      lowerText.includes('hi ')  ||
      lowerText === 'hi'
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

  private getDefaultSuggestions(language: 'ar' | 'en', intent?: AIIntent): SuggestedAction[] {
    // Return context-aware suggestions based on the detected intent
    const suggestions = this.getSuggestionsForIntent(intent || 'unclear', language);
    return suggestions;
  }

  private getSuggestionsForIntent(intent: AIIntent, language: 'ar' | 'en'): SuggestedAction[] {
    const isAr = language === 'ar';

    switch (intent) {
      case 'analyze_spending':
      case 'category_breakdown':
      case 'compare_periods':
        return [
          {
            id: 'compare',
            label: 'Compare to last month',
            labelAr: 'قارن بالشهر الماضي',
            action: 'send_message',
            payload: isAr ? 'قارن مصاريفي بالشهر الماضي' : 'Compare my spending to last month',
          },
          {
            id: 'save_tips',
            label: 'How can I reduce spending?',
            labelAr: 'كيف أقلل المصاريف؟',
            action: 'send_message',
            payload: isAr ? 'كيف أقدر أقلل مصاريفي؟' : 'How can I reduce my spending?',
          },
          {
            id: 'budget_check',
            label: 'Am I within budget?',
            labelAr: 'هل أنا ضمن الميزانية؟',
            action: 'send_message',
            payload: isAr ? 'هل أنا ضمن الميزانية؟' : 'Am I within my budget?',
          },
        ];

      case 'savings_advice':
      case 'goal_progress':
      case 'goal_planning':
      case 'forecast_savings':
        return [
          {
            id: 'goal_status',
            label: 'Check my goals progress',
            labelAr: 'تقدمي نحو أهدافي',
            action: 'send_message',
            payload: isAr ? 'كيف تقدمي نحو أهدافي؟' : 'How is my progress toward my goals?',
          },
          {
            id: 'save_plan',
            label: 'Create a saving plan',
            labelAr: 'اعملّي خطة ادخار',
            action: 'send_message',
            payload: isAr ? 'اعملّي خطة ادخار شهرية' : 'Create a monthly saving plan for me',
          },
          {
            id: 'cut_expenses',
            label: 'Where can I cut expenses?',
            labelAr: 'وين أقدر أوفر؟',
            action: 'send_message',
            payload: isAr ? 'وين أقدر أوفر من مصاريفي؟' : 'Where can I cut expenses to save more?',
          },
        ];

      case 'budget_status':
      case 'budget_advice':
      case 'overspending_alert':
        return [
          {
            id: 'breakdown',
            label: 'Show spending breakdown',
            labelAr: 'فصّل المصاريف',
            action: 'send_message',
            payload: isAr ? 'فصّلي المصاريف حسب الفئة' : 'Show me a spending breakdown by category',
          },
          {
            id: 'end_month',
            label: 'Will my money last?',
            labelAr: 'هل رح يكفيني لآخر الشهر؟',
            action: 'send_message',
            payload: isAr ? 'هل رح يكفيني الراتب لآخر الشهر؟' : 'Will my money last until end of month?',
          },
          {
            id: 'adjust_budget',
            label: 'Help me adjust my budget',
            labelAr: 'ساعدني أعدّل ميزانيتي',
            action: 'send_message',
            payload: isAr ? 'ساعدني أعدّل ميزانيتي' : 'Help me adjust my budget',
          },
        ];

      case 'predict_end_of_month':
      case 'simulate_scenario':
        return [
          {
            id: 'reduce_scenario',
            label: 'What if I spend less?',
            labelAr: 'لو صرفت أقل؟',
            action: 'send_message',
            payload: isAr ? 'لو قللت مصاريفي 20% شو بيصير؟' : 'What if I reduced spending by 20%?',
          },
          {
            id: 'budget_check',
            label: 'Review my budget',
            labelAr: 'راجع ميزانيتي',
            action: 'send_message',
            payload: isAr ? 'راجع ميزانيتي الحالية' : 'Review my current budget',
          },
          {
            id: 'save_tips',
            label: 'Tips to save more',
            labelAr: 'نصائح للتوفير',
            action: 'send_message',
            payload: isAr ? 'أعطيني نصائح عملية للتوفير' : 'Give me practical tips to save more',
          },
        ];

      case 'explain_concept':
      case 'learning_recommendation':
        return [
          {
            id: 'learn_more',
            label: 'Tell me more about this',
            labelAr: 'احكيلي أكثر عن هالموضوع',
            action: 'send_message',
            payload: isAr ? 'احكيلي أكثر عن هالموضوع' : 'Tell me more about this topic',
          },
          {
            id: 'apply_to_me',
            label: 'How does this apply to me?',
            labelAr: 'كيف ينطبق هاد على وضعي؟',
            action: 'send_message',
            payload: isAr ? 'كيف ينطبق هاد على وضعي المالي؟' : 'How does this apply to my financial situation?',
          },
          {
            id: 'what_learn',
            label: 'What else should I learn?',
            labelAr: 'شو كمان لازم أتعلم؟',
            action: 'send_message',
            payload: isAr ? 'شو كمان لازم أتعلم عن إدارة الأموال؟' : 'What else should I learn about managing money?',
          },
        ];

      case 'greeting':
        return [
          {
            id: 'analyze',
            label: 'Analyze my spending',
            labelAr: 'حلل مصاريفي',
            action: 'send_message',
            payload: isAr ? 'حلل مصاريفي لهذا الشهر' : 'Analyze my spending this month',
          },
          {
            id: 'save',
            label: 'How to save more?',
            labelAr: 'كيف أوفر أكثر؟',
            action: 'send_message',
            payload: isAr ? 'كيف أوفر أكثر؟' : 'How can I save more money?',
          },
          {
            id: 'budget',
            label: 'Check my budget',
            labelAr: 'تحقق من ميزانيتي',
            action: 'send_message',
            payload: isAr ? 'هل أنا ماشي صح بالميزانية؟' : 'Am I on track with my budget?',
          },
        ];

      default:
        // Fallback: diverse set of suggestions
        return [
          {
            id: 'analyze',
            label: 'Analyze my spending',
            labelAr: 'حلل مصاريفي',
            action: 'send_message',
            payload: isAr ? 'حلل مصاريفي لهذا الشهر' : 'Analyze my spending this month',
          },
          {
            id: 'save',
            label: 'How to save more?',
            labelAr: 'كيف أوفر أكثر؟',
            action: 'send_message',
            payload: isAr ? 'كيف أوفر أكثر؟' : 'How can I save more money?',
          },
          {
            id: 'budget',
            label: 'Check my budget',
            labelAr: 'تحقق من ميزانيتي',
            action: 'send_message',
            payload: isAr ? 'هل أنا ماشي صح بالميزانية؟' : 'Am I on track with my budget?',
          },
        ];
    }
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



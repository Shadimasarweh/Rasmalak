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
import {
  sendChatCompletion as openaiSendCompletion,
  sendChatCompletionWithRetry as openaiSendCompletionWithRetry,
  formatMessagesForOpenAI,
  getModelForAttachments as openaiGetModel,
} from './providers/openai';
import {
  sendChatCompletion as geminiSendCompletion,
  sendChatCompletionWithRetry as geminiSendCompletionWithRetry,
  formatMessagesForProvider as geminiFormatMessages,
  getModelForAttachments as geminiGetModel,
} from './providers/gemini';
import { getSystemPrompt, getInsightPrompt, getTaskPrompt } from './prompts';

// ============================================
// PROVIDER ROUTING
// ============================================

const isGemini = AI_CONFIG.provider === 'gemini';

function sendChatCompletion(...args: Parameters<typeof openaiSendCompletion>) {
  return isGemini ? geminiSendCompletion(...args) : openaiSendCompletion(...args);
}

function sendChatCompletionWithRetry(...args: Parameters<typeof openaiSendCompletionWithRetry>) {
  return isGemini ? geminiSendCompletionWithRetry(...args) : openaiSendCompletionWithRetry(...args);
}

function formatMessages(...args: Parameters<typeof formatMessagesForOpenAI>) {
  return isGemini ? geminiFormatMessages(...args) : formatMessagesForOpenAI(...args);
}

function getModelForAttachments(...args: Parameters<typeof openaiGetModel>) {
  return isGemini ? geminiGetModel(...args) : openaiGetModel(...args);
}
import { computeContextHash } from './contextHash';
import { logFinancialAdvice } from './adviceLogger';
import {
  InsightsResponseSchema,
  IntentResponseSchema,
  EntitiesResponseSchema,
  VALID_INTENTS,
} from './schemas';
import { computeFinancialSignals, type SignalSummary } from './financialSignals';
import { deriveAdvisoryState } from './financialAdvisory';
import { computeFinancialHealth } from './financialHealth';

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
// SIGNAL SUMMARY BUILDER
// ============================================
// Maps UserFinancialContext → SignalSummary consumed by
// computeFinancialSignals().  Derives monthly arrays from
// the current-month values and month-over-month deltas when
// full historical arrays are unavailable.

function buildSignalSummary(ctx: UserFinancialContext): SignalSummary {
  // Recurring expenses normalised to monthly amounts
  let recurringMonthly = 0;
  for (const r of ctx.patterns.recurringExpenses) {
    switch (r.frequency) {
      case 'weekly':  recurringMonthly += r.amount * (52 / 12); break;
      case 'monthly': recurringMonthly += r.amount;              break;
      case 'yearly':  recurringMonthly += r.amount / 12;         break;
    }
  }

  const discretionary = Math.max(0, ctx.totalExpenses - recurringMonthly);

  // Derive last-month values from percentage-change deltas.
  // comparedToLastMonth.*Change are percentages (e.g. +15 means +15 %).
  const curExp = ctx.currentMonth.expenses;
  const curInc = ctx.currentMonth.income;
  const expDelta = ctx.comparedToLastMonth.expenseChange;   // %
  const incDelta = ctx.comparedToLastMonth.incomeChange;     // %

  const prevExp = expDelta !== 0 ? curExp / (1 + expDelta / 100) : curExp;
  const prevInc = incDelta !== 0 ? curInc / (1 + incDelta / 100) : curInc;

  // monthlyExpenses / monthlyIncome: [previous, current] (oldest-first)
  const monthlyExpenses = [prevExp, curExp].filter((v) => Number.isFinite(v) && v >= 0);
  const monthlyIncome   = [prevInc, curInc].filter((v) => Number.isFinite(v) && v >= 0);

  // Goals
  const goals = ctx.goals.map((g) => ({
    target:  g.targetAmount,
    current: g.currentAmount,
  }));

  return {
    totalIncome:           ctx.totalIncome,
    totalExpenses:         ctx.totalExpenses,
    recurringExpenses:     recurringMonthly,
    discretionaryExpenses: discretionary,
    monthlyExpenses,
    monthlyIncome,
    goals: goals.length > 0 ? goals : undefined,
  };
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

    const messages = formatMessages(
      systemPrompt,
      formattedHistory,
      message,
      attachments
    );

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
   * Generate insights for the dashboard (no user message, just analysis).
   * Uses OpenAI Structured Outputs to guarantee valid JSON.
   *
   * Before calling the model, deterministic financial signals are computed
   * and injected as structured JSON so the model's reasoning is grounded
   * in hard numbers rather than relying on prompt interpretation alone.
   */
  async generateInsights(
    context: UserFinancialContext,
    language: 'ar' | 'en' = 'ar'
  ): Promise<InsightCard[]> {
    if (!AI_FEATURES.insightsEnabled) {
      return [];
    }

    // Compute deterministic signals, advisory state, and health score (pure math, no AI)
    const signalSummary = buildSignalSummary(context);
    const signals = computeFinancialSignals(signalSummary);
    const advisory = deriveAdvisoryState(signals);
    const health = computeFinancialHealth(signals);

    // Build prompt and append all three layers as structured JSON
    const basePrompt = getInsightPrompt(context, language);
    const signalsBlock =
      '\n\n## Financial Signals (deterministic raw metrics)\n' +
      JSON.stringify(signals, null, 2) +
      '\n\n## Advisory State (system-defined interpretation)\n' +
      JSON.stringify(advisory, null, 2) +
      '\n\n## Financial Health (deterministic score)\n' +
      JSON.stringify({ score: health.score, band: health.band, components: health.components }, null, 2);
    const prompt = basePrompt + signalsBlock;

    const messages = formatMessages(prompt, [], 'Generate insights');

    const result = await sendChatCompletionWithRetry(messages, {
      max_tokens: 500,
      temperature: 0.5,
      responseSchema: { name: 'InsightsResponse', schema: InsightsResponseSchema },
    });

    if (!result.success) {
      console.error('[AI] Failed to generate insights:', result.error);
      return this.getFallbackInsights(language);
    }

    try {
      const parsed = JSON.parse(result.content);
      if (Array.isArray(parsed.insights) && parsed.insights.length > 0) {
        return parsed.insights;
      }
      return this.getFallbackInsights(language);
    } catch {
      console.error('[AI] Failed to parse insights JSON');
      return this.getFallbackInsights(language);
    }
  }

  /**
   * Classify user intent (for routing/analytics).
   * Uses OpenAI Structured Outputs with the IntentResponse schema.
   * Falls back to local keyword detection if the AI call fails.
   */
  async classifyIntent(
    message: string,
    language: 'ar' | 'en' = 'ar'
  ): Promise<{ intent: AIIntent; confidence: ConfidenceLevel }> {
    try {
      const taskPrompt = getTaskPrompt('classify_intent', message, language);
      const messages = formatMessages(
        language === 'ar' ? 'أنت مصنف نوايا الرسائل.' : 'You are a message intent classifier.',
        [],
        taskPrompt
      );

      const result = await sendChatCompletion(messages, {
        max_tokens: 50,
        temperature: 0,
        responseSchema: { name: 'IntentResponse', schema: IntentResponseSchema },
      });

      if (result.success) {
        const parsed = JSON.parse(result.content);
        if (VALID_INTENTS.has(parsed.intent)) {
          return { intent: parsed.intent as AIIntent, confidence: 'high' };
        }
      }
    } catch {
      // Fall through to local detection
    }

    return {
      intent: this.detectIntentLocally(message),
      confidence: 'medium',
    };
  }

  /**
   * Extract financial entities from a message.
   * Uses OpenAI Structured Outputs with the EntitiesResponse schema.
   * Returns empty arrays per field if the AI call fails.
   */
  async extractEntities(
    message: string,
    language: 'ar' | 'en' = 'ar'
  ): Promise<{ amounts: number[]; categories: string[]; dates: string[]; merchants: string[]; goals: string[] }> {
    const empty = { amounts: [] as number[], categories: [] as string[], dates: [] as string[], merchants: [] as string[], goals: [] as string[] };

    try {
      const taskPrompt = getTaskPrompt('extract_entities', message, language);
      const messages = formatMessages(
        language === 'ar' ? 'أنت محلل نصوص مالية.' : 'You are a financial text analyzer.',
        [],
        taskPrompt
      );

      const result = await sendChatCompletion(messages, {
        max_tokens: 200,
        temperature: 0,
        responseSchema: { name: 'EntitiesResponse', schema: EntitiesResponseSchema },
      });

      if (!result.success) return empty;

      const parsed = JSON.parse(result.content);
      return {
        amounts:    parsed.entities?.amounts    ?? [],
        categories: parsed.entities?.categories ?? [],
        dates:      parsed.entities?.dates      ?? [],
        merchants:  parsed.entities?.merchants  ?? [],
        goals:      parsed.entities?.goals      ?? [],
      };
    } catch {
      return empty;
    }
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

  /**
   * Safe fallback insight returned when AI generation or parsing fails.
   */
  private getFallbackInsights(language: 'ar' | 'en'): InsightCard[] {
    return [
      {
        id: 'fallback_insight',
        type: 'info',
        title: language === 'ar' ? 'تعذر التحليل' : 'Analysis Unavailable',
        titleAr: 'تعذر التحليل',
        message: language === 'ar'
          ? 'تعذر توليد الملخص الآن، حاول مرة أخرى'
          : 'Could not generate summary right now, please try again',
        messageAr: 'تعذر توليد الملخص الآن، حاول مرة أخرى',
      },
    ];
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



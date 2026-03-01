/**
 * AI Orchestrator
 * ===============
 * Central orchestration layer that replaces direct aiService.chat() usage.
 *
 * Pipeline:
 *   User Input → Intent Classifier → Context Selector → Memory Read
 *   → Deterministic Layer → Agent Router → Prompt Composer → Single LLM Call
 *   → Validation Pipeline → Memory Update → Audit Log → User Response
 *
 * This service does NOT generate content directly. It delegates prompt
 * construction to agents and generation to providers.
 */

import type { OrchestratorInput, OrchestratorOutput, ExplanationTrace } from './orchestrator/types';
import type { AIResponse, AIMessage, ConfidenceLevel, SuggestedAction } from './types';
import type { FinancialContextSlice } from './agents/types';
import { classifyIntent } from './orchestrator/intentClassifier';
import { findAgentForIntent } from './agents/registry';
import { composePrompt } from './orchestrator/promptComposer';
import { selectContext } from './context/contextSelector';
import { readMemoryFields } from './memory/memoryService';
import {
  computeFinancialSignals,
  computeFinancialHealth,
  deriveAdvisoryState,
  computeProjections,
  type DeterministicOutputs,
  type SignalSummary,
} from './deterministic';
import { validateOutput, type ValidationResult } from './validation/pipeline';
import { writeAuditLog } from './validation/auditLogger';
import { updateMemoryFromSignals } from './memory/updateRules';
import { AI_CONFIG, AI_SAFETY } from './config';
import { computeContextHash } from './contextHash';
import { logFinancialAdvice } from './adviceLogger';

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

const isGemini = AI_CONFIG.provider === 'gemini';

function sendChatCompletionWithRetry(...args: Parameters<typeof openaiSendCompletionWithRetry>) {
  return isGemini ? geminiSendCompletionWithRetry(...args) : openaiSendCompletionWithRetry(...args);
}
function formatMessages(...args: Parameters<typeof formatMessagesForOpenAI>) {
  return isGemini ? geminiFormatMessages(...args) : formatMessagesForOpenAI(...args);
}
function getModelForAttachments(...args: Parameters<typeof openaiGetModel>) {
  return isGemini ? geminiGetModel(...args) : openaiGetModel(...args);
}

// In-memory conversation history (preserved from original service)
const conversationHistories = new Map<string, AIMessage[]>();

const ACTIONABLE_INTENTS = new Set([
  'analyze_spending', 'category_breakdown', 'compare_periods',
  'savings_advice', 'goal_progress', 'goal_planning',
  'budget_status', 'budget_advice', 'overspending_alert',
  'predict_end_of_month', 'simulate_scenario', 'forecast_savings',
]);

function intentToMetric(intent: string): string {
  if (['savings_advice', 'goal_progress', 'goal_planning', 'forecast_savings'].includes(intent)) return 'savings';
  if (['budget_status', 'budget_advice', 'overspending_alert'].includes(intent)) return 'budget';
  if (['predict_end_of_month', 'simulate_scenario'].includes(intent)) return 'cashflow';
  return 'spending';
}

export class AIOrchestrator {
  /**
   * Process a user message through the full orchestrator pipeline.
   */
  async process(input: OrchestratorInput): Promise<OrchestratorOutput> {
    const startTime = Date.now();
    const memoryFieldsWritten: string[] = [];

    // ── 1. Classify intent (rule-based, no LLM) ──
    const intentResult = classifyIntent(input.message);

    // ── 2. Select agent from registry ──
    const agent = findAgentForIntent(intentResult.intent);

    // ── 3. Read selective memory fields ──
    let memoryFields = {};
    if (input.userId && agent.requiredMemoryFields.length > 0) {
      try {
        memoryFields = await readMemoryFields(input.userId, agent.requiredMemoryFields);
      } catch {
        // Memory read failure is non-fatal
      }
    }

    // ── 4. Run deterministic layer if agent requires it ──
    let deterministic: DeterministicOutputs | null = null;
    if (agent.needsDeterministicLayer) {
      deterministic = this.computeDeterministic(input);
    }

    // ── 5. Build context via ContextSelector ──
    const contextSelection = selectContext(
      intentResult,
      agent,
      input.context,
      memoryFields,
    );

    // ── 6. Compose prompt from agent template ──
    const history = this.getHistory(input.conversationId);
    const composed = composePrompt(agent, {
      language: input.language,
      contextSlices: contextSelection.financialSlices,
      memoryFields: contextSelection.memoryFields,
      deterministic,
      userMessage: input.message,
      conversationHistory: history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      attachments: input.attachments,
    });

    // ── 7. Single LLM call ──
    const formattedHistory: Array<{ role: 'user' | 'assistant'; content: string }> = history
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    const messages = formatMessages(
      composed.systemPrompt,
      formattedHistory,
      input.message,
      input.attachments,
    ) as any; // Provider adapters return compatible but loosely-typed messages

    const model = getModelForAttachments(input.attachments);

    let llmResult = await sendChatCompletionWithRetry(messages, {
      ...(model !== AI_CONFIG.model && { model }),
      ...(agent.outputSchema && {
        responseSchema: { name: `${agent.id}Response`, schema: agent.outputSchema },
      }),
    });

    let retried = false;

    // ── 8. Validation pipeline (rule-based, no LLM) ──
    let validationResults: ValidationResult[] = [];
    if (llmResult.success) {
      validationResults = await validateOutput(
        llmResult.content,
        agent,
        deterministic,
        contextSelection,
      );

      const hasFailure = validationResults.some(v => !v.passed);
      if (hasFailure) {
        // Retry once with validation errors as constraints
        retried = true;
        const constraintBlock = '\n\n## IMPORTANT CONSTRAINTS (previous output was rejected)\n' +
          validationResults
            .filter(v => !v.passed)
            .map(v => `- ${v.stage}: ${v.errors.map(e => e.message).join('; ')}`)
            .join('\n') +
          '\n\nPlease regenerate your response avoiding these issues.';

        const retryMessages = formatMessages(
          composed.systemPrompt + constraintBlock,
          formattedHistory,
          input.message,
          input.attachments,
        ) as any;

        const retryResult = await sendChatCompletionWithRetry(retryMessages, {
          ...(model !== AI_CONFIG.model && { model }),
          ...(agent.outputSchema && {
            responseSchema: { name: `${agent.id}Response`, schema: agent.outputSchema },
          }),
        });

        if (retryResult.success) {
          llmResult = retryResult;
          validationResults = await validateOutput(
            retryResult.content,
            agent,
            deterministic,
            contextSelection,
          );
        }
      }
    }

    // ── Build response ──
    const aiResponse = this.buildResponse(
      llmResult.success ? llmResult.content : llmResult.error,
      llmResult.success,
      intentResult.intent,
      intentResult.confidence,
      input.language,
      startTime,
    );

    // ── 9. Update conversation history ──
    this.addToHistory(input.conversationId, 'user', input.message);
    this.addToHistory(input.conversationId, 'assistant', aiResponse.message);

    // ── 10. Memory update (if allowed) ──
    if (input.userId && deterministic) {
      try {
        const written = await updateMemoryFromSignals(
          input.userId,
          deterministic,
          agent.id,
        );
        memoryFieldsWritten.push(...written);
      } catch {
        // Non-fatal
      }
    }

    // ── 11. Advice logging ──
    if (input.userId && ACTIONABLE_INTENTS.has(intentResult.intent)) {
      try {
        const contextHash = await computeContextHash(input.context);
        await logFinancialAdvice({
          user_id: input.userId,
          source: 'ai',
          advice_text: aiResponse.message,
          target_metric: intentToMetric(intentResult.intent),
          confidence: aiResponse.confidence,
          conversation_id: input.conversationId,
          context_hash: contextHash,
        });
      } catch {
        // Non-fatal
      }
    }

    // ── Build explanation trace ──
    const trace: ExplanationTrace = {
      intent: intentResult.intent,
      intentConfidence: intentResult.confidence,
      agentId: agent.id,
      memoryFieldsUsed: Object.keys(contextSelection.memoryFields),
      memoryFieldsWritten,
      deterministicValues: deterministic ? {
        healthScore: deterministic.financialHealth.score,
        healthBand: deterministic.financialHealth.band,
        savingsRate: deterministic.signals.savingsRate ?? null,
        incomeStability: deterministic.signals.incomeStability ?? null,
      } : {},
      contextSlicesUsed: contextSelection.financialSlices.map(s => s.type),
      validationResults,
      confidenceScore: intentResult.confidenceScore,
      processingTimeMs: Date.now() - startTime,
      retried,
      timestamp: new Date().toISOString(),
    };

    // ── 12. Audit log ──
    if (input.userId) {
      writeAuditLog(input.userId, trace).catch(() => {});
    }

    return {
      response: aiResponse,
      conversationId: input.conversationId,
      trace,
    };
  }

  /**
   * Generate insights (dashboard use case).
   * Routes through the insight agent.
   */
  async generateInsights(
    context: import('./types').UserFinancialContext,
    language: 'ar' | 'en',
  ): Promise<import('./types').InsightCard[]> {
    const { insightAgent } = await import('./agents/insightAgent');
    const deterministic = this.computeDeterministicFromContext(context);

    const contextSelection = selectContext(
      { intent: 'analyze_spending', confidence: 'high', confidenceScore: 1, entities: [], needsClarification: false },
      insightAgent,
      context,
      {},
    );

    const composed = composePrompt(insightAgent, {
      language,
      contextSlices: contextSelection.financialSlices,
      memoryFields: {},
      deterministic,
      userMessage: 'Generate insights',
      conversationHistory: [],
    });

    const messages = formatMessages(composed.systemPrompt, [], 'Generate insights') as any;

    const result = await sendChatCompletionWithRetry(messages, {
      max_tokens: 500,
      temperature: 0.5,
      responseSchema: insightAgent.outputSchema
        ? { name: 'InsightsResponse', schema: insightAgent.outputSchema }
        : undefined,
    });

    if (!result.success) {
      return this.getFallbackInsights(language);
    }

    try {
      const parsed = JSON.parse(result.content);
      if (Array.isArray(parsed.insights) && parsed.insights.length > 0) {
        return parsed.insights;
      }
      return this.getFallbackInsights(language);
    } catch {
      return this.getFallbackInsights(language);
    }
  }

  clearConversation(conversationId: string): void {
    conversationHistories.delete(conversationId);
  }

  clearAllConversations(): void {
    conversationHistories.clear();
  }

  // ──────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────

  private computeDeterministic(input: OrchestratorInput): DeterministicOutputs {
    return this.computeDeterministicFromContext(input.context);
  }

  private computeDeterministicFromContext(
    context: import('./types').UserFinancialContext,
  ): DeterministicOutputs {
    let recurringMonthly = 0;
    for (const r of context.patterns.recurringExpenses) {
      switch (r.frequency) {
        case 'weekly':  recurringMonthly += r.amount * (52 / 12); break;
        case 'monthly': recurringMonthly += r.amount; break;
        case 'yearly':  recurringMonthly += r.amount / 12; break;
      }
    }

    const discretionary = Math.max(0, context.totalExpenses - recurringMonthly);

    const curExp = context.currentMonth.expenses;
    const curInc = context.currentMonth.income;
    const expDelta = context.comparedToLastMonth.expenseChange;
    const incDelta = context.comparedToLastMonth.incomeChange;

    const prevExp = expDelta !== 0 ? curExp / (1 + expDelta / 100) : curExp;
    const prevInc = incDelta !== 0 ? curInc / (1 + incDelta / 100) : curInc;

    const monthlyExpenses = [prevExp, curExp].filter(v => Number.isFinite(v) && v >= 0);
    const monthlyIncome = [prevInc, curInc].filter(v => Number.isFinite(v) && v >= 0);

    const goals = context.goals.map(g => ({ target: g.targetAmount, current: g.currentAmount }));

    const signalSummary: SignalSummary = {
      totalIncome: context.totalIncome,
      totalExpenses: context.totalExpenses,
      recurringExpenses: recurringMonthly,
      discretionaryExpenses: discretionary,
      monthlyExpenses,
      monthlyIncome,
      goals: goals.length > 0 ? goals : undefined,
    };

    const signals = computeFinancialSignals(signalSummary);
    const advisory = deriveAdvisoryState(signals);
    const health = computeFinancialHealth(signals);

    const now = new Date();
    const daysElapsed = now.getDate();

    const projections = computeProjections(
      context.netBalance,
      context.currentMonth.expenses,
      daysElapsed,
      context.currentMonth.daysRemaining,
      context.budget?.monthlyLimit,
    );

    return { financialHealth: health, signals, advisory, projections };
  }

  private getHistory(conversationId: string): AIMessage[] {
    const history = conversationHistories.get(conversationId) || [];
    return history.slice(-AI_SAFETY.maxHistoryMessages);
  }

  private addToHistory(conversationId: string, role: 'user' | 'assistant', content: string): void {
    const history = conversationHistories.get(conversationId) || [];
    history.push({
      id: `msg_${Date.now()}`,
      role,
      content,
      timestamp: new Date().toISOString(),
    });
    conversationHistories.set(conversationId, history);
  }

  private buildResponse(
    content: string,
    success: boolean,
    intent: import('./types').AIIntent,
    confidence: ConfidenceLevel,
    language: 'ar' | 'en',
    startTime: number,
  ): AIResponse {
    if (!success) {
      return {
        message: content,
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

    return {
      message: content,
      messageAr: language === 'ar' ? content : undefined,
      intent,
      confidence,
      entities: [],
      suggestedActions: this.getDefaultSuggestions(language),
      insights: [],
      needsClarification: false,
      processingTime: Date.now() - startTime,
      model: AI_CONFIG.model,
    };
  }

  private getDefaultSuggestions(language: 'ar' | 'en'): SuggestedAction[] {
    if (language === 'ar') {
      return [
        { id: 'analyze', label: 'Analyze my spending', labelAr: 'حلل مصاريفي', action: 'send_message', payload: 'حلل مصاريفي لهذا الشهر' },
        { id: 'save', label: 'How to save more?', labelAr: 'كيف أوفر أكثر؟', action: 'send_message', payload: 'كيف أوفر أكثر؟' },
        { id: 'budget', label: 'Check my budget', labelAr: 'تحقق من ميزانيتي', action: 'send_message', payload: 'هل أنا ماشي صح بالميزانية؟' },
      ];
    }
    return [
      { id: 'analyze', label: 'Analyze my spending', labelAr: 'حلل مصاريفي', action: 'send_message', payload: 'Analyze my spending this month' },
      { id: 'save', label: 'How to save more?', labelAr: 'كيف أوفر أكثر؟', action: 'send_message', payload: 'How can I save more money?' },
      { id: 'budget', label: 'Check my budget', labelAr: 'تحقق من ميزانيتي', action: 'send_message', payload: 'Am I on track with my budget?' },
    ];
  }

  private getFallbackInsights(language: 'ar' | 'en'): import('./types').InsightCard[] {
    return [{
      id: 'fallback_insight',
      type: 'info',
      title: language === 'ar' ? 'تعذر التحليل' : 'Analysis Unavailable',
      titleAr: 'تعذر التحليل',
      message: language === 'ar'
        ? 'تعذر توليد الملخص الآن، حاول مرة أخرى'
        : 'Could not generate summary right now, please try again',
      messageAr: 'تعذر توليد الملخص الآن، حاول مرة أخرى',
    }];
  }
}

export const orchestrator = new AIOrchestrator();

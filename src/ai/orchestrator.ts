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
import type { AIResponse, AIMessage, ConfidenceLevel, SuggestedAction, ExtractedDocument, MessageAttachment } from './types';
import type { FinancialContextSlice } from './agents/types';
import { classifyIntent } from './orchestrator/intentClassifier';
import { findAgentForIntent, getAgent } from './agents/registry';
import { composePrompt } from './orchestrator/promptComposer';
import { selectContext } from './context/contextSelector';
import { readMemoryFields } from './memory/memoryService';
import { lookupVendor } from './vendors/menaVendors';
import { analyzeBill, type BillAnalysis } from './deterministic/billAnalysis';
import { buildSuggestedActionsForBill } from './documentActions';
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
import { stripReasoning } from './postprocess/stripReasoning';

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

// In-memory conversation history.
// Shared by the AIOrchestrator class (non-streaming /api/chat) and the
// streaming /api/chat/stream route via the helpers exported below. This is
// per-instance and resets on cold start — durable persistence is PR-3.
const conversationHistories = new Map<string, AIMessage[]>();

const HISTORY_HARD_CAP = 100;

// ── Document extraction cache ──────────────────────────────────────
// Re-uploading the same file inside a single session must NOT trigger a
// second extractor call (it's expensive and deterministic). Keyed by
// SHA-256 of the base64 payload. Bounded to keep memory in check.
const EXTRACTION_CACHE_MAX_ENTRIES = 200;
const extractionCache = new Map<string, ExtractedDocument>();

async function hashAttachmentContent(content: string): Promise<string> {
  // Use the platform Web Crypto API — available in Node 20+ and edge runtimes.
  const data = new TextEncoder().encode(content);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function setExtractionCache(key: string, value: ExtractedDocument): void {
  if (extractionCache.size >= EXTRACTION_CACHE_MAX_ENTRIES) {
    const first = extractionCache.keys().next().value;
    if (first) extractionCache.delete(first);
  }
  extractionCache.set(key, value);
}

/**
 * Read the recent history for a conversation, capped to the configured
 * safety window. Returns an empty array if the conversation is unknown.
 */
export function getConversationHistory(conversationId: string): AIMessage[] {
  const history = conversationHistories.get(conversationId) || [];
  return history.slice(-AI_SAFETY.maxHistoryMessages);
}

/**
 * Append a turn to a conversation's in-memory history, with a hard cap to
 * keep memory bounded across very long sessions.
 */
export function appendToConversationHistory(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
): void {
  const history = conversationHistories.get(conversationId) || [];
  history.push({
    id: `msg_${crypto.randomUUID()}`,
    role,
    content,
    timestamp: new Date().toISOString(),
  });
  // Trim to the hard cap, keeping the most recent turns.
  if (history.length > HISTORY_HARD_CAP) {
    history.splice(0, history.length - HISTORY_HARD_CAP);
  }
  conversationHistories.set(conversationId, history);
}

/**
 * Escape user input to resist prompt injection attacks.
 * Neutralizes markdown/prompt delimiters that could break prompt structure.
 */
function escapeUserInput(input: string): string {
  return input
    .replace(/^(#{1,6})\s/gm, '\\$1 ')
    .replace(/^---+$/gm, '—')
    .replace(/```/g, '\\`\\`\\`')
    .replace(/\[INST\]/gi, '[inst]')
    .replace(/\[\/INST\]/gi, '[/inst]')
    .replace(/<\|[^|]*\|>/g, '')
    .replace(/<<SYS>>|<\/SYS>>/gi, '');
}

// Intents that use the fast Flash model instead of Pro
const FLASH_INTENTS = new Set([
  'greeting', 'gratitude', 'unclear', 'out_of_scope',
  'explain_concept', 'learning_recommendation',
]);

function selectModelForIntent(intent: string): string | undefined {
  if (FLASH_INTENTS.has(intent)) {
    return AI_CONFIG.flashModel;
  }
  return undefined; // undefined → sendChatCompletionWithRetry uses AI_CONFIG.model
}

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

/**
 * Pure-math deterministic layer. Exported so the streaming route
 * can run it without instantiating the full orchestrator class.
 */
export function computeDeterministicFromContext(
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

export class AIOrchestrator {
  /**
   * Process a user message through the full orchestrator pipeline.
   */
  async process(input: OrchestratorInput): Promise<OrchestratorOutput> {
    const startTime = Date.now();
    const memoryFieldsWritten: string[] = [];

    // ── 1. Classify intent (rule-based, no LLM) ──
    const hasAttachments = !!(input.attachments && input.attachments.length > 0);
    const intentResult = classifyIntent(input.message, hasAttachments);

    // ── 1b. Document extraction pipeline ─────────────────────────────
    // When the user uploaded a bill/receipt and didn't explicitly ask for
    // a transcript, run the extractor agent first. This produces
    // structured JSON which the chat agent reads instead of the raw image.
    let extractedDoc: ExtractedDocument | null = null;
    let billAnalysis: BillAnalysis | null = null;
    const useExtractionPipeline =
      hasAttachments && intentResult.intent === 'document_extract';

    if (useExtractionPipeline) {
      try {
        extractedDoc = await this.runDocumentExtractor(
          input.attachments!,
          input.language,
        );
      } catch {
        // Extraction failure is non-fatal — fall through to plain chat
        // with the original image. The user still gets a useful reply.
      }

      if (extractedDoc) {
        const history = input.recentTransactions ?? [];
        billAnalysis = analyzeBill(extractedDoc, history, input.context);
      }
    }

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
    const sanitizedMessage = escapeUserInput(input.message);

    // When extraction succeeded we DROP the raw image from the chat
    // payload — the chat agent reads the structured document block
    // instead. This is the core of the "extract once, then talk" pattern.
    const dropAttachmentsFromChat = useExtractionPipeline && extractedDoc !== null;
    const attachmentsForChat = dropAttachmentsFromChat ? undefined : input.attachments;

    const composed = composePrompt(agent, {
      language: input.language,
      contextSlices: contextSelection.financialSlices,
      memoryFields: contextSelection.memoryFields,
      deterministic,
      userMessage: sanitizedMessage,
      conversationHistory: history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      attachments: attachmentsForChat,
      documentContext: extractedDoc && billAnalysis
        ? { extracted: extractedDoc, analysis: billAnalysis, transcribeRequested: false }
        : undefined,
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
      attachmentsForChat,
    ) as any; // Provider adapters return compatible but loosely-typed messages

    const attachmentModel = getModelForAttachments(attachmentsForChat);
    const intentModel = selectModelForIntent(intentResult.intent);
    // Attachment model takes priority (vision requirement); otherwise use intent-based tier
    const model = attachmentModel !== AI_CONFIG.model ? attachmentModel : (intentModel ?? AI_CONFIG.model);

    let llmResult = await sendChatCompletionWithRetry(messages, {
      ...(model !== AI_CONFIG.model && { model }),
      // Invoices/receipts can have many line items — give the model enough room
      ...(attachmentsForChat && { max_tokens: 4096 }),
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
          attachmentsForChat,
        ) as any;

        const retryResult = await sendChatCompletionWithRetry(retryMessages, {
          ...(model !== AI_CONFIG.model && { model }),
          ...(attachmentsForChat && { max_tokens: 4096 }),
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
    // Strip any leaked reasoning/step labels before they reach the user.
    // Defense in depth: the Gemini provider already drops `thought` parts
    // and the chat agent prompt forbids step labels, but we also strip here.
    const finalContent = llmResult.success
      ? stripReasoning(llmResult.content)
      : llmResult.error;

    const aiResponse = this.buildResponse(
      finalContent,
      llmResult.success,
      intentResult.intent,
      intentResult.confidence,
      input.language,
      startTime,
    );

    // ── Document-driven suggested actions ────────────────────────────
    // When extraction ran, replace the generic suggestion chips with
    // bill-specific ones (Add as expense / Set reminder / Mark recurring).
    // The chat UI wires these directly to existing stores without an
    // additional LLM call.
    if (llmResult.success && extractedDoc && billAnalysis) {
      const docActions = buildSuggestedActionsForBill(
        extractedDoc,
        billAnalysis,
        input.language,
      );
      if (docActions.length > 0) {
        aiResponse.suggestedActions = docActions;
      }
    }

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

  /**
   * Single-shot vision JSON extraction for an uploaded bill / receipt.
   * Caches by SHA-256 of the attachment bytes so repeat uploads of the
   * same file in the same session reuse the result.
   */
  private async runDocumentExtractor(
    attachments: MessageAttachment[],
    language: 'ar' | 'en',
  ): Promise<ExtractedDocument | null> {
    const extractor = getAgent('document_extractor');
    if (!extractor) return null;

    // Use the first image attachment — V1 doesn't combine multiple pages.
    const target = attachments.find((a) => a.type === 'image' || a.type === 'pdf');
    if (!target) return null;

    const cacheKey = await hashAttachmentContent(target.content);
    const cached = extractionCache.get(cacheKey);
    if (cached) return cached;

    const systemPrompt = extractor.systemPromptBuilder({
      language,
      contextSlices: [],
      memoryFields: {},
      deterministic: null,
      userMessage: '',
      conversationHistory: [],
    });

    const messages = formatMessages(
      systemPrompt,
      [],
      'Extract the document fields per schema.',
      [target],
    ) as any;

    const result = await sendChatCompletionWithRetry(messages, {
      max_tokens: 1500,
      temperature: 0.1,
      responseSchema: extractor.outputSchema
        ? { name: 'ExtractedDocument', schema: extractor.outputSchema }
        : undefined,
    });

    if (!result.success) return null;

    let parsed: ExtractedDocument;
    try {
      parsed = JSON.parse(result.content) as ExtractedDocument;
    } catch {
      return null;
    }

    // Vendor normalization happens server-side, NOT in the LLM prompt —
    // this keeps the canonical names deterministic and out of the model's
    // creative reach.
    const lookup = lookupVendor(parsed.vendor);
    parsed.vendorCanonical = lookup.matched ? lookup.canonical : null;
    if (!parsed.category && lookup.matched) {
      parsed.category = lookup.category;
    }
    if (!parsed.isRecurring && lookup.isRecurring) {
      parsed.isRecurring = true;
    }

    setExtractionCache(cacheKey, parsed);
    return parsed;
  }

  private computeDeterministic(input: OrchestratorInput): DeterministicOutputs {
    return computeDeterministicFromContext(input.context);
  }

  private computeDeterministicFromContext(
    context: import('./types').UserFinancialContext,
  ): DeterministicOutputs {
    return computeDeterministicFromContext(context);
  }

  private getHistory(conversationId: string): AIMessage[] {
    return getConversationHistory(conversationId);
  }

  private addToHistory(conversationId: string, role: 'user' | 'assistant', content: string): void {
    appendToConversationHistory(conversationId, role, content);
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

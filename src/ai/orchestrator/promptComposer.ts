/**
 * Prompt Composer
 * ===============
 * Composes the final prompt from the selected agent's template,
 * injecting only the relevant context slices, memory fields,
 * and deterministic outputs.
 */

import type { AgentDefinition, AgentPromptParams, FinancialContextSlice } from '../agents/types';
import type { UserSemanticState } from '../memory/types';
import type { DeterministicOutputs } from '../deterministic';
import type { MessageAttachment } from '../types';

export interface ComposedPrompt {
  systemPrompt: string;
  attachmentInstructions: string | null;
  tokenEstimate: number;
}

/**
 * Build detailed OCR/document-analysis instructions injected only when attachments are present.
 */
function buildAttachmentInstructions(language: 'ar' | 'en', _attachments: MessageAttachment[]): string {
  if (language === 'ar') {
    return `## تعليمات تحليل المرفقات

### ١. استخراج النص (OCR)
- استخرج كل النص المرئي في الصورة بدقة، حرفاً حرفاً
- حافظ على التنسيق الأصلي قدر الإمكان (أسطر، أعمدة، جداول)
- إذا كان النص بالعربية، انتبه للأرقام العربية-الهندية (٠١٢٣٤٥٦٧٨٩) والتشكيل
- إذا كان النص مزيجاً من العربية والإنجليزية، استخرج كليهما

### ٢. تحليل الإيصالات والفواتير
إذا كانت الصورة إيصالاً أو فاتورة، استخرج هذه البيانات بشكل منظم:
- **التاجر/المتجر**: الاسم والفرع إن وُجد
- **التاريخ والوقت**: كما يظهر في الإيصال
- **العناصر**: كل عنصر مع سعره
- **المجموع الفرعي**: قبل الضريبة
- **الضريبة**: نسبتها ومبلغها إن وُجدت
- **المجموع الكلي**: المبلغ النهائي
- **العملة**: (دينار، ريال، درهم، جنيه، إلخ)
- **طريقة الدفع**: نقد، بطاقة، إلخ (إن ظهرت)

### ٣. عرض البيانات
- اعرض النص المستخرج أولاً في قسم واضح بعنوان "النص المستخرج"
- ثم قدم ملخصاً منظماً للبيانات المالية
- إذا كان إيصالاً، اقترح تصنيف المصروف (طعام، تسوق، مواصلات، صحة، ترفيه، إلخ)

### ٤. اقتراح تسجيل المعاملة
بعد عرض البيانات، اسأل المستخدم سؤالاً واحداً:
"هل تريدني أسجل هذا كمصروف؟ المبلغ: [المجموع] [العملة] — التصنيف المقترح: [التصنيف]"

### ٥. جودة الصورة
- إذا كانت الصورة غير واضحة أو مقطوعة، اذكر ذلك بصراحة واطلب صورة أفضل
- إذا استطعت قراءة جزء فقط، اعرض ما استخرجته ووضّح ما لم تستطع قراءته
- لا تخترع أو تخمّن أي بيانات غير مرئية بوضوح في الصورة`;
  }

  return `## Attachment Analysis Instructions

### 1. Text Extraction (OCR)
- Extract ALL visible text from the image accurately, character by character
- Preserve the original formatting as much as possible (lines, columns, tables)
- For Arabic text, pay attention to Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) and diacritics
- For mixed Arabic/English text, extract both languages faithfully

### 2. Receipt & Invoice Parsing
If the image is a receipt or invoice, extract the following in a structured format:
- **Merchant/Store**: Name and branch if available
- **Date & Time**: As shown on the receipt
- **Items**: Each line item with its price
- **Subtotal**: Before tax
- **Tax**: Rate and amount if present
- **Total**: Final amount charged
- **Currency**: (JOD, SAR, AED, EGP, etc.)
- **Payment method**: Cash, card, etc. (if shown)

### 3. Data Presentation
- Show the extracted text first under a clear "Extracted Text" heading
- Then provide a structured summary of the financial data
- If it's a receipt, suggest an expense category (food, shopping, transport, health, entertainment, etc.)

### 4. Transaction Logging Offer
After presenting the data, ask ONE question:
"Would you like me to log this as an expense? Amount: [total] [currency] — Suggested category: [category]"

### 5. Image Quality
- If the image is blurry, cropped, or low resolution, state this clearly and ask for a better image
- If you can only read part of it, show what you extracted and explain what was unreadable
- Never invent or guess data that is not clearly visible in the image`;
}

/**
 * Compose the final prompt for a single LLM call.
 */
export function composePrompt(
  agent: AgentDefinition,
  params: {
    language: 'ar' | 'en';
    contextSlices: FinancialContextSlice[];
    memoryFields: Partial<UserSemanticState>;
    deterministic: DeterministicOutputs | null;
    userMessage: string;
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
    attachments?: MessageAttachment[];
  },
): ComposedPrompt {
  const agentParams: AgentPromptParams = {
    language: params.language,
    contextSlices: params.contextSlices,
    memoryFields: params.memoryFields,
    deterministic: params.deterministic,
    userMessage: params.userMessage,
    conversationHistory: params.conversationHistory,
  };

  const basePrompt = agent.systemPromptBuilder(agentParams);

  let attachmentInstructions: string | null = null;
  if (params.attachments && params.attachments.length > 0) {
    attachmentInstructions = buildAttachmentInstructions(params.language, params.attachments);
  }

  const detectedLang = detectMessageLanguage(params.userMessage);
  const langDirective =
    detectedLang === 'ar'
      ? 'The user wrote in Arabic. Your ENTIRE reply MUST be in Arabic (match their dialect — Jordanian, Egyptian, Gulf, or Fusha). Do NOT reply in English.'
      : detectedLang === 'en'
      ? 'The user wrote in English. Your ENTIRE reply MUST be in English. Do NOT reply in Arabic.'
      : 'The user mixed Arabic and English. Reply in Arabic as the default, matching their dialect.';

  const languageEnforcement = `\n\n## LANGUAGE RULE (highest priority — overrides everything)\n${langDirective}`;

  const systemPrompt = [
    basePrompt,
    attachmentInstructions,
    languageEnforcement,
  ].filter(Boolean).join('\n\n');

  const tokenEstimate = estimateTokens(systemPrompt);

  return {
    systemPrompt,
    attachmentInstructions,
    tokenEstimate,
  };
}

/**
 * Detect the language of a user message by counting Arabic vs Latin characters.
 * Returns 'ar', 'en', or 'mixed'.
 */
function detectMessageLanguage(message: string): 'ar' | 'en' | 'mixed' {
  const arabicChars = (message.match(/[\u0600-\u06FF]/g) || []).length;
  const latinChars = (message.match(/[a-zA-Z]/g) || []).length;
  const total = arabicChars + latinChars;
  if (total === 0) return 'en';
  const arabicRatio = arabicChars / total;
  if (arabicRatio >= 0.6) return 'ar';
  if (arabicRatio <= 0.2) return 'en';
  return 'mixed';
}

/**
 * Rough token estimation: ~4 chars per token for English, ~2 for Arabic.
 */
function estimateTokens(text: string): number {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const otherChars = text.length - arabicChars;
  return Math.ceil(arabicChars / 2 + otherChars / 4);
}

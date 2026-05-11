/**
 * Chat Agent (default)
 * ====================
 * Handles general chat interactions — the primary conversational agent.
 * Uses the full Mustasharak identity and financial guidance rules.
 * This is the fallback agent when no specialized agent matches.
 */

import type { AgentDefinition, AgentPromptParams } from './types';
import type { AIIntent, ExtractedDocument } from '../types';
import type { DeterministicOutputs } from '../deterministic';
import type { BillAnalysis } from '../deterministic/billAnalysis';

const SUPPORTED_INTENTS: AIIntent[] = [
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
  'explain_concept',
  'learning_recommendation',
  'document_extract',
  'document_transcribe',
  'greeting',
  'gratitude',
  'unclear',
  'out_of_scope',
];

/**
 * Optional document context the orchestrator may pass to chatAgent
 * after running the extractor + deterministic analysis layer.
 */
export interface DocumentContext {
  extracted: ExtractedDocument;
  analysis: BillAnalysis;
  // True when the user explicitly asked for a transcript (rare). When
  // true, chatAgent is allowed to read out the document text. Otherwise
  // it must summarize + propose actions, never transcribe.
  transcribeRequested: boolean;
}

/**
 * Convert raw deterministic signals into human-readable, directive guidance
 * the LLM can act on directly — instead of parsing a JSON blob.
 */
function buildDeterministicGuidance(det: DeterministicOutputs, isAr: boolean): string {
  const { financialHealth, signals, advisory, projections } = det;

  const score = financialHealth.score;
  const band = financialHealth.band;

  const bandLabelAr: Record<string, string> = {
    excellent: 'ممتاز',
    good: 'جيد',
    fair: 'مقبول',
    poor: 'ضعيف',
    critical: 'حرج',
  };
  const bandLabel = isAr ? (bandLabelAr[band] ?? band) : band.charAt(0).toUpperCase() + band.slice(1);

  const lines: string[] = [];

  if (isAr) {
    lines.push(`## مؤشرات مالية للمستخدم (للمرجع — استخدمها فقط عند الحاجة، لا تذكرها بدون داعٍ)`);
    lines.push(`الصحة المالية: ${score}/١٠٠ — ${bandLabel}`);
    lines.push(`(عند ذكر التقييم، استخدم كلمة "${bandLabel}" حرفياً.)`);
  } else {
    lines.push(`## User Financial Signals (for reference — use only when relevant, don't volunteer them)`);
    lines.push(`Health: ${score}/100 — ${bandLabel}`);
    lines.push(`(When mentioning the assessment, use the exact word "${bandLabel}".)`);
  }

  lines.push('');

  // Savings rate signal
  if (signals.savingsRate != null) {
    const pct = Math.round(signals.savingsRate * 100);
    const status =
      signals.savingsRate < 0.05 ? (isAr ? '🚨 حرج — تحت ٥٪' : '🚨 Critical — under 5%') :
      signals.savingsRate < 0.10 ? (isAr ? '⚠️ منخفض جداً' : '⚠️ Very low') :
      signals.savingsRate < 0.20 ? (isAr ? '📊 أقل من الهدف (٢٠٪+)' : '📊 Below target (20%+)') :
      (isAr ? '✓ ضمن النطاق الصحي' : '✓ Within healthy range');
    lines.push(isAr
      ? `معدل الادخار: ${pct}٪ — ${status}`
      : `Savings rate: ${pct}% — ${status}`);
  }

  // Financial pressure
  if (advisory.financialPressureLevel) {
    const pressureAr: Record<string, string> = { low: 'منخفض', moderate: 'متوسط', high: 'مرتفع ⚠️' };
    const pressure = isAr ? pressureAr[advisory.financialPressureLevel] : advisory.financialPressureLevel;
    lines.push(isAr
      ? `الضغط المالي: ${pressure}`
      : `Financial pressure: ${pressure}`);
  }

  // Expense trend
  if (advisory.expenseTrendRisk === 'increasing') {
    lines.push(isAr
      ? '📈 اتجاه الإنفاق: متصاعد — الإنفاق ارتفع هذا الشهر'
      : '📈 Expense trend: Increasing — spending has risen this month');
  } else if (advisory.expenseTrendRisk === 'stable') {
    lines.push(isAr ? 'الإنفاق: مستقر' : 'Expense trend: Stable');
  }

  // Volatility
  if (advisory.volatilityRisk) {
    lines.push(isAr
      ? '⚡ التقلبات: مرتفعة — الإنفاق يتفاوت بشكل ملحوظ شهراً بشهر'
      : '⚡ Volatility: High — spending varies significantly month to month');
  }

  // Goal risk
  if (advisory.goalRiskLevel) {
    const goalStatusAr: Record<string, string> = {
      on_track: '✓ على المسار الصحيح',
      behind: '📉 متأخر عن الجدول',
      critical: '🚨 في خطر',
    };
    const goalStatusEn: Record<string, string> = {
      on_track: '✓ On track',
      behind: '📉 Behind schedule',
      critical: '🚨 Critical — at risk of missing',
    };
    lines.push(isAr
      ? `الأهداف: ${goalStatusAr[advisory.goalRiskLevel] ?? advisory.goalRiskLevel}`
      : `Goals: ${goalStatusEn[advisory.goalRiskLevel] ?? advisory.goalRiskLevel}`);
  }

  // Projection
  if (projections) {
    if (projections.onTrackForBudget !== null) {
      lines.push(isAr
        ? `التوقعات: ${projections.onTrackForBudget ? '✓ ضمن الميزانية بنهاية الشهر' : '⚠️ سيتجاوز الميزانية بنهاية الشهر'}`
        : `Projection: ${projections.onTrackForBudget ? '✓ On track for budget by month end' : '⚠️ Will exceed budget by month end'}`);
    }
  }

  return lines.join('\n');
}

/**
 * Build a focused, human-readable summary of the extracted document and
 * its deterministic analysis. The chat model reads this instead of the
 * original image so we get insight + action recommendations rather than
 * a transcript.
 */
function buildDocumentBlock(
  doc: ExtractedDocument,
  analysis: BillAnalysis,
  transcribeRequested: boolean,
  isAr: boolean,
): string {
  const lines: string[] = [];

  if (isAr) {
    lines.push('## مستند تم تحليله (بدلاً من الصورة الأصلية)');
    lines.push(`النوع: ${doc.documentType}`);
    if (doc.vendorCanonical || doc.vendor) {
      lines.push(`المُورِّد: ${doc.vendorCanonical || doc.vendor}`);
    }
    if (doc.amount != null) {
      lines.push(`المبلغ: ${doc.amount}${doc.currency ? ' ' + doc.currency : ''}`);
    }
    if (doc.date) lines.push(`التاريخ: ${doc.date}`);
    if (doc.dueDate) lines.push(`تاريخ الاستحقاق: ${doc.dueDate}`);
    if (doc.category) lines.push(`الفئة المقترحة: ${doc.category}`);
    lines.push(`الثقة في الاستخراج: ${doc.confidence}`);
    if (doc.lineItems.length > 0) {
      lines.push('بنود مختصرة:');
      for (const it of doc.lineItems.slice(0, 5)) {
        lines.push(`- ${it.description}${it.amount != null ? ` — ${it.amount}` : ''}`);
      }
    }

    lines.push('');
    lines.push('## تحليل (محسوب بشكل حتمي — لا تُغيّر هذه الأرقام)');
    if (analysis.duplicate.isDuplicate) {
      lines.push(`⚠️ مكرر محتمل: نفس المبلغ تقريباً في ${analysis.duplicate.candidateDate}.`);
    }
    if (analysis.comparison.hasHistory && analysis.comparison.deltaPercent != null) {
      const pct = Math.round(Math.abs(analysis.comparison.deltaPercent));
      const dir = analysis.comparison.trend;
      if (dir === 'higher') lines.push(`📈 أعلى بـ ${pct}٪ من متوسط ${analysis.comparison.matchCount} فاتورة سابقة.`);
      else if (dir === 'lower') lines.push(`📉 أقل بـ ${pct}٪ من المتوسط السابق.`);
      else lines.push(`✓ ضمن المتوسط المعتاد.`);
    }
    if (analysis.budget.hasBudget && analysis.budget.percentageOfMonthlyLimit != null) {
      const pct = Math.round(analysis.budget.percentageOfMonthlyLimit);
      const remaining = analysis.budget.remainingAfter;
      lines.push(
        analysis.budget.willOverflow
          ? `🚨 تسجيل هذه الفاتورة سيتجاوز الميزانية الشهرية (${pct}٪ من السقف).`
          : `الميزانية: هذه الفاتورة تساوي ${pct}٪ من السقف الشهري${remaining != null ? ` — يتبقى ${Math.round(remaining)}` : ''}.`,
      );
    }
    if (analysis.recurring.isRecurring) {
      lines.push(`🔁 يبدو أنها فاتورة متكررة (شوهدت في ${analysis.recurring.monthsSeen} أشهر مختلفة).`);
    }

    lines.push('');
    lines.push('## قواعد الرد على المستندات');
    if (transcribeRequested) {
      lines.push('- المستخدم طلب صراحةً نسخ/قراءة المستند. اكتب النص كما هو إذا أمكن، ثم قدّم ملخصاً قصيراً.');
    } else {
      lines.push('- لا تنسخ المستند ولا تكرر بنوده — لخّص الأهم فقط (المُورِّد، المبلغ، الفئة، أي تنبيه).');
      lines.push('- اربط بحالة المستخدم المالية إذا كان للأمر علاقة (تجاوز ميزانية، تكرار، فرق عن الشهر الماضي).');
      lines.push('- اختم ردّك بسطر قصير يُوجّه المستخدم للزر أسفل الرسالة، مثل: «اضغط الزر تحت لأضيفها كمصروف.» — لا تخترع أزراراً، الواجهة ترسمها.');
      lines.push('- لا تَعِد المستخدم بأنك «أضفتها» — الإضافة تتم فقط عندما يضغط الزر أو يقول «نعم».');
      lines.push('- لو طلب المستخدم لاحقاً «انسخ» أو «اقرأ»، عندها فقط اكتب النص.');
    }
  } else {
    lines.push('## Parsed Document (use this instead of the original image)');
    lines.push(`Type: ${doc.documentType}`);
    if (doc.vendorCanonical || doc.vendor) {
      lines.push(`Vendor: ${doc.vendorCanonical || doc.vendor}`);
    }
    if (doc.amount != null) {
      lines.push(`Amount: ${doc.amount}${doc.currency ? ' ' + doc.currency : ''}`);
    }
    if (doc.date) lines.push(`Date: ${doc.date}`);
    if (doc.dueDate) lines.push(`Due: ${doc.dueDate}`);
    if (doc.category) lines.push(`Suggested category: ${doc.category}`);
    lines.push(`Extraction confidence: ${doc.confidence}`);
    if (doc.lineItems.length > 0) {
      lines.push('Top line items:');
      for (const it of doc.lineItems.slice(0, 5)) {
        lines.push(`- ${it.description}${it.amount != null ? ` — ${it.amount}` : ''}`);
      }
    }

    lines.push('');
    lines.push('## Analysis (deterministic — do NOT change these figures)');
    if (analysis.duplicate.isDuplicate) {
      lines.push(`⚠️ Likely duplicate: a similar amount was recorded on ${analysis.duplicate.candidateDate}.`);
    }
    if (analysis.comparison.hasHistory && analysis.comparison.deltaPercent != null) {
      const pct = Math.round(Math.abs(analysis.comparison.deltaPercent));
      const dir = analysis.comparison.trend;
      if (dir === 'higher') lines.push(`📈 ${pct}% higher than the average of ${analysis.comparison.matchCount} prior bills.`);
      else if (dir === 'lower') lines.push(`📉 ${pct}% lower than the average of prior bills.`);
      else lines.push(`✓ Within the typical range.`);
    }
    if (analysis.budget.hasBudget && analysis.budget.percentageOfMonthlyLimit != null) {
      const pct = Math.round(analysis.budget.percentageOfMonthlyLimit);
      const remaining = analysis.budget.remainingAfter;
      lines.push(
        analysis.budget.willOverflow
          ? `🚨 Logging this would push the user over their monthly budget (${pct}% of the cap).`
          : `Budget: this is ~${pct}% of the monthly cap${remaining != null ? `; ${Math.round(remaining)} would remain` : ''}.`,
      );
    }
    if (analysis.recurring.isRecurring) {
      lines.push(`🔁 Looks like a recurring bill (seen in ${analysis.recurring.monthsSeen} distinct months).`);
    }

    lines.push('');
    lines.push('## Document handling rules');
    if (transcribeRequested) {
      lines.push('- The user explicitly asked to transcribe/read this document. Output the text faithfully, then add a one-line summary.');
    } else {
      lines.push('- Do NOT transcribe or list every field. Lead with what matters (vendor, amount, anything unusual).');
      lines.push('- Tie it to the user\'s actual financial situation if relevant (over budget, duplicate, vs last month).');
      lines.push('- End your reply with a single short line pointing at the action button, e.g. "Tap the button below to add it as an expense." Do NOT invent button labels — the UI renders them.');
      lines.push('- Do NOT claim you "added" the expense — it is only added when the user taps the button or says "yes, add it".');
      lines.push('- If the user later says "transcribe" or "read it", only then produce the verbatim text.');
    }
  }

  return lines.join('\n');
}

function buildSystemPrompt(params: AgentPromptParams): string {
  const { language, contextSlices, memoryFields, deterministic, documentContext } = params;
  const isAr = language === 'ar';

  // ── Core persona — single short identity, no methodology scaffolding ──
  const identity = isAr
    ? `أنت "مستشارك" (Mustasharak) — مساعد ذكاء اصطناعي ودود وعملي في تطبيق راسمالك للشؤون المالية.
تتحدث مثل أي مساعد ذكاء اصطناعي حديث (مثل ChatGPT) — طبيعي، واضح، ومتجاوب — لكن مع خبرة عميقة في الشؤون المالية الشخصية في منطقة الشرق الأوسط وشمال أفريقيا (الأردن، السعودية، الإمارات، مصر، وغيرها).

كيف تتصرف:
- ابدأ كل محادثة كأنك مساعد طبيعي. إذا قال المستخدم "مرحبا" — رد بترحيب قصير ودود واسأل كيف تقدر تساعد. لا تُلقِ تقييماً مالياً غير مطلوب.
- جاوب فقط على ما سُئِلت. لا تضف نصائح جانبية إلا إذا كانت ضرورية.
- إذا سأل المستخدم سؤالاً عاماً عن المفاهيم المالية، أجب كأنك مدرّس — بوضوح وبدون إقحام بياناته.
- إذا سأل عن وضعه الشخصي ("كم صرفت؟"، "كيف ميزانيتي؟")، استخدم بياناته الفعلية الموجودة أدناه.
- طابِق لهجة المستخدم: لو حكى أردني، رد أردني. لو سعودي، رد سعودي. لو فصحى، فصحى.
- اضبط طول الرد حسب السؤال — سؤال قصير → جواب قصير. سؤال معقد → جواب وافٍ.

ما لا تفعله:
- لا تكرر نفس النصيحة مراراً
- لا تختلق أرقاماً عن المستخدم — إذا لم تتوفر بيانات قل ذلك
- لا تعطِ توصيات أسهم محددة، أو نصائح قانونية، أو نصائح للتهرب الضريبي
- لا تكتب عناوين أو خطوات مرقمة كهيكل ثابت — اكتب بشكل طبيعي
- لا تبدأ بـ "سؤال رائع!" أو "أنا هنا لمساعدتك"

التعامل مع المستندات (فواتير، إيصالات، فواتير خدمات):
- الافتراضي: استخرج المعلومة المهمة وقدّم تحليلاً مختصراً + إجراء مقترح. لا تنسخ المستند.
- استثناء وحيد: إذا طلب المستخدم صراحةً «انسخ»، «اقرأ»، «ترجم»، «شو مكتوب فيها»، عندها فقط اكتب النص حرفياً.
- لا تذكر أنك «استخرجت» أو «حللت» — تكلم بشكل طبيعي كأن المستند ظاهر أمامك.`
    : `You are "Mustasharak" — a friendly, capable AI assistant inside the Rasmalak personal finance app.
You speak like any modern AI assistant (think ChatGPT) — natural, clear, responsive — but with deep expertise in personal finance for the MENA region (Jordan, Saudi Arabia, UAE, Egypt, and others).

How to behave:
- Open every conversation naturally. If the user says "hi", greet them back briefly and ask how you can help. Do NOT volunteer an unsolicited financial assessment.
- Answer only what was asked. Don't tack on side advice unless it's clearly relevant.
- For general financial-concept questions, teach the concept clearly without injecting the user's personal data.
- For questions about the user's own situation ("how much did I spend?", "am I on budget?"), use the actual data provided below.
- Match the user's language and dialect. If they write in Levantine Arabic, reply in Levantine. If English, English.
- Match length to the question — short question → short answer. Complex question → full answer.

What not to do:
- Don't repeat the same advice across turns
- Don't invent figures about the user — if data isn't available, say so plainly
- Don't give specific stock picks, legal advice, or tax-evasion advice
- Don't write rigid numbered headings or templated step structures — write naturally
- Don't open with "Great question!" or "I'm here to help!" — just answer

Document handling (bills, receipts, utility statements):
- Default: extract the meaningful info, surface what matters, suggest one concrete action. Do NOT transcribe.
- Only exception: when the user explicitly says "transcribe", "read it", "translate this", or "what does it say", reproduce the verbatim text.
- Don't announce that you "extracted" or "analyzed" — speak naturally as if the document is in front of you.`;

  // ── User's financial data (only included when context slices are present) ──
  let contextBlock = '';
  if (contextSlices.length > 0) {
    contextBlock = (isAr
      ? '## بيانات المستخدم المالية (للرجوع إليها عند السؤال عن وضعه الشخصي فقط)\n'
      : "## User's Financial Data (reference only when they ask about their own situation)\n") +
      contextSlices.map(s => s.content).join('\n\n');
  }

  // ── Memory: stored profile fields ──
  const memParts: string[] = [];
  if (memoryFields.financialHealthBand) {
    memParts.push(isAr
      ? `نطاق الصحة المالية المسجل: ${memoryFields.financialHealthBand}`
      : `Recorded health band: ${memoryFields.financialHealthBand}`);
  }
  if (memoryFields.riskProfile) {
    memParts.push(isAr
      ? `تحمّل المخاطر: ${memoryFields.riskProfile.tolerance}`
      : `Risk tolerance: ${memoryFields.riskProfile.tolerance}`);
  }
  if (memoryFields.preferences?.focusAreas?.length) {
    memParts.push(isAr
      ? `مجالات الاهتمام: ${memoryFields.preferences.focusAreas.join('، ')}`
      : `Focus areas: ${memoryFields.preferences.focusAreas.join(', ')}`);
  }
  const memoryBlock = memParts.length > 0
    ? (isAr ? '## ملف المستخدم\n' : '## User Profile\n') + memParts.join('\n')
    : '';

  // ── Deterministic signals — only included if the user is asking about
  // their own finances. The agent decides whether to surface this; it is NOT
  // a directive to volunteer the assessment.
  const deterministicBlock = deterministic
    ? buildDeterministicGuidance(deterministic, isAr)
    : '';

  // ── Document context — only present when the orchestrator routed
  // through documentExtractorAgent. Passing this block prevents us from
  // re-sending the original image to the chat model.
  const documentBlock = documentContext
    ? buildDocumentBlock(
        documentContext.extracted,
        documentContext.analysis,
        documentContext.transcribeRequested,
        isAr,
      )
    : '';

  return [identity, contextBlock, memoryBlock, deterministicBlock, documentBlock]
    .filter(Boolean)
    .join('\n\n---\n\n');
}

export const chatAgent: AgentDefinition = {
  id: 'chat',
  name: 'Chat Agent',
  description: 'Structured financial consultant with proactive assessment and data-grounded advice',
  supportedIntents: SUPPORTED_INTENTS,
  requiredMemoryFields: ['financialHealthBand', 'riskProfile', 'preferences'],
  requiredContextSlices: ['summary', 'currentMonth', 'categoryBreakdown', 'goals', 'budgets', 'trends', 'patterns'],
  needsDeterministicLayer: true,
  systemPromptBuilder: buildSystemPrompt,
  outputSchema: null,
  maxContextTokens: 4000,
  canWriteMemory: false,
  writableMemoryFields: [],
};

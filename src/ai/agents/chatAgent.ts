/**
 * Chat Agent (default)
 * ====================
 * Handles general chat interactions — the primary conversational agent.
 * Uses the full Mustasharak identity and financial guidance rules.
 * This is the fallback agent when no specialized agent matches.
 */

import type { AgentDefinition, AgentPromptParams } from './types';
import type { AIIntent } from '../types';
import type { DeterministicOutputs } from '../deterministic';

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
  'greeting',
  'gratitude',
  'unclear',
  'out_of_scope',
];

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
    lines.push(`## التقييم المالي (أرقام موثوقة — لا تتعارض معها)`);
    lines.push(`الصحة المالية الإجمالية: ${score}/١٠٠ — ${bandLabel}`);
  } else {
    lines.push(`## Financial Health Assessment (authoritative — do not contradict)`);
    lines.push(`Overall: ${score}/100 — ${bandLabel}`);
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

  // Advisory direction — tell the LLM what to prioritize
  lines.push('');
  let prioritySignal: string;
  if (advisory.financialPressureLevel === 'high') {
    prioritySignal = isAr
      ? 'الضغط المالي مرتفع — اجعل هذا محور المحادثة، افتح بتحديد المشكلة بوضوح'
      : 'Financial pressure is high — make this the conversation focus, open by naming the problem clearly';
  } else if (advisory.expenseTrendRisk === 'increasing') {
    prioritySignal = isAr
      ? 'الإنفاق في ارتفاع — اقترح تحليل المصاريف لتحديد المحرك الرئيسي'
      : 'Spending is rising — suggest a spending analysis to identify the main driver';
  } else if (advisory.goalRiskLevel === 'critical') {
    prioritySignal = isAr
      ? 'الأهداف في خطر — اقترح خطة ادخار مع جدول زمني واضح'
      : 'Goals are at risk — suggest a savings plan with a concrete timeline';
  } else if (advisory.goalRiskLevel === 'behind') {
    prioritySignal = isAr
      ? 'الأهداف متأخرة — اقترح زيادة المدخرات أو تعديل الجداول الزمنية'
      : 'Goals are behind — suggest increasing savings contributions or adjusting timelines';
  } else if (advisory.volatilityRisk) {
    prioritySignal = isAr
      ? 'الإنفاق غير منتظم — ساعد على بناء ميزانية أكثر استقراراً'
      : 'Spending is volatile — help build a more consistent budget';
  } else {
    prioritySignal = isAr
      ? 'لا توجد مشاكل حرجة — ركز على الفرص: زيادة الادخار أو تسريع الأهداف'
      : 'No critical issues — focus on opportunities: increasing savings or accelerating goals';
  }

  lines.push(isAr
    ? `→ الأولوية في هذه المحادثة: ${prioritySignal}`
    : `→ Conversation priority: ${prioritySignal}`);

  return lines.join('\n');
}

function buildSystemPrompt(params: AgentPromptParams): string {
  const { language, contextSlices, memoryFields, deterministic, conversationHistory } = params;
  const isAr = language === 'ar';
  const isFirstMessage = !conversationHistory || conversationHistory.length === 0;

  // ── 1. Identity ──────────────────────────────────────────────
  const identity = isAr
    ? `أنت "مستشارك" — المستشار المالي في تطبيق رصملك.
دورك: مستشار مالي منهجي. تبني صورة كاملة عن وضع المستخدم المالي، تحدد المشاكل الأكثر تأثيراً، وتقدم خطة عملية واضحة.
أسلوبك: رسمي ودود — مثل مستشار موثوق في بنك خاص. مهني وقابل للتواصل، بدون مبالغة عاطفية.
قيمك: الوضوح، الأمانة، العمل الفعلي، عدم إصدار الأحكام.`
    : `You are "Mustasharak" — the financial advisor in the Rasmalak app.
Role: A structured financial consultant. You build a complete picture of the user's financial situation, identify the highest-impact issues, and deliver a concrete actionable plan.
Style: Formally warm — like a trusted advisor at a private bank. Professional and approachable, without over-emoting.
Values: Clarity, honesty, practical action, non-judgment.`;

  // ── 2. Consultation methodology ──────────────────────────────
  const methodology = isAr
    ? `## منهجية الاستشارة
في كل رد اتبع هذا التسلسل:
1. **افهم** — اعترف بسؤال المستخدم أو وضعه بجملة واحدة
2. **قيّم** — استشهد بالأرقام الفعلية من بياناته (دائماً ذكر الأرقام الحقيقية)
3. **حدّد** — اذكر المشكلة أو الفرصة الأهم (مرتبة حسب التأثير)
4. **أوصِ** — قدم ٢-٣ خطوات عملية مرتبة بالأولوية، مربوطة بأرقامه الفعلية
5. **اسأل** — إذا احتجت معلومة إضافية، اطرح سؤالاً واحداً مركزاً فقط

الهدف: كل نصيحة يجب أن تكون مخصصة لهذا المستخدم تحديداً — لا نصائح عامة.`
    : `## Consultation Methodology
For every response, follow this sequence:
1. **Acknowledge** — validate the user's question or situation in one sentence
2. **Assess** — cite actual numbers from their data (always reference real figures, not generic guidance)
3. **Identify** — name the 1-2 most important issues or opportunities, ranked by impact
4. **Recommend** — give 2-3 concrete prioritized steps, explicitly tied to their specific numbers
5. **Ask** — if you need one piece of information to sharpen your advice, ask exactly ONE focused question

The goal: every recommendation must be specific to this user's actual situation — never generic tips.`;

  // ── 3. Opening protocol (first message only) ─────────────────
  const openingProtocol = isFirstMessage ? (isAr
    ? `## بروتوكول الجلسة الأولى (هذه الرسالة الأولى)
حتى لو قال المستخدم فقط "مرحبا" أو "أهلاً" — لا ترد بترحيب فارغ. افتح بـ:
1. جملة واحدة مباشرة عن صحته المالية: "وضعك المالي [التقييم] — [ملاحظة واحدة مهمة من بياناته]."
2. أهم مشكلة أو فرصة تراها (من التقييم أدناه)
3. سؤال واحد أو عرض للتعمق: "تحب نبدأ من هون، أو في شي ثاني على بالك؟"

مثال: "وضعك المالي مقبول — معدل ادخارك ١٢٪ وهو بداية، بس مصاريف الطعام ارتفعت ٣٥٪ هذا الشهر. تحب نشوف وين راحت هالزيادة، أو في شي ثاني تبغى نحكي فيه؟"`
    : `## Opening Protocol (this is the first message)
Even if the user just says "hi" or "hello" — do not give an empty greeting back. Always open with:
1. A direct one-sentence financial health summary: "Your finances are [band] — [one key observation from their data]."
2. The single most important issue or opportunity (from the assessment below)
3. One focused question or offer: "Want me to dig into that, or is there something else on your mind?"

Example: "Your finances are in fair shape — you're saving 12%, which is a start, but your food spending jumped 35% this month. Want me to dig into where that increase came from, or is there something else on your mind?"`)
    : null;

  // ── 4. Clarification rule ─────────────────────────────────────
  const clarificationRule = isAr
    ? `## قاعدة الأسئلة التوضيحية
إذا احتجت معلومة لتحسين نصيحتك:
- اطرح سؤالاً واحداً فقط — محدداً ومركزاً
- مثال جيد: "ما هو هدفك المالي الأهم الآن؟"
- مثال سيئ: "ما دخلك؟ وما مصاريفك الثابتة؟ وهل عندك ديون؟"
- لا تطرح قائمة أسئلة أبداً في رد واحد`
    : `## Clarification Rule
When you need information to give better advice:
- Ask exactly ONE focused question — never a list
- Good: "What's your most important financial goal right now?"
- Bad: "What's your income? And your fixed expenses? And do you have any debts?"
- Never bundle multiple questions into one response`;

  // ── 5. Response format ────────────────────────────────────────
  const responseFormat = isAr
    ? `## تنسيق الرد
- للتحليل والنصائح: ١-٢ جملة تقييم، ثم نقاط (٢-٣ خطوات مرتبة بالأولوية)
- لكل خطوة: اذكر الرقم الحالي، الهدف، والفجوة ("مصاريفك على الطعام ٣٤٠ د.أ — أعلى من ميزانيتك ٢٦٠ د.أ بـ ٨٠ د.أ")
- للشرح: فقرات مختصرة، لا تتجاوز ٤ جمل
- لا تبدأ بـ "سؤال رائع!" أو "أنا هنا لمساعدتك" — انتقل مباشرة للمحتوى`
    : `## Response Format
- For analysis/advice: 1-2 sentences of assessment, then bullets (2-3 steps ordered by priority)
- For each step: cite the current number, the target, and the gap ("your food spending is 340 JOD — 80 JOD above your 260 JOD budget")
- For explanations: concise paragraphs, max 4 sentences
- Never open with "Great question!" or "I'm here to help!" — go straight to substance`;

  // ── 6. Financial guidance rules ───────────────────────────────
  const financialRules = isAr
    ? `## قواعد الإرشاد المالي
- اشرح أين يذهب المال بناءً على البيانات الفعلية — لا تخترع أرقاماً
- لا تعطِ نصائح استثمارية أو قانونية محددة
- لا تضغط على المستخدم لاتخاذ قرارات
- رد دائماً بنفس لهجة المستخدم`
    : `## Financial Guidance Rules
- Ground all analysis in the user's actual data — never invent figures
- Don't give specific investment or legal advice
- Don't pressure users into decisions
- Always respond in the user's language and dialect`;

  // ── 7. Blocked topics ─────────────────────────────────────────
  const blockedTopics = isAr
    ? `## مواضيع محظورة
لا تقدم نصائح في: أسهم محددة، عملات مشفرة، التهرب الضريبي، الاستشارات القانونية.
إذا سُئلت: "هذا خارج نطاق ما أستطيع مساعدتك فيه. لقرارات الاستثمار الكبرى أنصحك بمختص."`
    : `## Blocked Topics
Do not advise on: specific stock picks, cryptocurrency recommendations, tax evasion, legal advice.
If asked: "This is outside what I can help with. For major investment or legal decisions, I recommend consulting a specialist."`;

  // ── 8. Financial context (data slices) ───────────────────────
  let contextBlock = '';
  if (contextSlices.length > 0) {
    contextBlock = '\n\n## User Financial Data\n' +
      contextSlices.map(s => s.content).join('\n\n');
  }

  // ── 9. Memory block ───────────────────────────────────────────
  let memoryBlock = '';
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
  if (memParts.length > 0) {
    memoryBlock = '\n\n' + (isAr ? '## ملف المستخدم (من الذاكرة)\n' : '## User Profile (from memory)\n') +
      memParts.join('\n');
  }

  // ── 10. Deterministic block (human-readable signals) ─────────
  let deterministicBlock = '';
  if (deterministic) {
    deterministicBlock = '\n\n' + buildDeterministicGuidance(deterministic, isAr);
  }

  return [
    identity,
    methodology,
    openingProtocol,
    clarificationRule,
    responseFormat,
    financialRules,
    blockedTopics,
    contextBlock,
    memoryBlock,
    deterministicBlock,
  ]
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

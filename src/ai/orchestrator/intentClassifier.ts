/**
 * Enhanced Rule-Based Intent Classifier
 * ======================================
 * Classifies user intent without an LLM call using:
 * - Pattern matching (regex for financial queries, greetings, etc.)
 * - Entity-based intent hints
 * - Confidence scoring
 */

import type { AIIntent, ConfidenceLevel, IntentClassification } from '../types';

interface PatternRule {
  intent: AIIntent;
  patterns: RegExp[];
  confidence: number;
}

const PATTERN_RULES: PatternRule[] = [
  // Greeting
  {
    intent: 'greeting',
    patterns: [
      /^(مرحبا|السلام|هلا|أهلا|هاي|مسا الخير|صباح الخير)/i,
      /^(hello|hi|hey|good morning|good evening|greetings)\b/i,
      /^(كيفك|كيف حالك|شلونك|ازيك|عامل ايه)/i,
    ],
    confidence: 0.95,
  },
  // Gratitude
  {
    intent: 'gratitude',
    patterns: [
      /^(شكر|يسلمو|تسلم|مشكور|يعطيك العافية|الله يعافيك)/i,
      /^(thanks?|thank you|appreciate|thx)\b/i,
    ],
    confidence: 0.95,
  },

  // Category breakdown
  {
    intent: 'category_breakdown',
    patterns: [
      /كم (صرفت|أنفقت|دفعت) على (ال)?/i,
      /how much.*(spend|spent|pay|paid).*(on|for)/i,
      /(مصاريف|إنفاق) (ال)?(أكل|مواصلات|تسوق|ترفيه|صحة|تعليم|سكن)/i,
      /breakdown.*(category|categories|spending)/i,
      /spending.*(by|per|each).*(category)/i,
    ],
    confidence: 0.9,
  },

  // Compare periods
  {
    intent: 'compare_periods',
    patterns: [
      /(مقارنة|قارن|أكثر من|أقل من).*(الشهر|الأسبوع|السنة).*(الماضي|السابق|اللي فات)/i,
      /(هل صرفت|هل أنفقت).*(أكثر|أقل).*(من|عن).*(الشهر|الأسبوع)/i,
      /compar(e|ed|ing).*(last|previous|month|week|year)/i,
      /(more|less).*(than|compared).*(last|previous)/i,
    ],
    confidence: 0.85,
  },

  // Receipt / image / document analysis
  {
    intent: 'analyze_spending',
    patterns: [
      /(فاتورة|إيصال|وصل|حساب)/i,
      /(receipt|invoice|bill)\b/i,
      /^(شو|ايش|ماذا|وش) (هاي|هال|هذي|هذه|هذا)/i,
      /^(حلل|اقرأ|شوف|سجل) (هال|هذي|هذه|هذا)?(صورة|فاتورة|وصل|إيصال)/i,
      /what.*(this|receipt|invoice|bill|image)/i,
      /scan|ocr|extract.*text/i,
    ],
    confidence: 0.85,
  },

  // Analyze spending
  {
    intent: 'analyze_spending',
    patterns: [
      /(وين|فين|أين) (راحت|راحو|ذهب|ذهبت) (فلوسي|مصاريفي|أموالي|قروشي)/i,
      /(حلل|تحليل) (مصاريفي|إنفاقي|فلوسي)/i,
      /(شو|ايش|ماذا) (صرفت|أنفقت)/i,
      /analyz(e|ing) (my )?spend/i,
      /where.*(my money|did.*go)/i,
      /(صرف|مصاريف|فلوس|إنفاق|spend|expense)/i,
    ],
    confidence: 0.85,
  },

  // Goal planning
  {
    intent: 'goal_planning',
    patterns: [
      /(بدي|أبي|عايز|أريد) (أوفر|أحفظ|ادخر) (ل|لل|عشان|حق)/i,
      /(أبغى|ابي|أبا) (أجمع|أوفر) (فلوس|مبلغ) (ل|لل)/i,
      /want to save (for|up)/i,
      /set.*(goal|target|saving)/i,
      /(plan|planning).*(save|saving|goal)/i,
    ],
    confidence: 0.85,
  },

  // Goal progress
  {
    intent: 'goal_progress',
    patterns: [
      /(كم باقي|كم وصلت|كم بعد|كيف ماشي).*(هدف|هدفي)/i,
      /(وين وصلت|كم ضلني|كم فاضل).*(هدف)/i,
      /(how much|how far|progress|status).*(goal|target)/i,
    ],
    confidence: 0.85,
  },

  // Savings advice
  {
    intent: 'savings_advice',
    patterns: [
      /(كيف|شلون|ازاي) (أوفر|ادخر|أحفظ|أجمع) (أكثر|أكتر|فلوس|مبلغ)/i,
      /(نصائح|نصيحة|ساعدني) (لل)?(توفير|ادخار|حفظ)/i,
      /how (can|do|to).*(save|saving) (more|money)/i,
      /tips?.*(sav(e|ing)|money)/i,
      /(وفر|ادخر|save|saving)/i,
    ],
    confidence: 0.8,
  },

  // Budget status
  {
    intent: 'budget_status',
    patterns: [
      /(هل أنا|أنا) (ماشي صح|ماشي كويس|على الطريق|ماشي تمام).*(ميزانية|بدجت)/i,
      /(كيف|شلون) حالة (ال)?(ميزانية|بدجت)/i,
      /am I on track.*(budget)/i,
      /(budget).*(status|track|check)/i,
      /(ميزانية|بدجت|budget)/i,
    ],
    confidence: 0.8,
  },

  // Budget advice
  {
    intent: 'budget_advice',
    patterns: [
      /(كيف|شلون|ازاي) (أرتب|أنظم|أحسن) (ال)?(ميزانية|بدجت)/i,
      /(ساعدني|نصائح) (في|لل|ب)(ميزانية|بدجت)/i,
      /how to.*(budget|organize.*money)/i,
      /(help|tips?).*(budget|budgeting)/i,
    ],
    confidence: 0.8,
  },

  // Overspending alert
  {
    intent: 'overspending_alert',
    patterns: [
      /(ليش|ليه|لماذا) (صارفين|صارف|منفقين|أصرف) (كتير|كثير|واجد)/i,
      /(صرف|إنفاق) (زيادة|كثير|كتير|واجد)/i,
      /why.*(overspend|spending too much|spent so much)/i,
      /overspend/i,
    ],
    confidence: 0.8,
  },

  // Predict end of month
  {
    intent: 'predict_end_of_month',
    patterns: [
      /(هل رح|هل بيكفي|هل يكفيني) (الراتب|المبلغ|الفلوس|المصاري)/i,
      /(رح يكفيني|بيوصل معي|بيضل معي)/i,
      /(will|can).*(salary|money|budget).*(last|enough|sufficient)/i,
      /end of (the )?month/i,
      /forecast|predict|project/i,
    ],
    confidence: 0.8,
  },

  // Simulate scenario
  {
    intent: 'simulate_scenario',
    patterns: [
      /(لو|إذا|شو بيصير لو) (صرفت|وفرت|دفعت|خفضت|زدت)/i,
      /(ماذا لو|شو لو|ايش لو)/i,
      /what if|what would happen/i,
      /simulat(e|ion)|scenario/i,
    ],
    confidence: 0.8,
  },

  // Forecast savings
  {
    intent: 'forecast_savings',
    patterns: [
      /(متى|إيمتى|امتى) (رح|بـ|ح)(أوصل|يوصل|يكتمل).*(هدف|مبلغ)/i,
      /(كم يبقى|كم باقي) (وقت|شهر|سنة)/i,
      /when.*(reach|achieve|complete).*(goal|target|amount)/i,
      /how long.*(take|need).*(save|reach|goal)/i,
    ],
    confidence: 0.8,
  },

  // Explain concept
  {
    intent: 'explain_concept',
    patterns: [
      /(شو يعني|ايش يعني|معنى|ما هو|ما هي|وش يعني) /i,
      /what (is|are|does).*(mean|concept|definition)/i,
      /(explain|define|tell me about|اشرح|فسر)/i,
      /(تدفق نقدي|cash flow|فائدة مركبة|compound interest|تضخم|inflation)/i,
    ],
    confidence: 0.75,
  },

  // Learning recommendation
  {
    intent: 'learning_recommendation',
    patterns: [
      /(شو|ايش|ماذا) (لازم|يجب) (أتعلم|اتعلم)/i,
      /(أبغى|ابي|بدي|عايز) (أتعلم|اتعلم|أفهم)/i,
      /what should I (learn|study|read)/i,
      /recommend.*(course|lesson|learn|read)/i,
    ],
    confidence: 0.75,
  },
];

/**
 * Classify user intent using rule-based pattern matching.
 * No LLM call. Returns immediately.
 */
export function classifyIntent(message: string, hasAttachments?: boolean): IntentClassification {
  const trimmed = message.trim();

  if (!trimmed) {
    return {
      intent: 'unclear',
      confidence: 'low',
      confidenceScore: 0.3,
      entities: [],
      needsClarification: true,
      clarificationQuestion: 'Can you tell me what you need help with?',
    };
  }

  let bestMatch: { intent: AIIntent; confidence: number } | null = null;

  for (const rule of PATTERN_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(trimmed)) {
        if (!bestMatch || rule.confidence > bestMatch.confidence) {
          bestMatch = { intent: rule.intent, confidence: rule.confidence };
        }
        break;
      }
    }
  }

  if (bestMatch) {
    const confidenceLevel: ConfidenceLevel =
      bestMatch.confidence >= 0.85 ? 'high' :
      bestMatch.confidence >= 0.7 ? 'medium' : 'low';

    return {
      intent: bestMatch.intent,
      confidence: confidenceLevel,
      confidenceScore: bestMatch.confidence,
      entities: [],
      needsClarification: false,
    };
  }

  // If the user sent an image with no strong text intent, default to analyze_spending
  // so the pro model (not flash) handles the vision task
  if (hasAttachments) {
    return {
      intent: 'analyze_spending',
      confidence: 'medium',
      confidenceScore: 0.75,
      entities: [],
      needsClarification: false,
    };
  }

  // Out of scope detection
  const financialKeywords = /\b(مال|فلوس|مصاري|دفع|صرف|ادخر|وفر|ميزانية|راتب|هدف|money|spend|save|budget|salary|goal|income|expense|debt|loan|invest)\b/i;
  if (!financialKeywords.test(trimmed)) {
    return {
      intent: 'out_of_scope',
      confidence: 'medium',
      confidenceScore: 0.6,
      entities: [],
      needsClarification: false,
    };
  }

  return {
    intent: 'unclear',
    confidence: 'low',
    confidenceScore: 0.4,
    entities: [],
    needsClarification: true,
    clarificationQuestion: 'Can you tell me more about what you need?',
  };
}

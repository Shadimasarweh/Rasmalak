/**
 * Report Generator Agent — Mustasharak's reporting engine
 * =======================================================
 * Generates natural language pipeline reports:
 * - Weekly manager reports (Sundays)
 * - Daily rep briefs (every day)
 *
 * Uses Arabic-Indic numerals when language is Arabic.
 */

import type { AgentDefinition, AgentPromptParams } from './types';
import type { AIIntent } from '../types';

const SUPPORTED_INTENTS: AIIntent[] = [
  'analyze_spending',
];

export const reportGeneratorAgent: AgentDefinition = {
  id: 'chat' as AgentDefinition['id'],
  name: 'Report Generator',
  description: 'Generates natural language pipeline health reports for managers and reps',
  supportedIntents: SUPPORTED_INTENTS,
  requiredMemoryFields: [],
  requiredContextSlices: [],
  needsDeterministicLayer: false,
  canWriteMemory: false,
  writableMemoryFields: [],
  maxContextTokens: 3000,
  outputSchema: null,

  systemPromptBuilder: (params: AgentPromptParams): string => {
    const { language } = params;
    const isAr = language === 'ar';

    if (isAr) {
      return `أنت مستشارك للتقارير — محرك التقارير في منصة رسمالك لإدارة العملاء.

مهمتك: إنشاء تقرير صحة خط المبيعات بناءً على البيانات المقدمة.

قواعد:
- اكتب باللغة العربية الفصحى المهنية
- استخدم الأرقام العربية الهندية (٠١٢٣٤٥٦٧٨٩)
- ابدأ بملخص تنفيذي من سطرين
- ثم النقاط الرئيسية مرقمة
- حدد الصفقات المعرضة للخطر بوضوح
- اقترح إجراءات محددة
- اختم بتوقعات الأسبوع القادم
- لا تستخدم تنسيق Markdown
- اجعل التقرير مختصراً وعملياً`;
    }

    return `You are Mustasharak's Report Generator — the reporting engine in Rasmalak CRM.

Your task: generate a pipeline health report based on the provided data.

Rules:
- Write in clear, professional English
- Start with a 2-line executive summary
- Then numbered key points
- Clearly identify at-risk deals
- Suggest specific actions
- End with next week's outlook
- Do NOT use Markdown formatting
- Keep the report concise and actionable`;
  },
};

/** Build context for weekly manager report */
export function buildManagerReportContext(data: {
  orgName: string;
  totalOpenDeals: number;
  totalPipelineValue: number;
  currency: string;
  dealsByStage: Array<{ stage: string; count: number; value: number }>;
  closedThisWeek: { won: number; wonValue: number; lost: number; lostValue: number };
  teamActivity: { totalComms: number; totalTasks: number; overdueCount: number };
  atRiskDeals: Array<{ title: string; value: number; score: number; reason: string }>;
  topDeals: Array<{ title: string; value: number; score: number; probability: number }>;
  language: 'ar' | 'en';
}): string {
  return `Generate a weekly pipeline report for ${data.orgName}:

Pipeline Summary:
- Open deals: ${data.totalOpenDeals}
- Total pipeline value: ${data.totalPipelineValue} ${data.currency}
- Deals by stage: ${data.dealsByStage.map(s => `${s.stage}: ${s.count} deals (${s.value} ${data.currency})`).join(', ')}

This Week's Closings:
- Won: ${data.closedThisWeek.won} deals worth ${data.closedThisWeek.wonValue} ${data.currency}
- Lost: ${data.closedThisWeek.lost} deals worth ${data.closedThisWeek.lostValue} ${data.currency}

Team Activity:
- Total communications: ${data.teamActivity.totalComms}
- Tasks completed: ${data.teamActivity.totalTasks}
- Overdue tasks: ${data.teamActivity.overdueCount}

At-Risk Deals:
${data.atRiskDeals.map(d => `- ${d.title} (${d.value} ${data.currency}, score: ${d.score}) — ${d.reason}`).join('\n')}

Top Deals:
${data.topDeals.map(d => `- ${d.title} (${d.value} ${data.currency}, score: ${d.score}, ${d.probability}% probability)`).join('\n')}

Language: ${data.language === 'ar' ? 'Arabic with Arabic-Indic numerals' : 'English'}`;
}

/** Build context for daily rep brief */
export function buildRepBriefContext(data: {
  repName: string;
  openDeals: Array<{ title: string; value: number; score: number; nextAction: string }>;
  todayTasks: Array<{ title: string; priority: string; relatedDeal: string | null }>;
  overdueItems: Array<{ title: string; dueDate: string }>;
  language: 'ar' | 'en';
}): string {
  return `Generate a daily brief for sales rep ${data.repName}:

Your Open Deals:
${data.openDeals.map(d => `- ${d.title} (${d.value}, score: ${d.score}) — Next: ${d.nextAction}`).join('\n')}

Today's Tasks:
${data.todayTasks.map(t => `- [${t.priority}] ${t.title}${t.relatedDeal ? ` (${t.relatedDeal})` : ''}`).join('\n')}

Overdue Items:
${data.overdueItems.length > 0 ? data.overdueItems.map(o => `- ${o.title} (due ${o.dueDate})`).join('\n') : 'None'}

Language: ${data.language === 'ar' ? 'Arabic with Arabic-Indic numerals' : 'English'}`;
}

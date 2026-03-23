/**
 * Context Selector
 * ================
 * Replaces the full-dump approach with selective context retrieval.
 * Each agent declares which slices it needs and only those are injected.
 *
 * Rules:
 * - Hard token ceiling at 70% of model context window
 * - Relevance filtering per agent requirements
 * - Deduplication of similar content
 * - Logs what was selected for auditability
 */

import type { IntentClassification, UserFinancialContext } from '../types';
import type { AgentDefinition, FinancialContextSlice } from '../agents/types';
import type { UserSemanticState } from '../memory/types';
import type { ContextSliceType } from './sliceTypes';
import { estimateTokens, wouldExceedBudget } from './tokenBudget';
import { AI_CONFIG } from '../config';
import { fmtNum, fmtPct } from '@/lib/utils';

export interface ContextSelection {
  memoryFields: Partial<UserSemanticState>;
  financialSlices: FinancialContextSlice[];
  tokenEstimate: number;
  selectionReason: string[];
}

type SliceBuilder = (ctx: UserFinancialContext, lang: 'ar' | 'en') => string;

const SLICE_BUILDERS: Record<ContextSliceType, SliceBuilder> = {
  summary: (ctx, lang) => {
    const currency = ctx.currency || 'JOD';
    const n = (v: number) => fmtNum(v, lang);
    if (lang === 'ar') {
      return `### الملخص المالي
- إجمالي الدخل: ${n(ctx.totalIncome)} ${currency}
- إجمالي المصاريف: ${n(ctx.totalExpenses)} ${currency}
- الرصيد الصافي: ${n(ctx.netBalance)} ${currency}
- معدل الادخار: ${fmtPct(ctx.savingsRate * 100, lang)}`;
    }
    return `### Financial Summary
- Total Income: ${n(ctx.totalIncome)} ${currency}
- Total Expenses: ${n(ctx.totalExpenses)} ${currency}
- Net Balance: ${n(ctx.netBalance)} ${currency}
- Savings Rate: ${fmtPct(ctx.savingsRate * 100, lang)}`;
  },

  currentMonth: (ctx, lang) => {
    const currency = ctx.currency || 'JOD';
    const n = (v: number) => fmtNum(v, lang);
    if (lang === 'ar') {
      return `### الشهر الحالي
- الدخل: ${n(ctx.currentMonth.income)} ${currency}
- المصاريف: ${n(ctx.currentMonth.expenses)} ${currency}
- الأيام المتبقية: ${n(ctx.currentMonth.daysRemaining)}
- الرصيد المتوقع نهاية الشهر: ${n(ctx.currentMonth.projectedEndBalance)} ${currency}`;
    }
    return `### Current Month
- Income: ${n(ctx.currentMonth.income)} ${currency}
- Expenses: ${n(ctx.currentMonth.expenses)} ${currency}
- Days Remaining: ${n(ctx.currentMonth.daysRemaining)}
- Projected End Balance: ${n(ctx.currentMonth.projectedEndBalance)} ${currency}`;
  },

  lastMonth: (ctx, lang) => {
    const c = ctx.comparedToLastMonth;
    if (lang === 'ar') {
      return `### مقارنة بالشهر الماضي
- تغير الدخل: ${c.incomeChange > 0 ? '+' : ''}${fmtPct(c.incomeChange, lang)}
- تغير المصاريف: ${c.expenseChange > 0 ? '+' : ''}${fmtPct(c.expenseChange, lang)}
- الاتجاه: ${c.trend === 'improving' ? 'تحسن' : c.trend === 'stable' ? 'مستقر' : 'تراجع'}`;
    }
    return `### Compared to Last Month
- Income Change: ${c.incomeChange > 0 ? '+' : ''}${fmtPct(c.incomeChange, lang)}
- Expense Change: ${c.expenseChange > 0 ? '+' : ''}${fmtPct(c.expenseChange, lang)}
- Trend: ${c.trend}`;
  },

  categoryBreakdown: (ctx, lang) => {
    if (ctx.spendingByCategory.length === 0) return '';
    const currency = ctx.currency || 'JOD';
    const n = (v: number) => fmtNum(v, lang);
    const header = lang === 'ar' ? '### الإنفاق حسب الفئة' : '### Spending by Category';
    const lines = ctx.spendingByCategory.slice(0, 5).map(cat =>
      `- ${cat.category}: ${n(cat.amount)} ${currency} (${fmtPct(cat.percentage, lang)})`,
    );
    return header + '\n' + lines.join('\n');
  },

  goals: (ctx, lang) => {
    if (ctx.goals.length === 0) return '';
    const currency = ctx.currency || 'JOD';
    const n = (v: number) => fmtNum(v, lang);
    const header = lang === 'ar' ? '### الأهداف' : '### Goals';
    const lines = ctx.goals.map(g =>
      `- ${g.name}: ${n(g.currentAmount)}/${n(g.targetAmount)} ${currency} (${fmtPct(g.progressPercentage, lang, 0)})`,
    );
    return header + '\n' + lines.join('\n');
  },

  budgets: (ctx, lang) => {
    if (!ctx.budget) return '';
    const currency = ctx.currency || 'JOD';
    const n = (v: number) => fmtNum(v, lang);
    if (lang === 'ar') {
      return `### حالة الميزانية
- الحد الشهري: ${n(ctx.budget.monthlyLimit)} ${currency}
- المصروف: ${n(ctx.budget.spent)} ${currency}
- المتبقي: ${n(ctx.budget.remaining)} ${currency}
- النسبة المستخدمة: ${fmtPct(ctx.budget.percentageUsed, lang, 0)}${ctx.budget.isOverBudget ? '\n- ⚠️ تجاوز الميزانية!' : ''}`;
    }
    return `### Budget Status
- Monthly Limit: ${n(ctx.budget.monthlyLimit)} ${currency}
- Spent: ${n(ctx.budget.spent)} ${currency}
- Remaining: ${n(ctx.budget.remaining)} ${currency}
- Used: ${fmtPct(ctx.budget.percentageUsed, lang, 0)}${ctx.budget.isOverBudget ? '\n- ⚠️ Over budget!' : ''}`;
  },

  recentTransactions: (_ctx, _lang) => {
    // Transactions are not individually available in context;
    // the summary and category breakdown provide sufficient detail.
    return '';
  },

  trends: (ctx, lang) => {
    const c = ctx.comparedToLastMonth;
    if (lang === 'ar') {
      return `### الاتجاهات
- الاتجاه العام: ${c.trend === 'improving' ? 'تحسن ↑' : c.trend === 'stable' ? 'مستقر →' : 'تراجع ↓'}
- تغير الإنفاق: ${c.expenseChange > 0 ? '+' : ''}${c.expenseChange.toFixed(1)}%`;
    }
    return `### Trends
- Overall Trend: ${c.trend === 'improving' ? 'Improving ↑' : c.trend === 'stable' ? 'Stable →' : 'Declining ↓'}
- Expense Change: ${c.expenseChange > 0 ? '+' : ''}${c.expenseChange.toFixed(1)}%`;
  },

  patterns: (ctx, lang) => {
    const parts: string[] = [];
    if (ctx.patterns.unusualSpending.length > 0) {
      const header = lang === 'ar' ? '### إنفاق غير معتاد' : '### Unusual Spending';
      const lines = ctx.patterns.unusualSpending.map(u =>
        lang === 'ar'
          ? `- ${u.category}: أعلى من المعتاد بـ ${fmtPct(u.deviation, lang, 0)}`
          : `- ${u.category}: ${fmtPct(u.deviation, lang, 0)} above normal`,
      );
      parts.push(header + '\n' + lines.join('\n'));
    }
    if (ctx.patterns.recurringExpenses.length > 0) {
      const currency = ctx.currency || 'JOD';
      const header = lang === 'ar' ? '### مصاريف متكررة' : '### Recurring Expenses';
      const lines = ctx.patterns.recurringExpenses.slice(0, 3).map(r =>
        `- ${r.description}: ${fmtNum(r.amount, lang)} ${currency} (${r.frequency})`,
      );
      parts.push(header + '\n' + lines.join('\n'));
    }
    return parts.join('\n\n');
  },

  projections: (ctx, lang) => {
    const currency = ctx.currency || 'JOD';
    if (lang === 'ar') {
      return `### التوقعات
- الرصيد المتوقع نهاية الشهر: ${fmtNum(ctx.currentMonth.projectedEndBalance, lang)} ${currency}`;
    }
    return `### Projections
- Projected End of Month Balance: ${fmtNum(ctx.currentMonth.projectedEndBalance, lang)} ${currency}`;
  },
};

/**
 * Select context slices based on agent requirements and token budget.
 */
export function selectContext(
  intent: IntentClassification,
  agent: AgentDefinition,
  fullContext: UserFinancialContext,
  memory: Partial<UserSemanticState>,
): ContextSelection {
  const language = fullContext.language || 'en';
  const maxTokens = agent.maxContextTokens;
  const selectionReason: string[] = [];
  const slices: FinancialContextSlice[] = [];
  let totalTokens = 0;

  // Build slices in the order the agent declared them
  for (const sliceType of agent.requiredContextSlices) {
    const builder = SLICE_BUILDERS[sliceType];
    if (!builder) continue;

    const content = builder(fullContext, language);
    if (!content) {
      selectionReason.push(`${sliceType}: skipped (empty)`);
      continue;
    }

    const tokens = estimateTokens(content);

    if (wouldExceedBudget(totalTokens, tokens, maxTokens)) {
      selectionReason.push(`${sliceType}: skipped (token budget exceeded)`);
      break;
    }

    slices.push({ type: sliceType, content, tokenEstimate: tokens });
    totalTokens += tokens;
    selectionReason.push(`${sliceType}: included (${tokens} tokens)`);
  }

  // Filter memory to only requested fields
  const filteredMemory: Partial<UserSemanticState> = {};
  for (const field of agent.requiredMemoryFields) {
    if (field in memory) {
      (filteredMemory as Record<string, unknown>)[field] =
        (memory as Record<string, unknown>)[field];
    }
  }

  return {
    memoryFields: filteredMemory,
    financialSlices: slices,
    tokenEstimate: totalTokens,
    selectionReason,
  };
}

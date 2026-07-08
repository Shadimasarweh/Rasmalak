/**
 * Dashboard notification rules — extracted from the inline effect in
 * src/app/(dashboard)/page.tsx so they are pure and testable.
 *
 * Windows are cycle-based (payday-aware when the user opted in), the
 * salary-missing rule uses the DETECTED payday when available (legacy
 * day-25 heuristic kept as the no-profile fallback), and number formatting
 * is injected per language — Arabic notifications get Arabic-Indic digits
 * regardless of the active UI locale (the old inline code leaked Western
 * digits into messageAr when the UI ran in English).
 */

import type { CycleRange } from '@/lib/cycles';
import { clampAnchorDay } from '@/lib/cycles';
import type { AppNotification } from '@/store/notificationStore';
import type { SalaryProfile } from '@/ai/deterministic/salaryProfile';
import type { SafeToSpendResult } from '@/ai/deterministic/safeToSpend';

export type PendingNotification = Omit<AppNotification, 'id' | 'timestamp' | 'read'>;

interface TxLike {
  type: 'income' | 'expense';
  date: string;
  category: string | null;
  amountBase: number;
}

interface GoalLike {
  name: string;
  nameAr?: string;
  targetAmount: number;
  currentAmount: number;
}

export interface NotificationRuleInput {
  transactions: TxLike[];
  savingsGoals: GoalLike[];
  cycle: CycleRange;
  prevCycle: CycleRange;
  salaryProfile: SalaryProfile | null;
  safeToSpend: SafeToSpendResult | null;
  // P50 daily discretionary rate — the "typical day" yardstick for the
  // low safe-to-spend warning. null disables that rule.
  typicalDailyRate: number | null;
  currency: string;
  fmtNumEn: (n: number) => string;
  fmtNumAr: (n: number) => string;
  now?: Date;
}

export const SALARY_GRACE_DAYS = 2;
export const SPIKE_THRESHOLD = 1.3;
export const GOAL_PROXIMITY = 0.9;
// Warn when the daily allowance drops under half a typical spending day.
export const LOW_STS_RATIO = 0.5;

export function buildDashboardNotifications(input: NotificationRuleInput): PendingNotification[] {
  const now = input.now ?? new Date();
  const out: PendingNotification[] = [];
  const { cycle, prevCycle, fmtNumEn, fmtNumAr, currency } = input;

  const inRange = (dateStr: string, range: CycleRange): boolean => {
    const d = new Date(dateStr);
    return d >= range.start && d <= range.end;
  };

  const currentSpending: Record<string, number> = {};
  const prevSpending: Record<string, number> = {};
  let cycleIncome = 0;
  for (const tx of input.transactions) {
    if (tx.type === 'expense' && inRange(tx.date, cycle)) {
      const cat = tx.category || 'other';
      currentSpending[cat] = (currentSpending[cat] || 0) + Math.abs(tx.amountBase);
    }
    if (tx.type === 'expense' && inRange(tx.date, prevCycle)) {
      const cat = tx.category || 'other';
      prevSpending[cat] = (prevSpending[cat] || 0) + Math.abs(tx.amountBase);
    }
    if (tx.type === 'income' && inRange(tx.date, cycle)) {
      cycleIncome += Math.abs(tx.amountBase);
    }
  }
  const daysLeft = cycle.daysRemaining;

  // 1. Spending spike — any category up 30%+ vs the previous cycle
  for (const [cat, amount] of Object.entries(currentSpending)) {
    const prev = prevSpending[cat] || 0;
    if (prev > 0 && amount > prev * SPIKE_THRESHOLD) {
      const pctIncrease = Math.round(((amount - prev) / prev) * 100);
      out.push({
        type: 'spending_alert',
        severity: 'critical',
        messageEn: `Your ${cat} spending is trending ${fmtNumEn(pctIncrease)}% higher than last cycle with ${fmtNumEn(daysLeft)} days left.`,
        messageAr: `إنفاقك على ${cat} يتجه للارتفاع بنسبة ${fmtNumAr(pctIncrease)}٪ مقارنة بالدورة الماضية مع بقاء ${fmtNumAr(daysLeft)} يوماً.`,
        actionHref: '/money/track',
        actionLabelEn: 'View transactions',
        actionLabelAr: 'عرض المعاملات',
      });
    }
  }

  // 2. Goal proximity — any goal within 10% of completion
  for (const goal of input.savingsGoals) {
    if (goal.targetAmount <= 0) continue;
    const pct = goal.currentAmount / goal.targetAmount;
    const remaining = goal.targetAmount - goal.currentAmount;
    if (pct >= GOAL_PROXIMITY && pct < 1) {
      out.push({
        type: 'goal_progress',
        severity: 'positive',
        messageEn: `You're ${currency} ${fmtNumEn(Math.round(remaining))} away from your ${goal.name} goal. One more deposit!`,
        messageAr: `أنت على بعد ${currency} ${fmtNumAr(Math.round(remaining))} من هدف ${goal.nameAr || goal.name}. إيداع واحد آخر!`,
        actionHref: '/goals',
        actionLabelEn: 'Add funds',
        actionLabelAr: 'إضافة أموال',
      });
    }
  }

  // 3. Salary missing — detected payday + grace when the engine knows it;
  // legacy day-25 heuristic otherwise (explicit non-regression).
  const salary = input.salaryProfile;
  if (salary?.source === 'detected' && salary.paydayDayOfMonth != null && salary.amountMedian != null) {
    const clampedPayday = clampAnchorDay(salary.paydayDayOfMonth, now.getFullYear(), now.getMonth());
    if (now.getDate() > clampedPayday + SALARY_GRACE_DAYS && cycleIncome < 0.5 * salary.amountMedian) {
      out.push({
        type: 'salary_missing',
        severity: 'warning',
        messageEn: `Your salary usually arrives around day ${fmtNumEn(clampedPayday)}. It hasn't been recorded yet.`,
        messageAr: `عادةً ما يصل راتبك حوالي يوم ${fmtNumAr(clampedPayday)}. لم يتم تسجيله بعد.`,
        actionHref: '/money/track/new/income',
        actionLabelEn: 'Add income',
        actionLabelAr: 'إضافة دخل',
      });
    }
  } else if (now.getDate() >= 25 && cycleIncome === 0) {
    out.push({
      type: 'salary_missing',
      severity: 'warning',
      messageEn: `Your salary usually arrives by the 25th. It hasn't been recorded yet this month.`,
      messageAr: `عادةً ما يصل راتبك بحلول ال٢٥ من الشهر. لم يتم تسجيله بعد هذا الشهر.`,
      actionHref: '/money/track/new/income',
      actionLabelEn: 'Add income',
      actionLabelAr: 'إضافة دخل',
    });
  }

  // 4. Overspending — expenses exceed income this cycle
  const totalCurrentExpenses = Object.values(currentSpending).reduce((s, v) => s + v, 0);
  if (cycleIncome > 0 && totalCurrentExpenses > cycleIncome) {
    out.push({
      type: 'spending_alert',
      severity: 'warning',
      messageEn: `You're spending more than you earn this cycle. Review your expenses to get back on track.`,
      messageAr: `إنفاقك أكثر من دخلك هذه الدورة. راجع مصروفاتك للعودة إلى المسار الصحيح.`,
      actionHref: '/money/track',
      actionLabelEn: 'Review spending',
      actionLabelAr: 'مراجعة الإنفاق',
    });
  }

  // 5. Safe-to-Spend trouble — negative is critical; a daily allowance
  // under half a typical day is a warning.
  const sts = input.safeToSpend;
  if (sts) {
    if (sts.total < 0) {
      out.push({
        type: 'safe_to_spend_low',
        severity: 'critical',
        messageEn: `Committed bills and goals exceed your balance by ${currency} ${fmtNumEn(Math.abs(Math.round(sts.total)))} this cycle.`,
        messageAr: `الالتزامات والأهداف تتجاوز رصيدك بمقدار ${currency} ${fmtNumAr(Math.abs(Math.round(sts.total)))} هذه الدورة.`,
        actionHref: '/money/plan',
        actionLabelEn: 'Review plan',
        actionLabelAr: 'مراجعة الخطة',
      });
    } else if (
      input.typicalDailyRate != null &&
      input.typicalDailyRate > 0 &&
      sts.perDay < LOW_STS_RATIO * input.typicalDailyRate
    ) {
      out.push({
        type: 'safe_to_spend_low',
        severity: 'warning',
        messageEn: `Your daily allowance (${currency} ${fmtNumEn(sts.perDay)}) is well below your typical spending day.`,
        messageAr: `المتاح لك يومياً (${currency} ${fmtNumAr(sts.perDay)}) أقل بكثير من يوم إنفاقك المعتاد.`,
        actionHref: '/money/plan',
        actionLabelEn: 'Review plan',
        actionLabelAr: 'مراجعة الخطة',
      });
    }
  }

  return out;
}

/**
 * Renders a UserProfile into a compact, human-readable block injected
 * into the system prompt. Kept short on purpose — this is a "who is
 * this user" preamble, not a finance dump. Detailed numbers belong to
 * the per-domain slices (summary, budgets, etc.).
 */

import type { UserProfile } from './types';
import { fmtNum, fmtPct } from '@/lib/utils';

export function renderUserProfile(profile: UserProfile, lang: 'ar' | 'en'): string {
  const isAr = lang === 'ar';
  const lines: string[] = [];

  const segmentLabel = isAr
    ? { individual: 'فرد', self_employed: 'عمل حر', sme: 'صاحب منشأة' }[profile.segment]
    : profile.segment.replace('_', ' ');

  lines.push(isAr ? `- النوع: ${segmentLabel}` : `- Type: ${segmentLabel}`);

  if (profile.financialHealthBand) {
    const bandAr = { critical: 'حرج', watch: 'يحتاج متابعة', stable: 'مستقر' }[profile.financialHealthBand];
    lines.push(isAr
      ? `- النطاق المالي المسجل: ${bandAr}`
      : `- Recorded health band: ${profile.financialHealthBand}`);
  }

  if (profile.riskProfile) {
    const tolAr: Record<string, string> = {
      conservative: 'محافظ',
      moderate: 'متوازن',
      aggressive: 'مغامر',
    };
    lines.push(isAr
      ? `- تحمّل المخاطر: ${tolAr[profile.riskProfile.tolerance] ?? profile.riskProfile.tolerance}`
      : `- Risk tolerance: ${profile.riskProfile.tolerance}`);
  }

  if (profile.incomeStabilityScore != null) {
    lines.push(isAr
      ? `- استقرار الدخل: ${fmtNum(profile.incomeStabilityScore, lang)}/١٠٠`
      : `- Income stability: ${fmtNum(profile.incomeStabilityScore, lang)}/100`);
  }

  if (profile.preferences.focusAreas?.length) {
    lines.push(isAr
      ? `- مجالات الاهتمام: ${profile.preferences.focusAreas.join('، ')}`
      : `- Focus areas: ${profile.preferences.focusAreas.join(', ')}`);
  }

  if (profile.preferences.notificationFrequency) {
    lines.push(isAr
      ? `- وتيرة الإشعارات المفضلة: ${profile.preferences.notificationFrequency}`
      : `- Preferred notification cadence: ${profile.preferences.notificationFrequency}`);
  }

  // Posture block — give the bot a one-glance read of the user's current state.
  lines.push('');
  lines.push(isAr
    ? `- معدل الادخار: ${fmtPct(profile.posture.savingsRate * 100, lang)}`
    : `- Savings rate: ${fmtPct(profile.posture.savingsRate * 100, lang)}`);

  lines.push(isAr
    ? `- الرصيد الصافي: ${fmtNum(profile.posture.netBalance, lang)} ${profile.preferredCurrency}`
    : `- Net balance: ${fmtNum(profile.posture.netBalance, lang)} ${profile.preferredCurrency}`);

  if (profile.posture.topCategoryThisQuarter) {
    lines.push(isAr
      ? `- أعلى فئة إنفاق حالياً: ${profile.posture.topCategoryThisQuarter}`
      : `- Top spending category right now: ${profile.posture.topCategoryThisQuarter}`);
  }

  if (profile.posture.activeGoalCount > 0) {
    lines.push(isAr
      ? `- أهداف نشطة: ${fmtNum(profile.posture.activeGoalCount, lang)}`
      : `- Active goals: ${fmtNum(profile.posture.activeGoalCount, lang)}`);
  }

  if (profile.posture.hasActiveBudget) {
    lines.push(isAr ? `- الميزانية مفعّلة` : `- Has an active monthly budget`);
  }

  // Engagement signal — useful so the bot can tone its responses for
  // first-time vs. heavy users without the user having to say so.
  if (profile.engagementSignals.totalInteractions != null) {
    lines.push(isAr
      ? `- عدد التفاعلات السابقة: ${fmtNum(profile.engagementSignals.totalInteractions, lang)}`
      : `- Prior interactions: ${fmtNum(profile.engagementSignals.totalInteractions, lang)}`);
  }

  const header = isAr ? '### ملف المستخدم' : '### User Profile';
  return `${header}\n${lines.filter((l) => l !== '' || lines.length > 0).join('\n')}`;
}

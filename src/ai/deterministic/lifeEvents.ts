/**
 * Life-event awareness — individual roadmap Pillar E (detection half).
 *
 * Big life changes announce themselves in the category mix: a category
 * that never existed suddenly carrying real share for two straight
 * months (a baby, a school, a wedding), or housing jumping a quarter
 * and staying there (a move). Detection only proposes — the surface
 * asks, the user decides, and re-planning happens on the Plan tab the
 * user already knows. Nothing here writes memory or re-profiles
 * (roadmap rule: never assume; always confirm).
 */

import { EngineTransaction, isGoalFunding } from './engineTypes';

export const NEW_CATEGORY_MIN_SHARE = 0.05; // of monthly expenses, both recent months
export const NEW_CATEGORY_PRIOR_MAX_SHARE = 0.01;
export const HOUSING_JUMP_FACTOR = 1.25;
export const PRIOR_WINDOW_MONTHS = 6;
export const RECENT_WINDOW_MONTHS = 2;

export interface LifeEventCandidate {
  kind: 'new_category' | 'housing_jump';
  categoryId: string;
  /** Stable key for per-event dismissal. */
  key: string;
  evidence: {
    recentMonthlyAvg: number;
    priorMonthlyAvg: number;
    recentSharePct?: number;
  };
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function detectLifeEvents(
  transactions: EngineTransaction[],
  now: Date = new Date(),
): LifeEventCandidate[] {
  const window = PRIOR_WINDOW_MONTHS + RECENT_WINDOW_MONTHS;
  const keys: string[] = [];
  for (let offset = window; offset >= 1; offset--) {
    keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - offset, 1)));
  }
  const perMonth = new Map<string, Map<string, number>>(keys.map((k) => [k, new Map()]));
  const totals = new Map<string, number>(keys.map((k) => [k, 0]));

  for (const t of transactions) {
    if (t.type !== 'expense' || isGoalFunding(t.category)) continue;
    const d = new Date(t.date);
    if (isNaN(d.getTime())) continue;
    const k = monthKey(d);
    const monthMap = perMonth.get(k);
    if (!monthMap) continue;
    const cat = t.category ?? 'other-expense';
    const amount = Math.abs(t.amountBase);
    monthMap.set(cat, (monthMap.get(cat) ?? 0) + amount);
    totals.set(k, (totals.get(k) ?? 0) + amount);
  }

  const priorKeys = keys.slice(0, PRIOR_WINDOW_MONTHS);
  const recentKeys = keys.slice(PRIOR_WINDOW_MONTHS);
  const priorActive = priorKeys.filter((k) => (totals.get(k) ?? 0) > 0);
  const recentActive = recentKeys.filter((k) => (totals.get(k) ?? 0) > 0);
  // Both recent months and a real prior history must exist, or the
  // "change" is just thin data.
  if (recentActive.length < RECENT_WINDOW_MONTHS || priorActive.length < 3) return [];

  const out: LifeEventCandidate[] = [];
  const latestKey = recentKeys[recentKeys.length - 1];

  const categories = new Set<string>();
  for (const k of keys) for (const cat of perMonth.get(k)!.keys()) categories.add(cat);

  for (const cat of categories) {
    const recentAmounts = recentKeys.map((k) => perMonth.get(k)!.get(cat) ?? 0);
    const recentShares = recentKeys.map((k, i) => recentAmounts[i] / Math.max(totals.get(k) ?? 0, 1e-9));
    const priorAmounts = priorActive.map((k) => perMonth.get(k)!.get(cat) ?? 0);
    const priorShares = priorActive.map((k) => (perMonth.get(k)!.get(cat) ?? 0) / Math.max(totals.get(k) ?? 0, 1e-9));
    const recentAvg = recentAmounts.reduce((a, b) => a + b, 0) / recentAmounts.length;
    const priorAvg = priorAmounts.reduce((a, b) => a + b, 0) / Math.max(priorAmounts.length, 1);

    if (cat === 'housing') {
      if (priorAvg > 0 && recentAvg >= priorAvg * HOUSING_JUMP_FACTOR) {
        out.push({
          kind: 'housing_jump',
          categoryId: cat,
          key: `housing_jump:${latestKey}`,
          evidence: {
            recentMonthlyAvg: Math.round(recentAvg * 100) / 100,
            priorMonthlyAvg: Math.round(priorAvg * 100) / 100,
          },
        });
      }
      continue;
    }

    const sustainedNow = recentShares.every((s) => s >= NEW_CATEGORY_MIN_SHARE);
    const absentBefore = priorShares.every((s) => s < NEW_CATEGORY_PRIOR_MAX_SHARE);
    if (sustainedNow && absentBefore) {
      out.push({
        kind: 'new_category',
        categoryId: cat,
        key: `new_category:${cat}:${latestKey}`,
        evidence: {
          recentMonthlyAvg: Math.round(recentAvg * 100) / 100,
          priorMonthlyAvg: Math.round(priorAvg * 100) / 100,
          recentSharePct: Math.round(Math.min(...recentShares) * 100),
        },
      });
    }
  }

  return out.sort((a, b) => b.evidence.recentMonthlyAvg - a.evidence.recentMonthlyAvg);
}

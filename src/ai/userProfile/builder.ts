/**
 * buildUserProfile
 * ================
 * Merges live financial context with persistent semantic state into a
 * single UserProfile. Pure function: same inputs → same output, no
 * side effects, no I/O. Caller is responsible for loading the
 * semantic state via the memory service.
 */

import type { UserFinancialContext } from '../types';
import type { UserSemanticState } from '../memory/types';
import type { UserProfile } from './types';

export function buildUserProfile(
  context: UserFinancialContext,
  memory: Partial<UserSemanticState>,
): UserProfile {
  // Pick the dominant category over the last 90 days. We use the
  // already-computed top categories list from context — this is a
  // proxy for "this person's main spending area right now". Falls
  // back to null when there's not enough data.
  const topCategoryThisQuarter = context.topSpendingCategories[0] ?? null;

  return {
    segment: context.userType,
    preferredLanguage: memory.preferences?.preferredLanguage ?? context.language,
    preferredCurrency: context.currency,

    financialHealthBand: memory.financialHealthBand ?? null,
    riskProfile: memory.riskProfile ?? null,
    incomeStabilityScore: memory.incomeStabilityScore ?? null,
    preferences: memory.preferences ?? {},
    behaviorSignals: memory.behaviorSignals ?? {},
    engagementSignals: memory.engagementSignals ?? {},

    posture: {
      savingsRate: context.savingsRate,
      netBalance: context.netBalance,
      topCategoryThisQuarter,
      activeGoalCount: context.goals.length,
      hasActiveBudget: !!context.budget,
    },
  };
}

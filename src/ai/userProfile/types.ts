/**
 * UserProfile types
 * =================
 * The "user profile" the AI sees every turn. It is a *derived view*
 * over multiple sources, not its own table:
 *
 *   - Onboarding data       (segment, language, currency)
 *   - UserSemanticState     (risk profile, preferences, behavior signals,
 *                            engagement signals, financial health band)
 *   - Live financial context (savings rate, spending posture, top
 *                            categories — derived, not stored)
 *
 * Treat this as the contract between the data layer and the prompt
 * layer. Field design beyond what is here is intentionally deferred —
 * we will add structured fields (goals-of-record, life events, AI
 * notes, etc.) in a follow-up. New fields should be optional so this
 * type stays render-safe even when state is partial.
 */

import type {
  RiskProfile,
  BehaviorSignals,
  UserPreferences,
  EngagementSignals,
} from '../memory/types';

export type UserSegment = 'individual' | 'self_employed' | 'sme';

export interface UserProfile {
  // ── Identity & locale ────────────────────────────────────────────
  segment: UserSegment;
  preferredLanguage: 'ar' | 'en';
  preferredCurrency: string;

  // ── Persistent semantic state (Supabase) ─────────────────────────
  // Each may be null when the user is new or the agent never wrote it.
  financialHealthBand: 'critical' | 'watch' | 'stable' | null;
  riskProfile: RiskProfile | null;
  incomeStabilityScore: number | null;
  preferences: UserPreferences;
  behaviorSignals: BehaviorSignals;
  engagementSignals: EngagementSignals;

  // ── Live financial posture (derived per-turn) ────────────────────
  // Snapshot computed from the same UserFinancialContext the chat
  // agent uses. We keep this thin — the slice builders already render
  // the heavy stuff. Only signals worth surfacing as "who this user is"
  // (vs "what did they spend") belong here.
  posture: {
    savingsRate: number;          // 0..1, may be negative
    netBalance: number;           // signed, in preferredCurrency
    topCategoryThisQuarter: string | null;
    activeGoalCount: number;
    hasActiveBudget: boolean;
  };
}

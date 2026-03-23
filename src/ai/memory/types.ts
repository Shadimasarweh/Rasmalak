/**
 * Structured Memory Types
 * =======================
 * Persistent user state stored in Supabase.
 * Replaces chat-history-based memory with versioned, selective fields.
 */

export interface RiskProfile {
  tolerance: 'conservative' | 'moderate' | 'aggressive';
  assessedAt: string;
  confidence: number;
}

export interface BehaviorSignals {
  avgSessionFrequency?: number;
  primaryGoalType?: string;
  spendingPatternStability?: number;
  lastSignificantChange?: string;
}

export interface UserPreferences {
  preferredLanguage?: 'ar' | 'en';
  preferredDialect?: string;
  notificationFrequency?: 'daily' | 'weekly' | 'none';
  focusAreas?: string[];
}

export interface CorrectionEntry {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  correctedAt: string;
  source: string;
}

export interface EngagementSignals {
  totalInteractions?: number;
  lastInteractionAt?: string;
  topIntents?: string[];
  insightDismissRate?: number;
}

export interface UserSemanticState {
  id: string;
  userId: string;
  version: number;
  financialHealthBand: 'critical' | 'watch' | 'stable' | null;
  riskProfile: RiskProfile | null;
  incomeStabilityScore: number | null;
  behaviorSignals: BehaviorSignals;
  preferences: UserPreferences;
  correctionHistory: CorrectionEntry[];
  engagementSignals: EngagementSignals;
  updatedAt: string;
  createdAt: string;
}

export type WritableMemoryField = keyof Omit<
  UserSemanticState,
  'id' | 'userId' | 'version' | 'createdAt'
>;

export function createEmptySemanticState(userId: string): UserSemanticState {
  const now = new Date().toISOString();
  return {
    id: '',
    userId,
    version: 1,
    financialHealthBand: null,
    riskProfile: null,
    incomeStabilityScore: null,
    behaviorSignals: {},
    preferences: {},
    correctionHistory: [],
    engagementSignals: {},
    updatedAt: now,
    createdAt: now,
  };
}

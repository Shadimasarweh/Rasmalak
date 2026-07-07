/**
 * Deterministic Computation Registry
 * ===================================
 * Formalizes all pure-math computation layers.
 * The orchestrator calls this BEFORE the LLM so model reasoning
 * is grounded in deterministic values it cannot override.
 *
 * Re-exports existing modules and adds a unified computation entry point.
 */

export {
  computeFinancialSignals,
  type FinancialSignals,
  type SignalSummary,
} from '../financialSignals';

export {
  computeFinancialHealth,
  type FinancialHealthResult,
  type FinancialHealthBand,
} from '../financialHealth';

export {
  deriveAdvisoryState,
  type FinancialAdvisoryState,
} from '../financialAdvisory';

// ============================================================
// Predictive engine (Phase 1) — pure statistical layer
// ============================================================

export { PREDICTIVE_ENGINE_VERSION, isGoalFunding, type EngineTransaction } from './engineTypes';
export {
  detectRecurringSeries,
  collectSeriesMemberIds,
  normalizeMerchant,
  type RecurringSeries,
  type Cadence,
} from './recurringSeries';
export { deriveSalaryProfile, type SalaryProfile, type ProfileFallback } from './salaryProfile';
export {
  computeCategoryBaselines,
  detectCategoryDeviations,
  type CategoryBaseline,
  type CategoryDeviation,
} from './categoryBaselines';
export {
  computeCashflowForecast,
  type CashflowForecast,
  type CommittedItem,
  type ForecastDay,
} from './cashflowForecast';
export {
  computeBehaviorSignals,
  deriveArchetype,
  type ComputedBehaviorSignals,
  type Archetype,
  type ArchetypeResult,
  type ArchetypeEvidence,
} from './behaviorProfile';
export { computeSafeToSpend, sumGoalFundingInCycle, type SafeToSpendResult } from './safeToSpend';
export {
  computePredictiveState,
  summarizeForContext,
  type PredictiveState,
  type PredictiveInputs,
  type PredictiveContextSummary,
} from './predictiveState';

export interface ProjectionResult {
  projectedEndOfMonthBalance: number;
  dailySpendRate: number;
  daysRemaining: number;
  onTrackForBudget: boolean | null;
}

export interface DeterministicOutputs {
  financialHealth: import('../financialHealth').FinancialHealthResult;
  signals: import('../financialSignals').FinancialSignals;
  advisory: import('../financialAdvisory').FinancialAdvisoryState;
  projections: ProjectionResult | null;
}

export function computeProjections(
  netBalance: number,
  currentMonthExpenses: number,
  daysElapsed: number,
  daysRemaining: number,
  monthlyBudget: number | undefined,
): ProjectionResult | null {
  if (daysElapsed === 0) return null;

  const dailySpendRate = currentMonthExpenses / daysElapsed;
  const projectedRemainingExpenses = dailySpendRate * daysRemaining;
  const projectedEndOfMonthBalance = netBalance - projectedRemainingExpenses;

  let onTrackForBudget: boolean | null = null;
  if (monthlyBudget && monthlyBudget > 0) {
    const projectedTotalSpend = currentMonthExpenses + projectedRemainingExpenses;
    onTrackForBudget = projectedTotalSpend <= monthlyBudget;
  }

  return {
    projectedEndOfMonthBalance,
    dailySpendRate,
    daysRemaining,
    onTrackForBudget,
  };
}

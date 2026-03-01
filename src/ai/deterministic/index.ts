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

/**
 * Rasmalak – Financial Advisory State
 * ====================================
 * Converts raw deterministic signals into structured advisory flags
 * that guide LLM reasoning with system-defined interpretations.
 *
 * Pure TypeScript.  No external dependencies.  No side-effects.
 */

import type { FinancialSignals } from './financialSignals';

// ============================================
// PUBLIC INTERFACE
// ============================================

export interface FinancialAdvisoryState {
  financialPressureLevel?: 'low' | 'moderate' | 'high';
  volatilityRisk?: boolean;
  expenseTrendRisk?: 'stable' | 'increasing';
  goalRiskLevel?: 'on_track' | 'behind' | 'critical';
}

// ============================================
// DERIVATION
// ============================================

export function deriveAdvisoryState(
  signals: FinancialSignals,
): FinancialAdvisoryState {
  const state: FinancialAdvisoryState = {};

  // 1) financialPressureLevel — based on savingsRate
  if (signals.savingsRate != null) {
    if (signals.savingsRate < 0.1) {
      state.financialPressureLevel = 'high';
    } else if (signals.savingsRate <= 0.25) {
      state.financialPressureLevel = 'moderate';
    } else {
      state.financialPressureLevel = 'low';
    }
  }

  // 2) volatilityRisk — based on expenseVolatility
  if (signals.expenseVolatility != null) {
    state.volatilityRisk = signals.expenseVolatility > 0.2;
  }

  // 3) expenseTrendRisk — based on negativeTrendDetected
  if (signals.negativeTrendDetected != null) {
    state.expenseTrendRisk = signals.negativeTrendDetected
      ? 'increasing'
      : 'stable';
  }

  // 4) goalRiskLevel — based on goalFundingProgress
  if (signals.goalFundingProgress != null) {
    if (signals.goalFundingProgress < 0.3) {
      state.goalRiskLevel = 'critical';
    } else if (signals.goalFundingProgress <= 0.7) {
      state.goalRiskLevel = 'behind';
    } else {
      state.goalRiskLevel = 'on_track';
    }
  }

  return state;
}

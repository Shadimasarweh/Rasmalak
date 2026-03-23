/**
 * Rasmalak – Financial Health Score
 * ==================================
 * Derives a single 0–100 health score from FinancialSignals via a
 * weighted-average of normalised components.  Missing signals are
 * excluded and weights are re-distributed proportionally.
 *
 * Pure TypeScript.  No external dependencies.  No side-effects.
 */

import type { FinancialSignals } from './financialSignals';

// ============================================
// PUBLIC TYPES
// ============================================

export type FinancialHealthBand = 'critical' | 'watch' | 'stable';

export interface FinancialHealthResult {
  /** Integer 0–100. */
  score: number;
  band: FinancialHealthBand;
  /** Normalised component values (0–1, higher is better). */
  components: {
    savingsRate?: number;
    incomeStability?: number;
    expenseVolatility?: number;
    recurringExpenseRatio?: number;
    goalFundingProgress?: number;
  };
  /** Fixed base weights (always emitted for transparency). */
  weights: {
    savingsRate: number;
    incomeStability: number;
    expenseVolatility: number;
    recurringExpenseRatio: number;
    goalFundingProgress: number;
  };
}

// ============================================
// HELPERS
// ============================================

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function safeRound(n: number): number {
  return Math.round(Number.isFinite(n) ? n : 0);
}

/**
 * Given an array of { key, baseWeight } entries, re-normalise so the
 * weights of *present* entries sum to 1.
 */
function reweight<K extends string>(
  entries: { key: K; baseWeight: number }[],
): Map<K, number> {
  const total = entries.reduce((s, e) => s + e.baseWeight, 0);
  const map = new Map<K, number>();
  if (total <= 0) return map;
  for (const e of entries) {
    map.set(e.key, e.baseWeight / total);
  }
  return map;
}

// ============================================
// BASE WEIGHTS
// ============================================

const BASE_WEIGHTS = {
  savingsRate:          0.35,
  incomeStability:      0.20,
  expenseVolatility:    0.15,
  recurringExpenseRatio: 0.10,
  goalFundingProgress:  0.20,
} as const;

type ComponentKey = keyof typeof BASE_WEIGHTS;

// ============================================
// MAIN COMPUTATION
// ============================================

export function computeFinancialHealth(
  signals: FinancialSignals,
): FinancialHealthResult {
  // 1) Normalise available components to 0..1 (higher = better)
  const raw: { key: ComponentKey; norm: number }[] = [];

  if (signals.savingsRate != null) {
    raw.push({ key: 'savingsRate', norm: clamp01(signals.savingsRate) });
  }

  if (signals.incomeStability != null) {
    raw.push({ key: 'incomeStability', norm: clamp01(signals.incomeStability) });
  }

  if (signals.expenseVolatility != null) {
    // Invert: volatility 0 → 1 (best), ≥0.35 → 0 (worst)
    raw.push({
      key: 'expenseVolatility',
      norm: 1 - clamp01(signals.expenseVolatility / 0.35),
    });
  }

  if (signals.recurringExpenseRatio != null) {
    // Invert: ratio 0 → 1 (best), ≥0.85 → 0 (worst)
    raw.push({
      key: 'recurringExpenseRatio',
      norm: 1 - clamp01(signals.recurringExpenseRatio / 0.85),
    });
  }

  if (signals.goalFundingProgress != null) {
    raw.push({ key: 'goalFundingProgress', norm: clamp01(signals.goalFundingProgress) });
  }

  // 2) Re-normalise weights across available components
  const adjusted = reweight(
    raw.map((r) => ({ key: r.key, baseWeight: BASE_WEIGHTS[r.key] })),
  );

  // 3) Weighted sum → score (0–100)
  let weighted = 0;
  for (const r of raw) {
    weighted += (adjusted.get(r.key) ?? 0) * r.norm;
  }
  const score = Math.max(0, Math.min(100, safeRound(weighted * 100)));

  // 4) Band
  let band: FinancialHealthBand;
  if (score < 40) {
    band = 'critical';
  } else if (score < 70) {
    band = 'watch';
  } else {
    band = 'stable';
  }

  // 5) Assemble result
  const components: FinancialHealthResult['components'] = {};
  for (const r of raw) {
    components[r.key] = r.norm;
  }

  return {
    score,
    band,
    components,
    weights: { ...BASE_WEIGHTS },
  };
}

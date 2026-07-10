/**
 * Peer benchmark placement — Phase 3, item 12 (client half).
 *
 * The database hands back three anonymized cohort percentiles
 * (savings rate, k-anonymous, ratio-only — see migration 016); this
 * module places the user's own rate on that curve. Piecewise-linear
 * interpolation between the known points is as much precision as three
 * percentiles honestly support — hence the ~ in the UI copy.
 */

import { EngineTransaction, isGoalFunding } from './engineTypes';
import { utcNoon } from './hijri';

export interface PeerStats {
  cohortSize: number;
  p25: number;
  p50: number;
  p75: number;
}

export type PeerPlacement =
  | 'top_quartile'
  | 'above_median'
  | 'below_median'
  | 'bottom_quartile';

export const SAVINGS_WINDOW_DAYS = 90;

/** The user's own trailing-90d savings rate, same definition as the
 * cohort SQL: 1 − consumption/income, goal transfers count as saved,
 * clamped to [-1, 1]. Null without income in the window. */
export function ownSavingsRate(
  transactions: EngineTransaction[],
  now: Date = new Date(),
): number | null {
  const cutoff = utcNoon(now).getTime() - SAVINGS_WINDOW_DAYS * 86_400_000;
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    const at = utcNoon(new Date(t.date)).getTime();
    if (!Number.isFinite(at) || at < cutoff) continue;
    if (t.type === 'income') income += Math.abs(t.amountBase);
    else if (!isGoalFunding(t.category)) expense += Math.abs(t.amountBase);
  }
  if (income <= 0) return null;
  const rate = 1 - expense / income;
  return Math.max(-1, Math.min(1, Math.round(rate * 10000) / 10000));
}

/** Approximate percentile (0-100) of `rate` on the cohort curve. */
export function approximatePercentile(rate: number, stats: PeerStats): number {
  const { p25, p50, p75 } = stats;
  let pct: number;
  if (rate <= p25) {
    // Below the known curve: scale within [-1, p25].
    pct = p25 <= -1 ? 25 : (25 * (rate + 1)) / (p25 + 1);
  } else if (rate <= p50) {
    pct = 25 + (25 * (rate - p25)) / Math.max(p50 - p25, 1e-9);
  } else if (rate <= p75) {
    pct = 50 + (25 * (rate - p50)) / Math.max(p75 - p50, 1e-9);
  } else {
    pct = p75 >= 1 ? 75 : 75 + (25 * (rate - p75)) / (1 - p75);
  }
  return Math.max(1, Math.min(99, Math.round(pct)));
}

export function placement(percentile: number): PeerPlacement {
  if (percentile >= 75) return 'top_quartile';
  if (percentile >= 50) return 'above_median';
  if (percentile >= 25) return 'below_median';
  return 'bottom_quartile';
}

/**
 * Per-category robust baselines + pace-adjusted anomaly detection —
 * predictive engine Phase 1, item 3.
 *
 * Replaces the old "compare a partial current month against last month only"
 * logic (n=1 baseline) with median + MAD over up to 12 completed months and
 * a ≥3-months eligibility gate.
 *
 * Callers pass the recurring-series member ids so committed bills are
 * excluded from BOTH the baselines and the current-cycle spend: rent clearing
 * on day 2 must not explode the discretionary run rate — the committed side
 * belongs to the cash-flow forecast.
 */

import { median, mad, effectiveMad } from './stats';
import { isoToDayNumber, dateToDayNumber, monthKeyOf } from './dates';
import { isGoalFunding, type EngineTransaction, type CycleRange } from './engineTypes';

export interface CategoryBaseline {
  categoryId: string;
  windowMonths: number; // window actually requested
  monthsWithData: number; // active months where this category had spend > 0
  // Median/MAD over the months WITH data ("what a spending month looks
  // like") — over all-months-including-zeros a seasonal category would have
  // median 0 and every purchase would flag as an extreme outlier.
  monthlyMedian: number;
  monthlyMad: number;
  // Every included (active) month, oldest first, zeros preserved — full
  // transparency for the explainer UI and the persisted row.
  monthlyValues: Array<{ month: string; value: number }>;
  eligible: boolean; // monthsWithData >= 3
}

export interface CategoryDeviation {
  categoryId: string;
  currentSpend: number; // cycle-to-date, series members excluded
  paceAdjustedSpend: number; // currentSpend × totalDays / daysElapsed
  monthlyMedian: number;
  deviationMadUnits: number;
  deviationPct: number;
  severity: 'none' | 'medium' | 'high';
}

export const DEFAULT_BASELINE_WINDOW_MONTHS = 12;
export const MIN_BASELINE_MONTHS = 3;
export const DEVIATION_K_MEDIUM = 3;
export const DEVIATION_K_HIGH = 5;
// Pace-adjusting 2 days of spending to a full month is noise — hold alerts
// early in the cycle unless the RAW spend already breaches the threshold.
export const PACE_SUPPRESSION_DAYS = 5;

export interface BaselineOptions {
  now?: Date;
  windowMonths?: number;
  excludeTransactionIds?: ReadonlySet<string>;
}

export function computeCategoryBaselines(
  txns: EngineTransaction[],
  opts: BaselineOptions = {},
): CategoryBaseline[] {
  const now = opts.now ?? new Date();
  const windowMonths = Math.max(MIN_BASELINE_MONTHS, opts.windowMonths ?? DEFAULT_BASELINE_WINDOW_MONTHS);
  const exclude = opts.excludeTransactionIds;

  // Completed months only, newest first: offset 1..windowMonths.
  const monthKeys: string[] = [];
  for (let offset = 1; offset <= windowMonths; offset++) {
    const ref = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    monthKeys.push(`${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`);
  }
  const monthSet = new Set(monthKeys);

  // Absent vs zero: a month with no transactions AT ALL is a gap month (the
  // user was not logging) and is excluded; an active month with no spend in
  // a category is a true zero and stays.
  const activeMonths = new Set<string>();
  const perCategory = new Map<string, Map<string, number>>();

  for (const tx of txns) {
    if (!Number.isFinite(tx.amountBase)) continue;
    const key = monthKeyOf(tx.date);
    if (!monthSet.has(key)) continue;
    activeMonths.add(key);
    if (tx.type !== 'expense') continue;
    if (isGoalFunding(tx.category)) continue;
    if (exclude?.has(tx.id)) continue;
    const cat = tx.category ?? 'other-expense';
    const catMap = perCategory.get(cat) ?? new Map<string, number>();
    catMap.set(key, (catMap.get(key) ?? 0) + Math.abs(tx.amountBase));
    perCategory.set(cat, catMap);
  }

  const includedMonthsOldestFirst = [...monthKeys].reverse().filter((k) => activeMonths.has(k));

  const baselines: CategoryBaseline[] = [];
  for (const [categoryId, catMap] of perCategory.entries()) {
    const monthlyValues = includedMonthsOldestFirst.map((month) => ({
      month,
      value: Math.round((catMap.get(month) ?? 0) * 100) / 100,
    }));
    const spendingMonths = monthlyValues.filter((m) => m.value > 0).map((m) => m.value);
    const monthsWithData = spendingMonths.length;
    const med = median(spendingMonths);
    baselines.push({
      categoryId,
      windowMonths,
      monthsWithData,
      monthlyMedian: Math.round(med * 100) / 100,
      monthlyMad: Math.round(mad(spendingMonths, med) * 100) / 100,
      monthlyValues,
      eligible: monthsWithData >= MIN_BASELINE_MONTHS,
    });
  }

  baselines.sort((a, b) => b.monthlyMedian - a.monthlyMedian);
  return baselines;
}

export function detectCategoryDeviations(
  baselines: CategoryBaseline[],
  cycleTxns: EngineTransaction[],
  cycle: CycleRange,
  seriesMemberIds: ReadonlySet<string>,
): CategoryDeviation[] {
  const daysElapsed = Math.max(1, cycle.daysElapsed);
  const startDay = dateToDayNumber(cycle.start);
  const endDay = dateToDayNumber(cycle.end);

  const currentByCategory = new Map<string, number>();
  for (const tx of cycleTxns) {
    if (tx.type !== 'expense') continue;
    if (!Number.isFinite(tx.amountBase)) continue;
    if (isGoalFunding(tx.category)) continue;
    if (seriesMemberIds.has(tx.id)) continue;
    const day = isoToDayNumber(tx.date);
    if (day < startDay || day > endDay) continue;
    const cat = tx.category ?? 'other-expense';
    currentByCategory.set(cat, (currentByCategory.get(cat) ?? 0) + Math.abs(tx.amountBase));
  }

  const deviations: CategoryDeviation[] = [];
  for (const baseline of baselines) {
    if (!baseline.eligible || baseline.monthlyMedian <= 0) continue;
    const currentSpend = currentByCategory.get(baseline.categoryId) ?? 0;
    if (currentSpend <= 0) continue;

    const paceAdjustedSpend = (currentSpend * cycle.totalDays) / daysElapsed;
    const madUnit = effectiveMad(baseline.monthlyMad, baseline.monthlyMedian);
    const rawBreach = currentSpend > baseline.monthlyMedian + DEVIATION_K_MEDIUM * madUnit;
    if (cycle.daysElapsed < PACE_SUPPRESSION_DAYS && !rawBreach) continue;

    const deviationMadUnits = (paceAdjustedSpend - baseline.monthlyMedian) / madUnit;
    const severity: CategoryDeviation['severity'] =
      deviationMadUnits >= DEVIATION_K_HIGH ? 'high' : deviationMadUnits >= DEVIATION_K_MEDIUM ? 'medium' : 'none';

    deviations.push({
      categoryId: baseline.categoryId,
      currentSpend: Math.round(currentSpend * 100) / 100,
      paceAdjustedSpend: Math.round(paceAdjustedSpend * 100) / 100,
      monthlyMedian: baseline.monthlyMedian,
      deviationMadUnits: Math.round(deviationMadUnits * 100) / 100,
      deviationPct: Math.round(((paceAdjustedSpend - baseline.monthlyMedian) / baseline.monthlyMedian) * 100),
      severity,
    });
  }

  deviations.sort((a, b) => b.deviationMadUnits - a.deviationMadUnits);
  return deviations;
}

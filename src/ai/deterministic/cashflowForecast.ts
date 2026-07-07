/**
 * Committed-vs-discretionary cash-flow forecast — predictive engine
 * Phase 1, item 2. Replaces the linear run-rate projection.
 *
 * Committed items (rent, salary, subscriptions) are projected exactly on
 * their predicted due dates from the recurring series. Discretionary spend
 * is projected from quantiles of trailing WEEKLY totals (raw daily medians
 * are zero-inflated: anyone spending on fewer than half of days would get
 * a median of 0), shaped by a day-of-cycle weight curve that captures the
 * MENA payday effect (heavy days 1–7).
 *
 * Output is a RANGE (P25/P50/P75), never a point.
 */

import { getCycleRange } from '@/lib/cycles';
import { quantile } from './stats';
import { dateToDayNumber, isoAddDays, isoAddMonthsClamped, isoToDayNumber } from './dates';
import { isGoalFunding, type CycleRange, type EngineTransaction } from './engineTypes';
import { CADENCE_BANDS, collectSeriesMemberIds, type RecurringSeries } from './recurringSeries';

export interface CommittedItem {
  seriesKey: string;
  label: string;
  categoryId: string;
  dueDate: string;
  amount: number;
  direction: 'income' | 'expense';
}

export type CyclePhase = 'days_1_7' | 'days_8_15' | 'days_16_23' | 'days_24_end';

export interface PhaseWeight {
  phase: CyclePhase;
  weight: number;
}

export interface ForecastDay {
  date: string;
  committedOut: number;
  committedIn: number;
  balanceP25: number;
  balanceP50: number;
  balanceP75: number;
}

export interface CashflowForecast {
  cycle: { start: string; end: string; daysRemaining: number; anchor: 'payday' | 'calendar' };
  currentBalance: number;
  committed: { totalRemaining: number; items: CommittedItem[] };
  expectedIncome: { totalRemaining: number; items: CommittedItem[] };
  discretionary: {
    dailyRateP25: number;
    dailyRateP50: number;
    dailyRateP75: number;
    remainingP25: number;
    remainingP50: number;
    remainingP75: number;
    weightCurve: PhaseWeight[];
  };
  // INVARIANT (explainer + tests): p25 pairs with P75 spending and vice versa.
  endOfCycleBalance: { p25: number; p50: number; p75: number };
  perDay: ForecastDay[]; // today .. cycle end, for charting
  basis: { daysOfHistory: number; weeksUsed: number; confidence: 'low' | 'medium' | 'high' };
}

export interface ForecastInput {
  transactions: EngineTransaction[];
  series: RecurringSeries[];
  cycle: CycleRange;
  // Clamped payday anchor for reconstructing HISTORICAL cycles in the weight
  // curve. null → calendar months.
  anchorDay: number | null;
  currentBalance: number;
  now?: Date;
}

export const DISCRETIONARY_HISTORY_WEEKS = 12;
export const MIN_WEEKS_FOR_QUANTILES = 4;
export const FALLBACK_BAND_SPREAD = 0.4;
export const WEIGHT_CLAMP: [number, number] = [0.5, 2];
export const MIN_PHASE_OBSERVED_DAYS = 7;

export function computeCashflowForecast(input: ForecastInput): CashflowForecast {
  const now = input.now ?? new Date();
  const nowDay = dateToDayNumber(now);
  const cycleStartDay = dateToDayNumber(input.cycle.start);
  const cycleEndDay = dateToDayNumber(input.cycle.end);

  const seriesMemberIds = collectSeriesMemberIds(input.series);
  const valid = input.transactions.filter((tx) => Number.isFinite(isoToDayNumber(tx.date)) && Number.isFinite(tx.amountBase));
  const firstDay = valid.length > 0 ? Math.min(...valid.map((t) => isoToDayNumber(t.date))) : nowDay;

  // ---- 1. committed occurrences in (today, cycle.end] ----
  // Projection starts strictly after each series' last REAL payment, so an
  // occurrence already paid this cycle is never double-counted.
  const committedItems: CommittedItem[] = [];
  const incomeItems: CommittedItem[] = [];
  for (const s of input.series) {
    if (!s.active) continue;
    const band = CADENCE_BANDS.find((b) => b.cadence === s.cadence)!;
    let due = s.lastDate;
    for (let guard = 0; guard < 24; guard++) {
      due = band.stepMonths != null
        ? isoAddMonthsClamped(due, band.stepMonths, s.anchorDayOfMonth ?? undefined)
        : isoAddDays(due, Math.max(1, Math.round(s.medianIntervalDays || band.min)));
      const dueDay = isoToDayNumber(due);
      if (dueDay > cycleEndDay) break;
      if (dueDay <= nowDay) continue;
      const item: CommittedItem = {
        seriesKey: s.key,
        label: s.merchantLabel,
        categoryId: s.categoryId,
        dueDate: due,
        amount: s.amountMedian,
        direction: s.direction,
      };
      (s.direction === 'expense' ? committedItems : incomeItems).push(item);
    }
  }
  committedItems.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  incomeItems.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const committedTotal = round2(committedItems.reduce((s, i) => s + i.amount, 0));
  const incomeTotal = round2(incomeItems.reduce((s, i) => s + i.amount, 0));

  // ---- 2. discretionary daily-rate quantiles from weekly totals ----
  const isDiscretionary = (tx: EngineTransaction): boolean =>
    tx.type === 'expense' && !isGoalFunding(tx.category) && !seriesMemberIds.has(tx.id);

  const weeklyTotals: number[] = [];
  for (let w = 0; w < DISCRETIONARY_HISTORY_WEEKS; w++) {
    const bucketEnd = nowDay - 7 * w;
    const bucketStart = bucketEnd - 6;
    if (bucketStart < firstDay) break; // partial weeks before logging began are gaps, not zeros
    let total = 0;
    for (const tx of valid) {
      if (!isDiscretionary(tx)) continue;
      const d = isoToDayNumber(tx.date);
      if (d >= bucketStart && d <= bucketEnd) total += Math.abs(tx.amountBase);
    }
    weeklyTotals.push(total);
  }

  const weeksUsed = weeklyTotals.length;
  let dailyRateP25: number;
  let dailyRateP50: number;
  let dailyRateP75: number;
  let confidence: CashflowForecast['basis']['confidence'];
  if (weeksUsed >= MIN_WEEKS_FOR_QUANTILES) {
    dailyRateP25 = quantile(weeklyTotals, 0.25) / 7;
    dailyRateP50 = quantile(weeklyTotals, 0.5) / 7;
    dailyRateP75 = quantile(weeklyTotals, 0.75) / 7;
    confidence = weeksUsed >= 10 ? 'high' : 'medium';
  } else {
    // Sparse history: 28-day mean with a wide declared band.
    let recent = 0;
    for (const tx of valid) {
      if (!isDiscretionary(tx)) continue;
      const d = isoToDayNumber(tx.date);
      if (d > nowDay - 28 && d <= nowDay) recent += Math.abs(tx.amountBase);
    }
    dailyRateP50 = recent / 28;
    dailyRateP25 = dailyRateP50 * (1 - FALLBACK_BAND_SPREAD);
    dailyRateP75 = dailyRateP50 * (1 + FALLBACK_BAND_SPREAD);
    confidence = 'low';
  }

  // ---- 3. day-of-cycle weight curve from historical cycles ----
  const weightCurve = computeWeightCurve(valid, isDiscretionary, input.cycle, input.anchorDay, now);
  const phaseOf = (dayOfCycle: number): CyclePhase =>
    dayOfCycle <= 7 ? 'days_1_7' : dayOfCycle <= 15 ? 'days_8_15' : dayOfCycle <= 23 ? 'days_16_23' : 'days_24_end';
  const weightByPhase = new Map(weightCurve.map((w) => [w.phase, w.weight]));
  // Normalize so the average weight across THIS cycle's days is exactly 1 —
  // the quantile rates already carry the overall level.
  let weightSum = 0;
  for (let d = 1; d <= input.cycle.totalDays; d++) weightSum += weightByPhase.get(phaseOf(d)) ?? 1;
  const normFactor = weightSum > 0 ? input.cycle.totalDays / weightSum : 1;
  const weightOf = (dayOfCycle: number): number => (weightByPhase.get(phaseOf(dayOfCycle)) ?? 1) * normFactor;

  // ---- 4 + 5. remaining discretionary and the per-day balance paths ----
  const committedOutByDay = new Map<number, number>();
  const committedInByDay = new Map<number, number>();
  for (const item of committedItems) {
    const d = isoToDayNumber(item.dueDate);
    committedOutByDay.set(d, (committedOutByDay.get(d) ?? 0) + item.amount);
  }
  for (const item of incomeItems) {
    const d = isoToDayNumber(item.dueDate);
    committedInByDay.set(d, (committedInByDay.get(d) ?? 0) + item.amount);
  }

  let remainingP25 = 0;
  let remainingP50 = 0;
  let remainingP75 = 0;
  const perDay: ForecastDay[] = [];
  let balP25 = input.currentBalance;
  let balP50 = input.currentBalance;
  let balP75 = input.currentBalance;
  const todayIso = isoFromDayNumber(nowDay);
  perDay.push({
    date: todayIso,
    committedOut: 0,
    committedIn: 0,
    balanceP25: round2(balP25),
    balanceP50: round2(balP50),
    balanceP75: round2(balP75),
  });

  for (let day = nowDay + 1; day <= cycleEndDay; day++) {
    const dayOfCycle = day - cycleStartDay + 1;
    const w = weightOf(dayOfCycle);
    const spendP25 = dailyRateP25 * w;
    const spendP50 = dailyRateP50 * w;
    const spendP75 = dailyRateP75 * w;
    remainingP25 += spendP25;
    remainingP50 += spendP50;
    remainingP75 += spendP75;

    const out = committedOutByDay.get(day) ?? 0;
    const inc = committedInByDay.get(day) ?? 0;
    // The optimistic balance path (P75) spends at the LOW rate and vice versa.
    balP75 += inc - out - spendP25;
    balP50 += inc - out - spendP50;
    balP25 += inc - out - spendP75;

    perDay.push({
      date: isoFromDayNumber(day),
      committedOut: round2(out),
      committedIn: round2(inc),
      balanceP25: round2(balP25),
      balanceP50: round2(balP50),
      balanceP75: round2(balP75),
    });
  }

  return {
    cycle: {
      start: isoFromDayNumber(cycleStartDay),
      end: isoFromDayNumber(cycleEndDay),
      daysRemaining: input.cycle.daysRemaining,
      anchor: input.cycle.mode === 'payday' ? 'payday' : 'calendar',
    },
    currentBalance: round2(input.currentBalance),
    committed: { totalRemaining: committedTotal, items: committedItems },
    expectedIncome: { totalRemaining: incomeTotal, items: incomeItems },
    discretionary: {
      dailyRateP25: round2(dailyRateP25),
      dailyRateP50: round2(dailyRateP50),
      dailyRateP75: round2(dailyRateP75),
      remainingP25: round2(remainingP25),
      remainingP50: round2(remainingP50),
      remainingP75: round2(remainingP75),
      weightCurve,
    },
    endOfCycleBalance: {
      p25: round2(input.currentBalance + incomeTotal - committedTotal - remainingP75),
      p50: round2(input.currentBalance + incomeTotal - committedTotal - remainingP50),
      p75: round2(input.currentBalance + incomeTotal - committedTotal - remainingP25),
    },
    perDay,
    basis: { daysOfHistory: Math.max(0, nowDay - firstDay), weeksUsed, confidence },
  };
}

function computeWeightCurve(
  txns: EngineTransaction[],
  isDiscretionary: (tx: EngineTransaction) => boolean,
  cycle: CycleRange,
  anchorDay: number | null,
  now: Date,
): PhaseWeight[] {
  const phases: CyclePhase[] = ['days_1_7', 'days_8_15', 'days_16_23', 'days_24_end'];
  const spend: Record<CyclePhase, number> = { days_1_7: 0, days_8_15: 0, days_16_23: 0, days_24_end: 0 };
  const days: Record<CyclePhase, number> = { days_1_7: 0, days_8_15: 0, days_16_23: 0, days_24_end: 0 };

  // Reconstruct up to 6 completed historical cycles with the same anchor.
  for (let offset = -1; offset >= -6; offset--) {
    const hist = getCycleRange({ mode: cycle.mode, anchorDay, offset, now });
    const startDay = dateToDayNumber(hist.start);
    const endDay = dateToDayNumber(hist.end);
    for (let d = startDay; d <= endDay; d++) {
      const dayOfCycle = d - startDay + 1;
      const phase: CyclePhase =
        dayOfCycle <= 7 ? 'days_1_7' : dayOfCycle <= 15 ? 'days_8_15' : dayOfCycle <= 23 ? 'days_16_23' : 'days_24_end';
      days[phase] += 1;
    }
    for (const tx of txns) {
      if (!isDiscretionary(tx)) continue;
      const d = isoToDayNumber(tx.date);
      if (d < startDay || d > endDay) continue;
      const dayOfCycle = d - startDay + 1;
      const phase: CyclePhase =
        dayOfCycle <= 7 ? 'days_1_7' : dayOfCycle <= 15 ? 'days_8_15' : dayOfCycle <= 23 ? 'days_16_23' : 'days_24_end';
      spend[phase] += Math.abs(tx.amountBase);
    }
  }

  const totalSpend = phases.reduce((s, p) => s + spend[p], 0);
  const totalDays = phases.reduce((s, p) => s + days[p], 0);
  const overallMean = totalDays > 0 ? totalSpend / totalDays : 0;

  return phases.map((phase) => {
    let weight = 1;
    if (overallMean > 0 && days[phase] >= MIN_PHASE_OBSERVED_DAYS) {
      const phaseMean = spend[phase] / days[phase];
      weight = Math.min(WEIGHT_CLAMP[1], Math.max(WEIGHT_CLAMP[0], phaseMean / overallMean));
    }
    return { phase, weight: Math.round(weight * 100) / 100 };
  });
}

function isoFromDayNumber(dayNumber: number): string {
  return new Date(dayNumber * 86_400_000).toISOString().slice(0, 10);
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

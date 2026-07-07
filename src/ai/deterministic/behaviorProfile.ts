/**
 * Behaviour signals + spending archetype — predictive engine Phase 2,
 * items 6–7 (the slice the "Rasmalak يعرفك" release needs).
 *
 * Everything here is rule-based and explainable: each archetype comes with
 * the exact data points that produced it (the B1 card never shows an
 * archetype without its evidence).
 */

import { getCycleRange, type CycleRange } from '@/lib/cycles';
import { median } from './stats';
import { isoToDayNumber, dateToDayNumber, monthKeyOf } from './dates';
import { isGoalFunding, type EngineTransaction } from './engineTypes';
import { collectSeriesMemberIds, type RecurringSeries } from './recurringSeries';
import type { SalaryProfile } from './salaryProfile';

export interface ComputedBehaviorSignals {
  // Where in the cycle the discretionary money goes. null below 2 cycles.
  spendTiming: {
    profile: 'front_loader' | 'smooth' | 'back_loader';
    thirdShares: [number, number, number];
    basisCycles: number;
  } | null;
  // Discretionary spend within 72h of income arrival ÷ total discretionary
  // (trailing 90 days). null when there is no income event or no spend.
  impulseIndex: number | null;
  smallTxnPerWeek: number | null;
  weekendWeekdayRatio: number | null;
  // Consecutive most-recent completed months with spend ≤ budget × 1.02.
  budgetAdherenceStreak: number | null;
  categoryDrift: Array<{ categoryId: string; direction: 'up' | 'down'; sharePctPointChange: number }>;
  basis: { daysOfHistory: number; cycles: number; transactionCount: number };
}

export interface BehaviorInput {
  transactions: EngineTransaction[];
  series: RecurringSeries[];
  salary: SalaryProfile;
  budgetHistory?: Array<{ monthYear: string; monthlyBudget: number }>;
  now?: Date;
  // JS getDay() indexes. Default Fri/Sat — the MENA weekend.
  weekendDays?: number[];
}

export const IMPULSE_WINDOW_DAYS = 3; // day of arrival + 2
export const SIGNAL_WINDOW_DAYS = 90;
export const FRONT_LOAD_SHARE = 0.45;
export const DRIFT_MIN_SHARE_POINTS = 5;
export const ADHERENCE_GRACE = 1.02;
export const SMALL_TXN_INCOME_FRACTION = 0.005;

export function computeBehaviorSignals(input: BehaviorInput): ComputedBehaviorSignals {
  const now = input.now ?? new Date();
  const weekendDays = input.weekendDays ?? [5, 6];
  const nowDay = dateToDayNumber(now);
  const windowStartDay = nowDay - SIGNAL_WINDOW_DAYS;

  const seriesMemberIds = collectSeriesMemberIds(input.series);
  const isDiscretionary = (tx: EngineTransaction): boolean =>
    tx.type === 'expense' &&
    Number.isFinite(tx.amountBase) &&
    !isGoalFunding(tx.category) &&
    !seriesMemberIds.has(tx.id);

  const valid = input.transactions.filter((tx) => Number.isFinite(isoToDayNumber(tx.date)));
  const windowTxns = valid.filter((tx) => {
    const d = isoToDayNumber(tx.date);
    return d >= windowStartDay && d <= nowDay;
  });
  const discretionary = windowTxns.filter(isDiscretionary);
  const discretionaryTotal = discretionary.reduce((s, t) => s + Math.abs(t.amountBase), 0);

  // ---- income events (for the impulse index) ----
  const salarySeries = input.series.find((s) => s.key === input.salary.seriesKey);
  const salaryMemberIds = new Set(salarySeries?.memberTransactionIds ?? []);
  const medianMonthlyIncome = computeMedianMonthlyIncome(valid);
  const incomeEventDays = new Set<number>();
  for (const tx of windowTxns) {
    if (tx.type !== 'income') continue;
    const qualifies = salaryMemberIds.size > 0
      ? salaryMemberIds.has(tx.id)
      : medianMonthlyIncome > 0 && Math.abs(tx.amountBase) >= 0.3 * medianMonthlyIncome;
    if (qualifies) incomeEventDays.add(isoToDayNumber(tx.date));
  }

  let impulseIndex: number | null = null;
  if (incomeEventDays.size > 0 && discretionaryTotal > 0) {
    let postPayday = 0;
    for (const tx of discretionary) {
      const day = isoToDayNumber(tx.date);
      for (const eventDay of incomeEventDays) {
        if (day >= eventDay && day < eventDay + IMPULSE_WINDOW_DAYS) {
          postPayday += Math.abs(tx.amountBase);
          break;
        }
      }
    }
    impulseIndex = Math.round((postPayday / discretionaryTotal) * 1000) / 1000;
  }

  // ---- small-transaction frequency ----
  const referenceIncome =
    (input.salary.amountMedian ?? 0) > 0
      ? input.salary.amountMedian!
      : medianMonthlyIncome > 0
        ? medianMonthlyIncome
        : null;
  const monthlySpendMedian = computeMedianMonthlySpend(valid);
  const smallThreshold = referenceIncome != null
    ? SMALL_TXN_INCOME_FRACTION * referenceIncome
    : monthlySpendMedian > 0
      ? 0.01 * monthlySpendMedian
      : null;
  const smallTxnPerWeek = smallThreshold != null && discretionary.length > 0
    ? Math.round((discretionary.filter((t) => Math.abs(t.amountBase) < smallThreshold).length / (SIGNAL_WINDOW_DAYS / 7)) * 10) / 10
    : null;

  // ---- weekend / weekday ratio ----
  let weekendWeekdayRatio: number | null = null;
  if (discretionary.length > 0) {
    let weekendSum = 0;
    let weekdaySum = 0;
    let weekendDayCount = 0;
    let weekdayDayCount = 0;
    for (let d = windowStartDay; d <= nowDay; d++) {
      // Day-of-week straight from the epoch day number (day 0 = Thursday).
      const dow = ((d + 4) % 7 + 7) % 7;
      if (weekendDays.includes(dow)) weekendDayCount++;
      else weekdayDayCount++;
    }
    for (const tx of discretionary) {
      const d = isoToDayNumber(tx.date);
      const dow = ((d + 4) % 7 + 7) % 7;
      if (weekendDays.includes(dow)) weekendSum += Math.abs(tx.amountBase);
      else weekdaySum += Math.abs(tx.amountBase);
    }
    const weekendMean = weekendDayCount > 0 ? weekendSum / weekendDayCount : 0;
    const weekdayMean = weekdayDayCount > 0 ? weekdaySum / weekdayDayCount : 0;
    weekendWeekdayRatio = weekdayMean > 0 ? Math.round((weekendMean / weekdayMean) * 100) / 100 : null;
  }

  // ---- spend timing across completed cycles ----
  const cycleMode = input.salary.paydayDayOfMonth != null ? 'payday' as const : 'calendar' as const;
  const completedCycles: CycleRange[] = [];
  for (let offset = -1; offset >= -6; offset--) {
    completedCycles.push(getCycleRange({ mode: cycleMode, anchorDay: input.salary.paydayDayOfMonth, offset, now }));
  }
  const allDiscretionary = valid.filter(isDiscretionary);
  const perCycleShares: Array<[number, number, number]> = [];
  for (const cycle of completedCycles) {
    const startDay = dateToDayNumber(cycle.start);
    const endDay = dateToDayNumber(cycle.end);
    const thirds: [number, number, number] = [0, 0, 0];
    let total = 0;
    for (const tx of allDiscretionary) {
      const d = isoToDayNumber(tx.date);
      if (d < startDay || d > endDay) continue;
      const posInCycle = (d - startDay) / Math.max(1, cycle.totalDays - 1 || 1);
      const third = posInCycle < 1 / 3 ? 0 : posInCycle < 2 / 3 ? 1 : 2;
      thirds[third] += Math.abs(tx.amountBase);
      total += Math.abs(tx.amountBase);
    }
    if (total > 0) {
      perCycleShares.push([thirds[0] / total, thirds[1] / total, thirds[2] / total]);
    }
  }

  let spendTiming: ComputedBehaviorSignals['spendTiming'] = null;
  if (perCycleShares.length >= 2) {
    const avg: [number, number, number] = [0, 1, 2].map(
      (i) => perCycleShares.reduce((s, c) => s + c[i], 0) / perCycleShares.length,
    ) as [number, number, number];
    const profile = avg[0] >= FRONT_LOAD_SHARE ? 'front_loader' : avg[2] >= FRONT_LOAD_SHARE ? 'back_loader' : 'smooth';
    spendTiming = {
      profile,
      thirdShares: avg.map((v) => Math.round(v * 100) / 100) as [number, number, number],
      basisCycles: perCycleShares.length,
    };
  }

  // ---- budget adherence streak ----
  let budgetAdherenceStreak: number | null = null;
  if (input.budgetHistory && input.budgetHistory.length > 0) {
    const budgetByMonth = new Map(input.budgetHistory.map((b) => [b.monthYear, b.monthlyBudget]));
    const spendByMonth = new Map<string, number>();
    for (const tx of valid) {
      if (tx.type !== 'expense' || isGoalFunding(tx.category)) continue;
      const key = monthKeyOf(tx.date);
      spendByMonth.set(key, (spendByMonth.get(key) ?? 0) + Math.abs(tx.amountBase));
    }
    let streak = 0;
    for (let offset = 1; offset <= 24; offset++) {
      const ref = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
      const budget = budgetByMonth.get(key);
      if (budget == null || budget <= 0) break;
      const spend = spendByMonth.get(key) ?? 0;
      if (spend <= budget * ADHERENCE_GRACE) streak++;
      else break;
    }
    budgetAdherenceStreak = streak;
  }

  // ---- category drift: trailing 3 vs prior 3 completed active months ----
  const categoryDrift: ComputedBehaviorSignals['categoryDrift'] = [];
  {
    const monthTotals = new Map<string, Map<string, number>>();
    const activeMonths = new Set<string>();
    for (const tx of valid) {
      const key = monthKeyOf(tx.date);
      activeMonths.add(key);
      if (tx.type !== 'expense' || isGoalFunding(tx.category)) continue;
      const cat = tx.category ?? 'other-expense';
      const m = monthTotals.get(key) ?? new Map<string, number>();
      m.set(cat, (m.get(cat) ?? 0) + Math.abs(tx.amountBase));
      monthTotals.set(key, m);
    }
    const completedActive: string[] = [];
    for (let offset = 1; offset <= 18 && completedActive.length < 6; offset++) {
      const ref = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
      if (activeMonths.has(key)) completedActive.push(key);
    }
    if (completedActive.length >= 6) {
      const recent = completedActive.slice(0, 3);
      const prior = completedActive.slice(3, 6);
      const share = (months: string[]): Map<string, number> => {
        const sums = new Map<string, number>();
        let total = 0;
        for (const month of months) {
          for (const [cat, v] of monthTotals.get(month) ?? []) {
            sums.set(cat, (sums.get(cat) ?? 0) + v);
            total += v;
          }
        }
        const shares = new Map<string, number>();
        if (total > 0) for (const [cat, v] of sums) shares.set(cat, (v / total) * 100);
        return shares;
      };
      const recentShares = share(recent);
      const priorShares = share(prior);
      const cats = new Set([...recentShares.keys(), ...priorShares.keys()]);
      const drifts: Array<{ categoryId: string; direction: 'up' | 'down'; sharePctPointChange: number }> = [];
      for (const cat of cats) {
        const delta = (recentShares.get(cat) ?? 0) - (priorShares.get(cat) ?? 0);
        if (Math.abs(delta) >= DRIFT_MIN_SHARE_POINTS) {
          drifts.push({
            categoryId: cat,
            direction: delta > 0 ? 'up' : 'down',
            sharePctPointChange: Math.round(delta * 10) / 10,
          });
        }
      }
      drifts.sort((a, b) => Math.abs(b.sharePctPointChange) - Math.abs(a.sharePctPointChange));
      categoryDrift.push(...drifts.slice(0, 3));
    }
  }

  const firstDay = valid.length > 0 ? Math.min(...valid.map((t) => isoToDayNumber(t.date))) : nowDay;

  return {
    spendTiming,
    impulseIndex,
    smallTxnPerWeek,
    weekendWeekdayRatio,
    budgetAdherenceStreak,
    categoryDrift,
    basis: {
      daysOfHistory: Math.max(0, nowDay - firstDay),
      cycles: perCycleShares.length,
      transactionCount: valid.length,
    },
  };
}

function computeMedianMonthlyIncome(txns: EngineTransaction[]): number {
  const byMonth = new Map<string, number>();
  for (const tx of txns) {
    if (tx.type !== 'income' || !Number.isFinite(tx.amountBase)) continue;
    const key = monthKeyOf(tx.date);
    byMonth.set(key, (byMonth.get(key) ?? 0) + Math.abs(tx.amountBase));
  }
  return median([...byMonth.values()]);
}

function computeMedianMonthlySpend(txns: EngineTransaction[]): number {
  const byMonth = new Map<string, number>();
  for (const tx of txns) {
    if (tx.type !== 'expense' || !Number.isFinite(tx.amountBase) || isGoalFunding(tx.category)) continue;
    const key = monthKeyOf(tx.date);
    byMonth.set(key, (byMonth.get(key) ?? 0) + Math.abs(tx.amountBase));
  }
  return median([...byMonth.values()]);
}

// ============================================================
// Archetypes
// ============================================================

export type Archetype = 'planner' | 'impulsive' | 'seasonal' | 'cautious';

export interface ArchetypeEvidence {
  // Stable signal ids — the UI maps them to i18n keys and drops unknowns.
  signal:
    | 'adherence_streak'
    | 'impulse_index'
    | 'spend_timing'
    | 'small_txn_freq'
    | 'weekend_ratio'
    | 'expense_volatility'
    | 'savings_rate'
    | 'discretionary_ratio'
    | 'recurring_share'
    | 'category_drift';
  value: number | string;
  weight: number;
}

export interface ArchetypeResult {
  archetype: Archetype | null;
  scores: Record<Archetype, number>;
  // Top contributors of the winning archetype — feeds the B1 card, which
  // never shows an archetype without at least two of these.
  evidence: ArchetypeEvidence[];
}

export interface ArchetypeAux {
  savingsRate?: number;
  discretionaryRatio?: number;
  expenseVolatility?: number;
  recurringExpenseRatio?: number;
}

export const ARCHETYPE_MIN_SCORE = 3;

export function deriveArchetype(signals: ComputedBehaviorSignals, aux: ArchetypeAux = {}): ArchetypeResult {
  const scores: Record<Archetype, number> = { planner: 0, impulsive: 0, seasonal: 0, cautious: 0 };
  const evidence: Record<Archetype, ArchetypeEvidence[]> = { planner: [], impulsive: [], seasonal: [], cautious: [] };

  const fire = (archetype: Archetype, signal: ArchetypeEvidence['signal'], value: number | string, weight: number) => {
    scores[archetype] += weight;
    evidence[archetype].push({ signal, value, weight });
  };

  // planner — plans and sticks to the plan
  if (signals.budgetAdherenceStreak != null && signals.budgetAdherenceStreak >= 2) {
    fire('planner', 'adherence_streak', signals.budgetAdherenceStreak, 2);
  }
  if (signals.impulseIndex != null && signals.impulseIndex < 0.25) {
    fire('planner', 'impulse_index', signals.impulseIndex, 1);
  }
  if (signals.spendTiming?.profile === 'smooth') {
    fire('planner', 'spend_timing', 'smooth', 1);
  }
  if (aux.recurringExpenseRatio != null && aux.recurringExpenseRatio >= 0.4) {
    fire('planner', 'recurring_share', Math.round(aux.recurringExpenseRatio * 100) / 100, 1);
  }

  // impulsive — money moves right after it arrives
  if (signals.impulseIndex != null && signals.impulseIndex >= 0.4) {
    fire('impulsive', 'impulse_index', signals.impulseIndex, 2);
  }
  if (signals.smallTxnPerWeek != null && signals.smallTxnPerWeek >= 10) {
    fire('impulsive', 'small_txn_freq', signals.smallTxnPerWeek, 1);
  }
  if (signals.spendTiming?.profile === 'front_loader') {
    fire('impulsive', 'spend_timing', 'front_loader', 1);
  }

  // seasonal — the month's shape keeps changing
  if (aux.expenseVolatility != null && aux.expenseVolatility >= 0.35) {
    fire('seasonal', 'expense_volatility', Math.round(aux.expenseVolatility * 100) / 100, 2);
  }
  if (signals.categoryDrift.length >= 2) {
    fire('seasonal', 'category_drift', signals.categoryDrift.length, 1);
  }

  // cautious — keeps distance from the edge
  if (aux.savingsRate != null && aux.savingsRate >= 0.2) {
    fire('cautious', 'savings_rate', Math.round(aux.savingsRate * 100) / 100, 2);
  }
  if (aux.discretionaryRatio != null && aux.discretionaryRatio < 0.35) {
    fire('cautious', 'discretionary_ratio', Math.round(aux.discretionaryRatio * 100) / 100, 1);
  }
  if (signals.spendTiming && signals.spendTiming.profile !== 'front_loader') {
    fire('cautious', 'spend_timing', signals.spendTiming.profile, 1);
  }

  // Positive-framing tie priority.
  const priority: Archetype[] = ['planner', 'cautious', 'seasonal', 'impulsive'];
  let winner: Archetype | null = null;
  for (const candidate of priority) {
    if (scores[candidate] >= ARCHETYPE_MIN_SCORE && (winner === null || scores[candidate] > scores[winner])) {
      winner = candidate;
    }
  }

  return {
    archetype: winner,
    scores,
    evidence: winner ? evidence[winner].sort((a, b) => b.weight - a.weight).slice(0, 3) : [],
  };
}

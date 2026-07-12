/**
 * Cycle report card — individual roadmap B3 (payday ritual), engine half.
 *
 * On payday, the moment worth looking back: how the JUST-ENDED cycle
 * actually went. One number the user feels (saved / overspent), one win
 * (the category they cut most vs the cycle before), one leak (the one
 * that grew most), and the streak. Comparisons are cycle-over-cycle —
 * the user's own immediately-previous behaviour is the fairest yardstick
 * on payday morning.
 */

import { EngineTransaction, isGoalFunding } from './engineTypes';
import { utcNoon } from './hijri';

export interface CycleWindow {
  start: Date;
  endExclusive: Date;
}

export interface CategoryShift {
  categoryId: string;
  previous: number;
  latest: number;
  delta: number; // latest − previous (negative = improvement for expenses)
}

export interface CycleReportCard {
  income: number;
  spent: number; // consumption only — goal transfers are savings
  saved: number; // income − spent
  goalFunded: number;
  adherence: { budget: number; spent: number; within: boolean } | null;
  topWin: CategoryShift | null;
  topLeak: CategoryShift | null;
}

/** Categories need this much movement (base currency) to count as a
 * win/leak — payday praise for a 2-unit wiggle would feel hollow. */
export const MIN_SHIFT_AMOUNT = 10;

function sums(txns: EngineTransaction[], window: CycleWindow) {
  const start = window.start.getTime();
  const end = window.endExclusive.getTime();
  let income = 0;
  let spent = 0;
  let goalFunded = 0;
  const byCategory = new Map<string, number>();
  for (const t of txns) {
    const at = utcNoon(new Date(t.date)).getTime();
    if (!Number.isFinite(at) || at < start || at >= end) continue;
    const amount = Math.abs(t.amountBase);
    if (t.type === 'income') {
      income += amount;
    } else if (isGoalFunding(t.category)) {
      goalFunded += amount;
    } else {
      spent += amount;
      const cat = t.category ?? 'other-expense';
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + amount);
    }
  }
  return { income, spent, goalFunded, byCategory };
}

export function buildCycleReportCard(input: {
  transactions: EngineTransaction[];
  endedCycle: CycleWindow;
  previousCycle: CycleWindow;
  cycleBudget?: number | null;
}): CycleReportCard {
  const ended = sums(input.transactions, input.endedCycle);
  const previous = sums(input.transactions, input.previousCycle);

  const shifts: CategoryShift[] = [];
  const categories = new Set([...ended.byCategory.keys(), ...previous.byCategory.keys()]);
  for (const categoryId of categories) {
    const latest = ended.byCategory.get(categoryId) ?? 0;
    const prev = previous.byCategory.get(categoryId) ?? 0;
    const delta = latest - prev;
    if (Math.abs(delta) >= MIN_SHIFT_AMOUNT) {
      shifts.push({
        categoryId,
        previous: Math.round(prev * 100) / 100,
        latest: Math.round(latest * 100) / 100,
        delta: Math.round(delta * 100) / 100,
      });
    }
  }
  const wins = shifts.filter((s) => s.delta < 0).sort((a, b) => a.delta - b.delta);
  const leaks = shifts.filter((s) => s.delta > 0).sort((a, b) => b.delta - a.delta);

  const budget = input.cycleBudget ?? null;
  return {
    income: Math.round(ended.income * 100) / 100,
    spent: Math.round(ended.spent * 100) / 100,
    saved: Math.round((ended.income - ended.spent) * 100) / 100,
    goalFunded: Math.round(ended.goalFunded * 100) / 100,
    adherence:
      budget && budget > 0
        ? { budget, spent: Math.round(ended.spent * 100) / 100, within: ended.spent <= budget * 1.02 }
        : null,
    topWin: wins[0] ?? null,
    topLeak: leaks[0] ?? null,
  };
}

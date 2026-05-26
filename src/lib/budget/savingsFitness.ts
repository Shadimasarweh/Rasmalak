/**
 * Savings fitness check.
 *
 * Per "Emergency funds and Savings Goals.docx":
 *   "If the automated goal entries exceed the user's total expected
 *   income for the month, the system must trigger an alert: 'Your
 *   current goals exceed your monthly budget room. Would you like
 *   to extend your target date or adjust your savings amount?'"
 *
 * This helper is the deterministic input to that alert. The Plan
 * page reads it and renders a banner when `isOverBudget` is true,
 * pointing the user at the goal that's pushing the largest amount
 * (so they can extend its deadline or pause it).
 */

export interface SavingsLine {
  /** Stable identifier so the alert can deep-link back. */
  id: string;
  /** Either a goal id or 'emergency-fund' for the EF line. */
  source: 'goal' | 'emergency-fund';
  /** Display label. */
  label: string;
  /** Monthly amount in base currency. */
  monthlyAmount: number;
  /** When source = 'goal'. */
  goalId?: string;
}

export interface SavingsFitness {
  totalSavings: number;
  expectedIncome: number;
  /** Income net of savings — the room left for everything else. */
  remainingRoom: number;
  isOverBudget: boolean;
  /** The line consuming the largest share — used as the deep-link target. */
  largestLine: SavingsLine | null;
}

export function evaluateSavingsFitness(
  lines: SavingsLine[],
  expectedIncome: number,
): SavingsFitness {
  const totalSavings = lines.reduce((s, l) => s + Math.max(0, l.monthlyAmount), 0);
  const safeIncome = Number.isFinite(expectedIncome) && expectedIncome > 0 ? expectedIncome : 0;
  const remainingRoom = safeIncome - totalSavings;
  const isOverBudget = safeIncome > 0 && totalSavings > safeIncome;
  const largestLine = lines.length === 0
    ? null
    : lines.reduce((max, l) => (l.monthlyAmount > (max?.monthlyAmount ?? 0) ? l : max), lines[0]);
  return { totalSavings, expectedIncome: safeIncome, remainingRoom, isOverBudget, largestLine };
}

/**
 * Estimate expected monthly income from prior history. This is used
 * as the denominator for the over-income alert when the user hasn't
 * declared a target income.
 *
 * Median of the last 3 complete months' income totals. Median rather
 * than mean so a single fat bonus month doesn't inflate expectations.
 */
export function estimateMonthlyIncome(
  transactions: Array<{ type: 'income' | 'expense'; amountBase: number; date: string }>,
  now: Date = new Date(),
): number {
  const months: number[] = [];
  for (let offset = 1; offset <= 3; offset++) {
    const ref = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const startMs = ref.getTime();
    const endMs = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    const total = transactions
      .filter((t) => t.type === 'income')
      .filter((t) => {
        const d = new Date(t.date).getTime();
        return d >= startMs && d <= endMs;
      })
      .reduce((s, t) => s + Math.abs(t.amountBase), 0);
    if (total > 0) months.push(total);
  }
  if (months.length === 0) return 0;
  months.sort((a, b) => a - b);
  const mid = Math.floor(months.length / 2);
  return months.length % 2 === 0
    ? (months[mid - 1] + months[mid]) / 2
    : months[mid];
}

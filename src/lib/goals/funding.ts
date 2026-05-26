/**
 * Savings-goal funding calculator.
 *
 * Per "Emergency funds and Savings Goals.docx":
 *   - User defines a target amount and target date.
 *   - System computes months remaining and divides the gap by it.
 *   - If the user misses a month, the next month absorbs the gap
 *     by recomputing on the new (shorter) horizon.
 *
 * The legacy `funding_type` ('none' | 'fixed' | 'percentage') still
 * exists in the schema; goals with funding_type='none' are NEVER
 * injected into the budget (the user explicitly opted out). Every
 * other goal uses the deadline-driven amount returned here.
 */

export interface GoalFundingInput {
  targetAmount: number;
  currentAmount: number;
  /** ISO date 'YYYY-MM-DD'. Optional — when missing we return 0. */
  deadline?: string | null;
  /** Funding type from the legacy schema. 'none' opts out entirely. */
  fundingType?: 'none' | 'fixed' | 'percentage' | string;
  /** Status from migration 013. 'paused' / 'achieved' opts out. */
  status?: 'active' | 'paused' | 'achieved' | string;
}

export interface GoalFundingResult {
  /** Monthly contribution this cycle. Already absorbs prior misses. */
  monthlyAmount: number;
  /** Whole months between now and the deadline (rounded UP). */
  monthsRemaining: number;
  /** Reason the goal isn't being funded, if applicable. */
  inactiveReason: 'paused' | 'achieved' | 'none' | 'no_deadline' | 'past_deadline' | null;
}

const ZERO: GoalFundingResult = {
  monthlyAmount: 0,
  monthsRemaining: 0,
  inactiveReason: null,
};

export function computeGoalFunding(
  input: GoalFundingInput,
  now: Date = new Date(),
): GoalFundingResult {
  // Status / opt-out short-circuits.
  if (input.status === 'paused') return { ...ZERO, inactiveReason: 'paused' };
  if (input.status === 'achieved') return { ...ZERO, inactiveReason: 'achieved' };
  if (input.fundingType === 'none') return { ...ZERO, inactiveReason: 'none' };
  if (!input.deadline) return { ...ZERO, inactiveReason: 'no_deadline' };

  const deadline = new Date(input.deadline);
  if (isNaN(deadline.getTime())) return { ...ZERO, inactiveReason: 'no_deadline' };

  // Months remaining counted from THIS month to the month containing
  // the deadline. ceil() so a deadline 2 weeks away still gets
  // 1 month (we can't cram into half a month).
  const monthsRemaining = Math.max(
    0,
    monthsBetween(now, deadline),
  );

  if (monthsRemaining <= 0) {
    return { ...ZERO, inactiveReason: 'past_deadline' };
  }

  const remaining = Math.max(0, input.targetAmount - input.currentAmount);
  if (remaining <= 0) {
    return { monthlyAmount: 0, monthsRemaining, inactiveReason: 'achieved' };
  }

  // Catch-up math: when months shorten, the per-month amount goes up
  // automatically because we always recompute against the LIVE
  // remaining horizon and remaining gap. No special "I missed last
  // month" branch needed.
  const monthlyAmount = remaining / monthsRemaining;
  return { monthlyAmount, monthsRemaining, inactiveReason: null };
}

/**
 * Calendar-month delta. The deadline's month counts as a full month
 * even if it's mid-month, so a deadline of June 15 with today =
 * June 1 returns 1 (not 0).
 */
export function monthsBetween(from: Date, to: Date): number {
  const fromYM = from.getFullYear() * 12 + from.getMonth();
  const toYM = to.getFullYear() * 12 + to.getMonth();
  // +1 because we include the deadline month in the horizon.
  return toYM - fromYM + 1;
}

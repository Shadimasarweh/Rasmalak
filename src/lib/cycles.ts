/**
 * Budget-cycle windows.
 *
 * One source of truth for "what period are we budgeting over": the classic
 * calendar month, or a payday-anchored cycle (salary day → day before the
 * next salary day). Pure date math — safe to import from React components,
 * stores, and the deterministic engine alike.
 *
 * INVARIANT: mode 'calendar' produces boundaries bit-identical to
 * getMonthRange in src/store/transactionStore.tsx, which every existing
 * calendar-mode feature relies on. cycles.test.ts pins this.
 */

export type CycleMode = 'calendar' | 'payday';

export interface CycleOpts {
  mode: CycleMode;
  // Payday day-of-month (1–31). Ignored in calendar mode; a null anchor
  // degrades payday mode to calendar. Clamped to the actual month length
  // (31 → Feb 28/29), mirroring how salaries land in short months.
  anchorDay: number | null;
  // 0 = the cycle containing `now`, -1 = the one before, +1 = the next.
  offset?: number;
  now?: Date;
}

export interface CycleRange {
  start: Date; // inclusive, local midnight
  end: Date;   // inclusive, 23:59:59.999 local — matches getMonthRange convention
  // 'YYYY-MM' of the cycle START. Payday cycles keep budget_cycles' calendar
  // keying: exactly one payday per calendar month, so keys stay unique.
  key: string;
  mode: CycleMode;
  // 1 on the start day. 0 when `now` precedes the cycle; capped at totalDays
  // once the cycle has fully passed.
  daysElapsed: number;
  // Full days after today still inside the cycle. The next payday is
  // daysRemaining + 1 days away (the cycle ends the day BEFORE payday).
  daysRemaining: number;
  totalDays: number;
}

export function clampAnchorDay(anchorDay: number, year: number, monthIndex: number): number {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(Math.max(1, Math.round(anchorDay)), daysInMonth);
}

// Calendar-day difference, immune to DST because it compares date parts only.
function daysBetween(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / 86_400_000);
}

export function getCycleRange(opts: CycleOpts): CycleRange {
  const now = opts.now ?? new Date();
  const offset = opts.offset ?? 0;
  const usePayday = opts.mode === 'payday' && opts.anchorDay != null && opts.anchorDay >= 1;

  let start: Date;
  let nextStart: Date;

  if (!usePayday) {
    start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    nextStart = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  } else {
    const anchor = opts.anchorDay as number;
    // The cycle containing `now` starts this month if payday has already
    // arrived (relative to this month's clamped payday), else last month.
    const clampedThisMonth = clampAnchorDay(anchor, now.getFullYear(), now.getMonth());
    const baseShift = now.getDate() >= clampedThisMonth ? 0 : -1;
    const startMonth = now.getMonth() + baseShift + offset;
    const startDay = clampAnchorDay(anchor, now.getFullYear(), startMonth);
    start = new Date(now.getFullYear(), startMonth, startDay);
    const nextDay = clampAnchorDay(anchor, now.getFullYear(), startMonth + 1);
    nextStart = new Date(now.getFullYear(), startMonth + 1, nextDay);
  }

  // 1 ms before the next cycle's midnight = 23:59:59.999 of the last day,
  // exactly what getMonthRange's explicit constructor produces.
  const end = new Date(nextStart.getTime() - 1);
  const totalDays = daysBetween(start, nextStart);
  const daysElapsed = Math.min(Math.max(daysBetween(start, now) + 1, 0), totalDays);
  const daysRemaining = Math.max(totalDays - daysElapsed, 0);

  return {
    start,
    end,
    key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
    mode: usePayday ? 'payday' : 'calendar',
    daysElapsed,
    daysRemaining,
    totalDays,
  };
}

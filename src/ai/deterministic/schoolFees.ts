/**
 * School-fees season — individual roadmap C5.
 *
 * The annual education pulse is the single biggest plannable shock in a
 * family budget, and the recurring-series engine already detects it
 * (yearly cadence, education category). This module turns a detected
 * pulse into a sinking-fund suggestion inside the pre-season window:
 * a clean monthly amount that has the fees ready before the due date,
 * instead of one brutal month.
 */

import { RecurringSeries } from './recurringSeries';
import { utcNoon } from './hijri';

export const SCHOOL_FEES_LEAD_DAYS = 120;
export const SCHOOL_FEES_MIN_DAYS = 14; // too close to help — skip

export interface SchoolFeesSuggestion {
  seriesKey: string;
  label: string;
  amount: number;
  dueDateIso: string;
  daysUntil: number;
  monthsUntil: number;
  monthlySetAside: number;
}

export function detectSchoolFeesPulse(
  series: RecurringSeries[],
  now: Date = new Date(),
): SchoolFeesSuggestion[] {
  const today = utcNoon(now).getTime();
  const out: SchoolFeesSuggestion[] = [];
  for (const s of series) {
    if (!s.active || s.direction !== 'expense') continue;
    if (s.categoryId !== 'education' || s.cadence !== 'yearly') continue;
    const due = utcNoon(new Date(s.nextDueDate)).getTime();
    if (!Number.isFinite(due)) continue;
    const daysUntil = Math.round((due - today) / 86_400_000);
    if (daysUntil < SCHOOL_FEES_MIN_DAYS || daysUntil > SCHOOL_FEES_LEAD_DAYS) continue;
    const monthsUntil = Math.max(1, Math.floor(daysUntil / 30));
    out.push({
      seriesKey: s.key,
      label: s.merchantLabel,
      amount: Math.round(s.amountMedian * 100) / 100,
      dueDateIso: s.nextDueDate,
      daysUntil,
      monthsUntil,
      monthlySetAside: Math.max(5, Math.ceil(s.amountMedian / monthsUntil / 5) * 5),
    });
  }
  return out.sort((a, b) => a.daysUntil - b.daysUntil);
}

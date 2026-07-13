/**
 * Zakat anniversary planner — individual roadmap C3.
 *
 * The user's zakat date is a hijri anniversary (their حول). Once set,
 * the engine keeps a rolling estimate — 2.5% over the cash the app can
 * actually see — and, inside the 60-day lead window, proposes a monthly
 * set-aside so the amount is ready on the day instead of a scramble.
 * The estimate is clearly labelled as tracked-cash-only; the existing
 * personal-zakat calculator remains the authority for nisab and full
 * holdings — this connects calculator → goals → forecast, it doesn't
 * replace fiqh.
 */

import { addDays, firstDayOfHijriMonth, hijriMonthWindow, hijriParts, utcNoon } from './hijri';

export const ZAKAT_RATE = 0.025;
export const ZAKAT_LEAD_DAYS = 60;

export interface ZakatAnniversaryPref {
  hijriMonth: number; // 1..12
  hijriDay: number; // 1..30
}

export interface ZakatPlan {
  nextDate: Date;
  hijriYear: number;
  daysUntil: number;
  withinLeadWindow: boolean;
  /** 2.5% of tracked cash (never negative). */
  estimatedZakat: number;
  /** Clean monthly set-aside to be ready on the day. */
  monthlySetAside: number;
}

function occurrenceIn(hijriYear: number, pref: ZakatAnniversaryPref): Date {
  const window = hijriMonthWindow(hijriYear, pref.hijriMonth);
  // Clamp day 30 in a 29-day month to the month's last day.
  const dayOffset = Math.min(pref.hijriDay, window.days) - 1;
  return addDays(window.start, dayOffset);
}

export function buildZakatPlan(input: {
  pref: ZakatAnniversaryPref;
  trackedCash: number;
  now?: Date;
}): ZakatPlan {
  const now = utcNoon(input.now ?? new Date());
  const { year } = hijriParts(now);

  let next = occurrenceIn(year, input.pref);
  let hijriYear = year;
  if (next.getTime() < now.getTime()) {
    next = occurrenceIn(year + 1, input.pref);
    hijriYear = year + 1;
  }

  const daysUntil = Math.round((next.getTime() - now.getTime()) / 86_400_000);
  const estimatedZakat =
    Math.round(Math.max(0, input.trackedCash) * ZAKAT_RATE * 100) / 100;
  const monthsUntil = Math.max(1, Math.ceil(daysUntil / 30));
  const monthlySetAside =
    estimatedZakat > 0 ? Math.max(5, Math.ceil(estimatedZakat / monthsUntil / 5) * 5) : 0;

  return {
    nextDate: next,
    hijriYear,
    daysUntil,
    withinLeadWindow: daysUntil <= ZAKAT_LEAD_DAYS,
    estimatedZakat,
    monthlySetAside,
  };
}

// firstDayOfHijriMonth re-exported for the card's date preview.
export { firstDayOfHijriMonth };

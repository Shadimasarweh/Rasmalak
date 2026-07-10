/**
 * Hijri (islamic-umalqura) calendar primitives — predictive engine Phase 2,
 * item 8. Ramadan and the Eids are the largest spending-seasonality events
 * in MENA; everything here exists so the engine can ask "when is Ramadan
 * for this user's timeline?" deterministically, offline, with zero deps.
 *
 * Implementation notes:
 * - `Intl.DateTimeFormat` with the `islamic-umalqura` calendar is the
 *   source of truth (built into V8/ICU — the same tables KSA uses for
 *   civil purposes). No lookup tables shipped, no drift to maintain.
 * - All arithmetic happens on UTC-noon-normalized stamps so DST and the
 *   user's local timezone can never shift a boundary day.
 * - Month windows are found by estimating with the mean synodic month
 *   (29.530589 days) from a same-run anchor, then correcting against
 *   Intl — bounded to a handful of probes, exact by construction.
 */

export interface HijriParts {
  year: number;
  month: number; // 1..12 (9 = Ramadan, 10 = Shawwal, 12 = Dhu al-Hijjah)
  day: number; // 1..30
}

export interface DateWindow {
  start: Date; // inclusive, UTC noon
  endExclusive: Date; // exclusive, UTC noon
  days: number;
}

export const RAMADAN_MONTH = 9;
export const SHAWWAL_MONTH = 10;
export const DHU_AL_HIJJAH_MONTH = 12;

const DAY_MS = 86_400_000;
const MEAN_HIJRI_MONTH_DAYS = 29.530589;

const hijriFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
});

/** Normalize any Date to 12:00 UTC of its own UTC calendar day. */
export function utcNoon(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12),
  );
}

export function addDays(date: Date, days: number): Date {
  return new Date(utcNoon(date).getTime() + days * DAY_MS);
}

/** Whole-day difference `target - from` on UTC-noon stamps. */
export function daysBetween(from: Date, target: Date): number {
  return Math.round((utcNoon(target).getTime() - utcNoon(from).getTime()) / DAY_MS);
}

export function hijriParts(date: Date): HijriParts {
  const parts: Record<string, string> = {};
  for (const p of hijriFormatter.formatToParts(utcNoon(date))) {
    parts[p.type] = p.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

/**
 * Gregorian date of day 1 of the given hijri month.
 *
 * Estimate-then-correct: jump from a runtime anchor by mean month
 * lengths, re-jump on residual month error, then snap to day 1. The
 * mean-month estimate lands within ±2 days of the true month, so the
 * loop converges in 2-3 probes; the iteration cap is pure paranoia.
 */
export function firstDayOfHijriMonth(hijriYear: number, hijriMonth: number): Date {
  if (hijriMonth < 1 || hijriMonth > 12) {
    throw new Error(`hijri month out of range: ${hijriMonth}`);
  }
  let probe = utcNoon(new Date());
  for (let i = 0; i < 12; i++) {
    const at = hijriParts(probe);
    const monthDelta =
      (hijriYear - at.year) * 12 + (hijriMonth - at.month);
    if (monthDelta === 0) {
      const first = addDays(probe, 1 - at.day);
      // Snapping by day offset can overshoot into the previous month's
      // 30th when the current month is short; nudge forward if so.
      return hijriParts(first).month === hijriMonth ? first : addDays(first, 1);
    }
    probe = addDays(probe, Math.round(monthDelta * MEAN_HIJRI_MONTH_DAYS - (at.day - 1)));
  }
  throw new Error(
    `hijri month search did not converge for ${hijriYear}-${hijriMonth}`,
  );
}

export function hijriMonthWindow(hijriYear: number, hijriMonth: number): DateWindow {
  const start = firstDayOfHijriMonth(hijriYear, hijriMonth);
  const endExclusive =
    hijriMonth === 12
      ? firstDayOfHijriMonth(hijriYear + 1, 1)
      : firstDayOfHijriMonth(hijriYear, hijriMonth + 1);
  return { start, endExclusive, days: daysBetween(start, endExclusive) };
}

export function ramadanWindow(hijriYear: number): DateWindow {
  return hijriMonthWindow(hijriYear, RAMADAN_MONTH);
}

/** Eid al-Fitr: 1–3 Shawwal. */
export function eidAlFitrWindow(hijriYear: number): DateWindow {
  const start = firstDayOfHijriMonth(hijriYear, SHAWWAL_MONTH);
  return { start, endExclusive: addDays(start, 3), days: 3 };
}

/** Eid al-Adha: 10–13 Dhu al-Hijjah. */
export function eidAlAdhaWindow(hijriYear: number): DateWindow {
  const first = firstDayOfHijriMonth(hijriYear, DHU_AL_HIJJAH_MONTH);
  const start = addDays(first, 9);
  return { start, endExclusive: addDays(start, 4), days: 4 };
}

export function isDuring(date: Date, window: DateWindow): boolean {
  const t = utcNoon(date).getTime();
  return t >= window.start.getTime() && t < window.endExclusive.getTime();
}

/**
 * The Ramadan window that is ongoing at `from`, or the next one.
 * (An ongoing Ramadan is still the one the product should talk about.)
 */
export function currentOrNextRamadan(from: Date): DateWindow {
  const { year } = hijriParts(from);
  // `from` can sit after this hijri year's Ramadan (months 10-12) or
  // before it (months 1-8) — probe this year first, then the next.
  for (const hYear of [year, year + 1]) {
    const window = ramadanWindow(hYear);
    if (utcNoon(from).getTime() < window.endExclusive.getTime()) {
      return window;
    }
  }
  // Unreachable: year+1's Ramadan is always in the future.
  throw new Error('currentOrNextRamadan failed to resolve');
}

/** Days from `from` until the window starts; 0 when inside it. */
export function daysUntilWindow(from: Date, window: DateWindow): number {
  if (isDuring(from, window)) return 0;
  return daysBetween(from, window.start);
}

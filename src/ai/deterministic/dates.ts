/**
 * Timezone-immune date arithmetic for the predictive engine.
 *
 * Transaction dates are ISO 'YYYY-MM-DD' strings. The engine never round-trips
 * them through `new Date(iso)` (which is UTC-midnight-shifted in negative-UTC
 * zones); it works on the date PARTS, so results are identical on any machine.
 */

export interface DateParts {
  year: number;
  monthIndex: number; // 0-based
  day: number;
}

export function parseIsoDate(iso: string): DateParts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return { year: Number(m[1]), monthIndex: Number(m[2]) - 1, day: Number(m[3]) };
}

export function toIso(parts: DateParts): string {
  const mm = String(parts.monthIndex + 1).padStart(2, '0');
  const dd = String(parts.day).padStart(2, '0');
  return `${parts.year}-${mm}-${dd}`;
}

// Days since the Unix epoch for a calendar date — the engine's interval unit.
export function isoToDayNumber(iso: string): number {
  const p = parseIsoDate(iso);
  if (!p) return NaN;
  return Math.round(Date.UTC(p.year, p.monthIndex, p.day) / 86_400_000);
}

export function dateToDayNumber(d: Date): number {
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

export function isoAddDays(iso: string, days: number): string {
  const p = parseIsoDate(iso);
  if (!p) return iso;
  const shifted = new Date(Date.UTC(p.year, p.monthIndex, p.day + days));
  return toIso({ year: shifted.getUTCFullYear(), monthIndex: shifted.getUTCMonth(), day: shifted.getUTCDate() });
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

// Step forward by whole months keeping the anchor day-of-month, clamped to
// short months (31st → Feb 28/29) — how salaries and bills actually recur.
export function isoAddMonthsClamped(iso: string, months: number, anchorDay?: number): string {
  const p = parseIsoDate(iso);
  if (!p) return iso;
  const anchor = anchorDay ?? p.day;
  const base = new Date(Date.UTC(p.year, p.monthIndex + months, 1));
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth();
  return toIso({ year: y, monthIndex: m, day: Math.min(Math.max(1, anchor), daysInMonth(y, m)) });
}

export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

export function dayOfMonth(iso: string): number {
  const p = parseIsoDate(iso);
  return p ? p.day : NaN;
}

import { describe, expect, it } from 'vitest';

import {
  DHU_AL_HIJJAH_MONTH,
  RAMADAN_MONTH,
  SHAWWAL_MONTH,
  addDays,
  currentOrNextRamadan,
  daysBetween,
  daysUntilWindow,
  eidAlAdhaWindow,
  eidAlFitrWindow,
  firstDayOfHijriMonth,
  hijriMonthWindow,
  hijriParts,
  isDuring,
  ramadanWindow,
  utcNoon,
} from './hijri';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const at = (s: string) => new Date(`${s}T12:00:00Z`);

describe('hijriParts', () => {
  // Civil pins straight from the Umm al-Qura tables ICU ships.
  it('maps 2025-03-01 to 1 Ramadan 1446', () => {
    expect(hijriParts(at('2025-03-01'))).toEqual({ year: 1446, month: 9, day: 1 });
  });

  it('maps 2026-02-18 to 1 Ramadan 1447', () => {
    expect(hijriParts(at('2026-02-18'))).toEqual({ year: 1447, month: 9, day: 1 });
  });

  it('is timezone-proof: any time of day maps to the same UTC calendar day', () => {
    expect(hijriParts(new Date('2025-03-01T23:59:00Z'))).toEqual(
      hijriParts(new Date('2025-03-01T00:01:00Z')),
    );
  });
});

describe('firstDayOfHijriMonth / hijriMonthWindow', () => {
  it('finds 1 Ramadan for pinned years', () => {
    expect(iso(firstDayOfHijriMonth(1446, RAMADAN_MONTH))).toBe('2025-03-01');
    expect(iso(firstDayOfHijriMonth(1447, RAMADAN_MONTH))).toBe('2026-02-18');
  });

  it('window boundaries are exact by construction', () => {
    const w = ramadanWindow(1447);
    expect(hijriParts(w.start)).toEqual({ year: 1447, month: RAMADAN_MONTH, day: 1 });
    // Day before the window is Sha'ban (month 8).
    expect(hijriParts(addDays(w.start, -1)).month).toBe(8);
    // First day past the window is 1 Shawwal.
    expect(hijriParts(w.endExclusive)).toEqual({
      year: 1447,
      month: SHAWWAL_MONTH,
      day: 1,
    });
    expect([29, 30]).toContain(w.days);
  });

  it('handles the year-end rollover (Dhu al-Hijjah -> Muharram)', () => {
    const w = hijriMonthWindow(1446, 12);
    expect(hijriParts(w.endExclusive)).toEqual({ year: 1447, month: 1, day: 1 });
    expect([29, 30]).toContain(w.days);
  });

  it('rejects out-of-range months', () => {
    expect(() => firstDayOfHijriMonth(1447, 13)).toThrow();
  });
});

describe('eid windows', () => {
  it('Eid al-Fitr is 1-3 Shawwal, immediately after Ramadan', () => {
    const ramadan = ramadanWindow(1446);
    const fitr = eidAlFitrWindow(1446);
    expect(fitr.start.getTime()).toBe(ramadan.endExclusive.getTime());
    expect(fitr.days).toBe(3);
    expect(hijriParts(fitr.start)).toEqual({ year: 1446, month: SHAWWAL_MONTH, day: 1 });
  });

  it('Eid al-Adha starts on 10 Dhu al-Hijjah and spans 4 days', () => {
    const adha = eidAlAdhaWindow(1446);
    expect(hijriParts(adha.start)).toEqual({
      year: 1446,
      month: DHU_AL_HIJJAH_MONTH,
      day: 10,
    });
    expect(adha.days).toBe(4);
  });
});

describe('currentOrNextRamadan', () => {
  it('returns the upcoming Ramadan when between Ramadans', () => {
    // 2026-07-10 is Muharram 1448 — after Ramadan 1447 ended.
    const w = currentOrNextRamadan(at('2026-07-10'));
    expect(hijriParts(w.start).year).toBe(1448);
  });

  it('returns the ongoing window during Ramadan itself', () => {
    const w = currentOrNextRamadan(at('2026-03-01')); // mid-Ramadan 1447
    expect(hijriParts(w.start)).toEqual({ year: 1447, month: RAMADAN_MONTH, day: 1 });
    expect(isDuring(at('2026-03-01'), w)).toBe(true);
  });

  it('flips to the next year the day Ramadan ends', () => {
    const current = ramadanWindow(1447);
    const after = currentOrNextRamadan(current.endExclusive);
    expect(hijriParts(after.start).year).toBe(1448);
  });
});

describe('window membership + countdown', () => {
  it('start is inclusive, end is exclusive', () => {
    const w = ramadanWindow(1447);
    expect(isDuring(w.start, w)).toBe(true);
    expect(isDuring(addDays(w.endExclusive, -1), w)).toBe(true);
    expect(isDuring(w.endExclusive, w)).toBe(false);
    expect(isDuring(addDays(w.start, -1), w)).toBe(false);
  });

  it('daysUntilWindow counts down and clamps to 0 inside', () => {
    const w = ramadanWindow(1447);
    expect(daysUntilWindow(addDays(w.start, -30), w)).toBe(30);
    expect(daysUntilWindow(addDays(w.start, 5), w)).toBe(0);
  });
});

describe('date helpers', () => {
  it('utcNoon normalizes and daysBetween rounds exactly', () => {
    expect(utcNoon(new Date('2026-01-05T23:45:00Z')).toISOString()).toBe(
      '2026-01-05T12:00:00.000Z',
    );
    expect(daysBetween(at('2026-01-01'), at('2026-01-31'))).toBe(30);
    expect(daysBetween(at('2026-01-31'), at('2026-01-01'))).toBe(-30);
  });
});

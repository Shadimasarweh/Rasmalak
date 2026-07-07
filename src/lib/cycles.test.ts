import { describe, it, expect } from 'vitest';
import { getCycleRange, clampAnchorDay } from './cycles';

// Replicates getMonthRange in src/store/transactionStore.tsx verbatim.
// (Importing the store here would drag in the Supabase client; if
// getMonthRange ever changes, this copy — and the parity below — must too.)
function getMonthRangeReference(monthOffset: number, now: Date): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

describe('calendar mode — bit-identical to getMonthRange', () => {
  const probes: Array<{ now: Date; offset: number }> = [
    { now: new Date(2026, 4, 15), offset: 0 },   // mid-May
    { now: new Date(2026, 4, 15), offset: -1 },  // April
    { now: new Date(2026, 4, 31), offset: 0 },   // last day of May
    { now: new Date(2026, 0, 1), offset: -1 },   // year boundary back into Dec
    { now: new Date(2025, 11, 31), offset: 1 },  // year boundary forward into Jan
    { now: new Date(2028, 1, 15), offset: 0 },   // leap-year February
  ];

  for (const { now, offset } of probes) {
    it(`matches for now=${now.toISOString().slice(0, 10)} offset=${offset}`, () => {
      const cycle = getCycleRange({ mode: 'calendar', anchorDay: null, offset, now });
      const ref = getMonthRangeReference(offset, now);
      expect(cycle.start.getTime()).toBe(ref.start.getTime());
      expect(cycle.end.getTime()).toBe(ref.end.getTime());
      expect(cycle.mode).toBe('calendar');
    });
  }

  it('payday mode with anchor day 1 produces the same boundaries as calendar', () => {
    const now = new Date(2026, 4, 15);
    const payday1 = getCycleRange({ mode: 'payday', anchorDay: 1, now });
    const ref = getMonthRangeReference(0, now);
    expect(payday1.start.getTime()).toBe(ref.start.getTime());
    expect(payday1.end.getTime()).toBe(ref.end.getTime());
  });

  it('payday mode with a null anchor degrades to calendar', () => {
    const now = new Date(2026, 4, 15);
    const cycle = getCycleRange({ mode: 'payday', anchorDay: null, now });
    expect(cycle.mode).toBe('calendar');
    expect(cycle.start.getTime()).toBe(new Date(2026, 4, 1).getTime());
  });

  it('reports elapsed/remaining/total for a calendar month', () => {
    const cycle = getCycleRange({ mode: 'calendar', anchorDay: null, now: new Date(2026, 4, 15) });
    expect(cycle.totalDays).toBe(31);
    expect(cycle.daysElapsed).toBe(15);
    expect(cycle.daysRemaining).toBe(16);
    expect(cycle.key).toBe('2026-05');
  });
});

describe('payday mode', () => {
  it('mid-cycle: payday 25, May 15 → cycle Apr 25 .. May 24', () => {
    const cycle = getCycleRange({ mode: 'payday', anchorDay: 25, now: new Date(2026, 4, 15) });
    expect(cycle.start.getTime()).toBe(new Date(2026, 3, 25).getTime());
    expect(cycle.end.getTime()).toBe(new Date(2026, 4, 24, 23, 59, 59, 999).getTime());
    expect(cycle.totalDays).toBe(30);
    expect(cycle.daysElapsed).toBe(21); // Apr 25 counts as day 1
    expect(cycle.daysRemaining).toBe(9);
    expect(cycle.key).toBe('2026-04');
  });

  it('on payday itself the new cycle starts', () => {
    const cycle = getCycleRange({ mode: 'payday', anchorDay: 25, now: new Date(2026, 4, 25) });
    expect(cycle.start.getTime()).toBe(new Date(2026, 4, 25).getTime());
    expect(cycle.daysElapsed).toBe(1);
  });

  it('the day before payday is the last day of the old cycle', () => {
    const cycle = getCycleRange({ mode: 'payday', anchorDay: 25, now: new Date(2026, 4, 24) });
    expect(cycle.start.getTime()).toBe(new Date(2026, 3, 25).getTime());
    expect(cycle.daysElapsed).toBe(cycle.totalDays);
    expect(cycle.daysRemaining).toBe(0);
  });

  it('payday 31 clamps in short months (Feb non-leap)', () => {
    // Feb 10, 2026: this month's clamped payday is Feb 28; 10 < 28 → cycle started Jan 31
    const cycle = getCycleRange({ mode: 'payday', anchorDay: 31, now: new Date(2026, 1, 10) });
    expect(cycle.start.getTime()).toBe(new Date(2026, 0, 31).getTime());
    expect(cycle.end.getTime()).toBe(new Date(2026, 1, 27, 23, 59, 59, 999).getTime());
    expect(cycle.totalDays).toBe(28);
  });

  it('payday 31 clamps to Feb 29 in a leap year', () => {
    const cycle = getCycleRange({ mode: 'payday', anchorDay: 31, now: new Date(2028, 1, 29) });
    expect(cycle.start.getTime()).toBe(new Date(2028, 1, 29).getTime());
    // next payday re-expands to Mar 31
    expect(cycle.end.getTime()).toBe(new Date(2028, 2, 30, 23, 59, 59, 999).getTime());
  });

  it('offset -1 crosses the year boundary', () => {
    // Jan 10, 2026 with payday 25 → current cycle started Dec 25, 2025
    const prev = getCycleRange({ mode: 'payday', anchorDay: 25, offset: -1, now: new Date(2026, 0, 10) });
    expect(prev.start.getTime()).toBe(new Date(2025, 10, 25).getTime()); // Nov 25
    expect(prev.end.getTime()).toBe(new Date(2025, 11, 24, 23, 59, 59, 999).getTime());
    expect(prev.key).toBe('2025-11');
  });

  it('offset +1 yields a future cycle with 0 elapsed days', () => {
    const next = getCycleRange({ mode: 'payday', anchorDay: 25, offset: 1, now: new Date(2026, 4, 15) });
    expect(next.start.getTime()).toBe(new Date(2026, 4, 25).getTime());
    expect(next.daysElapsed).toBe(0);
    expect(next.daysRemaining).toBe(next.totalDays);
  });

  it('keys stay unique across consecutive cycles (one payday per month)', () => {
    const now = new Date(2026, 6, 1);
    const keys = [-2, -1, 0, 1].map((offset) =>
      getCycleRange({ mode: 'payday', anchorDay: 25, offset, now }).key,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('clampAnchorDay', () => {
  it('clamps 31 to the month length', () => {
    expect(clampAnchorDay(31, 2026, 1)).toBe(28); // Feb 2026
    expect(clampAnchorDay(31, 2028, 1)).toBe(29); // Feb 2028 (leap)
    expect(clampAnchorDay(31, 2026, 3)).toBe(30); // April
    expect(clampAnchorDay(31, 2026, 0)).toBe(31); // January
  });
  it('floors at 1 and rounds fractional input', () => {
    expect(clampAnchorDay(0, 2026, 0)).toBe(1);
    expect(clampAnchorDay(25.4, 2026, 0)).toBe(25);
  });
  it('normalizes out-of-range month indexes', () => {
    expect(clampAnchorDay(31, 2026, -1)).toBe(31); // Dec 2025
    expect(clampAnchorDay(31, 2025, 12)).toBe(31); // Jan 2026
  });
});

import { describe, expect, it } from 'vitest';

import { hijriParts } from './hijri';
import { ZAKAT_LEAD_DAYS, buildZakatPlan } from './zakatAnniversary';

const NOW = new Date('2026-07-12T12:00:00Z'); // 27 Muharram 1448

describe('buildZakatPlan', () => {
  it('finds the next hijri occurrence and sizes the set-aside', () => {
    // Anniversary 1 Ramadan: already passed in 1447 → next is 1448.
    const plan = buildZakatPlan({
      pref: { hijriMonth: 9, hijriDay: 1 },
      trackedCash: 10_000,
      now: NOW,
    });
    expect(plan.hijriYear).toBe(1448);
    expect(hijriParts(plan.nextDate)).toEqual({ year: 1448, month: 9, day: 1 });
    expect(plan.estimatedZakat).toBe(250); // 2.5%
    expect(plan.daysUntil).toBeGreaterThan(ZAKAT_LEAD_DAYS);
    expect(plan.withinLeadWindow).toBe(false);
    // Clean-step monthly amount over the months actually remaining.
    const months = Math.max(1, Math.ceil(plan.daysUntil / 30));
    expect(plan.monthlySetAside).toBe(Math.max(5, Math.ceil(250 / months / 5) * 5));
  });

  it('stays in the current hijri year when the date is ahead', () => {
    // 27 Muharram 1448 now; anniversary 10 Safar (month 2) is ahead.
    const plan = buildZakatPlan({
      pref: { hijriMonth: 2, hijriDay: 10 },
      trackedCash: 4_000,
      now: NOW,
    });
    expect(plan.hijriYear).toBe(1448);
    expect(hijriParts(plan.nextDate)).toEqual({ year: 1448, month: 2, day: 10 });
    expect(plan.withinLeadWindow).toBe(plan.daysUntil <= ZAKAT_LEAD_DAYS);
  });

  it('clamps day 30 in a 29-day month and never suggests from negative cash', () => {
    const plan = buildZakatPlan({
      pref: { hijriMonth: 9, hijriDay: 30 },
      trackedCash: -500,
      now: NOW,
    });
    const parts = hijriParts(plan.nextDate);
    expect(parts.month).toBe(9);
    expect(parts.day).toBeGreaterThanOrEqual(29);
    expect(plan.estimatedZakat).toBe(0);
    expect(plan.monthlySetAside).toBe(0);
  });
});

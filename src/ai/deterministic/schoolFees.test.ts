import { describe, expect, it } from 'vitest';

import { RecurringSeries } from './recurringSeries';
import { detectSchoolFeesPulse, SCHOOL_FEES_LEAD_DAYS } from './schoolFees';

const NOW = new Date('2026-07-12T12:00:00Z');

function series(overrides: Partial<RecurringSeries>): RecurringSeries {
  return {
    key: 'edu-1', direction: 'expense', categoryId: 'education', subcategoryId: null,
    merchantLabel: 'International School', cadence: 'yearly', medianIntervalDays: 365,
    intervalMadDays: 5, amountMedian: 3000, amountMad: 100, anchorDayOfMonth: null,
    firstDate: '2024-09-01', lastDate: '2025-09-01', nextDueDate: '2026-09-01',
    occurrences: 2, confidence: 0.8, confidenceGrade: 'medium', active: true,
    source: 'detected', ...overrides,
  } as RecurringSeries;
}

describe('detectSchoolFeesPulse', () => {
  it('suggests a sinking fund inside the pre-season window', () => {
    const [suggestion] = detectSchoolFeesPulse([series({})], NOW);
    expect(suggestion).toBeDefined();
    expect(suggestion.daysUntil).toBe(51);
    expect(suggestion.monthsUntil).toBe(1);
    expect(suggestion.monthlySetAside).toBe(3000);
    expect(suggestion.amount).toBe(3000);
  });

  it('spreads across the months actually remaining', () => {
    const [suggestion] = detectSchoolFeesPulse(
      [series({ nextDueDate: '2026-11-01' })], NOW,
    );
    expect(suggestion.monthsUntil).toBe(3); // 112 days
    expect(suggestion.monthlySetAside).toBe(1000);
  });

  it('ignores out-of-window, non-yearly, and non-education series', () => {
    expect(detectSchoolFeesPulse([series({ nextDueDate: '2027-03-01' })], NOW)).toEqual([]);
    expect(detectSchoolFeesPulse([series({ nextDueDate: '2026-07-27' })], NOW)).toHaveLength(1); // 15d — just inside
    expect(detectSchoolFeesPulse([series({ nextDueDate: '2026-07-20' })], NOW)).toEqual([]); // 8d — too close
    expect(detectSchoolFeesPulse([series({ cadence: 'monthly' })], NOW)).toEqual([]);
    expect(detectSchoolFeesPulse([series({ categoryId: 'bills' })], NOW)).toEqual([]);
    expect(detectSchoolFeesPulse([series({ active: false })], NOW)).toEqual([]);
  });
});

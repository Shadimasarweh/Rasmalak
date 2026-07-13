import { describe, expect, it } from 'vitest';

import { RecurringSeries } from './recurringSeries';
import { detectRemittanceSeries, looksLikeRemittance } from './remittance';

function series(overrides: Partial<RecurringSeries>): RecurringSeries {
  return {
    key: 'r1', direction: 'expense', categoryId: 'other-expense', subcategoryId: null,
    merchantLabel: 'Western Union', cadence: 'monthly', medianIntervalDays: 30,
    intervalMadDays: 2, amountMedian: 200, amountMad: 10, anchorDayOfMonth: 25,
    firstDate: '2026-01-25', lastDate: '2026-06-25', nextDueDate: '2026-07-25',
    occurrences: 6, confidence: 0.85, confidenceGrade: 'high', active: true,
    source: 'detected', ...overrides,
  } as RecurringSeries;
}

describe('remittance detection', () => {
  it('matches transfer-shaped labels in both languages', () => {
    expect(looksLikeRemittance('Western Union Amman')).toBe(true);
    expect(looksLikeRemittance('حوالة الأهل الشهرية')).toBe(true);
    expect(looksLikeRemittance('Carrefour')).toBe(false);
  });

  it('finds the series, the typical day, and the corridor from entry currencies', () => {
    const [insight] = detectRemittanceSeries(
      [series({})],
      [
        { description: 'Western Union to Cairo', currency: 'EGP', date: '2026-06-25' },
        { description: 'western union', currency: 'EGP', date: '2026-05-25' },
        { description: 'Western Union', currency: 'JOD', date: '2026-04-25' }, // base — ignored
      ],
      'JOD',
    );
    expect(insight).toBeDefined();
    expect(insight.typicalDay).toBe(25);
    expect(insight.monthlyAmount).toBe(200);
    expect(insight.corridorCurrency).toBe('EGP');
  });

  it('null corridor when entries never reveal one; biweekly doubles to monthly', () => {
    const [insight] = detectRemittanceSeries(
      [series({ merchantLabel: 'حوالة العائلة', cadence: 'biweekly', amountMedian: 100 })],
      [],
      'JOD',
    );
    expect(insight.corridorCurrency).toBeNull();
    expect(insight.monthlyAmount).toBe(200);
  });

  it('ignores non-transfer, yearly, income, and inactive series', () => {
    expect(detectRemittanceSeries([series({ merchantLabel: 'Netflix' })], [], 'JOD')).toEqual([]);
    expect(detectRemittanceSeries([series({ cadence: 'yearly' })], [], 'JOD')).toEqual([]);
    expect(detectRemittanceSeries([series({ direction: 'income' })], [], 'JOD')).toEqual([]);
    expect(detectRemittanceSeries([series({ active: false })], [], 'JOD')).toEqual([]);
  });
});

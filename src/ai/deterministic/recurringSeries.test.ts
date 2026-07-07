import { describe, it, expect } from 'vitest';
import {
  detectRecurringSeries,
  normalizeMerchant,
  collectSeriesMemberIds,
  type RecurringSeries,
} from './recurringSeries';
import { isoAddDays } from './dates';
import { makeTx, salaryEveryMonth, monthlyBill, type FixtureTransaction } from './fixtures';

// June 15, 2026 — all fixtures are built relative to this.
const NOW = new Date(2026, 5, 15);

function everyKDays(
  k: number,
  count: number,
  startIso: string,
  overrides: Partial<FixtureTransaction> = {},
): FixtureTransaction[] {
  return Array.from({ length: count }, (_, i) =>
    makeTx({
      date: isoAddDays(startIso, i * k),
      type: 'expense',
      category: 'bills',
      description: 'Test Vendor',
      amountBase: 100,
      ...overrides,
    }),
  );
}

function detect(txns: FixtureTransaction[]): RecurringSeries[] {
  return detectRecurringSeries(txns, { now: NOW });
}

describe('normalizeMerchant', () => {
  it('collapses Arabic spelling variants to one key', () => {
    const plain = normalizeMerchant('فاتوره كهرباء');
    expect(normalizeMerchant('فَاتُورَة كَهْرَبَاء')).toBe(plain); // tashkeel + ة
    expect(normalizeMerchant('فاتورة كهرباء')).toBe(plain);
  });
  it('unifies alef variants and ى', () => {
    expect(normalizeMerchant('أحمد')).toBe(normalizeMerchant('احمد'));
    expect(normalizeMerchant('مستشفى')).toBe(normalizeMerchant('مستشفي'));
  });
  it('strips digits (Western and Arabic-Indic), punctuation, and case', () => {
    expect(normalizeMerchant('CARREFOUR #1234!')).toBe('carrefour');
    expect(normalizeMerchant('فاتورة كهرباء ١٢٣')).toBe(normalizeMerchant('فاتورة كهرباء'));
  });
  it('returns empty string for null/undefined/whitespace', () => {
    expect(normalizeMerchant(null)).toBe('');
    expect(normalizeMerchant('  ')).toBe('');
  });
});

describe('cadence detection', () => {
  it('detects a monthly salary with ±2-day payday drift', () => {
    const txns = salaryEveryMonth(25, 3000, 6, { start: '2025-12', jitterDays: 2, seed: 5 });
    const series = detect(txns);
    expect(series).toHaveLength(1);
    const s = series[0];
    expect(s.direction).toBe('income');
    expect(s.cadence).toBe('monthly');
    expect(s.anchorDayOfMonth).toBeGreaterThanOrEqual(23);
    expect(s.anchorDayOfMonth).toBeLessThanOrEqual(27);
    expect(s.occurrences).toBe(6);
    expect(s.active).toBe(true);
    expect(s.source).toBe('detected');
  });

  it('accepts the monthly band edges (26 and 35 days) and rejects outside (25, 36)', () => {
    expect(detect(everyKDays(26, 5, '2026-02-01'))[0]?.cadence).toBe('monthly');
    expect(detect(everyKDays(35, 4, '2026-02-15'))[0]?.cadence).toBe('monthly');
    expect(detect(everyKDays(25, 5, '2026-02-01'))).toHaveLength(0);
    expect(detect(everyKDays(36, 4, '2026-02-15'))).toHaveLength(0);
  });

  it('classifies a 28-day series as monthly (documented ambiguity)', () => {
    expect(detect(everyKDays(28, 5, '2026-02-01'))[0]?.cadence).toBe('monthly');
  });

  it('distinguishes weekly from biweekly', () => {
    expect(detect(everyKDays(7, 6, '2026-05-01'))[0]?.cadence).toBe('weekly');
    expect(detect(everyKDays(14, 5, '2026-04-15'))[0]?.cadence).toBe('biweekly');
  });

  it('rejects irregular intervals even inside the band', () => {
    // Median 30 but wildly spread: intervals 10, 30, 60 → MAD 20 > tol 5
    const dates = ['2026-03-01', '2026-03-11', '2026-04-10', '2026-06-09'];
    const txns = dates.map((date) =>
      makeTx({ date, type: 'expense', category: 'bills', description: 'Erratic Co', amountBase: 90 }),
    );
    expect(detect(txns)).toHaveLength(0);
  });
});

describe('amount handling', () => {
  it('sums amountBase, never the native amount (fixture decoy is 2×)', () => {
    const series = detect(salaryEveryMonth(25, 3000, 6, { start: '2025-12' }));
    expect(series[0].amountMedian).toBe(3000);
  });

  it('rejects noisy amounts without a user flag', () => {
    const amounts = [100, 20, 500, 90, 350];
    const txns = amounts.map((amountBase, i) =>
      makeTx({
        date: isoAddDays('2026-01-10', i * 30),
        type: 'expense',
        category: 'shopping',
        description: 'Random Store',
        amountBase,
      }),
    );
    expect(detect(txns)).toHaveLength(0);
  });

  it('sub-clusters category-level buckets by amount (rent vs small fee)', () => {
    const rent = Array.from({ length: 4 }, (_, i) =>
      makeTx({ date: isoAddDays('2026-02-01', i * 30), type: 'expense', category: 'housing', amountBase: 1200 }),
    );
    const fee = Array.from({ length: 4 }, (_, i) =>
      makeTx({ date: isoAddDays('2026-02-15', i * 30), type: 'expense', category: 'housing', amountBase: 45 }),
    );
    const series = detect([...rent, ...fee]);
    expect(series).toHaveLength(2);
    expect(series.map((s) => s.amountMedian).sort((a, b) => a - b)).toEqual([45, 1200]);
    expect(series.every((s) => s.key.includes('#b'))).toBe(true);
  });

  it('merges same-day rows into one occurrence', () => {
    // A bill split into two same-day rows must not create a 0-day interval.
    const txns = Array.from({ length: 3 }, (_, i) => [
      makeTx({ date: isoAddDays('2026-03-05', i * 30), type: 'expense', category: 'bills', description: 'Water Co', amountBase: 30 }),
      makeTx({ date: isoAddDays('2026-03-05', i * 30), type: 'expense', category: 'bills', description: 'Water Co', amountBase: 10 }),
    ]).flat();
    const series = detect(txns);
    expect(series).toHaveLength(1);
    expect(series[0].occurrences).toBe(3);
    expect(series[0].amountMedian).toBe(40);
  });
});

describe('user isRecurring flag', () => {
  it('qualifies a pair of flagged transactions', () => {
    const txns = [
      makeTx({ date: '2026-04-10', type: 'expense', category: 'bills', description: 'Gym', amountBase: 40, isRecurring: true }),
      makeTx({ date: '2026-05-10', type: 'expense', category: 'bills', description: 'Gym', amountBase: 40, isRecurring: true }),
    ];
    const series = detect(txns);
    expect(series).toHaveLength(1);
    expect(series[0].source).toBe('user_flag');
    expect(series[0].confidenceGrade).toBe('low');
    expect(series[0].cadence).toBe('monthly');
  });

  it('a lone flagged transaction yields a declared monthly series at confidence 0.4', () => {
    const series = detect([
      makeTx({ date: '2026-05-20', type: 'expense', category: 'entertainment', description: 'Netflix', amountBase: 15, isRecurring: true }),
    ]);
    expect(series).toHaveLength(1);
    const s = series[0];
    expect(s.occurrences).toBe(1);
    expect(s.cadence).toBe('monthly');
    expect(s.confidence).toBe(0.4);
    expect(s.confidenceGrade).toBe('low');
    expect(s.source).toBe('user_flag');
    expect(s.nextDueDate).toBe('2026-06-20');
  });

  it('marks a fully detected series that also carries flags as both', () => {
    const series = detect(everyKDays(30, 4, '2026-03-01', { isRecurring: true }));
    expect(series[0].source).toBe('both');
  });

  it('keeps a noisy-amount series alive when the user flagged it', () => {
    const amounts = [100, 20, 500, 90, 350];
    const txns = amounts.map((amountBase, i) =>
      makeTx({
        date: isoAddDays('2026-01-10', i * 30),
        type: 'expense',
        category: 'shopping',
        description: 'Random Store',
        amountBase,
        isRecurring: true,
      }),
    );
    expect(detect(txns)).toHaveLength(1);
  });
});

describe('lifecycle: next due, lapsing, end dates, window', () => {
  it('clamps the next due date in short months (Jan 31 → Feb 28)', () => {
    const txns = monthlyBill('Rent', 31, 800, 3, { start: '2025-11' }); // Nov 30, Dec 31, Jan 31
    const series = detect(txns);
    expect(series).toHaveLength(1);
    expect(series[0].nextDueDate).toBe('2026-02-28');
  });

  it('marks a series lapsed after two silent intervals', () => {
    // Last occurrence Mar 10; by Jun 15 that's ~97 days > 2×30+5.
    const txns = everyKDays(30, 4, '2025-12-10');
    const series = detect(txns);
    expect(series[0].lastDate).toBe('2026-03-10');
    expect(series[0].active).toBe(false);
  });

  it('honors a past recurringEndDate', () => {
    const txns = everyKDays(30, 4, '2026-02-20', { isRecurring: true, recurringEndDate: '2026-06-01' });
    const series = detect(txns);
    expect(series[0].active).toBe(false);
  });

  it('ignores transactions outside the lookback window', () => {
    const old = monthlyBill('Old Gym', 5, 60, 3, { start: '2024-01' });
    expect(detect(old)).toHaveLength(0);
  });

  it('ignores future-dated transactions', () => {
    const future = everyKDays(30, 4, '2026-07-01');
    expect(detect(future)).toHaveLength(0);
  });
});

describe('collectSeriesMemberIds', () => {
  it('collects every member id across series', () => {
    const txns = salaryEveryMonth(25, 3000, 4, { start: '2026-02' });
    const series = detect(txns);
    const ids = collectSeriesMemberIds(series);
    expect(ids.size).toBe(4);
    for (const tx of txns) expect(ids.has(tx.id)).toBe(true);
  });
});

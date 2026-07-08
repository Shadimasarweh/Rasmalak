import { describe, it, expect } from 'vitest';
import { detectRecurringSeries } from './recurringSeries';
import { deriveSalaryProfile, FALLBACK_CONFIDENCE } from './salaryProfile';
import { salaryEveryMonth, monthlyBill, makeTx } from './fixtures';
import { isoAddDays } from './dates';

const NOW = new Date(2026, 5, 15);

const NO_FALLBACK = { persona: null, monthlyIncome: null } as const;

describe('deriveSalaryProfile — detection', () => {
  it('picks the dominant monthly income series and reads its payday', () => {
    const salary = salaryEveryMonth(25, 3000, 6, { start: '2025-12' });
    const sideGig = salaryEveryMonth(10, 400, 6, { start: '2025-12', category: 'freelance' })
      .map((t) => ({ ...t, description: 'Upwork payout' }));
    const series = detectRecurringSeries([...salary, ...sideGig], { now: NOW });
    // median monthly income ≈ 3400 → dominance floor 1360 excludes the side gig
    const profile = deriveSalaryProfile(series, NO_FALLBACK, 3400);
    expect(profile.source).toBe('detected');
    expect(profile.cadence).toBe('monthly');
    expect(profile.paydayDayOfMonth).toBe(25);
    expect(profile.amountMedian).toBe(3000);
    expect(profile.nextPayday).toBe('2026-06-25');
    expect(profile.stability).toBeGreaterThan(0.8);
  });

  it('never crowns a side gig below the dominance floor even when it is the only series', () => {
    const sideGig = salaryEveryMonth(10, 400, 6, { start: '2025-12', category: 'freelance' });
    const series = detectRecurringSeries(sideGig, { now: NOW });
    const profile = deriveSalaryProfile(series, NO_FALLBACK, 3400);
    expect(profile.source).toBe('none');
  });

  it('boosts the salary category over a slightly larger other income', () => {
    const salary = salaryEveryMonth(25, 3000, 6, { start: '2025-12' });
    const rental = salaryEveryMonth(1, 3300, 6, { start: '2025-12', category: 'rental' })
      .map((t) => ({ ...t, description: 'Rent from tenant' }));
    const series = detectRecurringSeries([...salary, ...rental], { now: NOW });
    const profile = deriveSalaryProfile(series, NO_FALLBACK, 6300);
    expect(profile.paydayDayOfMonth).toBe(25);
    expect(profile.amountMedian).toBe(3000);
  });

  it('ignores lapsed income series', () => {
    // Salary stopped in January; by June it is inactive.
    const stopped = salaryEveryMonth(25, 3000, 4, { start: '2025-10' });
    const series = detectRecurringSeries(stopped, { now: NOW });
    const profile = deriveSalaryProfile(series, NO_FALLBACK, 3000);
    expect(profile.source).toBe('none');
  });

  it('ignores expense series entirely', () => {
    const rent = monthlyBill('Rent', 1, 3000, 6, { start: '2025-12' });
    const series = detectRecurringSeries(rent, { now: NOW });
    expect(deriveSalaryProfile(series, NO_FALLBACK, 3000).source).toBe('none');
  });

  it('reports a biweekly salary without a day-of-month anchor', () => {
    const biweekly = Array.from({ length: 8 }, (_, i) =>
      makeTx({
        date: isoAddDays('2026-03-05', i * 14),
        type: 'income',
        category: 'salary',
        description: 'Salary ACME',
        amountBase: 1500,
      }),
    );
    const series = detectRecurringSeries(biweekly, { now: NOW });
    const profile = deriveSalaryProfile(series, NO_FALLBACK, 3000);
    expect(profile.source).toBe('detected');
    expect(profile.cadence).toBe('biweekly');
    expect(profile.paydayDayOfMonth).toBeNull();
  });
});

describe('deriveSalaryProfile — fallback contract', () => {
  it('salaried persona with declared income → profile_fallback at 0.3', () => {
    const profile = deriveSalaryProfile([], { persona: 'salaried', monthlyIncome: 2500 }, 0);
    expect(profile.source).toBe('profile_fallback');
    expect(profile.amountMedian).toBe(2500);
    expect(profile.confidence).toBe(FALLBACK_CONFIDENCE);
    expect(profile.paydayDayOfMonth).toBeNull();
    expect(profile.nextPayday).toBeNull();
  });

  it('non-salaried personas get none', () => {
    expect(deriveSalaryProfile([], { persona: 'variable', monthlyIncome: 2500 }, 0).source).toBe('none');
    expect(deriveSalaryProfile([], { persona: 'student', monthlyIncome: 800 }, 0).source).toBe('none');
    expect(deriveSalaryProfile([], { persona: null, monthlyIncome: 2500 }, 0).source).toBe('none');
  });

  it('salaried persona without an income figure gets none', () => {
    const profile = deriveSalaryProfile([], { persona: 'salaried', monthlyIncome: null }, 0);
    expect(profile.source).toBe('none');
    expect(profile.confidence).toBe(0);
  });
});

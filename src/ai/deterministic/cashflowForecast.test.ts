import { describe, it, expect } from 'vitest';
import { getCycleRange } from '@/lib/cycles';
import { computeCashflowForecast } from './cashflowForecast';
import { detectRecurringSeries } from './recurringSeries';
import { monthlyBill, salaryEveryMonth, dailySpend, makeTx, type FixtureTransaction } from './fixtures';
import { mulberry32 } from './stats';
import { isoAddDays } from './dates';

const NOW = new Date(2026, 5, 15); // June 15, 2026
const JUNE = getCycleRange({ mode: 'calendar', anchorDay: null, now: NOW });

function forecastOf(txns: FixtureTransaction[], currentBalance = 2000) {
  const series = detectRecurringSeries(txns, { now: NOW });
  return computeCashflowForecast({
    transactions: txns,
    series,
    cycle: JUNE,
    anchorDay: null,
    currentBalance,
    now: NOW,
  });
}

describe('committed projection', () => {
  it('projects an unpaid bill due later this cycle and skips one already paid', () => {
    // Internet bill on the 20th — last paid May 20, due June 20 (upcoming).
    const internet = monthlyBill('Internet Co', 20, 40, 6, { start: '2025-12' });
    // Rent on the 1st — already paid June 1, next due July 1 (outside cycle).
    const rent = monthlyBill('Landlord', 1, 800, 7, { start: '2025-12' });
    const f = forecastOf([...internet, ...rent]);
    expect(f.committed.items).toHaveLength(1);
    expect(f.committed.items[0].label).toBe('Internet Co');
    expect(f.committed.items[0].dueDate).toBe('2026-06-20');
    expect(f.committed.totalRemaining).toBe(40);
  });

  it('projects expected income separately', () => {
    const salary = salaryEveryMonth(25, 3000, 6, { start: '2025-12' }); // next June 25, inside calendar June
    const f = forecastOf(salary);
    expect(f.expectedIncome.totalRemaining).toBe(3000);
    expect(f.expectedIncome.items[0].dueDate).toBe('2026-06-25');
    expect(f.committed.totalRemaining).toBe(0);
  });

  it('a payday-anchored cycle ends before the next salary lands', () => {
    const salary = salaryEveryMonth(25, 3000, 6, { start: '2025-12' });
    const series = detectRecurringSeries(salary, { now: NOW });
    const cycle = getCycleRange({ mode: 'payday', anchorDay: 25, now: NOW }); // May 25 .. Jun 24
    const f = computeCashflowForecast({
      transactions: salary, series, cycle, anchorDay: 25, currentBalance: 2000, now: NOW,
    });
    expect(f.expectedIncome.totalRemaining).toBe(0);
  });
});

describe('discretionary band', () => {
  it('weekly quantiles beat zero-inflated daily medians', () => {
    // Spending on only ~40% of days would give a DAILY median of 0; the
    // weekly-totals path must still produce a positive P50 rate.
    const spend = dailySpend('food', 20, 90, '2026-03-16', { seed: 11, zeroDayShare: 0.6 });
    const f = forecastOf(spend);
    expect(f.discretionary.dailyRateP50).toBeGreaterThan(0);
    expect(f.basis.weeksUsed).toBeGreaterThanOrEqual(10);
    expect(f.basis.confidence).toBe('high');
  });

  it('band invariant: pessimistic balance pairs with the P75 spend rate', () => {
    const spend = dailySpend('food', 25, 90, '2026-03-16', { seed: 3 });
    const f = forecastOf(spend, 1500);
    const expectedP25 =
      f.currentBalance + f.expectedIncome.totalRemaining - f.committed.totalRemaining - f.discretionary.remainingP75;
    expect(f.endOfCycleBalance.p25).toBeCloseTo(expectedP25, 2);
    expect(f.endOfCycleBalance.p25).toBeLessThanOrEqual(f.endOfCycleBalance.p50);
    expect(f.endOfCycleBalance.p50).toBeLessThanOrEqual(f.endOfCycleBalance.p75);
  });

  it('falls back to a declared ±40% band under 4 weeks of history', () => {
    const spend = dailySpend('food', 20, 18, '2026-05-28', { seed: 4, zeroDayShare: 0 });
    const f = forecastOf(spend);
    expect(f.basis.confidence).toBe('low');
    // Ratio-based: the stored rates are rounded to 2dp individually.
    expect(f.discretionary.dailyRateP75 / f.discretionary.dailyRateP50).toBeCloseTo(1.4, 2);
    expect(f.discretionary.dailyRateP25 / f.discretionary.dailyRateP50).toBeCloseTo(0.6, 2);
  });

  it('front-loaded history bends the weight curve above 1 for days 1–7', () => {
    const rng = mulberry32(9);
    const txns: FixtureTransaction[] = [];
    // Three completed months: days 1-7 heavy (60±), rest light (8±).
    for (const month of ['2026-03', '2026-04', '2026-05']) {
      for (let day = 1; day <= 28; day++) {
        const heavy = day <= 7;
        txns.push(
          makeTx({
            date: `${month}-${String(day).padStart(2, '0')}`,
            type: 'expense',
            category: 'shopping',
            amountBase: (heavy ? 60 : 8) + Math.round(rng() * 6),
          }),
        );
      }
    }
    const f = forecastOf(txns);
    const w17 = f.discretionary.weightCurve.find((w) => w.phase === 'days_1_7')!;
    const wLate = f.discretionary.weightCurve.find((w) => w.phase === 'days_16_23')!;
    expect(w17.weight).toBeGreaterThan(1);
    expect(w17.weight).toBeGreaterThan(wLate.weight);
  });
});

describe('per-day path', () => {
  it('runs from today to cycle end and lands on the P50 end balance', () => {
    const spend = dailySpend('food', 20, 90, '2026-03-16', { seed: 6 });
    const bill = monthlyBill('Internet Co', 20, 40, 6, { start: '2025-12' });
    const f = forecastOf([...spend, ...bill], 1200);
    expect(f.perDay[0].date).toBe('2026-06-15');
    expect(f.perDay[0].balanceP50).toBe(1200);
    const last = f.perDay[f.perDay.length - 1];
    expect(last.date).toBe('2026-06-30');
    expect(last.balanceP50).toBeCloseTo(f.endOfCycleBalance.p50, 1);
    // The committed bill shows up on its due day.
    const dueDay = f.perDay.find((d) => d.date === '2026-06-20')!;
    expect(dueDay.committedOut).toBe(40);
  });
});

describe('band calibration (seeded synthetic cycles)', () => {
  it('realized end balances land inside [p25, p75] for 40–90% of simulated cycles', () => {
    // Build 26 weeks of history, then for each of 8 simulated "futures"
    // draw the remaining-cycle spend from the same generator and check
    // coverage of the interval.
    const history = dailySpend('food', 30, 182, '2025-12-16', { seed: 21, zeroDayShare: 0.3 });
    const f = forecastOf(history, 3000);
    const remainingDays = JUNE.totalDays - JUNE.daysElapsed;

    let inside = 0;
    const simulations = 16;
    for (let sim = 0; sim < simulations; sim++) {
      const future = dailySpend('food', 30, remainingDays, isoAddDays('2026-06-15', 1), {
        seed: 100 + sim,
        zeroDayShare: 0.3,
      });
      const spendSum = future.reduce((s, t) => s + t.amountBase, 0);
      const realized = 3000 - spendSum;
      if (realized >= f.endOfCycleBalance.p25 && realized <= f.endOfCycleBalance.p75) inside++;
    }
    const coverage = inside / simulations;
    expect(coverage).toBeGreaterThanOrEqual(0.35);
    expect(coverage).toBeLessThanOrEqual(0.95);
  });
});

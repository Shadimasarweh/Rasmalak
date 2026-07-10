import { describe, expect, it } from 'vitest';

import { EngineTransaction } from './engineTypes';
import { MIN_CATEGORY_SAMPLES, checkCoolingOff } from './coolingOff';

let seq = 0;
function txn(
  date: string,
  category: string,
  amountBase: number,
  type: 'income' | 'expense' = 'expense',
): EngineTransaction {
  seq += 1;
  return { id: `t${seq}`, date: `${date}T12:00:00Z`, type, category, amountBase };
}

/** Salary on the 25th + a healthy shopping history of ~20-40 each. */
function fixture(): EngineTransaction[] {
  const out: EngineTransaction[] = [
    txn('2026-05-25', 'salary', 1500, 'income'),
    txn('2026-06-25', 'salary', 1500, 'income'),
  ];
  for (let d = 1; d <= 12; d++) {
    out.push(txn(`2026-06-${String(d).padStart(2, '0')}`, 'shopping', 20 + d));
  }
  return out;
}

const candidate = (date: string, amountBase: number, category: string | null = 'shopping') => ({
  category,
  amountBase,
  date: new Date(`${date}T12:00:00Z`),
});

describe('checkCoolingOff', () => {
  it('triggers on a big discretionary purchase right after payday', () => {
    const check = checkCoolingOff({
      transactions: fixture(),
      candidate: candidate('2026-06-26', 150),
    });
    expect(check.triggered).toBe(true);
    expect(check.basis!.daysSinceIncome).toBeLessThan(3);
    expect(check.basis!.sampleCount).toBeGreaterThanOrEqual(MIN_CATEGORY_SAMPLES);
    expect(check.basis!.categoryP90).toBeLessThan(150);
  });

  it('stays silent below the category P90', () => {
    expect(
      checkCoolingOff({ transactions: fixture(), candidate: candidate('2026-06-26', 25) })
        .triggered,
    ).toBe(false);
  });

  it('stays silent outside the 72h post-income window', () => {
    expect(
      checkCoolingOff({ transactions: fixture(), candidate: candidate('2026-06-15', 150) })
        .triggered,
    ).toBe(false);
    // Day 3 exactly is already outside (window is [0, 3)).
    expect(
      checkCoolingOff({ transactions: fixture(), candidate: candidate('2026-06-28', 150) })
        .triggered,
    ).toBe(false);
  });

  it('never judges committed categories', () => {
    expect(
      checkCoolingOff({
        transactions: fixture(),
        candidate: candidate('2026-06-26', 500, 'bills'),
      }).triggered,
    ).toBe(false);
    expect(
      checkCoolingOff({
        transactions: fixture(),
        candidate: candidate('2026-06-26', 500, null),
      }).triggered,
    ).toBe(false);
  });

  it('needs a real distribution before it has an opinion', () => {
    const thin = [
      txn('2026-06-25', 'salary', 1500, 'income'),
      txn('2026-06-10', 'shopping', 30),
      txn('2026-06-12', 'shopping', 25),
    ];
    expect(
      checkCoolingOff({ transactions: thin, candidate: candidate('2026-06-26', 300) }).triggered,
    ).toBe(false);
  });

  it('small refunds do not open an impulse window', () => {
    const txns = fixture();
    // A 40-unit "income" (refund) yesterday must not count as payday...
    txns.push(txn('2026-07-08', 'other-income', 40, 'income'));
    const check = checkCoolingOff({
      transactions: txns,
      candidate: candidate('2026-07-09', 150),
    });
    // ...so with the real payday (Jun 25) two weeks past, no trigger.
    expect(check.triggered).toBe(false);
  });

  it('no income history means no window at all', () => {
    const txns = fixture().filter((t) => t.type !== 'income');
    expect(
      checkCoolingOff({ transactions: txns, candidate: candidate('2026-06-26', 150) }).triggered,
    ).toBe(false);
  });
});

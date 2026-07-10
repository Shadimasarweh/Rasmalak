import { describe, expect, it } from 'vitest';

import { EngineTransaction } from './engineTypes';
import {
  PeerStats,
  approximatePercentile,
  ownSavingsRate,
  placement,
} from './peerBenchmark';

const NOW = new Date('2026-07-10T12:00:00Z');
const STATS: PeerStats = { cohortSize: 100, p25: 0.05, p50: 0.15, p75: 0.3 };

let seq = 0;
function txn(date: string, amountBase: number, type: 'income' | 'expense', category = 'food'): EngineTransaction {
  seq += 1;
  return { id: `t${seq}`, date: `${date}T12:00:00Z`, type, category, amountBase };
}

describe('ownSavingsRate', () => {
  it('matches the cohort definition: 1 − consumption/income, goal transfers saved', () => {
    const rate = ownSavingsRate(
      [
        txn('2026-06-01', 1000, 'income', 'salary'),
        txn('2026-06-10', 700, 'expense'),
        txn('2026-06-15', 100, 'expense', 'goal-funding-x'), // saved, not spent
      ],
      NOW,
    );
    expect(rate).toBeCloseTo(0.3, 5);
  });

  it('ignores transactions outside the 90-day window', () => {
    const rate = ownSavingsRate(
      [
        txn('2026-01-01', 5000, 'income', 'salary'), // stale
        txn('2026-06-01', 1000, 'income', 'salary'),
        txn('2026-06-10', 800, 'expense'),
      ],
      NOW,
    );
    expect(rate).toBeCloseTo(0.2, 5);
  });

  it('is null without income, clamped when spending dwarfs income', () => {
    expect(ownSavingsRate([txn('2026-06-10', 500, 'expense')], NOW)).toBeNull();
    expect(
      ownSavingsRate(
        [txn('2026-06-01', 100, 'income', 'salary'), txn('2026-06-10', 5000, 'expense')],
        NOW,
      ),
    ).toBe(-1);
  });
});

describe('approximatePercentile + placement', () => {
  it('pins the known percentile points', () => {
    expect(approximatePercentile(STATS.p25, STATS)).toBe(25);
    expect(approximatePercentile(STATS.p50, STATS)).toBe(50);
    expect(approximatePercentile(STATS.p75, STATS)).toBe(75);
  });

  it('interpolates between points and clamps at the tails', () => {
    const mid = approximatePercentile(0.1, STATS); // halfway p25→p50
    expect(mid).toBe(38); // 25 + 12.5 rounded
    expect(approximatePercentile(-1, STATS)).toBe(1);
    expect(approximatePercentile(1, STATS)).toBe(99);
  });

  it('is monotone in the rate', () => {
    let prev = -1;
    for (let rate = -1; rate <= 1.0001; rate += 0.05) {
      const pct = approximatePercentile(rate, STATS);
      expect(pct).toBeGreaterThanOrEqual(prev);
      prev = pct;
    }
  });

  it('maps percentiles to placements', () => {
    expect(placement(90)).toBe('top_quartile');
    expect(placement(60)).toBe('above_median');
    expect(placement(30)).toBe('below_median');
    expect(placement(10)).toBe('bottom_quartile');
  });
});

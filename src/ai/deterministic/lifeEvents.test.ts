import { describe, expect, it } from 'vitest';

import { EngineTransaction } from './engineTypes';
import { detectLifeEvents } from './lifeEvents';

const NOW = new Date('2026-07-12T12:00:00Z');
let seq = 0;
const txn = (date: string, category: string, amountBase: number): EngineTransaction => (
  { id: `t${++seq}`, date: `${date}T12:00:00Z`, type: 'expense', category, amountBase }
);

/** food 900/month across the whole window (the stable backdrop). */
function backdrop(): EngineTransaction[] {
  const out: EngineTransaction[] = [];
  for (let m = 1; m <= 8; m++) {
    const d = new Date(Date.UTC(2026, 6 - m, 10, 12)); // m=1 → June (last completed)
    out.push(txn(d.toISOString().slice(0, 10), 'food', 900));
  }
  return out;
}

describe('detectLifeEvents', () => {
  it('flags a category that appears from nowhere and sustains real share', () => {
    const events = detectLifeEvents(
      [...backdrop(), txn('2026-06-05', 'education', 150), txn('2026-05-05', 'education', 150)],
      NOW,
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: 'new_category', categoryId: 'education' });
    expect(events[0].evidence.recentSharePct).toBeGreaterThanOrEqual(5);
  });

  it('stays silent for one-month blips and historically-present categories', () => {
    // Blip: only the latest month.
    expect(
      detectLifeEvents([...backdrop(), txn('2026-06-05', 'education', 150)], NOW),
    ).toEqual([]);
    // Historically present: education existed in the prior window too.
    expect(
      detectLifeEvents(
        [...backdrop(), txn('2026-06-05', 'education', 150), txn('2026-05-05', 'education', 150), txn('2026-01-05', 'education', 100)],
        NOW,
      ),
    ).toEqual([]);
  });

  it('flags a sustained housing jump', () => {
    const txns = [...backdrop()];
    for (let m = 3; m <= 8; m++) {
      const d = new Date(Date.UTC(2026, 6 - m, 1, 12)); // m=3..8 → Apr..Nov (prior window)
      txns.push(txn(d.toISOString().slice(0, 10), 'housing', 400));
    }
    txns.push(txn('2026-06-01', 'housing', 560), txn('2026-05-01', 'housing', 560));
    const events = detectLifeEvents(txns, NOW);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: 'housing_jump' });
    expect(events[0].evidence.priorMonthlyAvg).toBe(400);
    expect(events[0].evidence.recentMonthlyAvg).toBe(560);
  });

  it('needs a real prior history before calling anything a change', () => {
    expect(
      detectLifeEvents(
        [txn('2026-06-05', 'education', 150), txn('2026-05-05', 'education', 150)],
        NOW,
      ),
    ).toEqual([]);
  });
});

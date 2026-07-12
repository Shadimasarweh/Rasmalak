import { describe, expect, it } from 'vitest';

import { HAJJ_COST_PRIORS, buildHajjGoalTemplate } from './hajjTemplate';
import { hijriParts, DHU_AL_HIJJAH_MONTH } from './hijri';

const NOW = new Date('2026-07-12T12:00:00Z'); // Muharram 1448

describe('buildHajjGoalTemplate', () => {
  it('anchors the deadline to 1 Dhu al-Hijjah two hijri years out', () => {
    const t = buildHajjGoalTemplate({ countryCode: 'JO', now: NOW });
    expect(t.targetHijriYear).toBe(1450);
    const parts = hijriParts(new Date(`${t.deadlineIso}T12:00:00Z`));
    expect(parts).toEqual({ year: 1450, month: DHU_AL_HIJJAH_MONTH, day: 1 });
    expect(t.targetAmount).toBe(HAJJ_COST_PRIORS.JO.amount);
    expect(t.currency).toBe('JOD');
    expect(t.nameAr).toContain('1450');
  });

  it('unknown countries get the USD default', () => {
    const t = buildHajjGoalTemplate({ countryCode: 'OTHER', now: NOW });
    expect(t.currency).toBe('USD');
    expect(t.targetAmount).toBeGreaterThan(0);
  });

  it('every prior is positive with a currency', () => {
    for (const [code, prior] of Object.entries(HAJJ_COST_PRIORS)) {
      expect(prior.amount, code).toBeGreaterThan(0);
      expect(prior.currency).toMatch(/^[A-Z]{3}$/);
    }
  });
});

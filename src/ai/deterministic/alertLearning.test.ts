import { describe, expect, it } from 'vitest';

import {
  AlertEngagement,
  RETRY_AFTER_DAYS,
  SUPPRESS_MIN_SHOWN,
  overallDismissRate,
  recordAlertEvent,
  shouldSuppressAlert,
} from './alertLearning';

const NOW = new Date('2026-07-10T12:00:00Z');

function ignoredType(shown = 6, dismissed = 6, lastShownAt = NOW.toISOString()): AlertEngagement {
  return { budget_warning: { shown, dismissed, actedOn: 0, lastShownAt } };
}

describe('recordAlertEvent', () => {
  it('accumulates immutably per type', () => {
    const a = recordAlertEvent({}, 'budget_warning', 'shown', NOW);
    const b = recordAlertEvent(a, 'budget_warning', 'dismissed', NOW);
    const c = recordAlertEvent(b, 'goal_progress', 'acted', NOW);

    expect(a.budget_warning.shown).toBe(1);
    expect(b.budget_warning.dismissed).toBe(1);
    expect(c.goal_progress.actedOn).toBe(1);
    expect(a).not.toBe(b); // no mutation
    expect(b.budget_warning.lastShownAt).toBe(NOW.toISOString());
  });
});

describe('shouldSuppressAlert', () => {
  it('suppresses a consistently-ignored type', () => {
    expect(shouldSuppressAlert('budget_warning', 'warning', ignoredType(), NOW)).toBe(true);
  });

  it('needs a real sample before judging', () => {
    expect(
      shouldSuppressAlert('budget_warning', 'warning', ignoredType(SUPPRESS_MIN_SHOWN - 1, 4), NOW),
    ).toBe(false);
    expect(shouldSuppressAlert('budget_warning', 'warning', {}, NOW)).toBe(false);
  });

  it('one act-on rescues the type forever', () => {
    const engagement: AlertEngagement = {
      budget_warning: { shown: 10, dismissed: 9, actedOn: 1, lastShownAt: NOW.toISOString() },
    };
    expect(shouldSuppressAlert('budget_warning', 'warning', engagement, NOW)).toBe(false);
  });

  it('moderate dismissal is not apathy', () => {
    expect(shouldSuppressAlert('budget_warning', 'warning', ignoredType(10, 7), NOW)).toBe(false);
  });

  it('critical severity is never muted', () => {
    expect(shouldSuppressAlert('budget_warning', 'critical', ignoredType(20, 20), NOW)).toBe(false);
  });

  it('a long-quiet type earns another appearance', () => {
    const old = new Date(NOW.getTime() - (RETRY_AFTER_DAYS + 1) * 86_400_000).toISOString();
    expect(shouldSuppressAlert('budget_warning', 'warning', ignoredType(6, 6, old), NOW)).toBe(false);
  });
});

describe('overallDismissRate', () => {
  it('aggregates across types and rounds', () => {
    const engagement: AlertEngagement = {
      a: { shown: 6, dismissed: 6, actedOn: 0, lastShownAt: null },
      b: { shown: 4, dismissed: 1, actedOn: 2, lastShownAt: null },
    };
    expect(overallDismissRate(engagement)).toBe(0.7);
    expect(overallDismissRate({})).toBeNull();
  });
});

/**
 * Alert learning — engine roadmap Phase 3, item 13.
 *
 * The static alert rules fire on thresholds; this module learns which
 * alert TYPES a specific user consistently ignores and mutes them —
 * an alert stream that's 80% noise trains the user to ignore the 20%
 * that matters. Suppression is deliberately conservative:
 *
 * - only after a real sample (≥5 shown),
 * - only when dismissal is near-total (≥80%) AND the user never once
 *   acted on that type,
 * - never for critical severity (money-losing alerts don't get muted
 *   by apathy),
 * - and never forever: after 60 quiet days the type gets another shot,
 *   because circumstances change.
 *
 * Pure reducers over a plain record — persistence and UI wiring live
 * in the store layer.
 */

export interface AlertTypeStats {
  shown: number;
  dismissed: number;
  actedOn: number;
  lastShownAt: string | null; // ISO
}

export type AlertEngagement = Record<string, AlertTypeStats>;

export type AlertEvent = 'shown' | 'dismissed' | 'acted';

export const SUPPRESS_MIN_SHOWN = 5;
export const SUPPRESS_DISMISS_RATE = 0.8;
export const RETRY_AFTER_DAYS = 60;

const EMPTY_STATS: AlertTypeStats = {
  shown: 0,
  dismissed: 0,
  actedOn: 0,
  lastShownAt: null,
};

export function recordAlertEvent(
  engagement: AlertEngagement,
  type: string,
  event: AlertEvent,
  now: Date = new Date(),
): AlertEngagement {
  const stats = { ...(engagement[type] ?? EMPTY_STATS) };
  if (event === 'shown') {
    stats.shown += 1;
    stats.lastShownAt = now.toISOString();
  } else if (event === 'dismissed') {
    stats.dismissed += 1;
  } else {
    stats.actedOn += 1;
  }
  return { ...engagement, [type]: stats };
}

export function shouldSuppressAlert(
  type: string,
  severity: 'info' | 'warning' | 'critical' | 'positive',
  engagement: AlertEngagement,
  now: Date = new Date(),
): boolean {
  if (severity === 'critical') return false;
  const stats = engagement[type];
  if (!stats || stats.shown < SUPPRESS_MIN_SHOWN) return false;
  if (stats.actedOn > 0) return false;
  if (stats.dismissed / stats.shown < SUPPRESS_DISMISS_RATE) return false;

  // Cool-down: a long-quiet type earns one more appearance.
  if (stats.lastShownAt) {
    const quietDays = (now.getTime() - new Date(stats.lastShownAt).getTime()) / 86_400_000;
    if (quietDays >= RETRY_AFTER_DAYS) return false;
  }
  return true;
}

/** Overall dismissal rate across types — feeds the existing
 * EngagementSignals.insightDismissRate field. */
export function overallDismissRate(engagement: AlertEngagement): number | null {
  let shown = 0;
  let dismissed = 0;
  for (const stats of Object.values(engagement)) {
    shown += stats.shown;
    dismissed += stats.dismissed;
  }
  if (shown === 0) return null;
  return Math.round((dismissed / shown) * 100) / 100;
}

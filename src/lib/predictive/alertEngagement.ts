/**
 * Alert-engagement persistence (Phase 3, item 13).
 *
 * The engagement record lives in localStorage (instant, per-user) and
 * flushes into user_semantic_state.engagement_signals at most once per
 * local day — the AI layer reads memory, not localStorage, so the
 * flush is what lets Mustasharak know "this user ignores budget
 * warnings". Everything here is fail-open: alert plumbing must never
 * break the UI.
 */

import { supabase } from '@/lib/supabaseClient';
import {
  AlertEngagement,
  AlertEvent,
  overallDismissRate,
  recordAlertEvent,
} from '@/ai/deterministic/alertLearning';

const storageKey = (userId: string) => `rasmalak:alert-engagement:${userId}`;
const flushStampKey = (userId: string) => `rasmalak:alert-engagement-flushed:${userId}`;

export function loadEngagement(userId: string): AlertEngagement {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as AlertEngagement) : {};
  } catch {
    return {};
  }
}

export function trackAlertEvent(userId: string, type: string, event: AlertEvent): void {
  if (typeof window === 'undefined') return;
  try {
    const next = recordAlertEvent(loadEngagement(userId), type, event);
    window.localStorage.setItem(storageKey(userId), JSON.stringify(next));
    void maybeFlush(userId, next);
  } catch {
    // fail-open
  }
}

async function maybeFlush(userId: string, engagement: AlertEngagement): Promise<void> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    if (window.localStorage.getItem(flushStampKey(userId)) === today) return;

    const { data } = await supabase
      .from('user_semantic_state')
      .select('engagement_signals')
      .eq('user_id', userId)
      .maybeSingle();
    const existing = (data?.engagement_signals as Record<string, unknown>) ?? {};

    const { error } = await supabase
      .from('user_semantic_state')
      .update({
        engagement_signals: {
          ...existing,
          alertEngagement: engagement,
          insightDismissRate: overallDismissRate(engagement),
          lastInteractionAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    if (!error) {
      window.localStorage.setItem(flushStampKey(userId), today);
    }
  } catch {
    // fail-open — next event retries the flush
  }
}

/**
 * Nightly predictive recompute — engine roadmap Phase 3, item 11.
 *
 * Wired to Vercel Cron via `vercel.json`. Sweeps users server-side
 * (service-role client) and refreshes exactly what the client sync
 * writes — recurring_series, category_baselines, prediction_log — via
 * the SAME `syncPredictiveState` / `reconcileDuePredictions` code and
 * natural keys, so a user who doesn't open the app for a month still
 * gets forecasts written at cycle boundaries and past predictions
 * scored on time (the ledger's honesty depends on writing forecasts
 * BEFORE their horizon, not when the user happens to log in).
 *
 * What it deliberately does NOT do:
 * - behavioural-memory writes (user_semantic_state) — session-scoped
 *   semantics, not a batch job's business (includeMemory: false);
 * - goal-contribution-aware Safe-to-Spend — that stays a client
 *   computation; nothing this job persists depends on it.
 *
 * Fail-open per user: one user's bad data must not starve the sweep.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { computePredictiveState } from '@/ai/deterministic/predictiveState';
import type { EngineTransaction } from '@/ai/deterministic/engineTypes';
import { reconcileDuePredictions, syncPredictiveState } from '@/lib/predictive/service';

export const dynamic = 'force-dynamic';
// Vercel function ceiling; the sweep self-limits well below it.
export const maxDuration = 300;

const USER_BATCH = 100;
const MAX_USERS_PER_RUN = 500;
// Leave headroom before maxDuration so a slow user can't hit the wall.
const TIME_BUDGET_MS = 240_000;

interface ProfileRow {
  id: string;
  persona: string | null;
  monthly_income: number | null;
  payday_day_of_month: number | null;
}

function engineTxnsFromRows(rows: Record<string, unknown>[]): EngineTransaction[] {
  return rows.map((r) => ({
    id: String(r.id),
    date: String(r.date),
    type: r.type === 'income' ? 'income' : 'expense',
    category: (r.category as string | null) ?? null,
    amountBase: Number(r.amount_base ?? 0),
    isRecurring: Boolean(r.is_recurring),
    recurringEndDate: (r.recurring_end_date as string | null) ?? null,
  }));
}

export async function GET(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const db = getSupabaseServerClient();
  const startedAt = Date.now();
  let usersProcessed = 0;
  let usersSkipped = 0;
  let reconciledTotal = 0;
  const failures: string[] = [];

  for (let offset = 0; offset < MAX_USERS_PER_RUN; offset += USER_BATCH) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) break;

    const { data: profiles, error } = await db
      .from('profiles')
      .select('id, persona, monthly_income, payday_day_of_month')
      .order('id')
      .range(offset, offset + USER_BATCH - 1);
    if (error) {
      failures.push(`profiles page ${offset}: ${error.message}`);
      break;
    }
    if (!profiles || profiles.length === 0) break;

    for (const profile of profiles as unknown as ProfileRow[]) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) break;
      try {
        const { data: txRows, error: txError } = await db
          .from('transactions')
          .select('id, date, type, category, amount_base, is_recurring, recurring_end_date')
          .eq('user_id', profile.id)
          .order('date', { ascending: true });
        if (txError) throw new Error(txError.message);

        const txns = engineTxnsFromRows((txRows ?? []) as Record<string, unknown>[]);
        if (txns.length === 0) {
          usersSkipped++;
          continue;
        }

        const currentBalance = txns.reduce(
          (sum, t) => sum + (t.type === 'income' ? Math.abs(t.amountBase) : -Math.abs(t.amountBase)),
          0,
        );
        const persona = profile.persona;
        const state = computePredictiveState({
          transactions: txns,
          currentBalance,
          profileFallback: {
            persona:
              persona === 'salaried' || persona === 'variable' || persona === 'student'
                ? persona
                : null,
            monthlyIncome:
              profile.monthly_income != null && Number.isFinite(Number(profile.monthly_income))
                ? Number(profile.monthly_income)
                : null,
          },
          paydayOverride: profile.payday_day_of_month,
          // Ledger + series + baselines don't depend on goal funding;
          // Safe-to-Spend (which does) is not persisted by this job.
          plannedGoalContributionsMonthly: 0,
        });

        if (!state.meta.hasMinimumHistory) {
          usersSkipped++;
          continue;
        }

        const { reconciled } = await reconcileDuePredictions(profile.id, txns, new Date(), db);
        reconciledTotal += reconciled;
        await syncPredictiveState(profile.id, state, { client: db, includeMemory: false });
        usersProcessed++;
      } catch (e) {
        failures.push(`${profile.id}: ${e instanceof Error ? e.message : String(e)}`);
        if (failures.length >= 20) break; // systemic problem — stop, report
      }
    }

    if (profiles.length < USER_BATCH) break;
  }

  return NextResponse.json({
    usersProcessed,
    usersSkipped,
    reconciled: reconciledTotal,
    failures: failures.slice(0, 10),
    elapsedMs: Date.now() - startedAt,
  });
}

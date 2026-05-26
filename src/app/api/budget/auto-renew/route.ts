/**
 * POST /api/budget/auto-renew
 *
 * Monthly cron that creates the new month's `budget_cycles` row
 * for every user, copying the previous month's caps so users hit
 * Day 1 with their plan already populated. Per "Emergency funds
 * and Savings Goals.docx":
 *
 *   "When a budget is generated (either manually by the user or
 *    auto-renewed at the start of the month), the system must
 *    query the Goals database for all active goals."
 *
 * The query for goals happens at READ time on the Plan page (the
 * savings line builder). This route's job is just to make sure
 * the new month's caps row exists. The lazy-create path in
 * `budgetCyclesStore.tsx` is the safety net for users not online
 * when this cron runs.
 *
 * Wired in `vercel.json` to fire at 00:01 UTC on the 1st of each
 * month. Auth is via the `CRON_SECRET` env var, identical pattern
 * to /api/fx/refresh.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

function currentMonthYear(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function previousMonthYear(now: Date = new Date()): string {
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return currentMonthYear(prev);
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret) {
    const auth = request.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = getSupabaseServerClient();
  const newMonth = currentMonthYear();
  const prevMonth = previousMonthYear();

  // Pull every distinct user_id in budget_cycles. Any user without
  // a cycle history (e.g. brand-new signups) will get their first
  // cycle on first dashboard load via the lazy-create path.
  const { data: prevCycles, error: prevErr } = await supabase
    .from('budget_cycles')
    .select('user_id, monthly_budget, category_budgets, currency_native')
    .eq('month_year', prevMonth);

  if (prevErr) {
    return NextResponse.json({ error: prevErr.message }, { status: 500 });
  }

  if (!prevCycles || prevCycles.length === 0) {
    return NextResponse.json({ renewed: 0, message: 'No prior cycles to renew' });
  }

  const rows = prevCycles.map((c) => ({
    user_id: c.user_id,
    month_year: newMonth,
    monthly_budget: c.monthly_budget,
    category_budgets: c.category_budgets ?? {},
    currency_native: c.currency_native ?? 'SAR',
  }));

  const { error: insertErr } = await supabase
    .from('budget_cycles')
    .upsert(rows, { onConflict: 'user_id,month_year', ignoreDuplicates: true });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ renewed: rows.length, newMonth, prevMonth });
}

// Vercel Cron uses GET — alias to POST so the same handler runs.
export async function GET(request: NextRequest) {
  return POST(request);
}

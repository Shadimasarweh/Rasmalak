/**
 * POST /api/auto-budget/refine
 *
 * Optionally enriches the deterministic auto-budget suggestion with one
 * sentence of LLM-generated rationale per category. Always returns the
 * deterministic baseline; rationales are best-effort.
 *
 * The Plan tab calls this on demand. If the `aiAutoBudget` flag in
 * src/ai/config.ts is off, this endpoint returns immediately with empty
 * rationales — no LLM round-trip.
 */

import { NextRequest, NextResponse } from 'next/server';
import { refineAutoBudget } from '@/ai/autoBudget/refineWithAI';
import type { AutoBudgetResult } from '@/lib/autoBudget';

export const dynamic = 'force-dynamic';

interface Body {
  baseline: AutoBudgetResult;
  language?: 'en' | 'ar';
  monthlyIncome?: number;
  activeSavingsGoals?: Array<{ name: string; monthlyContribution: number }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    if (!body || !body.baseline || !body.baseline.byCategory) {
      return NextResponse.json({ error: 'Invalid baseline' }, { status: 400 });
    }
    const result = await refineAutoBudget({
      baseline: body.baseline,
      language: body.language ?? 'en',
      monthlyIncome: body.monthlyIncome,
      activeSavingsGoals: body.activeSavingsGoals,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Refine failed',
      },
      { status: 500 },
    );
  }
}

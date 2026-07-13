/**
 * Ramadan & Eid spending seasonality — predictive engine Phase 2, item 8,
 * feeding the "وضع رمضان" (Ramadan mode) surface (individual roadmap C2).
 *
 * The honest core: a year-2 user's plan comes from THEIR OWN prior-year
 * Ramadan — per-category daily spend inside last Ramadan's window versus
 * the 90 days before it. A year-1 user (no prior-Ramadan coverage) gets
 * conservative population priors, clearly labelled as such. No LLM, no
 * lookup services — pure arithmetic over `amountBase` (currency rule).
 *
 * Everything is expressed as multiplicative factors on a category's
 * normal budget, because that is what the surface applies: "groceries
 * usually run X — during Ramadan yours ran 1.4×."
 */

import {
  DateWindow,
  currentOrNextRamadan,
  daysUntilWindow,
  eidAlFitrWindow,
  hijriParts,
  isDuring,
  ramadanWindow,
  utcNoon,
} from './hijri';
import { EngineTransaction, isGoalFunding } from './engineTypes';

export type AdjustmentSource = 'personal' | 'population_prior';
export type AdjustmentConfidence = 'high' | 'medium' | 'low';

export interface RamadanCategoryAdjustment {
  categoryId: string;
  /** Multiply the category's normal monthly budget by this during Ramadan. */
  factor: number;
  source: AdjustmentSource;
  confidence: AdjustmentConfidence;
  basis: {
    ramadanDaily?: number;
    baselineDaily?: number;
    ramadanTxnCount?: number;
    baselineTxnCount?: number;
    priorRamadanHijriYear?: number;
  };
}

export interface EidEnvelopeSuggestion {
  /** Suggested set-aside for the Eid al-Fitr days, in base currency. */
  suggestedAmount: number;
  source: AdjustmentSource;
  priorEidSpend?: number;
}

export interface RamadanPlan {
  /** The Ramadan this plan is FOR (ongoing or next). */
  ramadan: DateWindow;
  hijriYear: number;
  daysUntilStart: number; // 0 while Ramadan is ongoing
  source: AdjustmentSource;
  adjustments: RamadanCategoryAdjustment[];
  eidEnvelope: EidEnvelopeSuggestion | null;
  meta: {
    hasPriorRamadanCoverage: boolean;
    priorRamadanHijriYear: number;
    baselineWindowDays: number;
  };
}

// ── Tunables ──────────────────────────────────────────────────────────

/** Baseline = this many days immediately before the prior Ramadan.
 * Sits entirely before the month, so Eid spending never contaminates it. */
export const BASELINE_LOOKBACK_DAYS = 90;

/** A category needs at least this many transactions on each side before
 * its personal factor is trusted at all. */
export const MIN_TXNS_PER_SIDE = 3;
export const HIGH_CONFIDENCE_TXNS = 8;

/** Factors are clamped: a single anomalous month must not tell a user
 * to quadruple their grocery budget. */
export const FACTOR_MIN = 0.5;
export const FACTOR_MAX = 3.0;

/** Suggestions flatter than this are noise — omitted from the plan. */
export const MIN_MEANINGFUL_SHIFT = 0.1;

/**
 * Conservative population priors for year-1 users (no personal prior
 * Ramadan). Directionally uncontroversial for the region: groceries and
 * Eid-prep shopping rise, transport and entertainment fall during the
 * fasting month. Flat categories are simply absent. Confidence is
 * always 'low' — the surface must present these as generic guidance,
 * never as "your pattern".
 */
export const RAMADAN_POPULATION_PRIORS: Record<string, number> = {
  food: 1.3,
  shopping: 1.2,
  personal: 1.1,
  transport: 0.85,
  entertainment: 0.75,
};

/** Year-1 Eid envelope prior, as a share of monthly expense budget —
 * applied by the surface against whatever total it knows. Kept here so
 * the number is versioned with the engine, not the UI. */
export const EID_ENVELOPE_PRIOR_SHARE = 0.08;

const round2 = (n: number) => Math.round(n * 100) / 100;

interface SideStats {
  daily: number;
  txnCount: number;
}

function sideStats(
  txns: EngineTransaction[],
  from: Date,
  toExclusive: Date,
): Map<string, SideStats> {
  const days = Math.max(
    1,
    Math.round((toExclusive.getTime() - from.getTime()) / 86_400_000),
  );
  const sums = new Map<string, { total: number; count: number }>();
  for (const t of txns) {
    if (t.type !== 'expense' || !t.category || isGoalFunding(t.category)) continue;
    const at = utcNoon(new Date(t.date)).getTime();
    if (at < from.getTime() || at >= toExclusive.getTime()) continue;
    const entry = sums.get(t.category) ?? { total: 0, count: 0 };
    entry.total += Math.abs(t.amountBase);
    entry.count += 1;
    sums.set(t.category, entry);
  }
  const out = new Map<string, SideStats>();
  for (const [cat, { total, count }] of sums) {
    out.set(cat, { daily: total / days, txnCount: count });
  }
  return out;
}

function earliestTxnTime(txns: EngineTransaction[]): number | null {
  let min: number | null = null;
  for (const t of txns) {
    const at = utcNoon(new Date(t.date)).getTime();
    if (min === null || at < min) min = at;
  }
  return min;
}

function personalAdjustments(
  txns: EngineTransaction[],
  priorRamadan: DateWindow,
  priorHijriYear: number,
): RamadanCategoryAdjustment[] {
  const baselineStart = new Date(
    priorRamadan.start.getTime() - BASELINE_LOOKBACK_DAYS * 86_400_000,
  );
  const baseline = sideStats(txns, baselineStart, priorRamadan.start);
  const ramadan = sideStats(txns, priorRamadan.start, priorRamadan.endExclusive);

  const adjustments: RamadanCategoryAdjustment[] = [];
  for (const [categoryId, r] of ramadan) {
    const b = baseline.get(categoryId);
    if (!b || b.daily <= 0) continue;
    if (r.txnCount < MIN_TXNS_PER_SIDE || b.txnCount < MIN_TXNS_PER_SIDE) continue;

    const raw = r.daily / b.daily;
    const factor = round2(Math.min(FACTOR_MAX, Math.max(FACTOR_MIN, raw)));
    if (Math.abs(factor - 1) < MIN_MEANINGFUL_SHIFT) continue;

    adjustments.push({
      categoryId,
      factor,
      source: 'personal',
      confidence:
        r.txnCount >= HIGH_CONFIDENCE_TXNS && b.txnCount >= HIGH_CONFIDENCE_TXNS
          ? 'high'
          : 'medium',
      basis: {
        ramadanDaily: round2(r.daily),
        baselineDaily: round2(b.daily),
        ramadanTxnCount: r.txnCount,
        baselineTxnCount: b.txnCount,
        priorRamadanHijriYear: priorHijriYear,
      },
    });
  }
  // Largest shifts first — the surface shows the top few.
  return adjustments.sort(
    (a, c) => Math.abs(c.factor - 1) - Math.abs(a.factor - 1),
  );
}

function priorAdjustments(): RamadanCategoryAdjustment[] {
  return Object.entries(RAMADAN_POPULATION_PRIORS).map(([categoryId, factor]) => ({
    categoryId,
    factor,
    source: 'population_prior' as const,
    confidence: 'low' as const,
    basis: {},
  }));
}

function personalEidEnvelope(
  txns: EngineTransaction[],
  priorHijriYear: number,
): EidEnvelopeSuggestion | null {
  const eid = eidAlFitrWindow(priorHijriYear);
  let total = 0;
  let count = 0;
  for (const t of txns) {
    if (t.type !== 'expense' || isGoalFunding(t.category)) continue;
    if (!isDuring(new Date(t.date), eid)) continue;
    total += Math.abs(t.amountBase);
    count += 1;
  }
  if (count === 0 || total <= 0) return null;
  // Round UP to the next 5 — an envelope that comes up short defeats
  // its purpose.
  const suggested = Math.ceil(total / 5) * 5;
  return { suggestedAmount: suggested, source: 'personal', priorEidSpend: round2(total) };
}

/**
 * Build the Ramadan plan for the upcoming (or ongoing) Ramadan.
 *
 * `now` is injectable so surfaces and tests can pin the clock; the
 * transactions array is whatever the caller already holds in the store —
 * no I/O happens here.
 */
export function buildRamadanPlan(input: {
  transactions: EngineTransaction[];
  now: Date;
}): RamadanPlan {
  const { transactions, now } = input;
  const upcoming = currentOrNextRamadan(now);
  const upcomingHijriYear = hijriParts(upcoming.start).year;
  const priorHijriYear = upcomingHijriYear - 1;
  const priorRamadan = ramadanWindow(priorHijriYear);

  const baselineStartTime =
    priorRamadan.start.getTime() - BASELINE_LOOKBACK_DAYS * 86_400_000;
  const earliest = earliestTxnTime(transactions);
  const hasPriorRamadanCoverage =
    earliest !== null && earliest <= baselineStartTime;

  let adjustments = hasPriorRamadanCoverage
    ? personalAdjustments(transactions, priorRamadan, priorHijriYear)
    : [];
  let source: AdjustmentSource = 'personal';

  // Coverage without signal (e.g. barely any categorised spend around
  // last Ramadan) degrades to priors too — an empty personal plan helps
  // no one, and the label keeps it honest.
  if (adjustments.length === 0) {
    adjustments = priorAdjustments();
    source = 'population_prior';
  }

  const eidEnvelope = hasPriorRamadanCoverage
    ? personalEidEnvelope(transactions, priorHijriYear)
    : null;

  return {
    ramadan: upcoming,
    hijriYear: upcomingHijriYear,
    daysUntilStart: daysUntilWindow(now, upcoming),
    source,
    adjustments,
    eidEnvelope,
    meta: {
      hasPriorRamadanCoverage,
      priorRamadanHijriYear: priorHijriYear,
      baselineWindowDays: BASELINE_LOOKBACK_DAYS,
    },
  };
}

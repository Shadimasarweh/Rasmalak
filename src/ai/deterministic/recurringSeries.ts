/**
 * Recurring-series detection — predictive engine Phase 1, item 1.
 *
 * Clusters transactions into repeating series (rent, salary, subscriptions,
 * remittances…), infers cadence from the median inter-occurrence interval
 * with MAD tolerance, and predicts the next due date. Everything downstream
 * (salary detection, cash-flow forecast, safe-to-spend) builds on this.
 *
 * Pure function over EngineTransaction[] — no I/O, injectable `now`.
 */

import { median, mad } from './stats';
import {
  dateToDayNumber,
  dayOfMonth,
  isoAddDays,
  isoAddMonthsClamped,
  isoToDayNumber,
} from './dates';
import type { EngineTransaction } from './engineTypes';

export type Cadence = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringSeries {
  // Natural key, stable across recomputes — the Supabase upsert key.
  key: string;
  direction: 'income' | 'expense';
  categoryId: string;
  subcategoryId: string | null;
  // Most frequent raw description (original Arabic/casing) for display.
  merchantLabel: string;
  cadence: Cadence;
  medianIntervalDays: number;
  intervalMadDays: number;
  amountMedian: number; // base currency, absolute
  amountMad: number;
  // monthly/quarterly/yearly only: median day-of-month of recent occurrences.
  anchorDayOfMonth: number | null;
  firstDate: string;
  lastDate: string;
  nextDueDate: string;
  occurrences: number;
  confidence: number; // 0..1
  confidenceGrade: 'low' | 'medium' | 'high';
  active: boolean;
  source: 'detected' | 'user_flag' | 'both';
  // Newest first, capped — explainability + discretionary-residual filtering.
  memberTransactionIds: string[];
}

export interface DetectSeriesOptions {
  now?: Date;
  windowMonths?: number;
}

export const DEFAULT_WINDOW_MONTHS = 15;
export const MIN_OCCURRENCES = 3;
export const MIN_OCCURRENCES_FLAGGED = 2;
// A "single bill" whose amounts vary more than this (in MAD/median terms) is
// noise, not a series — unless the user explicitly flagged it recurring.
export const AMOUNT_NOISE_LIMIT = 0.35;
export const MEMBER_ID_CAP = 60;

interface CadenceBand {
  cadence: Cadence;
  min: number;
  max: number;
  tol: number;
  stepMonths?: number;
}

export const CADENCE_BANDS: CadenceBand[] = [
  { cadence: 'weekly', min: 5, max: 9, tol: 2 },
  { cadence: 'biweekly', min: 11, max: 17, tol: 3 },
  { cadence: 'monthly', min: 26, max: 35, tol: 5, stepMonths: 1 },
  { cadence: 'quarterly', min: 80, max: 100, tol: 10, stepMonths: 3 },
  { cadence: 'yearly', min: 330, max: 400, tol: 20, stepMonths: 12 },
];

export function cadenceTolerance(cadence: Cadence): number {
  return CADENCE_BANDS.find((b) => b.cadence === cadence)?.tol ?? 5;
}

// Arabic-aware merchant normalization: strips tashkeel/tatweel, unifies alef
// variants, ى→ي, ة→ه, drops digits/punctuation/emoji. Descriptions of the
// same vendor typed slightly differently must collapse to one key.
export function normalizeMerchant(description: string | null | undefined): string {
  if (!description) return '';
  return description
    .normalize('NFKC')
    .replace(/[ً-ْٰ]/g, '') // tashkeel
    .replace(/ـ/g, '')                // tatweel
    .replace(/[آأإ]/g, 'ا') // آ أ إ → ا
    .replace(/ى/g, 'ي')          // ى → ي
    .replace(/ة/g, 'ه')          // ة → ه
    .toLowerCase()
    // Arabic-Indic digits live inside the Arabic block — strip them explicitly
    // (invoice numbers etc. must not split a vendor into many keys).
    .replace(/[\d٠-٩۰-۹]/g, ' ')
    .replace(/[^a-z؀-ۿ\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48);
}

// One occurrence = one calendar day within a group (same-day rows merge:
// a split bill or double salary line is still a single payday/due date).
interface Occurrence {
  date: string;
  dayNumber: number;
  amount: number;
  ids: string[];
  descriptions: string[];
  flagged: boolean;
  recurringEndDate: string | null;
  subcategory: string | null;
}

interface Group {
  direction: 'income' | 'expense';
  categoryId: string;
  merchantKey: string;
  occurrences: Occurrence[];
}

export function detectRecurringSeries(
  txns: EngineTransaction[],
  opts: DetectSeriesOptions = {},
): RecurringSeries[] {
  const now = opts.now ?? new Date();
  const windowMonths = opts.windowMonths ?? DEFAULT_WINDOW_MONTHS;
  const nowDay = dateToDayNumber(now);
  const windowStartDay = nowDay - Math.round(windowMonths * 30.44);

  const groups = new Map<string, Group>();

  for (const tx of txns) {
    if (!Number.isFinite(tx.amountBase) || tx.amountBase === 0) continue;
    const dayNum = isoToDayNumber(tx.date);
    if (!Number.isFinite(dayNum) || dayNum < windowStartDay || dayNum > nowDay) continue;

    const categoryId = tx.category ?? 'other';
    const merchantKey = normalizeMerchant(tx.description) || (tx.subcategory ?? '');
    const groupKey = `${tx.type}|${categoryId}|${merchantKey}`;

    let group = groups.get(groupKey);
    if (!group) {
      group = { direction: tx.type, categoryId, merchantKey, occurrences: [] };
      groups.set(groupKey, group);
    }

    const date = tx.date.slice(0, 10);
    let occ = group.occurrences.find((o) => o.date === date);
    if (!occ) {
      occ = {
        date,
        dayNumber: isoToDayNumber(date),
        amount: 0,
        ids: [],
        descriptions: [],
        flagged: false,
        recurringEndDate: null,
        subcategory: null,
      };
      group.occurrences.push(occ);
    }
    occ.amount += Math.abs(tx.amountBase);
    occ.ids.push(tx.id);
    if (tx.description) occ.descriptions.push(tx.description);
    occ.flagged = occ.flagged || !!tx.isRecurring;
    if (tx.recurringEndDate) {
      occ.recurringEndDate =
        occ.recurringEndDate && occ.recurringEndDate > tx.recurringEndDate
          ? occ.recurringEndDate
          : tx.recurringEndDate;
    }
    if (tx.subcategory && !occ.subcategory) occ.subcategory = tx.subcategory;
  }

  const series: RecurringSeries[] = [];

  for (const group of groups.values()) {
    if (group.merchantKey === '') {
      // Category-level bucket: many unrelated one-offs share it. Sub-cluster
      // by amount so rent doesn't merge with a small same-category fee.
      for (const cluster of clusterByAmount(group.occurrences)) {
        const clusterMedian = Math.round(median(cluster.map((o) => o.amount)));
        const result = analyzeCandidate(group, cluster, `#b${clusterMedian}`, nowDay);
        if (result) series.push(result);
      }
    } else {
      const result = analyzeCandidate(group, group.occurrences, '', nowDay);
      if (result) series.push(result);
    }
  }

  series.sort((a, b) => b.amountMedian - a.amountMedian);
  return series;
}

// Greedy amount clustering: sorted ascending, an occurrence joins the current
// cluster while it stays within ±20% of the cluster's running median.
function clusterByAmount(occurrences: Occurrence[]): Occurrence[][] {
  const sorted = [...occurrences].sort((a, b) => a.amount - b.amount);
  const clusters: Occurrence[][] = [];
  let current: Occurrence[] = [];

  for (const occ of sorted) {
    if (current.length === 0) {
      current = [occ];
      continue;
    }
    const runningMedian = median(current.map((o) => o.amount));
    if (runningMedian > 0 && Math.abs(occ.amount - runningMedian) / runningMedian <= 0.2) {
      current.push(occ);
    } else {
      clusters.push(current);
      current = [occ];
    }
  }
  if (current.length > 0) clusters.push(current);
  return clusters;
}

function analyzeCandidate(
  group: Group,
  occurrences: Occurrence[],
  keySuffix: string,
  nowDay: number,
): RecurringSeries | null {
  const occs = [...occurrences].sort((a, b) => a.dayNumber - b.dayNumber);
  const n = occs.length;
  if (n === 0) return null;

  // Detection needs 3 occurrences; a user isRecurring flag qualifies a pair,
  // and even a lone flagged transaction yields a declared low-confidence series.
  const hasFlag = occs.some((o) => o.flagged);
  if (n < MIN_OCCURRENCES && !hasFlag) return null;

  const amounts = occs.map((o) => o.amount);
  const amountMedian = median(amounts);
  const amountMadValue = mad(amounts, amountMedian);
  if (amountMedian <= 0) return null;

  let cadence: Cadence | null = null;
  let medianInterval = 0;
  let intervalMad = 0;

  if (n >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < n; i++) intervals.push(occs[i].dayNumber - occs[i - 1].dayNumber);
    medianInterval = median(intervals);
    intervalMad = mad(intervals, medianInterval);
    const band = CADENCE_BANDS.find(
      (b) => medianInterval >= b.min && medianInterval <= b.max && intervalMad <= b.tol,
    );
    cadence = band?.cadence ?? null;
  }

  const detected =
    n >= MIN_OCCURRENCES &&
    cadence !== null &&
    (hasFlag || amountMadValue <= AMOUNT_NOISE_LIMIT * amountMedian);

  if (!detected) {
    if (!hasFlag) return null;
    // User said "recurring": honor it even below detection thresholds.
    // Unmatched or unknown cadence defaults to monthly (the MENA norm).
    if (cadence === null) {
      cadence = 'monthly';
      if (n < 2) medianInterval = 30;
    }
  }

  const band = CADENCE_BANDS.find((b) => b.cadence === cadence)!;
  const first = occs[0];
  const last = occs[n - 1];

  // Anchor day from the most recent occurrences — recency absorbs a payday
  // or billing-day policy change.
  const monthlyPlus = band.stepMonths != null;
  const anchorDayOfMonth = monthlyPlus
    ? Math.round(median(occs.slice(-6).map((o) => dayOfMonth(o.date))))
    : null;

  const nextDueDate = monthlyPlus
    ? isoAddMonthsClamped(last.date, band.stepMonths!, anchorDayOfMonth ?? undefined)
    : isoAddDays(last.date, Math.round(medianInterval));

  // Lapsed: silent for over two expected intervals (+ tolerance), or the user
  // closed the recurrence via recurringEndDate.
  const expectedGap = 2 * (medianInterval || 30) + band.tol;
  let active = nowDay - last.dayNumber <= expectedGap;
  const endDates = occs.map((o) => o.recurringEndDate).filter((d): d is string => !!d);
  if (endDates.length > 0) {
    const latestEnd = endDates.sort().at(-1)!;
    if (isoToDayNumber(latestEnd) < nowDay) active = false;
  }

  // A single declared occurrence has no interval evidence at all — pin it at
  // 0.4 rather than letting the regularity term hand out unearned credit.
  let confidence: number;
  if (n === 1) {
    confidence = 0.4;
  } else {
    confidence =
      0.4 * Math.min(n, 6) / 6 +
      0.35 * (1 - Math.min(1, band.tol > 0 ? intervalMad / band.tol : 0)) +
      0.25 * (1 - Math.min(1, amountMadValue / (0.25 * amountMedian)));
    if (hasFlag) confidence = Math.min(1, confidence + 0.15);
  }
  confidence = Math.round(confidence * 1000) / 1000;

  // Below full detection strength the grade is always 'low', whatever the
  // formula says — the UI must not present a 2-point series as solid.
  const confidenceGrade: RecurringSeries['confidenceGrade'] =
    n < MIN_OCCURRENCES ? 'low' : confidence >= 0.75 ? 'high' : confidence >= 0.5 ? 'medium' : 'low';

  const source: RecurringSeries['source'] = detected && hasFlag ? 'both' : detected ? 'detected' : 'user_flag';

  const merchantLabel = mostFrequent(occs.flatMap((o) => o.descriptions)) ?? group.categoryId;
  const subcategoryId = occs.find((o) => o.subcategory)?.subcategory ?? null;

  const memberTransactionIds = occs
    .flatMap((o) => o.ids)
    .reverse()
    .slice(0, MEMBER_ID_CAP);

  return {
    key: `${group.direction}|${group.categoryId}|${group.merchantKey}${keySuffix}`,
    direction: group.direction,
    categoryId: group.categoryId,
    subcategoryId,
    merchantLabel,
    cadence: cadence!,
    medianIntervalDays: medianInterval,
    intervalMadDays: intervalMad,
    amountMedian: Math.round(amountMedian * 100) / 100,
    amountMad: Math.round(amountMadValue * 100) / 100,
    anchorDayOfMonth,
    firstDate: first.date,
    lastDate: last.date,
    nextDueDate,
    occurrences: n,
    confidence,
    confidenceGrade,
    active,
    source,
    memberTransactionIds,
  };
}

function mostFrequent(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  let best: string = values[0];
  let bestCount = 0;
  for (const v of values) {
    const c = (counts.get(v) ?? 0) + 1;
    counts.set(v, c);
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

// Convenience for downstream modules: every transaction id that belongs to
// some series — the "committed" side of the ledger.
export function collectSeriesMemberIds(series: RecurringSeries[]): Set<string> {
  const ids = new Set<string>();
  for (const s of series) {
    for (const id of s.memberTransactionIds) ids.add(id);
  }
  return ids;
}

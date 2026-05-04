/**
 * autoBudget unit tests
 * ---------------------
 * Self-contained, dependency-free assertions runnable via `npx tsx` if a
 * test runner is added later. Until then this file is a living spec for
 * the suggestion engine — read it to understand the expected behavior.
 *
 * Run manually:  npx tsx src/lib/autoBudget.test.ts
 */

import {
  AutoBudgetTransaction,
  suggestNextMonthPlan,
  suggestionRationale,
} from './autoBudget';

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ name, passed: true });
  } catch (err) {
    results.push({ name, passed: false, message: err instanceof Error ? err.message : String(err) });
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition: boolean, label: string): void {
  if (!condition) throw new Error(label);
}

// "Now" used for tests so windows are deterministic.
const NOW = new Date(2026, 4, 15); // May 15, 2026 (month is 0-indexed)

function tx(date: string, category: string, amount: number, type: 'income' | 'expense' = 'expense'): AutoBudgetTransaction {
  return { date, category, amount, type };
}

// ============================================================
// Empty input
// ============================================================
test('empty transactions => empty result, no history', () => {
  const r = suggestNextMonthPlan([], { now: NOW });
  assertEqual(Object.keys(r.byCategory).length, 0, 'no categories');
  assertEqual(r.hasEnoughHistory, false, 'hasEnoughHistory false');
  assertEqual(r.totalSuggested, 0, 'total is 0');
});

// ============================================================
// Current month is excluded
// ============================================================
test('current month spending is excluded from suggestions', () => {
  // Only one transaction, in current month -> no signal.
  const r = suggestNextMonthPlan([tx('2026-05-10', 'food', 100)], { now: NOW });
  assertEqual(Object.keys(r.byCategory).length, 0, 'current-month tx ignored');
});

// ============================================================
// Single previous month, single category
// ============================================================
test('one prior month with one category => high suggestion with buffer + rounding', () => {
  const r = suggestNextMonthPlan(
    [tx('2026-04-12', 'food', 220)],
    { now: NOW, lookbackMonths: 1, roundTo: 5, buffer: 0.05 },
  );
  const food = r.byCategory['food'];
  assertTrue(!!food, 'food entry exists');
  // average = 220, +5% = 231, max(lastMonth=220, 231) = 231, ceil to 5 = 235
  assertEqual(food.suggestedAmount, 235, 'suggested rounded up');
  assertEqual(food.basedOnMonths, 1, 'basedOnMonths=1');
  assertEqual(food.confidence, 'low', 'low confidence with 1 month');
});

// ============================================================
// 3 months, smoothing happens, last-month spike preserved
// ============================================================
test('3 months: suggestion never goes below the most recent month', () => {
  const r = suggestNextMonthPlan(
    [
      // Feb
      tx('2026-02-05', 'transport', 100),
      // Mar
      tx('2026-03-05', 'transport', 100),
      // Apr (spike)
      tx('2026-04-05', 'transport', 300),
    ],
    { now: NOW, lookbackMonths: 3, roundTo: 5, buffer: 0.05 },
  );
  const t = r.byCategory['transport'];
  // average = (100+100+300)/3 = 166.67, +5% = 175, max(last=300, 175) = 300
  assertEqual(t.suggestedAmount, 300, 'suggestion not below last month');
  assertEqual(t.confidence, 'high', '3 months => high confidence');
});

// ============================================================
// Missing months counted as zero
// ============================================================
test('missing months count as zero in the average', () => {
  const r = suggestNextMonthPlan(
    [tx('2026-04-10', 'shopping', 600)],
    { now: NOW, lookbackMonths: 3, roundTo: 5, buffer: 0 },
  );
  const s = r.byCategory['shopping'];
  // average across 3 months with only 1 month populated = 600/3 = 200
  // baseline = max(200, last=600) = 600
  assertEqual(s.suggestedAmount, 600, 'last-month value wins when sparse');
  assertEqual(s.basedOnMonths, 1, 'only 1 month with this category');
  assertEqual(s.confidence, 'low', 'sparse history => low confidence');
});

// ============================================================
// Income transactions are ignored
// ============================================================
test('income transactions are skipped', () => {
  const r = suggestNextMonthPlan(
    [tx('2026-04-01', 'salary', 5000, 'income')],
    { now: NOW },
  );
  assertEqual(Object.keys(r.byCategory).length, 0, 'no expense categories from income');
});

// ============================================================
// Multiple categories in same month
// ============================================================
test('multiple categories aggregate independently', () => {
  const r = suggestNextMonthPlan(
    [
      tx('2026-04-01', 'food', 100),
      tx('2026-04-15', 'food', 200),
      tx('2026-04-20', 'bills', 400),
    ],
    { now: NOW, lookbackMonths: 1, buffer: 0, roundTo: 5 },
  );
  // food: total 300, avg 300, baseline=max(300, 300)=300
  assertEqual(r.byCategory['food'].suggestedAmount, 300, 'food sum across month');
  // bills: 400
  assertEqual(r.byCategory['bills'].suggestedAmount, 400, 'bills sum across month');
});

// ============================================================
// Null category => other-expense bucket
// ============================================================
test('null category falls into other-expense', () => {
  const t: AutoBudgetTransaction = { type: 'expense', amount: 50, date: '2026-04-10', category: null };
  const r = suggestNextMonthPlan([t], { now: NOW, lookbackMonths: 1 });
  assertTrue(!!r.byCategory['other-expense'], 'other-expense exists');
});

// ============================================================
// Total is rounded to roundTo
// ============================================================
test('totalSuggested is rounded to roundTo granularity', () => {
  const r = suggestNextMonthPlan(
    [
      tx('2026-04-01', 'food', 91),
      tx('2026-04-02', 'transport', 33),
    ],
    { now: NOW, lookbackMonths: 1, buffer: 0, roundTo: 10 },
  );
  // food: 91 -> 100, transport: 33 -> 40, sum = 140, already multiple of 10
  assertEqual(r.byCategory['food'].suggestedAmount, 100, 'food rounded to 100');
  assertEqual(r.byCategory['transport'].suggestedAmount, 40, 'transport rounded to 40');
  assertEqual(r.totalSuggested, 140, 'total is sum of rounded categories');
});

// ============================================================
// Rationale returns localized string
// ============================================================
test('suggestionRationale returns localized string', () => {
  const en = suggestionRationale({
    categoryId: 'food', suggestedAmount: 300, basedOnMonths: 3,
    monthlyAverage: 280, monthlyMax: 320, confidence: 'high',
  }, 'en');
  assertTrue(en.includes('3 months'), 'EN includes month count');
  const ar = suggestionRationale({
    categoryId: 'food', suggestedAmount: 300, basedOnMonths: 3,
    monthlyAverage: 280, monthlyMax: 320, confidence: 'high',
  }, 'ar');
  assertTrue(ar.includes('أشهر'), 'AR includes Arabic month word');
});

// ============================================================
// Reporter
// ============================================================
const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed);

// eslint-disable-next-line no-console
console.log(`\nautoBudget tests: ${passed}/${results.length} passed`);
for (const f of failed) {
  // eslint-disable-next-line no-console
  console.error(`  FAIL: ${f.name}\n    ${f.message ?? ''}`);
}
if (failed.length > 0) {
  // Exit non-zero so CI can pick this up if wired in.
  if (typeof process !== 'undefined') process.exit(1);
  throw new Error('autoBudget tests failed');
}

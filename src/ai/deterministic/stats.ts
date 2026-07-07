/**
 * Robust-statistics helpers shared by the predictive engine.
 *
 * All functions are pure and total: empty input returns 0 rather than NaN,
 * so downstream modules never propagate NaN into the UI or prompts.
 */

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Median absolute deviation, in the raw units of the data (no consistency
// constant — thresholds throughout the engine are tuned against raw MAD).
export function mad(values: number[], med?: number): number {
  if (values.length === 0) return 0;
  const m = med ?? median(values);
  return median(values.map((v) => Math.abs(v - m)));
}

// MAD of a perfectly regular series is 0, which would make every deviation
// infinite in MAD units. Floor at 5% of the median (or an epsilon) so
// thresholds stay meaningful for very consistent spenders.
export function effectiveMad(madValue: number, med: number): number {
  return Math.max(madValue, 0.05 * Math.abs(med), 1e-9);
}

// Linear-interpolation quantile (R type 7). q is clamped to [0, 1].
export function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * Math.min(1, Math.max(0, q));
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// Finite-window EWMA normalized by the sum of weights, so a constant series
// returns exactly that constant regardless of length. Newest value gets
// weight α, each older one α(1−α)^k.
export function ewma(valuesOldestFirst: number[], alpha: number): number {
  const n = valuesOldestFirst.length;
  if (n === 0) return 0;
  let weightedSum = 0;
  let weightTotal = 0;
  for (let i = 0; i < n; i++) {
    const w = alpha * Math.pow(1 - alpha, n - 1 - i);
    weightedSum += w * valuesOldestFirst[i];
    weightTotal += w;
  }
  return weightTotal === 0 ? 0 : weightedSum / weightTotal;
}

// Per-step slope of the least-squares line through (0, v₀)…(n−1, vₙ₋₁).
export function leastSquaresSlope(valuesOldestFirst: number[]): number {
  const n = valuesOldestFirst.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = valuesOldestFirst.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (valuesOldestFirst[i] - yMean);
    den += (i - xMean) * (i - xMean);
  }
  return den === 0 ? 0 : num / den;
}

// Deterministic PRNG for synthetic fixtures and band-calibration tests —
// keeps every suite reproducible without Math.random.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

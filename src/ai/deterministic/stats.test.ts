import { describe, it, expect } from 'vitest';
import { median, mad, effectiveMad, quantile, ewma, leastSquaresSlope, mulberry32 } from './stats';

describe('median', () => {
  it('returns 0 for empty input', () => {
    expect(median([])).toBe(0);
  });
  it('handles odd and even lengths', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
  it('does not mutate its input', () => {
    const values = [3, 1, 2];
    median(values);
    expect(values).toEqual([3, 1, 2]);
  });
});

describe('mad', () => {
  it('returns 0 for empty and constant series', () => {
    expect(mad([])).toBe(0);
    expect(mad([5, 5, 5])).toBe(0);
  });
  it('computes median absolute deviation in raw units', () => {
    // median = 100; abs deviations = [0, 0, 200] -> median 0? No: [100,100,300]
    // deviations sorted = [0, 0, 200] -> middle = 0
    expect(mad([100, 100, 300])).toBe(0);
    // [10, 20, 30]: median 20, deviations [10, 0, 10] -> 10
    expect(mad([10, 20, 30])).toBe(10);
  });
  it('accepts a precomputed median', () => {
    expect(mad([10, 20, 30], 20)).toBe(10);
  });
});

describe('effectiveMad', () => {
  it('floors a zero MAD at 5% of the median', () => {
    expect(effectiveMad(0, 100)).toBe(5);
    expect(effectiveMad(0, -100)).toBe(5);
  });
  it('keeps a real MAD when it dominates', () => {
    expect(effectiveMad(30, 100)).toBe(30);
  });
  it('never returns 0 even when both inputs are 0', () => {
    expect(effectiveMad(0, 0)).toBeGreaterThan(0);
  });
});

describe('quantile', () => {
  it('returns 0 for empty input', () => {
    expect(quantile([], 0.5)).toBe(0);
  });
  it('matches min/median/max at 0 / 0.5 / 1', () => {
    const values = [10, 20, 30, 40];
    expect(quantile(values, 0)).toBe(10);
    expect(quantile(values, 0.5)).toBe(25);
    expect(quantile(values, 1)).toBe(40);
  });
  it('interpolates linearly (R type 7)', () => {
    // positions 0..3, q=0.25 -> pos 0.75 -> 10 + 0.75*(20-10) = 17.5
    expect(quantile([10, 20, 30, 40], 0.25)).toBe(17.5);
    expect(quantile([10, 20, 30, 40], 0.75)).toBe(32.5);
  });
  it('clamps q outside [0,1]', () => {
    expect(quantile([10, 20], -1)).toBe(10);
    expect(quantile([10, 20], 2)).toBe(20);
  });
});

describe('ewma', () => {
  it('returns 0 for empty input', () => {
    expect(ewma([], 0.5)).toBe(0);
  });
  it('returns the constant for a constant series (finite-window normalization)', () => {
    expect(ewma([100, 100, 100], 0.5)).toBeCloseTo(100, 10);
    expect(ewma([100], 0.5)).toBeCloseTo(100, 10);
  });
  it('weights the newest value most heavily', () => {
    // oldest-first [100, 100, 300], α=0.5: (0.125·100 + 0.25·100 + 0.5·300)/0.875
    expect(ewma([100, 100, 300], 0.5)).toBeCloseTo(187.5 / 0.875, 6);
  });
  it('tracks a trend faster than the flat mean', () => {
    const trending = [100, 200, 300, 400];
    const flatMean = 250;
    expect(ewma(trending, 0.5)).toBeGreaterThan(flatMean);
  });
});

describe('leastSquaresSlope', () => {
  it('returns 0 for fewer than 2 points', () => {
    expect(leastSquaresSlope([])).toBe(0);
    expect(leastSquaresSlope([5])).toBe(0);
  });
  it('recovers the slope of a perfect line', () => {
    expect(leastSquaresSlope([10, 20, 30, 40])).toBeCloseTo(10, 10);
    expect(leastSquaresSlope([40, 30, 20, 10])).toBeCloseTo(-10, 10);
  });
  it('is 0 for a flat series', () => {
    expect(leastSquaresSlope([7, 7, 7])).toBe(0);
  });
});

describe('mulberry32', () => {
  it('is deterministic per seed', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('produces values in [0, 1) with different streams per seed', () => {
    const a = mulberry32(1);
    const c = mulberry32(2);
    const va = a();
    expect(va).toBeGreaterThanOrEqual(0);
    expect(va).toBeLessThan(1);
    expect(va).not.toBe(c());
  });
});

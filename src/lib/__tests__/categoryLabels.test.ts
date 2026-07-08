/**
 * Category-label helpers must never surface a raw enum id to the user.
 */
import { describe, it, expect } from 'vitest';
import { getCategoryLabel } from '../constants';
import { zakatCategoryLabel } from '../../calculators/personalZakatCalculator';

describe('getCategoryLabel', () => {
  it('localizes known spending categories', () => {
    expect(getCategoryLabel('food', 'ar')).toBe('الطعام والمطاعم');
    expect(getCategoryLabel('food', 'en')).toBe('Food & Dining');
  });
  it('handles the bare "other" aggregation fallback', () => {
    expect(getCategoryLabel('other', 'ar')).toBe('أخرى');
  });
  it('never returns an English id for a known category', () => {
    expect(getCategoryLabel('food', 'ar')).not.toMatch(/[a-z]/i);
  });
});

describe('zakatCategoryLabel', () => {
  it('localizes every asset category', () => {
    expect(zakatCategoryLabel('gold_24k', 'ar')).toBe('ذهب عيار 24');
    expect(zakatCategoryLabel('silver_utensils', 'ar')).toBe('أواني فضية');
    expect(zakatCategoryLabel('cash', 'en')).toBe('Cash');
  });
  it('never leaks the raw enum key in Arabic', () => {
    for (const c of ['cash', 'gold_24k', 'gold_21k', 'gold_14k', 'gold_other', 'silver_pure', 'silver_utensils'] as const) {
      expect(zakatCategoryLabel(c, 'ar')).not.toContain('_');
    }
  });
});

/**
 * Execution tests for the RTL shaper's two report-breaking defects:
 * bracket mirroring and page-label ordering.
 */
import { describe, it, expect } from 'vitest';
import { shapeArabic } from '../arabic';

// Arabic-Indic digits
const D1 = 0x0661; // ١
const D5 = 0x0665; // ٥
const LPAREN = 0x0028;
const RPAREN = 0x0029;

describe('bracket mirroring', () => {
  it('keeps an opening paren opening the enclosed Arabic after RTL reversal', () => {
    // Logical «(ب)» must render with "(" on the left and ")" on the right,
    // i.e. the visual glyph stream starts with ( and ends with ) — not «)ب(».
    const out = shapeArabic('(ب)');
    expect(out[0]).toBe(LPAREN);
    expect(out[out.length - 1]).toBe(RPAREN);
  });

  it('mirrors both parens around a multi-word Arabic phrase', () => {
    const out = shapeArabic('(السعودية)');
    expect(out[0]).toBe(LPAREN);
    expect(out[out.length - 1]).toBe(RPAREN);
  });
});

describe('page-label ordering', () => {
  it('renders "صفحة ١ من ٥" so that ٥ sits left of ١ (reads "1 of 5", not "5 of 1")', () => {
    // In correct RTL visual order the total (٥) is leftmost and the current
    // page (١) is to its right; the old code inverted this to «٥ من ١».
    const out = shapeArabic('صفحة ١ من ٥');
    expect(out).toContain(D1);
    expect(out).toContain(D5);
    expect(out.indexOf(D5)).toBeLessThan(out.indexOf(D1));
  });
});

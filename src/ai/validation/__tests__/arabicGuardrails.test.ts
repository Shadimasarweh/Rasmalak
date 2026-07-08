/**
 * Regression tests for the Arabic safety guardrails.
 *
 * These rules were dead code for Arabic input: JS `\b` is ASCII-only and never
 * fires next to Arabic letters, so every Arabic pattern silently failed. The
 * fix matches keyword groups as order-independent substrings. These tests lock
 * that in — each Arabic phrase below must trip its rule.
 */

import { describe, it, expect } from 'vitest';
import { evaluatePolicy, hasBlockingViolations } from '../../agents/policyAgent';
import { filterToneAndRisk } from '../toneAndRiskFilter';
import { classifyIntent } from '../../orchestrator/intentClassifier';

describe('policyAgent — Arabic prohibited content', () => {
  it('blocks a guaranteed-return claim in natural Arabic word order', () => {
    // Adjective after noun («ربح مضمون») — the ordered `\b`-pattern missed this.
    const v = evaluatePolicy('استثمر معنا وستحصل على ربح مضمون كل شهر');
    expect(v.some(x => x.rule === 'no_guaranteed_returns')).toBe(true);
    expect(hasBlockingViolations(v)).toBe(true);
  });

  it('blocks a guaranteed-return claim with accusative tanwīn', () => {
    const v = evaluatePolicy('ستحقق أرباحاً مضمونة دون أي مخاطرة');
    expect(v.some(x => x.rule === 'no_guaranteed_returns')).toBe(true);
  });

  it('blocks a specific stock recommendation in Arabic', () => {
    const v = evaluatePolicy('استثمر في أسهم أرامكو الآن، إنها فرصة مؤكدة');
    expect(v.some(x => x.rule === 'no_specific_investment')).toBe(true);
  });

  it('flags Arabic tax-evasion advice', () => {
    const v = evaluatePolicy('يمكنك أن تخفي دخلك — أخفِ دخلك عن دائرة الضريبة');
    expect(v.some(x => x.rule === 'no_tax_evasion')).toBe(true);
  });

  it('does not fire on clean Arabic advice', () => {
    const v = evaluatePolicy('ننصحك بتنويع محفظتك الاستثمارية وتكوين صندوق طوارئ');
    expect(v.length).toBe(0);
  });
});

describe('toneAndRiskFilter — Arabic tone', () => {
  it('flags a personal guarantee in Arabic', () => {
    const r = filterToneAndRisk('أنا أضمن لك أن هذا القرار صحيح');
    expect(r.errors.some(e => e.code === 'PERSONAL_GUARANTEE')).toBe(true);
    expect(r.passed).toBe(false);
  });

  it('flags judgmental language in Arabic word order (صرف غبي)', () => {
    const r = filterToneAndRisk('هذا كان صرف غبي منك بصراحة');
    expect(r.errors.some(e => e.code === 'JUDGMENTAL_TONE')).toBe(true);
  });

  it('flags urgency pressure in Arabic', () => {
    const r = filterToneAndRisk('لازم تستثمر حالاً قبل فوات الأوان');
    expect(r.errors.some(e => e.code === 'URGENCY_PRESSURE')).toBe(true);
  });

  it('passes neutral Arabic guidance', () => {
    const r = filterToneAndRisk('يمكنك مراجعة ميزانيتك ومقارنتها بالشهر الماضي');
    expect(r.passed).toBe(true);
  });
});

describe('intentClassifier — Arabic financial questions', () => {
  const financial = [
    'وين راح المال تبعي هذا الشهر؟',
    'كم راتبي بعد الضريبة؟',
    'أريد أن أضع ميزانية شهرية',
    'كيف أوفر للمستقبل؟',
  ];
  for (const q of financial) {
    it(`does not route "${q}" to out_of_scope`, () => {
      expect(classifyIntent(q).intent).not.toBe('out_of_scope');
    });
  }
});

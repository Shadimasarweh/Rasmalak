'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useLanguage, useCurrency } from '@/store/useStore';
import { calculateCreditCard } from '@/calculators/creditCardCalculator';
import type { CreditCardInput, CreditCardResult } from '@/calculators/creditCardCalculator';
import { generateCreditCardPDF } from '@/calculators/creditCardReport';
import { CURRENCIES } from '@/lib/constants';

/* ===== ICONS ===== */
const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const CalculatorIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-4v-2h4v2zm0-4h-4v-2h4v2zm0-4h-4V7h4v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2z" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const CreditCardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

/* ===== TYPES ===== */
interface FormErrors {
  balance?: string;
  rate?: string;
  minPct?: string;
  floor?: string;
}

/* ===== MAIN PAGE ===== */
export default function CreditCardCalculatorPage() {
  const intl = useIntl();
  const language = useLanguage();
  const currency = useCurrency();
  const isRTL = language === 'ar';

  const currencyInfo = CURRENCIES.find(c => c.code === currency);
  const currencySymbol = isRTL
    ? (currencyInfo?.symbolAr || currencyInfo?.symbol || currency)
    : (currencyInfo?.symbol || currency);

  // Form
  const [balance, setBalance] = useState('');
  const [rate, setRate] = useState('');
  const [minPct, setMinPct] = useState('');
  const [plusInterest, setPlusInterest] = useState(true);
  const [floor, setFloor] = useState('');
  const [fixedPayment, setFixedPayment] = useState('');
  const [introMonths, setIntroMonths] = useState('');

  const [result, setResult] = useState<CreditCardResult | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const t = (key: string, defaultMessage: string) =>
    intl.formatMessage({ id: `tools.${key}`, defaultMessage });

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!balance || parseFloat(balance) <= 0)
      newErrors.balance = t('credit_card_validation_balance', 'Balance must be greater than 0');
    if (!rate || parseFloat(rate) < 0 || parseFloat(rate) > 100)
      newErrors.rate = t('credit_card_validation_rate', 'Interest rate must be between 0 and 100');
    if (!minPct || parseFloat(minPct) < 1 || parseFloat(minPct) > 100)
      newErrors.minPct = t('credit_card_validation_min_pct', 'Minimum payment % must be between 1 and 100');
    if (floor && parseFloat(floor) < 0)
      newErrors.floor = t('credit_card_validation_floor', 'Floor amount must be 0 or greater');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCalculate = useCallback(() => {
    if (!validate()) return;
    const input: CreditCardInput = {
      currentBalance: parseFloat(balance),
      annualInterestRate: parseFloat(rate),
      minPaymentPercent: parseFloat(minPct),
      minPaymentPlusInterest: plusInterest,
      minPaymentFloor: parseFloat(floor) || 25,
      fixedMonthlyPayment: parseFloat(fixedPayment) || 0,
      introMonths: parseInt(introMonths) || 0,
    };
    setResult(calculateCreditCard(input));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance, rate, minPct, plusInterest, floor, fixedPayment, introMonths]);

  const handleReset = () => {
    setBalance(''); setRate(''); setMinPct(''); setPlusInterest(true);
    setFloor(''); setFixedPayment(''); setIntroMonths('');
    setResult(null); setErrors({});
  };

  const handleDownloadPDF = async () => {
    if (!result) return;
    setIsGeneratingPDF(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      const input: CreditCardInput = {
        currentBalance: parseFloat(balance),
        annualInterestRate: parseFloat(rate),
        minPaymentPercent: parseFloat(minPct),
        minPaymentPlusInterest: plusInterest,
        minPaymentFloor: parseFloat(floor) || 25,
        fixedMonthlyPayment: parseFloat(fixedPayment) || 0,
        introMonths: parseInt(introMonths) || 0,
      };
      await generateCreditCardPDF(input, result, language, currencySymbol);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const formatCurrencyValue = (value: number) =>
    intl.formatNumber(value, { style: 'currency', currency });

  const inputFieldStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '10px 14px',
    fontSize: '0.9375rem',
    border: `1.5px solid ${hasError ? 'var(--color-error)' : 'var(--theme-border-input)'}`,
    borderRadius: 'var(--radius-input)',
    backgroundColor: 'var(--theme-bg-input)',
    color: 'var(--theme-text-primary)',
    outline: 'none',
    direction: 'ltr',
    textAlign: isRTL ? 'right' : 'left',
  });

  const labelStyle = {
    display: 'block' as const,
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--theme-text-secondary)',
    marginBottom: '6px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 80px)', padding: 'var(--spacing-3)', direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Back Link */}
      <Link href="/tools" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-brand-emerald)', textDecoration: 'none', marginBottom: 'var(--spacing-2)' }} className="hover:underline">
        <span style={{ transform: isRTL ? 'scaleX(-1)' : 'none', display: 'inline-flex' }}><ArrowLeftIcon /></span>
        {t('credit_card_back_to_tools', 'Back to Tools')}
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 'var(--spacing-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-error)', flexShrink: 0 }}>
            <CreditCardIcon />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-brand-navy)', lineHeight: 1.2 }}>
              {t('credit_card_title', 'Credit Card Payment Calculator')}
            </h1>
            <p style={{ fontSize: '0.9375rem', color: 'var(--theme-text-secondary)', lineHeight: 1.6, marginTop: '4px' }}>
              {t('credit_card_subtitle', 'See how long it will take to pay off your credit card and how much interest you will pay.')}
            </p>
          </div>
        </div>
      </div>

      {/* Form + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Form */}
        <div className="col-span-1 lg:col-span-5">
          <div className="card-standard" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--color-brand-emerald)' }}><CalculatorIcon /></span>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-brand-navy)' }}>
                {t('credit_card_enter_values', 'Enter Card Details')}
              </h2>
            </div>

            {/* Current Balance */}
            <div>
              <label style={labelStyle}>{t('credit_card_current_balance', 'Current Balance')} ({currencySymbol})</label>
              <input type="number" value={balance} onChange={e => setBalance(e.target.value)}
                placeholder={t('credit_card_balance_placeholder', 'e.g. 17000')} style={inputFieldStyle(!!errors.balance)} />
              {errors.balance && <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px' }}>{errors.balance}</p>}
            </div>

            {/* Interest Rate */}
            <div>
              <label style={labelStyle}>{t('credit_card_interest_rate', 'Annual Interest Rate (%)')}</label>
              <input type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)}
                placeholder={t('credit_card_rate_placeholder', 'e.g. 21')} style={inputFieldStyle(!!errors.rate)} />
              {errors.rate && <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px' }}>{errors.rate}</p>}
            </div>

            {/* Min Payment % */}
            <div>
              <label style={labelStyle}>{t('credit_card_min_payment_percent', 'Min Payment % of Balance')}</label>
              <input type="number" step="0.1" value={minPct} onChange={e => setMinPct(e.target.value)}
                placeholder={t('credit_card_min_pct_placeholder', 'e.g. 5')} style={inputFieldStyle(!!errors.minPct)} />
              {errors.minPct && <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px' }}>{errors.minPct}</p>}
            </div>

            {/* Plus Interest? */}
            <div>
              <label style={labelStyle}>{t('credit_card_plus_interest', 'Min Payment Plus Interest?')}</label>
              <select value={plusInterest ? 'yes' : 'no'} onChange={e => setPlusInterest(e.target.value === 'yes')}
                style={{ ...inputFieldStyle(false), cursor: 'pointer', direction: undefined as unknown as 'ltr' }}>
                <option value="yes">{t('credit_card_yes', 'Yes')}</option>
                <option value="no">{t('credit_card_no', 'No')}</option>
              </select>
            </div>

            {/* Min Payment Floor */}
            <div>
              <label style={labelStyle}>{t('credit_card_min_payment_floor', 'Min Payment for Low Balance')} ({currencySymbol})</label>
              <input type="number" value={floor} onChange={e => setFloor(e.target.value)}
                placeholder={t('credit_card_floor_placeholder', 'e.g. 25')} style={inputFieldStyle(!!errors.floor)} />
              {errors.floor && <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px' }}>{errors.floor}</p>}
            </div>

            {/* Fixed Payment */}
            <div>
              <label style={labelStyle}>{t('credit_card_fixed_payment', 'Fixed Monthly Payment (optional)')} ({currencySymbol})</label>
              <input type="number" value={fixedPayment} onChange={e => setFixedPayment(e.target.value)}
                placeholder={t('credit_card_fixed_placeholder', 'e.g. 500')} style={inputFieldStyle(false)} />
            </div>

            {/* Intro Months */}
            <div>
              <label style={labelStyle}>{t('credit_card_intro_months', '0% Introductory Period (months)')}</label>
              <input type="number" value={introMonths} onChange={e => setIntroMonths(e.target.value)}
                placeholder={t('credit_card_intro_placeholder', 'e.g. 0')} style={inputFieldStyle(false)} />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="button" onClick={handleCalculate}
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', background: 'var(--color-brand-emerald)', color: '#FFFFFF', fontSize: '0.9375rem', fontWeight: 600, border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                className="hover:opacity-90 transition-opacity">
                <CalculatorIcon /> {t('credit_card_calculate', 'Calculate')}
              </button>
              <button type="button" onClick={handleReset}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '12px 20px', background: 'transparent', color: 'var(--theme-text-secondary)', fontSize: '0.875rem', fontWeight: 500, border: '1.5px solid var(--theme-border-input)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                className="hover:opacity-80 transition-opacity">
                {t('credit_card_reset', 'Reset')}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="col-span-1 lg:col-span-7">
          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              <div className="card-standard" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-brand-navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--color-brand-emerald)' }}><CheckCircleIcon /></span>
                  {t('credit_card_summary', 'Payoff Summary')}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <SummaryItem label={t('credit_card_first_payment', 'First Payment')} value={formatCurrencyValue(result.summary.firstPayment)} highlight />
                  <SummaryItem label={t('credit_card_max_payment', 'Max Payment')} value={formatCurrencyValue(result.summary.maxPayment)} />
                  <SummaryItem label={t('credit_card_months_to_payoff', 'Months to Pay Off')} value={`${result.summary.monthsToPayOff}`} />
                  <SummaryItem label={t('credit_card_years_to_payoff', 'Years to Pay Off')} value={`${result.summary.yearsToPayOff} ${t('credit_card_years', 'years')}`} accent />
                  <SummaryItem label={t('credit_card_total_interest', 'Total Interest Paid')} value={formatCurrencyValue(result.summary.totalInterestPaid)} />
                  <SummaryItem label={t('credit_card_total_paid', 'Total Amount Paid')} value={formatCurrencyValue(result.summary.totalAmountPaid)} />
                </div>
              </div>

              <button type="button" onClick={handleDownloadPDF} disabled={isGeneratingPDF}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px 28px', background: isGeneratingPDF ? 'var(--theme-text-muted)' : 'var(--color-brand-emerald)', color: '#FFFFFF', fontSize: '0.9375rem', fontWeight: 600, border: 'none', borderRadius: 'var(--radius-sm)', cursor: isGeneratingPDF ? 'not-allowed' : 'pointer', width: '100%' }}
                className="hover:opacity-90 transition-opacity">
                <DownloadIcon />
                {isGeneratingPDF ? t('credit_card_generating', 'Generating...') : t('credit_card_download_report', 'Download PDF Report')}
              </button>
            </div>
          ) : (
            <div className="card-standard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-card)', background: 'rgba(239, 68, 68, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-error)' }}>
                <CreditCardIcon />
              </div>
              <p style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--theme-text-secondary)', textAlign: 'center' }}>
                {t('credit_card_enter_values', 'Enter Card Details')}
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--theme-text-muted)', textAlign: 'center', maxWidth: '320px' }}>
                {t('credit_card_subtitle', 'See how long it will take to pay off your credit card and how much interest you will pay.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value, highlight, accent }: { label: string; value: string; highlight?: boolean; accent?: boolean }) {
  return (
    <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: highlight ? 'rgba(16, 185, 129, 0.08)' : accent ? 'rgba(99, 102, 241, 0.06)' : 'var(--theme-bg-input)', border: highlight ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--theme-border)' }}>
      <p style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--theme-text-muted)', marginBottom: '4px', lineHeight: 1.3 }}>{label}</p>
      <p style={{ fontSize: highlight ? '1.25rem' : '1rem', fontWeight: 600, color: highlight ? 'var(--color-brand-emerald)' : accent ? '#6366F1' : 'var(--color-brand-navy)', lineHeight: 1.3 }}>{value}</p>
    </div>
  );
}


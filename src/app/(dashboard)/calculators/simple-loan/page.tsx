'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useLanguage, useCurrency } from '@/store/useStore';
import { calculateSimpleLoan } from '@/calculators/simpleLoanCalculator';
import type { SimpleLoanInput, SimpleLoanResult } from '@/calculators/simpleLoanCalculator';
import { generateSimpleLoanPDF } from '@/calculators/simpleLoanReport';
import { CURRENCIES } from '@/lib/constants';
import { styledNum } from '@/components/StyledNumber';

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

const CreditIcon = () => (
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
  loanAmount?: string;
  interestRate?: string;
  loanPeriod?: string;
  startDate?: string;
}

/* ===== MAIN PAGE ===== */
export default function SimpleLoanCalculatorPage() {
  const intl = useIntl();
  const language = useLanguage();
  const currency = useCurrency();
  const isRTL = language === 'ar';

  const currencyInfo = CURRENCIES.find(c => c.code === currency);
  const currencySymbol = isRTL
    ? (currencyInfo?.symbolAr || currencyInfo?.symbol || currency)
    : (currencyInfo?.symbol || currency);

  // Form state
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [loanPeriod, setLoanPeriod] = useState('');
  const [startDate, setStartDate] = useState('');

  const [result, setResult] = useState<SimpleLoanResult | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const t = (key: string, defaultMessage: string) =>
    intl.formatMessage({ id: `tools.${key}`, defaultMessage });

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!loanAmount || parseFloat(loanAmount) <= 0)
      newErrors.loanAmount = t('simple_loan_validation_loan_amount', 'Loan amount must be greater than 0');
    if (!interestRate || parseFloat(interestRate) < 0 || parseFloat(interestRate) > 100)
      newErrors.interestRate = t('simple_loan_validation_interest_rate', 'Interest rate must be between 0 and 100');
    if (!loanPeriod || parseFloat(loanPeriod) < 1 || parseFloat(loanPeriod) > 50)
      newErrors.loanPeriod = t('simple_loan_validation_loan_period', 'Loan period must be between 1 and 50 years');
    if (!startDate)
      newErrors.startDate = t('simple_loan_validation_start_date', 'Please enter a valid start date');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCalculate = useCallback(() => {
    if (!validate()) return;
    const input: SimpleLoanInput = {
      loanAmount: parseFloat(loanAmount),
      annualInterestRate: parseFloat(interestRate),
      loanPeriodYears: parseFloat(loanPeriod),
      startDate,
    };
    setResult(calculateSimpleLoan(input));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanAmount, interestRate, loanPeriod, startDate]);

  const handleReset = () => {
    setLoanAmount(''); setInterestRate(''); setLoanPeriod(''); setStartDate('');
    setResult(null); setErrors({});
  };

  const handleDownloadPDF = async () => {
    if (!result) return;
    setIsGeneratingPDF(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      const input: SimpleLoanInput = {
        loanAmount: parseFloat(loanAmount),
        annualInterestRate: parseFloat(interestRate),
        loanPeriodYears: parseFloat(loanPeriod),
        startDate,
      };
      await generateSimpleLoanPDF(input, result, language, currencySymbol);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const formatCurrency = (value: number) =>
    styledNum(intl.formatNumber(value, { style: 'currency', currency }));

  const inputFieldStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '10px 14px',
    fontSize: '0.9375rem',
    border: `1.5px solid ${hasError ? 'var(--color-error)' : 'var(--color-border-input)'}`,
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-bg-input)',
    color: 'var(--color-text-primary)',
    outline: 'none',
    direction: 'ltr',
    textAlign: isRTL ? 'right' : 'left',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 80px)', padding: 'var(--spacing-3)', direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Back Link */}
      <Link href="/tools" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-accent-growth)', textDecoration: 'none', marginBottom: 'var(--spacing-2)' }} className="hover:underline">
        <span style={{ transform: isRTL ? 'scaleX(-1)' : 'none', display: 'inline-flex' }}><ArrowLeftIcon /></span>
        {t('simple_loan_back_to_tools', 'Back to Tools')}
      </Link>

      {/* Page Header */}
      <div style={{ marginBottom: 'var(--spacing-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-error)', flexShrink: 0 }}>
            <CreditIcon />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
              {t('simple_loan_title', 'Simple Loan Calculator')}
            </h1>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: '4px' }}>
              {t('simple_loan_subtitle', 'Calculate your monthly payment and view the full amortization schedule for any fixed-rate loan.')}
            </p>
          </div>
        </div>
      </div>

      {/* Form + Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Input Form */}
        <div className="col-span-1 lg:col-span-5">
          <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--color-accent-growth)' }}><CalculatorIcon /></span>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {t('simple_loan_enter_values', 'Enter Loan Details')}
              </h2>
            </div>

            {/* Loan Amount */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                {t('simple_loan_loan_amount', 'Loan Amount')} ({currencySymbol})
              </label>
              <input type="number" value={loanAmount} onChange={e => setLoanAmount(e.target.value)}
                placeholder={t('simple_loan_loan_amount_placeholder', 'e.g. 5000')}
                style={inputFieldStyle(!!errors.loanAmount)} />
              {errors.loanAmount && <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px' }}>{errors.loanAmount}</p>}
            </div>

            {/* Interest Rate */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                {t('simple_loan_interest_rate', 'Annual Interest Rate (%)')}
              </label>
              <input type="number" step="0.01" value={interestRate} onChange={e => setInterestRate(e.target.value)}
                placeholder={t('simple_loan_interest_rate_placeholder', 'e.g. 5.5')}
                style={inputFieldStyle(!!errors.interestRate)} />
              {errors.interestRate && <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px' }}>{errors.interestRate}</p>}
            </div>

            {/* Loan Period */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                {t('simple_loan_loan_period', 'Loan Period (Years)')}
              </label>
              <input type="number" value={loanPeriod} onChange={e => setLoanPeriod(e.target.value)}
                placeholder={t('simple_loan_loan_period_placeholder', 'e.g. 5')}
                style={inputFieldStyle(!!errors.loanPeriod)} />
              {errors.loanPeriod && <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px' }}>{errors.loanPeriod}</p>}
            </div>

            {/* Start Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                {t('simple_loan_start_date', 'Start Date of Loan')}
              </label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', fontSize: '0.9375rem', border: `1.5px solid ${errors.startDate ? 'var(--color-error)' : 'var(--color-border-input)'}`, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', outline: 'none' }} />
              {errors.startDate && <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px' }}>{errors.startDate}</p>}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="button" onClick={handleCalculate}
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', background: 'var(--color-accent-growth)', color: '#FFFFFF', fontSize: '0.9375rem', fontWeight: 600, border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                className="hover:opacity-90 transition-opacity">
                <CalculatorIcon /> {t('simple_loan_calculate', 'Calculate')}
              </button>
              <button type="button" onClick={handleReset}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '12px 20px', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, border: '1.5px solid var(--color-border-input)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                className="hover:opacity-80 transition-opacity">
                {t('simple_loan_reset', 'Reset')}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="col-span-1 lg:col-span-7">
          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--color-accent-growth)' }}><CheckCircleIcon /></span>
                  {t('simple_loan_summary', 'Loan Summary')}
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <SummaryItem label={t('simple_loan_monthly_payment', 'Monthly Payment')} value={formatCurrency(result.summary.monthlyPayment)} highlight />
                  <SummaryItem label={t('simple_loan_number_of_payments', 'Number of Payments')} value={`${result.summary.numberOfPayments}`} />
                  <SummaryItem label={t('simple_loan_total_interest', 'Total Interest')} value={formatCurrency(result.summary.totalInterest)} />
                  <SummaryItem label={t('simple_loan_total_cost', 'Total Cost of Loan')} value={formatCurrency(result.summary.totalCost)} accent />
                </div>
              </div>

              <button type="button" onClick={handleDownloadPDF} disabled={isGeneratingPDF}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px 28px', background: isGeneratingPDF ? 'var(--color-text-muted)' : 'var(--color-accent-growth)', color: '#FFFFFF', fontSize: '0.9375rem', fontWeight: 600, border: 'none', borderRadius: 'var(--radius-sm)', cursor: isGeneratingPDF ? 'not-allowed' : 'pointer', width: '100%' }}
                className="hover:opacity-90 transition-opacity">
                <DownloadIcon />
                {isGeneratingPDF ? t('simple_loan_generating', 'Generating...') : t('simple_loan_download_report', 'Download PDF Report')}
              </button>
            </div>
          ) : (
            <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-xl)', background: 'rgba(239, 68, 68, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-error)' }}>
                <CreditIcon />
              </div>
              <p style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                {t('simple_loan_enter_values', 'Enter Loan Details')}
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: '320px' }}>
                {t('simple_loan_subtitle', 'Calculate your monthly payment and view the full amortization schedule for any fixed-rate loan.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value, highlight, accent }: { label: string; value: React.ReactNode; highlight?: boolean; accent?: boolean }) {
  return (
    <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: highlight ? 'rgba(var(--accent-color-rgb), 0.08)' : accent ? 'rgba(99, 102, 241, 0.06)' : 'var(--color-bg-input)', border: highlight ? '1px solid rgba(var(--accent-color-rgb), 0.2)' : '1px solid var(--color-border)' }}>
      <p style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '4px', lineHeight: 1.3 }}>{label}</p>
      <p style={{ fontSize: highlight ? '1.25rem' : '1rem', fontWeight: 600, color: highlight ? 'var(--color-accent-growth)' : accent ? '#6366F1' : 'var(--color-text-primary)', lineHeight: 1.3 }}>{value}</p>
    </div>
  );
}


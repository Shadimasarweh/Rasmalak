'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useLanguage, useCurrency } from '@/store/useStore';
import { calculateMortgagePayoff } from '@/calculators/mortgagePayoffCalculator';
import type { MortgagePayoffInput, MortgagePayoffResult } from '@/calculators/mortgagePayoffCalculator';
import { generateMortgagePayoffPDF } from '@/calculators/mortgagePayoffReport';
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

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const TrendDownIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </svg>
);

/* ===== TYPES ===== */
interface FormErrors {
  loanAmount?: string;
  annualInterestRate?: string;
  loanTermYears?: string;
  paymentsPerYear?: string;
  startDate?: string;
}

/* ===== MAIN PAGE ===== */
export default function MortgagePayoffCalculatorPage() {
  const intl = useIntl();
  const language = useLanguage();
  const currency = useCurrency();
  const isRTL = language === 'ar';

  // Get currency symbol
  const currencyInfo = CURRENCIES.find(c => c.code === currency);
  const currencySymbol = isRTL
    ? (currencyInfo?.symbolAr || currencyInfo?.symbol || currency)
    : (currencyInfo?.symbol || currency);

  // Form state
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [loanTerm, setLoanTerm] = useState('');
  const [paymentsPerYear, setPaymentsPerYear] = useState('');
  const [startDate, setStartDate] = useState('');
  const [extraPayment, setExtraPayment] = useState('');
  const [lenderName, setLenderName] = useState('');

  // Results state
  const [result, setResult] = useState<MortgagePayoffResult | null>(null);
  const [resultWithoutExtra, setResultWithoutExtra] = useState<MortgagePayoffResult | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Helper to get message
  const t = (key: string, defaultMessage: string, values?: Record<string, string | number>) => {
    return intl.formatMessage({ id: `tools.${key}`, defaultMessage }, values);
  };

  // Validation
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!loanAmount || parseFloat(loanAmount) <= 0) {
      newErrors.loanAmount = t('mortgage_payoff_validation_loan_amount', 'Loan amount must be greater than 0');
    }
    if (!interestRate || parseFloat(interestRate) < 0 || parseFloat(interestRate) > 100) {
      newErrors.annualInterestRate = t('mortgage_payoff_validation_interest_rate', 'Interest rate must be between 0 and 100');
    }
    if (!loanTerm || parseFloat(loanTerm) < 1 || parseFloat(loanTerm) > 50) {
      newErrors.loanTermYears = t('mortgage_payoff_validation_loan_term', 'Loan term must be between 1 and 50 years');
    }
    if (!paymentsPerYear || parseInt(paymentsPerYear) < 1 || parseInt(paymentsPerYear) > 52) {
      newErrors.paymentsPerYear = t('mortgage_payoff_validation_payments_per_year', 'Payments per year must be between 1 and 52');
    }
    if (!startDate) {
      newErrors.startDate = t('mortgage_payoff_validation_start_date', 'Please enter a valid start date');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Calculate
  const handleCalculate = useCallback(() => {
    if (!validate()) return;

    const input: MortgagePayoffInput = {
      loanAmount: parseFloat(loanAmount),
      annualInterestRate: parseFloat(interestRate),
      loanTermYears: parseFloat(loanTerm),
      paymentsPerYear: parseInt(paymentsPerYear),
      startDate,
      extraPayment: parseFloat(extraPayment) || 0,
      lenderName,
    };

    const calcResult = calculateMortgagePayoff(input);
    setResult(calcResult);

    // Also calculate without extra to show savings comparison
    if (input.extraPayment > 0) {
      const inputWithoutExtra = { ...input, extraPayment: 0 };
      const resultNoExtra = calculateMortgagePayoff(inputWithoutExtra);
      setResultWithoutExtra(resultNoExtra);
    } else {
      setResultWithoutExtra(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanAmount, interestRate, loanTerm, paymentsPerYear, startDate, extraPayment, lenderName]);

  // Reset
  const handleReset = () => {
    setLoanAmount('');
    setInterestRate('');
    setLoanTerm('');
    setPaymentsPerYear('');
    setStartDate('');
    setExtraPayment('');
    setLenderName('');
    setResult(null);
    setResultWithoutExtra(null);
    setErrors({});
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    if (!result) return;

    setIsGeneratingPDF(true);

    // Small delay for UI feedback
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const input: MortgagePayoffInput = {
        loanAmount: parseFloat(loanAmount),
        annualInterestRate: parseFloat(interestRate),
        loanTermYears: parseFloat(loanTerm),
        paymentsPerYear: parseInt(paymentsPerYear),
        startDate,
        extraPayment: parseFloat(extraPayment) || 0,
        lenderName,
      };

      await generateMortgagePayoffPDF(input, result, language, currencySymbol);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Format number for display
  const formatCurrency = (value: number) => {
    return intl.formatNumber(value, { style: 'currency', currency });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 80px)',
        padding: 'var(--spacing-3)',
        direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
      {/* ===== BACK LINK ===== */}
      <Link
        href="/tools"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: 'var(--color-accent-growth)',
          textDecoration: 'none',
          marginBottom: 'var(--spacing-2)',
        }}
        className="hover:underline"
      >
        <span style={{ transform: isRTL ? 'scaleX(-1)' : 'none', display: 'inline-flex' }}>
          <ArrowLeftIcon />
        </span>
        {t('mortgage_payoff_back_to_tools', 'Back to Tools')}
      </Link>

      {/* ===== PAGE HEADER ===== */}
      <div style={{ marginBottom: 'var(--spacing-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent-growth)',
              flexShrink: 0,
            }}
          >
            <HomeIcon />
          </div>
          <div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                lineHeight: 1.2,
              }}
            >
              {t('mortgage_payoff_title', 'Mortgage Payoff Calculator')}
            </h1>
            <p
              style={{
                fontSize: '0.9375rem',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
                marginTop: '4px',
              }}
            >
              {t('mortgage_payoff_subtitle', 'Calculate how extra payments can help you pay off your mortgage faster and save on interest.')}
            </p>
          </div>
        </div>
      </div>

      {/* ===== FORM + RESULTS GRID ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ===== INPUT FORM ===== */}
        <div className="col-span-1 lg:col-span-5">
          <div
            className="ds-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-2)',
            }}
          >
            {/* Form Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--color-accent-growth)' }}>
                <CalculatorIcon />
              </span>
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                }}
              >
                {t('mortgage_payoff_enter_values', 'Enter Values')}
              </h2>
            </div>

            {/* Loan Amount */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '6px',
                }}
              >
                {t('mortgage_payoff_loan_amount', 'Loan Amount')} ({currencySymbol})
              </label>
              <input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                placeholder={t('mortgage_payoff_loan_amount_placeholder', 'e.g. 200000')}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '0.9375rem',
                  border: `1.5px solid ${errors.loanAmount ? 'var(--color-error)' : 'var(--color-border-input)'}`,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-input)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  direction: 'ltr',
                  textAlign: isRTL ? 'right' : 'left',
                }}
              />
              {errors.loanAmount && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px' }}>
                  {errors.loanAmount}
                </p>
              )}
            </div>

            {/* Interest Rate */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '6px',
                }}
              >
                {t('mortgage_payoff_interest_rate', 'Annual Interest Rate (%)')}
              </label>
              <input
                type="number"
                step="0.01"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder={t('mortgage_payoff_interest_rate_placeholder', 'e.g. 5')}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '0.9375rem',
                  border: `1.5px solid ${errors.annualInterestRate ? 'var(--color-error)' : 'var(--color-border-input)'}`,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-input)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  direction: 'ltr',
                  textAlign: isRTL ? 'right' : 'left',
                }}
              />
              {errors.annualInterestRate && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px' }}>
                  {errors.annualInterestRate}
                </p>
              )}
            </div>

            {/* Loan Term */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '6px',
                }}
              >
                {t('mortgage_payoff_loan_term', 'Loan Term (Years)')}
              </label>
              <input
                type="number"
                value={loanTerm}
                onChange={(e) => setLoanTerm(e.target.value)}
                placeholder={t('mortgage_payoff_loan_term_placeholder', 'e.g. 30')}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '0.9375rem',
                  border: `1.5px solid ${errors.loanTermYears ? 'var(--color-error)' : 'var(--color-border-input)'}`,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-input)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  direction: 'ltr',
                  textAlign: isRTL ? 'right' : 'left',
                }}
              />
              {errors.loanTermYears && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px' }}>
                  {errors.loanTermYears}
                </p>
              )}
            </div>

            {/* Payments Per Year */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '6px',
                }}
              >
                {t('mortgage_payoff_payments_per_year', 'Payments Per Year')}
              </label>
              <select
                value={paymentsPerYear}
                onChange={(e) => setPaymentsPerYear(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '0.9375rem',
                  border: `1.5px solid ${errors.paymentsPerYear ? 'var(--color-error)' : 'var(--color-border-input)'}`,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-input)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="12">{isRTL ? '12 (شهري)' : '12 (Monthly)'}</option>
                <option value="26">{isRTL ? '26 (كل أسبوعين)' : '26 (Bi-weekly)'}</option>
                <option value="24">{isRTL ? '24 (نصف شهري)' : '24 (Semi-monthly)'}</option>
                <option value="52">{isRTL ? '52 (أسبوعي)' : '52 (Weekly)'}</option>
                <option value="4">{isRTL ? '4 (ربع سنوي)' : '4 (Quarterly)'}</option>
                <option value="1">{isRTL ? '1 (سنوي)' : '1 (Annually)'}</option>
              </select>
              {errors.paymentsPerYear && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px' }}>
                  {errors.paymentsPerYear}
                </p>
              )}
            </div>

            {/* Start Date */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '6px',
                }}
              >
                {t('mortgage_payoff_start_date', 'Repayment Start Date')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '0.9375rem',
                  border: `1.5px solid ${errors.startDate ? 'var(--color-error)' : 'var(--color-border-input)'}`,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-input)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                }}
              />
              {errors.startDate && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px' }}>
                  {errors.startDate}
                </p>
              )}
            </div>

            {/* Extra Payment */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '6px',
                }}
              >
                {t('mortgage_payoff_extra_payment', 'Optional Extra Payment')} ({currencySymbol})
              </label>
              <input
                type="number"
                value={extraPayment}
                onChange={(e) => setExtraPayment(e.target.value)}
                placeholder={t('mortgage_payoff_extra_payment_placeholder', 'e.g. 200')}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '0.9375rem',
                  border: '1.5px solid var(--color-border-input)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-input)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  direction: 'ltr',
                  textAlign: isRTL ? 'right' : 'left',
                }}
              />
            </div>

            {/* Lender Name */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '6px',
                }}
              >
                {t('mortgage_payoff_lender_name', 'Lender Name')}
              </label>
              <input
                type="text"
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
                placeholder={t('mortgage_payoff_lender_placeholder', 'e.g. Your Bank')}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '0.9375rem',
                  border: '1.5px solid var(--color-border-input)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-input)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={handleCalculate}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: 'var(--color-accent-growth)',
                  color: '#FFFFFF',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
                className="hover:opacity-90 transition-opacity"
              >
                <CalculatorIcon />
                {t('mortgage_payoff_calculate', 'Calculate')}
              </button>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px 20px',
                  background: 'transparent',
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  border: '1.5px solid var(--color-border-input)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
                className="hover:opacity-80 transition-opacity"
              >
                {t('mortgage_payoff_reset', 'Reset')}
              </button>
            </div>
          </div>
        </div>

        {/* ===== RESULTS SECTION ===== */}
        <div className="col-span-1 lg:col-span-7">
          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              {/* Loan Summary Card */}
              <div
                className="ds-card"
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <h2
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{ color: 'var(--color-accent-growth)' }}><CheckCircleIcon /></span>
                    {t('mortgage_payoff_loan_summary', 'Loan Summary')}
                  </h2>
                  {result.summary.lenderName && (
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        color: 'var(--color-text-muted)',
                        paddingInline: '12px',
                        paddingBlock: '4px',
                        borderRadius: 'var(--radius-pill)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {result.summary.lenderName}
                    </span>
                  )}
                </div>

                {/* Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {/* Scheduled Payment */}
                  <SummaryItem
                    label={t('mortgage_payoff_scheduled_payment', 'Scheduled Payment')}
                    value={formatCurrency(result.summary.scheduledPayment)}
                    highlight
                  />
                  {/* Scheduled Payments */}
                  <SummaryItem
                    label={t('mortgage_payoff_scheduled_payments', 'Scheduled Number of Payments')}
                    value={`${result.summary.scheduledNumberOfPayments}`}
                  />
                  {/* Actual Payments */}
                  <SummaryItem
                    label={t('mortgage_payoff_actual_payments', 'Actual Number of Payments')}
                    value={`${result.summary.actualNumberOfPayments}`}
                    accent={result.summary.yearsSaved > 0}
                  />
                  {/* Years Saved */}
                  <SummaryItem
                    label={t('mortgage_payoff_years_saved', 'Years Saved')}
                    value={`${result.summary.yearsSaved} ${t('mortgage_payoff_years', 'years')}`}
                    accent={result.summary.yearsSaved > 0}
                  />
                  {/* Total Early Payments */}
                  <SummaryItem
                    label={t('mortgage_payoff_total_early_payments', 'Total Early Payments')}
                    value={formatCurrency(result.summary.totalEarlyPayments)}
                  />
                  {/* Total Interest */}
                  <SummaryItem
                    label={t('mortgage_payoff_total_interest', 'Total Interest')}
                    value={formatCurrency(result.summary.totalInterest)}
                  />
                </div>
              </div>

              {/* Interest Savings Card (only if extra payments) */}
              {resultWithoutExtra && result.summary.totalEarlyPayments > 0 && (
                <div
                  style={{
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-xl)',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.03) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--color-accent-growth)' }}><TrendDownIcon /></span>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {t('mortgage_payoff_interest_savings', 'Interest Savings with Extra Payments')}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>
                        {t('mortgage_payoff_interest_without_extra', 'Interest Without Extra Payments')}
                      </p>
                      <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                        {formatCurrency(resultWithoutExtra.summary.totalInterest)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>
                        {t('mortgage_payoff_interest_with_extra', 'Interest With Extra Payments')}
                      </p>
                      <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-accent-growth)' }}>
                        {formatCurrency(result.summary.totalInterest)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>
                        {t('mortgage_payoff_you_save', 'You Save')}
                      </p>
                      <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-accent-growth)' }}>
                        {formatCurrency(resultWithoutExtra.summary.totalInterest - result.summary.totalInterest)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Download PDF Button */}
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '14px 28px',
                  background: isGeneratingPDF ? 'var(--color-text-muted)' : 'var(--color-accent-growth)',
                  color: '#FFFFFF',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: isGeneratingPDF ? 'not-allowed' : 'pointer',
                  width: '100%',
                }}
                className="hover:opacity-90 transition-opacity"
              >
                <DownloadIcon />
                {isGeneratingPDF
                  ? t('mortgage_payoff_generating', 'Generating...')
                  : t('mortgage_payoff_download_report', 'Download PDF Report')
                }
              </button>
            </div>
          ) : (
            /* Empty state placeholder */
            <div
              className="ds-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: 'var(--radius-xl)',
                  background: 'rgba(16, 185, 129, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-accent-growth)',
                }}
              >
                <HomeIcon />
              </div>
              <p style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                {t('mortgage_payoff_enter_values', 'Enter Values')}
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: '320px' }}>
                {t('mortgage_payoff_subtitle', 'Calculate how extra payments can help you pay off your mortgage faster and save on interest.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== SUMMARY ITEM COMPONENT ===== */
function SummaryItem({
  label,
  value,
  highlight,
  accent,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        padding: '12px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: highlight
          ? 'rgba(16, 185, 129, 0.08)'
          : accent
            ? 'rgba(99, 102, 241, 0.06)'
            : 'var(--color-bg-input)',
        border: highlight
          ? '1px solid rgba(16, 185, 129, 0.2)'
          : '1px solid var(--color-border)',
      }}
    >
      <p
        style={{
          fontSize: '0.6875rem',
          fontWeight: 500,
          color: 'var(--color-text-muted)',
          marginBottom: '4px',
          lineHeight: 1.3,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: highlight ? '1.25rem' : '1rem',
          fontWeight: 600,
          color: highlight
            ? 'var(--color-accent-growth)'
            : accent
              ? '#6366F1'
              : 'var(--color-text-primary)',
          lineHeight: 1.3,
        }}
      >
        {value}
      </p>
    </div>
  );
}


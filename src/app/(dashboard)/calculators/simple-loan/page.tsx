'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useLanguage, useCurrency } from '@/store/useStore';
import { calculateSimpleLoan } from '@/calculators/simpleLoanCalculator';
import type { SimpleLoanInput, SimpleLoanResult } from '@/calculators/simpleLoanCalculator';
import { downloadReport } from '@/lib/reportDownload';
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
  const [calcBtnHover, setCalcBtnHover] = useState(false);
  const [pdfBtnHover, setPdfBtnHover] = useState(false);
  const [csvBtnHover, setCsvBtnHover] = useState(false);

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
    try {
      await downloadReport('simple-loan', 'pdf', language, currencySymbol, {
        loanAmount: parseFloat(loanAmount),
        annualInterestRate: parseFloat(interestRate),
        loanPeriodYears: parseFloat(loanPeriod),
        startDate,
      });
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadCSV = async () => {
    if (!result) return;
    await downloadReport('simple-loan', 'xlsx', language, currencySymbol, {
      loanAmount: parseFloat(loanAmount),
      annualInterestRate: parseFloat(interestRate),
      loanPeriodYears: parseFloat(loanPeriod),
      startDate,
    });
  };

  const formatCurrency = (value: number) =>
    styledNum(intl.formatNumber(value, { style: 'currency', currency }));

  const inputFieldStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    border: `0.5px solid ${hasError ? 'var(--ds-error)' : 'var(--ds-border)'}`,
    borderRadius: '8px',
    backgroundColor: 'var(--ds-bg-input)',
    color: 'var(--ds-text-heading)',
    outline: 'none',
    textAlign: isRTL ? 'right' : 'left',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 80px)', padding: '12px', direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Back Link */}
      <Link href="/tools" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-muted)', textDecoration: 'none', marginBottom: '12px' }}>
        <span style={{ transform: isRTL ? 'scaleX(-1)' : 'none', display: 'inline-flex' }}><ArrowLeftIcon /></span>
        {t('simple_loan_back_to_tools', 'Back to Tools')}
      </Link>

      {/* Page Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'var(--ds-bg-tinted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-primary)', flexShrink: 0 }}>
            <CreditIcon />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', lineHeight: 1.2, fontFeatureSettings: '"kern" 1' }}>
              {t('simple_loan_title', 'Simple Loan Calculator')}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', lineHeight: 1.6, marginTop: '4px' }}>
              {t('simple_loan_subtitle', 'Calculate your monthly payment and view the full amortization schedule for any fixed-rate loan.')}
            </p>
          </div>
        </div>
      </div>

      {/* Form + Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Input Form */}
        <div className="col-span-1 lg:col-span-5">
          <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '20px 24px', boxShadow: 'var(--ds-shadow-card)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--ds-primary)' }}><CalculatorIcon /></span>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', fontFeatureSettings: '"kern" 1' }}>
                {t('simple_loan_enter_values', 'Enter Loan Details')}
              </h2>
            </div>

            {/* Loan Amount */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '6px' }}>
                {t('simple_loan_loan_amount', 'Loan Amount')} ({currencySymbol})
              </label>
              <input type="text" inputMode="decimal" value={loanAmount} onChange={e => setLoanAmount(e.target.value)}
                placeholder={t('simple_loan_loan_amount_placeholder', 'e.g. 5000')}
                style={inputFieldStyle(!!errors.loanAmount)} />
              {errors.loanAmount && <p style={{ fontSize: '12px', color: 'var(--ds-error)', marginTop: '4px' }}>{errors.loanAmount}</p>}
            </div>

            {/* Interest Rate */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '6px' }}>
                {t('simple_loan_interest_rate', 'Annual Interest Rate (%)')}
              </label>
              <input type="text" inputMode="decimal" value={interestRate} onChange={e => setInterestRate(e.target.value)}
                placeholder={t('simple_loan_interest_rate_placeholder', 'e.g. 5.5')}
                style={inputFieldStyle(!!errors.interestRate)} />
              {errors.interestRate && <p style={{ fontSize: '12px', color: 'var(--ds-error)', marginTop: '4px' }}>{errors.interestRate}</p>}
            </div>

            {/* Loan Period */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '6px' }}>
                {t('simple_loan_loan_period', 'Loan Period (Years)')}
              </label>
              <input type="text" inputMode="numeric" value={loanPeriod} onChange={e => setLoanPeriod(e.target.value)}
                placeholder={t('simple_loan_loan_period_placeholder', 'e.g. 5')}
                style={inputFieldStyle(!!errors.loanPeriod)} />
              {errors.loanPeriod && <p style={{ fontSize: '12px', color: 'var(--ds-error)', marginTop: '4px' }}>{errors.loanPeriod}</p>}
            </div>

            {/* Start Date */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '6px' }}>
                {t('simple_loan_start_date', 'Start Date of Loan')}
              </label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: `0.5px solid ${errors.startDate ? 'var(--ds-error)' : 'var(--ds-border)'}`, borderRadius: '8px', backgroundColor: 'var(--ds-bg-input)', color: 'var(--ds-text-heading)', outline: 'none' }} />
              {errors.startDate && <p style={{ fontSize: '12px', color: 'var(--ds-error)', marginTop: '4px' }}>{errors.startDate}</p>}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
              <button type="button" onClick={handleCalculate}
                onMouseEnter={() => setCalcBtnHover(true)}
                onMouseLeave={() => setCalcBtnHover(false)}
                style={{ flex: '1 1 auto', minWidth: '140px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '9px 18px', background: calcBtnHover ? 'var(--ds-primary-hover)' : 'var(--ds-primary)', color: '#FFFFFF', fontSize: '13px', fontWeight: 500, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s ease' }}>
                <CalculatorIcon /> {t('simple_loan_calculate', 'Calculate')}
              </button>
              <button type="button" onClick={handleReset}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '9px 18px', background: 'transparent', color: 'var(--ds-text-body)', fontSize: '13px', fontWeight: 500, border: '0.5px solid var(--ds-border)', borderRadius: '8px', cursor: 'pointer' }}>
                {t('simple_loan_reset', 'Reset')}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="col-span-1 lg:col-span-7">
          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Dark glass results card */}
              <div style={{ background: 'var(--ds-bg-card-dark)', border: '0.5px solid var(--ds-dark-card-border)', borderRadius: '16px', padding: '20px 24px', boxShadow: 'var(--ds-dark-card-glow)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h2 style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-dark-card-body)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--ds-primary-glow)' }}><CheckCircleIcon /></span>
                  {t('simple_loan_summary', 'Loan Summary')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SummaryItem label={t('simple_loan_monthly_payment', 'Monthly Payment')} value={formatCurrency(result.summary.monthlyPayment)} highlight />
                  <SummaryItem label={t('simple_loan_number_of_payments', 'Number of Payments')} value={styledNum(intl.formatNumber(result.summary.numberOfPayments, { maximumFractionDigits: 0 }))} />
                  <SummaryItem label={t('simple_loan_total_interest', 'Total Interest')} value={formatCurrency(result.summary.totalInterest)} />
                  <SummaryItem label={t('simple_loan_total_cost', 'Total Cost of Loan')} value={formatCurrency(result.summary.totalCost)} accent />
                </div>

                {/* PDF button inside dark card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  <button type="button" onClick={handleDownloadPDF} disabled={isGeneratingPDF}
                    onMouseEnter={() => setPdfBtnHover(true)}
                    onMouseLeave={() => setPdfBtnHover(false)}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '8px 16px', background: isGeneratingPDF ? '#9CA3AF' : pdfBtnHover ? 'rgba(34,197,94,0.1)' : 'transparent', color: isGeneratingPDF ? '#FFFFFF' : 'var(--ds-primary-glow)', fontSize: '13px', fontWeight: 500, border: `1.5px solid ${isGeneratingPDF ? 'transparent' : 'rgba(74,222,128,0.3)'}`, borderRadius: '8px', cursor: isGeneratingPDF ? 'not-allowed' : 'pointer', width: '100%', opacity: isGeneratingPDF ? 0.5 : 1, transition: 'background 0.15s ease' }}>
                    <DownloadIcon />
                    {isGeneratingPDF ? t('simple_loan_generating', 'Generating...') : t('simple_loan_download_report', 'Download PDF Report')}
                  </button>
                  <button type="button" onClick={handleDownloadCSV}
                    onMouseEnter={() => setCsvBtnHover(true)}
                    onMouseLeave={() => setCsvBtnHover(false)}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '8px 16px', background: csvBtnHover ? 'rgba(96,165,250,0.1)' : 'transparent', color: 'rgba(147,197,253,0.9)', fontSize: '13px', fontWeight: 500, border: '1.5px solid rgba(96,165,250,0.3)', borderRadius: '8px', cursor: 'pointer', width: '100%', transition: 'background 0.15s ease' }}>
                    <DownloadIcon />
                    {isRTL ? 'تحميل Excel' : 'Download Excel'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '20px 24px', boxShadow: 'var(--ds-shadow-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '16px', background: 'var(--ds-bg-tinted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-primary)' }}>
                <CreditIcon />
              </div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-body)', textAlign: 'center' }}>
                {t('simple_loan_enter_values', 'Enter Loan Details')}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', textAlign: 'center', maxWidth: '320px' }}>
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
    <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
      <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-dark-card-body)', marginBottom: '4px', lineHeight: 1.3 }}>{label}</p>
      <p style={{ fontSize: '20px', fontWeight: 600, color: highlight ? 'var(--ds-primary-glow)' : 'var(--ds-dark-card-heading)', lineHeight: 1.3 }}>{value}</p>
    </div>
  );
}

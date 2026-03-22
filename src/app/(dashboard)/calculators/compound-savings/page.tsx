'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useLanguage, useCurrency } from '@/store/useStore';
import { calculateCompoundSavings } from '@/calculators/compoundSavingsCalculator';
import type { CompoundSavingsInput, CompoundSavingsResult, DepositFrequency } from '@/calculators/compoundSavingsCalculator';
import { generateCompoundSavingsPDF } from '@/calculators/compoundSavingsReport';
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

const PiggyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.83 7.5l-2.27-2.27c.07-.42.18-.81.32-1.15A1.5 1.5 0 0016.5 2.5c-.71 0-1.33.41-1.63 1-.91-.65-2-.99-3.12-.99-1.51 0-2.91.57-3.98 1.56L6.2 3.5A1.5 1.5 0 004.5 2 1.5 1.5 0 003 3.5c0 .53.28 1 .7 1.27-.12.41-.2.84-.2 1.29 0 1.44.63 2.74 1.63 3.68l-.09.38A3.5 3.5 0 005 11.5v1A3.5 3.5 0 008.5 16h.5v2.5a1 1 0 001 1h1a1 1 0 001-1V16h2v2.5a1 1 0 001 1h1a1 1 0 001-1V16h.5a3.5 3.5 0 003.5-3.5v-1c0-.78-.26-1.5-.69-2.08l.02-.02c.17-.29.32-.59.44-.9H21a1 1 0 001-1 1 1 0 00-1-1h-.17zM16 11a1 1 0 110-2 1 1 0 010 2z" />
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
  yearsToInvest?: string;
  initialInvestment?: string;
  interestRate?: string;
  depositAmount?: string;
}

/* ===== MAIN PAGE ===== */
export default function CompoundSavingsCalculatorPage() {
  const intl = useIntl();
  const language = useLanguage();
  const currency = useCurrency();
  const isRTL = language === 'ar';

  const currencyInfo = CURRENCIES.find(c => c.code === currency);
  const currencySymbol = isRTL
    ? (currencyInfo?.symbolAr || currencyInfo?.symbol || currency)
    : (currencyInfo?.symbol || currency);

  // Form state
  const [yearsToInvest, setYearsToInvest] = useState('');
  const [initialInvestment, setInitialInvestment] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositFrequency, setDepositFrequency] = useState<DepositFrequency>('monthly');
  const [extraAnnualDeposit, setExtraAnnualDeposit] = useState('');

  const [result, setResult] = useState<CompoundSavingsResult | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const t = (key: string, defaultMessage: string) =>
    intl.formatMessage({ id: `tools.${key}`, defaultMessage });

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!yearsToInvest || parseFloat(yearsToInvest) < 1 || parseFloat(yearsToInvest) > 100)
      newErrors.yearsToInvest = t('compound_validation_years', 'Years must be between 1 and 100');
    if (!initialInvestment || parseFloat(initialInvestment) < 0)
      newErrors.initialInvestment = t('compound_validation_initial', 'Initial investment must be 0 or greater');
    if (!interestRate || parseFloat(interestRate) < 0 || parseFloat(interestRate) > 100)
      newErrors.interestRate = t('compound_validation_rate', 'Interest rate must be between 0 and 100');
    if (depositAmount !== '' && parseFloat(depositAmount) < 0)
      newErrors.depositAmount = t('compound_validation_deposit', 'Deposit amount cannot be negative');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCalculate = useCallback(() => {
    if (!validate()) return;
    const input: CompoundSavingsInput = {
      yearsToInvest: parseFloat(yearsToInvest),
      initialInvestment: parseFloat(initialInvestment),
      annualInterestRate: parseFloat(interestRate) / 100,
      depositAmount: parseFloat(depositAmount || '0'),
      depositFrequency,
      extraAnnualDeposit: parseFloat(extraAnnualDeposit || '0'),
    };
    setResult(calculateCompoundSavings(input));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearsToInvest, initialInvestment, interestRate, depositAmount, depositFrequency, extraAnnualDeposit]);

  const handleReset = () => {
    setYearsToInvest(''); setInitialInvestment(''); setInterestRate('');
    setDepositAmount(''); setDepositFrequency('monthly'); setExtraAnnualDeposit('');
    setResult(null); setErrors({});
  };

  const handleDownloadPDF = async () => {
    if (!result) return;
    setIsGeneratingPDF(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      const input: CompoundSavingsInput = {
        yearsToInvest: parseFloat(yearsToInvest),
        initialInvestment: parseFloat(initialInvestment),
        annualInterestRate: parseFloat(interestRate) / 100,
        depositAmount: parseFloat(depositAmount || '0'),
        depositFrequency,
        extraAnnualDeposit: parseFloat(extraAnnualDeposit || '0'),
      };
      await generateCompoundSavingsPDF(input, result, language, currencySymbol);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const formatCurrency = (value: number) =>
    styledNum(intl.formatNumber(value, { style: 'currency', currency }));

  const formatPercent = (value: number) =>
    styledNum(intl.formatNumber(value / 100, { style: 'percent', minimumFractionDigits: 2 }));

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

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    fontSize: '0.9375rem',
    border: '1.5px solid var(--color-border-input)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-bg-input)',
    color: 'var(--color-text-primary)',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 80px)', padding: 'var(--spacing-3)', direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Back Link */}
      <Link href="/tools" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-accent-growth)', textDecoration: 'none', marginBottom: 'var(--spacing-2)' }} className="hover:underline">
        <span style={{ transform: isRTL ? 'scaleX(-1)' : 'none', display: 'inline-flex' }}><ArrowLeftIcon /></span>
        {t('compound_back_to_tools', 'Back to Tools')}
      </Link>

      {/* Page Header */}
      <div style={{ marginBottom: 'var(--spacing-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--accent-color-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent-growth)', flexShrink: 0 }}>
            <PiggyIcon />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
              {t('compound_title', 'Compound Savings Calculator')}
            </h1>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: '4px' }}>
              {t('compound_subtitle', 'See how your savings grow over time with compound interest and plan your wealth-building journey.')}
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
                {t('compound_enter_values', 'Savings Plan Inputs')}
              </h2>
            </div>

            {/* Years to Invest */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                {t('compound_years', 'Years to Invest')}
              </label>
              <input type="number" value={yearsToInvest} onChange={e => setYearsToInvest(e.target.value)}
                placeholder={isRTL ? 'مثال: ١٠' : 'e.g. 10'}
                style={inputFieldStyle(!!errors.yearsToInvest)} />
              {errors.yearsToInvest && <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px' }}>{errors.yearsToInvest}</p>}
            </div>

            {/* Initial Investment */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                {t('compound_initial', 'Initial Investment')} ({currencySymbol})
              </label>
              <input type="number" value={initialInvestment} onChange={e => setInitialInvestment(e.target.value)}
                placeholder={isRTL ? 'مثال: ٥٠٠٠' : 'e.g. 5000'}
                style={inputFieldStyle(!!errors.initialInvestment)} />
              {errors.initialInvestment && <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px' }}>{errors.initialInvestment}</p>}
            </div>

            {/* Annual Interest Rate */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                {t('compound_rate', 'Expected Annual Interest Rate (%)')}
              </label>
              <input type="number" step="0.01" value={interestRate} onChange={e => setInterestRate(e.target.value)}
                placeholder={isRTL ? 'مثال: ٤' : 'e.g. 4'}
                style={inputFieldStyle(!!errors.interestRate)} />
              {errors.interestRate && <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px' }}>{errors.interestRate}</p>}
            </div>

            {/* Deposit Amount */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                {t('compound_deposit', 'Deposit Amount')} ({currencySymbol})
              </label>
              <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
                placeholder={isRTL ? 'مثال: ٥٠' : 'e.g. 50'}
                style={inputFieldStyle(!!errors.depositAmount)} />
              {errors.depositAmount && <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px' }}>{errors.depositAmount}</p>}
            </div>

            {/* Deposit Frequency */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                {t('compound_frequency', 'Deposit Frequency')}
              </label>
              <select value={depositFrequency} onChange={e => setDepositFrequency(e.target.value as DepositFrequency)}
                style={selectStyle}>
                <option value="monthly">{t('compound_monthly', 'Monthly')}</option>
                <option value="quarterly">{t('compound_quarterly', 'Quarterly')}</option>
                <option value="annually">{t('compound_annually', 'Annually')}</option>
              </select>
            </div>

            {/* Extra Annual Deposit */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                {t('compound_extra', 'Additional Annual Investment')} ({currencySymbol})
              </label>
              <input type="number" value={extraAnnualDeposit} onChange={e => setExtraAnnualDeposit(e.target.value)}
                placeholder={isRTL ? 'اختياري' : 'Optional'}
                style={inputFieldStyle(false)} />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="button" onClick={handleCalculate}
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', background: 'var(--color-accent-growth)', color: '#FFFFFF', fontSize: '0.9375rem', fontWeight: 600, border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                className="hover:opacity-90 transition-opacity">
                <CalculatorIcon /> {t('compound_calculate', 'Calculate')}
              </button>
              <button type="button" onClick={handleReset}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '12px 20px', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, border: '1.5px solid var(--color-border-input)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                className="hover:opacity-80 transition-opacity">
                {t('compound_reset', 'Reset')}
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
                  {t('compound_results_title', 'Summary of Results')}
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <SummaryItem
                      label={t('compound_future_value', 'Estimated Future Value')}
                      sublabel={t('compound_value_after', `Value After ${yearsToInvest} Years`)}
                      value={formatCurrency(result.summary.futureValue)} highlight />
                  </div>
                  <SummaryItem label={t('compound_total_invested', 'Total Invested')} value={formatCurrency(result.summary.totalInvested)} />
                  <SummaryItem label={t('compound_interest_earned', 'Interest Earned')} value={formatCurrency(result.summary.interestEarned)} accent />
                </div>
              </div>

              {/* Growth schedule table */}
              <div className="ds-card" style={{ overflowX: 'auto' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
                  {t('compound_schedule_title', 'Savings Growth Schedule')}
                </h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr>
                      {[
                        t('compound_col_year', 'Year'),
                        t('compound_col_rate', 'Rate'),
                        t('compound_col_interest', 'Interest'),
                        t('compound_col_deposits', 'Deposits'),
                        t('compound_col_balance', 'Balance'),
                        t('compound_col_cumulative', 'Total Contributed'),
                        t('compound_col_cum_interest', 'Total Interest'),
                      ].map(h => (
                        <th key={h} style={{ padding: '8px 6px', textAlign: isRTL ? 'right' : 'left', fontWeight: 600, color: 'var(--color-text-secondary)', borderBottom: '2px solid var(--color-border)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.schedule.map((row, idx) => (
                      <tr key={row.year} style={{ background: idx % 2 === 1 ? 'var(--color-bg-surface-1)' : undefined }}>
                        <td style={cellStyle}>{row.year}</td>
                        <td style={cellStyle}>{formatPercent(row.rate * 100)}</td>
                        <td style={cellStyle}>{formatCurrency(row.interest)}</td>
                        <td style={cellStyle}>{formatCurrency(row.scheduledDeposits + row.extraDeposit)}</td>
                        <td style={{ ...cellStyle, fontWeight: 600 }}>{formatCurrency(row.balance)}</td>
                        <td style={cellStyle}>{formatCurrency(row.cumulativeContribution)}</td>
                        <td style={cellStyle}>{formatCurrency(row.cumulativeInterest)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button type="button" onClick={handleDownloadPDF} disabled={isGeneratingPDF}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px 28px', background: isGeneratingPDF ? 'var(--color-text-muted)' : 'var(--color-accent-growth)', color: '#FFFFFF', fontSize: '0.9375rem', fontWeight: 600, border: 'none', borderRadius: 'var(--radius-sm)', cursor: isGeneratingPDF ? 'not-allowed' : 'pointer', width: '100%' }}
                className="hover:opacity-90 transition-opacity">
                <DownloadIcon />
                {isGeneratingPDF ? t('compound_generating', 'Generating...') : t('compound_download', 'Download PDF Report')}
              </button>
            </div>
          ) : (
            <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-xl)', background: 'rgba(var(--accent-color-rgb), 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent-growth)' }}>
                <PiggyIcon />
              </div>
              <p style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                {t('compound_enter_values', 'Savings Plan Inputs')}
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: '320px' }}>
                {t('compound_subtitle', 'See how your savings grow over time with compound interest and plan your wealth-building journey.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const cellStyle: React.CSSProperties = {
  padding: '8px 6px',
  borderBottom: '1px solid var(--color-border-subtle)',
  whiteSpace: 'nowrap',
};

function SummaryItem({ label, sublabel, value, highlight, accent }: { label: string; sublabel?: string; value: React.ReactNode; highlight?: boolean; accent?: boolean }) {
  return (
    <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: highlight ? 'rgba(var(--accent-color-rgb), 0.08)' : accent ? 'rgba(99, 102, 241, 0.06)' : 'var(--color-bg-input)', border: highlight ? '1px solid rgba(var(--accent-color-rgb), 0.2)' : '1px solid var(--color-border)' }}>
      <p style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '2px', lineHeight: 1.3 }}>{label}</p>
      {sublabel && <p style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', marginBottom: '4px', opacity: 0.7 }}>{sublabel}</p>}
      <p style={{ fontSize: highlight ? '1.25rem' : '1rem', fontWeight: 600, color: highlight ? 'var(--color-accent-growth)' : accent ? '#6366F1' : 'var(--color-text-primary)', lineHeight: 1.3 }}>{value}</p>
    </div>
  );
}

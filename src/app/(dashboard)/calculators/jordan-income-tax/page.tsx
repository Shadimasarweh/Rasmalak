'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useLanguage } from '@/store/useStore';
import { calculateJordanIncomeTax } from '@/calculators/jordanIncomeTaxCalculator';
import type {
  JordanIncomeTaxInput,
  JordanIncomeTaxResult,
  JordanTaxBracketKey,
} from '@/calculators/jordanIncomeTaxCalculator';
import { downloadReport } from '@/lib/reportDownload';
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

const ReceiptIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

interface FormErrors {
  employmentIncome?: string;
}

export default function JordanIncomeTaxCalculatorPage() {
  const intl = useIntl();
  const language = useLanguage();
  const isRTL = language === 'ar';

  // Jordanian tax brackets are statutory JOD amounts, so the page pins
  // JOD instead of following the user's display currency.
  const currencySymbol = isRTL ? 'د.أ' : 'JOD';

  const [employmentIncome, setEmploymentIncome] = useState('');
  const [retirementIncome, setRetirementIncome] = useState('');
  const [disabilityCount, setDisabilityCount] = useState('');
  const [personalDeduction, setPersonalDeduction] = useState('9000');
  const [familyDeduction, setFamilyDeduction] = useState('');
  const [otherDeductions, setOtherDeductions] = useState('');
  const [contributions, setContributions] = useState('');

  const [result, setResult] = useState<JordanIncomeTaxResult | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [calcBtnHover, setCalcBtnHover] = useState(false);
  const [pdfBtnHover, setPdfBtnHover] = useState(false);
  const [csvBtnHover, setCsvBtnHover] = useState(false);

  const t = (key: string, defaultMessage: string) =>
    intl.formatMessage({ id: `tools.${key}`, defaultMessage });

  const BRACKET_LABELS: Record<JordanTaxBracketKey, string> = {
    first5k: t('jotax_bracket_first5k', 'First JOD 5,000'),
    second5k: t('jotax_bracket_second5k', 'Second JOD 5,000'),
    third5k: t('jotax_bracket_third5k', 'Third JOD 5,000'),
    fourth5k: t('jotax_bracket_fourth5k', 'Fourth JOD 5,000'),
    over20k: t('jotax_bracket_over20k', 'JOD 20,000 – 1,000,000'),
    over1m: t('jotax_bracket_over1m', 'Above JOD 1,000,000'),
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const totalEntered = (parseFloat(employmentIncome) || 0) + (parseFloat(retirementIncome) || 0);
    if (totalEntered <= 0)
      newErrors.employmentIncome = t('jotax_validation_income', 'Enter your annual income (salaries or retirement)');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildInput = useCallback((): JordanIncomeTaxInput => ({
    employmentIncome: parseFloat(employmentIncome) || 0,
    retirementIncome: parseFloat(retirementIncome) || 0,
    disabilityCount: parseInt(disabilityCount, 10) || 0,
    personalDeduction: parseFloat(personalDeduction) || 0,
    familyDeduction: parseFloat(familyDeduction) || 0,
    otherDeductions: parseFloat(otherDeductions) || 0,
    contributions: parseFloat(contributions) || 0,
  }), [employmentIncome, retirementIncome, disabilityCount, personalDeduction, familyDeduction, otherDeductions, contributions]);

  const handleCalculate = useCallback(() => {
    if (!validate()) return;
    setResult(calculateJordanIncomeTax(buildInput()));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employmentIncome, retirementIncome, disabilityCount, personalDeduction, familyDeduction, otherDeductions, contributions]);

  const handleReset = () => {
    setEmploymentIncome('');
    setRetirementIncome('');
    setDisabilityCount('');
    setPersonalDeduction('9000');
    setFamilyDeduction('');
    setOtherDeductions('');
    setContributions('');
    setResult(null);
    setErrors({});
  };

  const handleDownloadPDF = async () => {
    if (!result) return;
    setIsGeneratingPDF(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await downloadReport('jordan-income-tax', 'pdf', language, currencySymbol, buildInput() as any);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadCSV = async () => {
    if (!result) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await downloadReport('jordan-income-tax', 'xlsx', language, currencySymbol, buildInput() as any);
  };

  // JOD formats with 3 minor digits by default; tax figures read better
  // rounded to whole dinars with cents only when present.
  const formatCurrency = (value: number) =>
    styledNum(intl.formatNumber(value, { style: 'currency', currency: 'JOD', minimumFractionDigits: 0, maximumFractionDigits: 2 }));

  const formatPercent = (fraction: number) =>
    styledNum(intl.formatNumber(fraction, { style: 'percent', maximumFractionDigits: 2 }));

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

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--ds-text-heading)',
    marginBottom: '6px',
  };

  const bracketCellStyle: React.CSSProperties = {
    padding: '8px 10px',
    fontSize: '13px',
    color: 'var(--ds-dark-card-heading)',
    borderBottom: '0.5px solid rgba(255,255,255,0.08)',
    textAlign: isRTL ? 'right' : 'left',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 80px)', padding: '12px', direction: isRTL ? 'rtl' : 'ltr' }}>
      <Link href="/tools" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-muted)', textDecoration: 'none', marginBottom: '12px' }}>
        <span style={{ transform: isRTL ? 'scaleX(-1)' : 'none', display: 'inline-flex' }}><ArrowLeftIcon /></span>
        {t('jotax_back_to_tools', 'Back to Tools')}
      </Link>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'var(--ds-bg-tinted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-primary)', flexShrink: 0 }}>
            <ReceiptIcon />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', lineHeight: 1.2, fontFeatureSettings: '"kern" 1' }}>
              {t('jotax_title', 'Jordanian Income Tax Calculator')}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', lineHeight: 1.6, marginTop: '4px' }}>
              {t('jotax_subtitle', 'Estimate your annual personal income tax under the Jordanian brackets, including exemptions and deductions.')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="col-span-1 lg:col-span-5">
          <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '20px 24px', boxShadow: 'var(--ds-shadow-card)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--ds-primary)' }}><CalculatorIcon /></span>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', fontFeatureSettings: '"kern" 1' }}>
                {t('jotax_enter_values', 'Enter Income Details')}
              </h2>
            </div>

            {/* Employment income */}
            <div>
              <label style={labelStyle}>
                {t('jotax_employment_income', 'Salaries & Other Income (annual)')} ({currencySymbol})
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={employmentIncome}
                onChange={(e) => setEmploymentIncome(e.target.value)}
                placeholder={t('jotax_employment_placeholder', 'e.g. 20000')}
                style={inputFieldStyle(!!errors.employmentIncome)}
              />
              {errors.employmentIncome && <p style={{ fontSize: '12px', color: 'var(--ds-error)', marginTop: '4px' }}>{errors.employmentIncome}</p>}
            </div>

            {/* Retirement income */}
            <div>
              <label style={labelStyle}>
                {t('jotax_retirement_income', 'Retirement Salary Above JOD 2,500 (annual)')}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={retirementIncome}
                onChange={(e) => setRetirementIncome(e.target.value)}
                placeholder={t('jotax_retirement_placeholder', 'e.g. 0')}
                style={inputFieldStyle(false)}
              />
            </div>

            {/* Disability count */}
            <div>
              <label style={labelStyle}>
                {t('jotax_disability_count', 'Disability Exemption — Eligible Persons (JOD 2,000 each)')}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={disabilityCount}
                onChange={(e) => setDisabilityCount(e.target.value)}
                placeholder={t('jotax_disability_placeholder', 'e.g. 0')}
                style={inputFieldStyle(false)}
              />
            </div>

            {/* Personal & family deductions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>
                  {t('jotax_personal_deduction', 'Personal Deduction (max JOD 9,000)')}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={personalDeduction}
                  onChange={(e) => setPersonalDeduction(e.target.value)}
                  placeholder={t('jotax_personal_placeholder', 'e.g. 9000')}
                  style={inputFieldStyle(false)}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  {t('jotax_family_deduction', 'Family Deduction (max JOD 9,000)')}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={familyDeduction}
                  onChange={(e) => setFamilyDeduction(e.target.value)}
                  placeholder={t('jotax_family_placeholder', 'e.g. 9000')}
                  style={inputFieldStyle(false)}
                />
              </div>
            </div>

            {/* Other deductions */}
            <div>
              <label style={labelStyle}>
                {t('jotax_other_deductions', 'Other Deductions — Medical, Education… (JOD 1,000 per person)')}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={otherDeductions}
                onChange={(e) => setOtherDeductions(e.target.value)}
                placeholder={t('jotax_other_placeholder', 'e.g. 1000')}
                style={inputFieldStyle(false)}
              />
            </div>

            {/* Accepted contributions */}
            <div>
              <label style={labelStyle}>
                {t('jotax_contributions', 'Accepted Donations (max 25% of taxable income)')}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={contributions}
                onChange={(e) => setContributions(e.target.value)}
                placeholder={t('jotax_contributions_placeholder', 'e.g. 0')}
                style={inputFieldStyle(false)}
              />
            </div>

            <p style={{ fontSize: '11px', color: 'var(--ds-text-muted)', lineHeight: 1.5, marginTop: '4px' }}>
              {t('jotax_disclaimer', 'Estimate based on Jordanian personal income tax brackets. Your actual assessment may differ — consult the Income and Sales Tax Department or a tax advisor.')}
            </p>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleCalculate}
                onMouseEnter={() => setCalcBtnHover(true)}
                onMouseLeave={() => setCalcBtnHover(false)}
                style={{ flex: '1 1 auto', minWidth: '140px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '9px 18px', background: calcBtnHover ? 'var(--ds-primary-hover)' : 'var(--ds-primary)', color: '#FFFFFF', fontSize: '13px', fontWeight: 500, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s ease' }}
              >
                <CalculatorIcon /> {t('jotax_calculate', 'Calculate Tax')}
              </button>
              <button
                type="button"
                onClick={handleReset}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '9px 18px', background: 'transparent', color: 'var(--ds-text-body)', fontSize: '13px', fontWeight: 500, border: '0.5px solid var(--ds-border)', borderRadius: '8px', cursor: 'pointer' }}
              >
                {t('jotax_reset', 'Reset')}
              </button>
            </div>
          </div>
        </div>

        <div className="col-span-1 lg:col-span-7">
          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'var(--ds-bg-card-dark)', border: '0.5px solid var(--ds-dark-card-border)', borderRadius: '16px', padding: '20px 24px', boxShadow: 'var(--ds-dark-card-glow)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h2 style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-dark-card-body)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--ds-primary-glow)' }}><CheckCircleIcon /></span>
                  {t('jotax_summary', 'Tax Summary')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SummaryItem label={t('jotax_total_tax', 'Total Tax Payable')} value={formatCurrency(result.totalTax)} highlight accent />
                  <SummaryItem label={t('jotax_effective_rate', 'Effective Tax Rate')} value={formatPercent(result.effectiveRate)} />
                  <SummaryItem label={t('jotax_total_income', 'Total Income')} value={formatCurrency(result.totalIncome)} />
                  <SummaryItem label={t('jotax_taxable_income', 'Taxable Income')} value={formatCurrency(result.taxableIncome)} />
                  <SummaryItem label={t('jotax_adjusted_income', 'Adjusted Taxable Income')} value={formatCurrency(result.adjustedTaxableIncome)} />
                  <SummaryItem label={t('jotax_net_income', 'Income After Tax')} value={formatCurrency(result.netIncomeAfterTax)} />
                </div>

                {/* Bracket breakdown — mirrors the tax table in the source sheet */}
                <div>
                  <h3 style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-dark-card-body)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '8px 0' }}>
                    {t('jotax_brackets_heading', 'Bracket Breakdown')}
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ ...bracketCellStyle, color: 'var(--ds-dark-card-body)', fontWeight: 500, fontSize: '12px' }}>{t('jotax_bracket_col', 'Tax Bracket')}</th>
                          <th style={{ ...bracketCellStyle, color: 'var(--ds-dark-card-body)', fontWeight: 500, fontSize: '12px' }}>{t('jotax_bracket_rate', 'Rate')}</th>
                          <th style={{ ...bracketCellStyle, color: 'var(--ds-dark-card-body)', fontWeight: 500, fontSize: '12px' }}>{t('jotax_bracket_amount', 'Taxable Amount')}</th>
                          <th style={{ ...bracketCellStyle, color: 'var(--ds-dark-card-body)', fontWeight: 500, fontSize: '12px' }}>{t('jotax_bracket_tax', 'Tax')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.brackets.map((row) => (
                          <tr key={row.key} style={{ opacity: row.amount > 0 ? 1 : 0.45 }}>
                            <td style={bracketCellStyle}>{BRACKET_LABELS[row.key]}</td>
                            <td style={bracketCellStyle}>{formatPercent(row.rate)}</td>
                            <td style={bracketCellStyle}>{formatCurrency(row.amount)}</td>
                            <td style={bracketCellStyle}>{formatCurrency(row.tax)}</td>
                          </tr>
                        ))}
                        <tr>
                          <td style={{ ...bracketCellStyle, fontWeight: 600, borderBottom: 'none' }} colSpan={3}>{t('jotax_total_tax', 'Total Tax Payable')}</td>
                          <td style={{ ...bracketCellStyle, fontWeight: 600, color: 'var(--ds-primary-glow)', borderBottom: 'none' }}>{formatCurrency(result.totalTax)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                    onMouseEnter={() => setPdfBtnHover(true)}
                    onMouseLeave={() => setPdfBtnHover(false)}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '8px 16px', background: isGeneratingPDF ? '#9CA3AF' : pdfBtnHover ? 'rgba(34,197,94,0.1)' : 'transparent', color: isGeneratingPDF ? '#FFFFFF' : 'var(--ds-primary-glow)', fontSize: '13px', fontWeight: 500, border: `1.5px solid ${isGeneratingPDF ? 'transparent' : 'rgba(74,222,128,0.3)'}`, borderRadius: '8px', cursor: isGeneratingPDF ? 'not-allowed' : 'pointer', width: '100%', opacity: isGeneratingPDF ? 0.5 : 1, transition: 'background 0.15s ease' }}
                  >
                    <DownloadIcon />
                    {isGeneratingPDF ? t('jotax_generating', 'Generating...') : t('jotax_download_report', 'Download PDF Report')}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCSV}
                    onMouseEnter={() => setCsvBtnHover(true)}
                    onMouseLeave={() => setCsvBtnHover(false)}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '8px 16px', background: csvBtnHover ? 'rgba(96,165,250,0.1)' : 'transparent', color: 'rgba(147,197,253,0.9)', fontSize: '13px', fontWeight: 500, border: '1.5px solid rgba(96,165,250,0.3)', borderRadius: '8px', cursor: 'pointer', width: '100%', transition: 'background 0.15s ease' }}
                  >
                    <DownloadIcon />
                    {isRTL ? 'تحميل Excel' : 'Download Excel'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '20px 24px', boxShadow: 'var(--ds-shadow-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '16px', background: 'var(--ds-bg-tinted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-primary)' }}>
                <ReceiptIcon />
              </div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-body)', textAlign: 'center' }}>
                {t('jotax_enter_values', 'Enter Income Details')}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', textAlign: 'center', maxWidth: '320px' }}>
                {t('jotax_subtitle', 'Estimate your annual personal income tax under the Jordanian brackets, including exemptions and deductions.')}
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
    <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: accent ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
      <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-dark-card-body)', marginBottom: '4px', lineHeight: 1.3 }}>{label}</p>
      <p style={{ fontSize: '20px', fontWeight: 600, color: highlight ? 'var(--ds-primary-glow)' : 'var(--ds-dark-card-heading)', lineHeight: 1.3 }}>{value}</p>
    </div>
  );
}

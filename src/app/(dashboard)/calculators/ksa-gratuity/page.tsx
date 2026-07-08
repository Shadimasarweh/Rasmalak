'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useLanguage } from '@/store/useStore';
import { calculateKsaGratuity } from '@/calculators/ksaGratuityCalculator';
import type {
  KsaEndReason,
  KsaGratuityInput,
  KsaGratuityResult,
} from '@/calculators/ksaGratuityCalculator';
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

const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

interface FormErrors {
  joiningDate?: string;
  endDate?: string;
  basicSalary?: string;
}

export default function KsaGratuityCalculatorPage() {
  const intl = useIntl();
  const language = useLanguage();
  const isRTL = language === 'ar';

  // KSA end-of-service awards are always paid in Saudi riyals, so the
  // page pins SAR instead of following the user's display currency.
  const currencySymbol = isRTL ? 'ر.س' : 'SAR';

  const today = new Date().toISOString().slice(0, 10);

  const [endReason, setEndReason] = useState<KsaEndReason>('employer');
  const [joiningDate, setJoiningDate] = useState('');
  const [endDate, setEndDate] = useState(today);
  const [basicSalary, setBasicSalary] = useState('');
  const [housing, setHousing] = useState('');
  const [transportation, setTransportation] = useState('');

  const [result, setResult] = useState<KsaGratuityResult | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [calcBtnHover, setCalcBtnHover] = useState(false);
  const [pdfBtnHover, setPdfBtnHover] = useState(false);
  const [csvBtnHover, setCsvBtnHover] = useState(false);

  const t = (key: string, defaultMessage: string) =>
    intl.formatMessage({ id: `tools.${key}`, defaultMessage });

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!joiningDate) newErrors.joiningDate = t('ksagrat_validation_joining', 'Joining date is required');
    if (!endDate) newErrors.endDate = t('ksagrat_validation_end', 'End date is required');
    if (joiningDate && endDate && new Date(endDate) <= new Date(joiningDate))
      newErrors.endDate = t('ksagrat_validation_end_after', 'End date must be after the joining date');
    if (!basicSalary || parseFloat(basicSalary) <= 0)
      newErrors.basicSalary = t('ksagrat_validation_basic', 'Basic salary must be greater than 0');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildInput = useCallback((): KsaGratuityInput => ({
    endReason,
    joiningDate,
    endDate,
    basicSalary: parseFloat(basicSalary) || 0,
    housing: parseFloat(housing) || 0,
    transportation: parseFloat(transportation) || 0,
  }), [endReason, joiningDate, endDate, basicSalary, housing, transportation]);

  const handleCalculate = useCallback(() => {
    if (!validate()) return;
    setResult(calculateKsaGratuity(buildInput()));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endReason, joiningDate, endDate, basicSalary, housing, transportation]);

  const handleReset = () => {
    setEndReason('employer');
    setJoiningDate('');
    setEndDate(today);
    setBasicSalary('');
    setHousing('');
    setTransportation('');
    setResult(null);
    setErrors({});
  };

  const handleDownloadPDF = async () => {
    if (!result) return;
    setIsGeneratingPDF(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await downloadReport('ksa-gratuity', 'pdf', language, currencySymbol, buildInput() as any);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadCSV = async () => {
    if (!result) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await downloadReport('ksa-gratuity', 'xlsx', language, currencySymbol, buildInput() as any);
  };

  const formatCurrency = (value: number) =>
    styledNum(intl.formatNumber(value, { style: 'currency', currency: 'SAR' }));

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

  const noGratuity = result?.bracket === 'employee_under_2y';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 80px)', padding: '12px', direction: isRTL ? 'rtl' : 'ltr' }}>
      <Link href="/tools" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-muted)', textDecoration: 'none', marginBottom: '12px' }}>
        <span style={{ transform: isRTL ? 'scaleX(-1)' : 'none', display: 'inline-flex' }}><ArrowLeftIcon /></span>
        {t('ksagrat_back_to_tools', 'Back to Tools')}
      </Link>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'var(--ds-bg-tinted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-primary)', flexShrink: 0 }}>
            <ShieldIcon />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', lineHeight: 1.2, fontFeatureSettings: '"kern" 1' }}>
              {t('ksagrat_title', 'KSA End of Service Calculator')}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', lineHeight: 1.6, marginTop: '4px' }}>
              {t('ksagrat_subtitle', 'Calculate your end-of-service award under Saudi Labor Law, based on how the contract ended.')}
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
                {t('ksagrat_enter_values', 'Enter Employment Details')}
              </h2>
            </div>

            {/* End reason */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '6px' }}>
                {t('ksagrat_end_reason', 'Contract Ended By')}
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['employer', 'employee'] as const).map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setEndReason(reason)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: endReason === reason ? '0.5px solid var(--ds-primary)' : '0.5px solid var(--ds-border)',
                      borderRadius: '8px',
                      background: endReason === reason ? 'var(--ds-bg-tinted)' : 'var(--ds-bg-input)',
                      color: endReason === reason ? 'var(--ds-primary)' : 'var(--ds-text-body)',
                      fontWeight: 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {reason === 'employer'
                      ? t('ksagrat_by_employer', 'By Employer')
                      : t('ksagrat_by_employee', 'By Employee (resignation)')}
                  </button>
                ))}
              </div>
            </div>

            {/* Joining date */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '6px' }}>
                {t('ksagrat_joining_date', 'Joining Date')}
              </label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                style={{ ...inputFieldStyle(!!errors.joiningDate) }}
              />
              {errors.joiningDate && <p style={{ fontSize: '12px', color: 'var(--ds-error)', marginTop: '4px' }}>{errors.joiningDate}</p>}
            </div>

            {/* End date */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '6px' }}>
                {t('ksagrat_end_date', 'End Date')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ ...inputFieldStyle(!!errors.endDate) }}
              />
              {errors.endDate && <p style={{ fontSize: '12px', color: 'var(--ds-error)', marginTop: '4px' }}>{errors.endDate}</p>}
            </div>

            {/* Basic salary */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '6px' }}>
                {t('ksagrat_basic_salary', 'Basic Salary (monthly)')} ({currencySymbol})
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={basicSalary}
                onChange={(e) => setBasicSalary(e.target.value)}
                placeholder={t('ksagrat_basic_placeholder', 'e.g. 12000')}
                style={inputFieldStyle(!!errors.basicSalary)}
              />
              {errors.basicSalary && <p style={{ fontSize: '12px', color: 'var(--ds-error)', marginTop: '4px' }}>{errors.basicSalary}</p>}
            </div>

            {/* Housing & transportation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '6px' }}>
                  {t('ksagrat_housing', 'Housing Allowance')}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={housing}
                  onChange={(e) => setHousing(e.target.value)}
                  placeholder={t('ksagrat_housing_placeholder', 'e.g. 3000')}
                  style={inputFieldStyle(false)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '6px' }}>
                  {t('ksagrat_transportation', 'Transportation')}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={transportation}
                  onChange={(e) => setTransportation(e.target.value)}
                  placeholder={t('ksagrat_transport_placeholder', 'e.g. 1500')}
                  style={inputFieldStyle(false)}
                />
              </div>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--ds-text-muted)', lineHeight: 1.5, marginTop: '4px' }}>
              {t('ksagrat_disclaimer', 'Simplified estimate based on Saudi Labor Law end-of-service rules. The actual award may differ depending on your contract and final wage.')}
            </p>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleCalculate}
                onMouseEnter={() => setCalcBtnHover(true)}
                onMouseLeave={() => setCalcBtnHover(false)}
                style={{ flex: '1 1 auto', minWidth: '140px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '9px 18px', background: calcBtnHover ? 'var(--ds-primary-hover)' : 'var(--ds-primary)', color: '#FFFFFF', fontSize: '13px', fontWeight: 500, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s ease' }}
              >
                <CalculatorIcon /> {t('ksagrat_calculate', 'Calculate')}
              </button>
              <button
                type="button"
                onClick={handleReset}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '9px 18px', background: 'transparent', color: 'var(--ds-text-body)', fontSize: '13px', fontWeight: 500, border: '0.5px solid var(--ds-border)', borderRadius: '8px', cursor: 'pointer' }}
              >
                {t('ksagrat_reset', 'Reset')}
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
                  {t('ksagrat_summary', 'End of Service Summary')}
                </h2>

                {noGratuity && (
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#FCD34D', background: 'rgba(217,119,6,0.12)', border: '0.5px solid rgba(217,119,6,0.35)', borderRadius: '8px', padding: '10px 12px', lineHeight: 1.5 }}>
                    {t('ksagrat_no_gratuity', 'No award is due — resignation before completing 2 years of service.')}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SummaryItem label={t('ksagrat_amount', 'End of Service Award')} value={formatCurrency(result.gratuity)} highlight accent />
                  <SummaryItem
                    label={t('ksagrat_months', 'Months of Service')}
                    value={styledNum(intl.formatNumber(result.monthsOfService, { maximumFractionDigits: 0 }))}
                  />
                  <SummaryItem
                    label={t('ksagrat_years', 'Years of Service')}
                    value={styledNum(intl.formatNumber(result.yearsOfService, { maximumFractionDigits: 2 }))}
                  />
                  <SummaryItem
                    label={t('ksagrat_equiv_months', 'Equivalent Months of Basic')}
                    value={styledNum(intl.formatNumber(result.equivalentMonthsOfBasic, { maximumFractionDigits: 2 }))}
                  />
                  <SummaryItem label={t('ksagrat_total_salary', 'Total Salary')} value={formatCurrency(result.totalSalary)} />
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
                    {isGeneratingPDF ? t('ksagrat_generating', 'Generating...') : t('ksagrat_download_report', 'Download PDF Report')}
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
                <ShieldIcon />
              </div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-body)', textAlign: 'center' }}>
                {t('ksagrat_enter_values', 'Enter Employment Details')}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', textAlign: 'center', maxWidth: '320px' }}>
                {t('ksagrat_subtitle', 'Calculate your end-of-service award under Saudi Labor Law, based on how the contract ended.')}
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

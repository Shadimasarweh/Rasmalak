'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useLanguage, useCurrency } from '@/store/useStore';
import { calculateHomeAffordability } from '@/calculators/homeAffordabilityCalculator';
import type { HomeAffordabilityInput, HomeAffordabilityResult } from '@/calculators/homeAffordabilityCalculator';
import { generateHomeAffordabilityPDF } from '@/calculators/homeAffordabilityReport';
import { exportHomeAffordabilityCSV } from '@/calculators/csvExport';
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

/* ===== TYPES ===== */
interface FormErrors {
  income?: string; housingPct?: string; dtiRatio?: string;
  downPct?: string; term?: string; rate?: string;
}

/* ===== MAIN PAGE ===== */
export default function HomeAffordabilityCalculatorPage() {
  const intl = useIntl();
  const language = useLanguage();
  const currency = useCurrency();
  const isRTL = language === 'ar';

  const currencyInfo = CURRENCIES.find(c => c.code === currency);
  const currencySymbol = isRTL
    ? (currencyInfo?.symbolAr || currencyInfo?.symbol || currency)
    : (currencyInfo?.symbol || currency);

  // Income
  const [grossIncome, setGrossIncome] = useState('');
  const [maxHousingPct, setMaxHousingPct] = useState('');

  // Monthly debts
  const [carLoans, setCarLoans] = useState('');
  const [creditCards, setCreditCards] = useState('');
  const [studentLoans, setStudentLoans] = useState('');
  const [childSupport, setChildSupport] = useState('');
  const [otherMortgages, setOtherMortgages] = useState('');
  const [otherLoans, setOtherLoans] = useState('');
  const [maxDTI, setMaxDTI] = useState('');

  // Housing expenses
  const [propertyTax, setPropertyTax] = useState('');
  const [insurance, setInsurance] = useState('');
  const [pmi, setPmi] = useState('');
  const [hoa, setHoa] = useState('');
  const [otherExpenses, setOtherExpenses] = useState('');

  // Available funds
  const [availableFunds, setAvailableFunds] = useState('');
  const [fixedClosing, setFixedClosing] = useState('');
  const [variableClosing, setVariableClosing] = useState('');
  const [minDown, setMinDown] = useState('');

  // Financing
  const [mortgageTerm, setMortgageTerm] = useState('');
  const [interestRate, setInterestRate] = useState('');

  const [result, setResult] = useState<HomeAffordabilityResult | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [calcHover, setCalcHover] = useState(false);
  const [pdfHover, setPdfHover] = useState(false);
  const [csvHover, setCsvHover] = useState(false);

  const t = (key: string, defaultMessage: string) =>
    intl.formatMessage({ id: `tools.${key}`, defaultMessage });

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!grossIncome || parseFloat(grossIncome) <= 0)
      newErrors.income = t('home_afford_validation_income', 'Annual income must be greater than 0');
    if (!maxHousingPct || parseFloat(maxHousingPct) < 1 || parseFloat(maxHousingPct) > 100)
      newErrors.housingPct = t('home_afford_validation_housing_pct', 'Housing expense % must be between 1 and 100');
    if (!maxDTI || parseFloat(maxDTI) < 1 || parseFloat(maxDTI) > 100)
      newErrors.dtiRatio = t('home_afford_validation_dti', 'DTI ratio must be between 1 and 100');
    if (!minDown || parseFloat(minDown) < 1 || parseFloat(minDown) > 100)
      newErrors.downPct = t('home_afford_validation_down', 'Down payment % must be between 1 and 100');
    if (!mortgageTerm || parseFloat(mortgageTerm) < 1 || parseFloat(mortgageTerm) > 50)
      newErrors.term = t('home_afford_validation_term', 'Mortgage term must be between 1 and 50 years');
    if (!interestRate || parseFloat(interestRate) < 0 || parseFloat(interestRate) > 100)
      newErrors.rate = t('home_afford_validation_rate', 'Interest rate must be between 0 and 100');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildInput = (): HomeAffordabilityInput => ({
    grossAnnualIncome: parseFloat(grossIncome) || 0,
    maxHousingExpensePercent: parseFloat(maxHousingPct) || 28,
    carLoans: parseFloat(carLoans) || 0,
    creditCardMinimums: parseFloat(creditCards) || 0,
    studentLoans: parseFloat(studentLoans) || 0,
    childSupportOther: parseFloat(childSupport) || 0,
    otherMortgages: parseFloat(otherMortgages) || 0,
    otherLoans: parseFloat(otherLoans) || 0,
    maxDTIRatio: parseFloat(maxDTI) || 36,
    propertyTaxMonthly: parseFloat(propertyTax) || 0,
    homeInsuranceMonthly: parseFloat(insurance) || 0,
    pmiMonthly: parseFloat(pmi) || 0,
    hoaFees: parseFloat(hoa) || 0,
    otherHousingExpenses: parseFloat(otherExpenses) || 0,
    availableFunds: parseFloat(availableFunds) || 0,
    fixedClosingCosts: parseFloat(fixedClosing) || 0,
    variableClosingCostsPercent: parseFloat(variableClosing) || 4,
    minDownPaymentPercent: parseFloat(minDown) || 20,
    mortgageTermYears: parseFloat(mortgageTerm) || 30,
    annualInterestRate: parseFloat(interestRate) || 0,
  });

  const handleCalculate = useCallback(() => {
    if (!validate()) return;
    setResult(calculateHomeAffordability(buildInput()));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grossIncome, maxHousingPct, carLoans, creditCards, studentLoans, childSupport, otherMortgages, otherLoans, maxDTI, propertyTax, insurance, pmi, hoa, otherExpenses, availableFunds, fixedClosing, variableClosing, minDown, mortgageTerm, interestRate]);

  const handleReset = () => {
    setGrossIncome(''); setMaxHousingPct('');
    setCarLoans(''); setCreditCards(''); setStudentLoans(''); setChildSupport('');
    setOtherMortgages(''); setOtherLoans(''); setMaxDTI('');
    setPropertyTax(''); setInsurance(''); setPmi(''); setHoa(''); setOtherExpenses('');
    setAvailableFunds(''); setFixedClosing(''); setVariableClosing(''); setMinDown('');
    setMortgageTerm(''); setInterestRate('');
    setResult(null); setErrors({});
  };

  const handleDownloadPDF = async () => {
    if (!result) return;
    setIsGeneratingPDF(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      await generateHomeAffordabilityPDF(buildInput(), result, language, currencySymbol);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!result) return;
    exportHomeAffordabilityCSV(result, language, currencySymbol);
  };

  const formatCurrencyValue = (value: number) =>
    styledNum(intl.formatNumber(value, { style: 'currency', currency }));

  const sectionTitle = (text: string) => (
    <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text-heading)', marginTop: '8px', marginBottom: '4px', paddingTop: '8px', borderTop: '0.5px solid var(--ds-border)' }}>
      {text}
    </h3>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 80px)', padding: 'var(--spacing-3)', direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Back Link */}
      <Link href="/tools" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-muted)', textDecoration: 'none', marginBottom: 'var(--spacing-2)' }}>
        <span style={{ transform: isRTL ? 'scaleX(-1)' : 'none', display: 'inline-flex' }}><ArrowLeftIcon /></span>
        {t('home_afford_back_to_tools', 'Back to Tools')}
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 'var(--spacing-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'var(--ds-bg-tinted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-primary)', flexShrink: 0 }}>
            <HomeIcon />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', lineHeight: 1.2, fontFeatureSettings: '"kern" 1' }}>
              {t('home_afford_title', 'Home Affordability Calculator')}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', lineHeight: 1.6, marginTop: '4px' }}>
              {t('home_afford_subtitle', 'Determine how much home you can afford based on your income, debts, and available funds.')}
            </p>
          </div>
        </div>
      </div>

      {/* Form + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Form */}
        <div className="col-span-1 lg:col-span-6">
          <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '20px 24px', boxShadow: 'var(--ds-shadow-card)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--ds-primary)' }}><CalculatorIcon /></span>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', fontFeatureSettings: '"kern" 1' }}>
                {t('home_afford_enter_values', 'Enter Your Details')}
              </h2>
            </div>

            {/* ===== INCOME ===== */}
            {sectionTitle(t('home_afford_income_section', 'Income'))}
            <NumField isRTL={isRTL} label={t('home_afford_gross_income', 'Gross Annual Income (before tax)')} value={grossIncome} onChange={setGrossIncome} placeholder={t('home_afford_income_placeholder', 'e.g. 65000')} error={errors.income} suffix={`(${currencySymbol})`} />
            <NumField isRTL={isRTL} label={t('home_afford_max_housing_pct', 'Maximum Housing Expense %')} value={maxHousingPct} onChange={setMaxHousingPct} placeholder="28" error={errors.housingPct} />

            {/* ===== DEBTS ===== */}
            {sectionTitle(t('home_afford_debts_section', 'Monthly Debts'))}
            <div className="grid grid-cols-2 gap-3">
              <NumField isRTL={isRTL} label={t('home_afford_car_loans', 'Car Loans')} value={carLoans} onChange={setCarLoans} placeholder="0" suffix={`(${currencySymbol})`} />
              <NumField isRTL={isRTL} label={t('home_afford_credit_cards', 'Credit Card Minimums')} value={creditCards} onChange={setCreditCards} placeholder="0" suffix={`(${currencySymbol})`} />
              <NumField isRTL={isRTL} label={t('home_afford_student_loans', 'Student Loans')} value={studentLoans} onChange={setStudentLoans} placeholder="0" suffix={`(${currencySymbol})`} />
              <NumField isRTL={isRTL} label={t('home_afford_child_support', 'Child Support & Other')} value={childSupport} onChange={setChildSupport} placeholder="0" suffix={`(${currencySymbol})`} />
              <NumField isRTL={isRTL} label={t('home_afford_other_mortgages', 'Other Mortgages')} value={otherMortgages} onChange={setOtherMortgages} placeholder="0" suffix={`(${currencySymbol})`} />
              <NumField isRTL={isRTL} label={t('home_afford_other_loans', 'Other Loans')} value={otherLoans} onChange={setOtherLoans} placeholder="0" suffix={`(${currencySymbol})`} />
            </div>
            <NumField isRTL={isRTL} label={t('home_afford_max_dti', 'Maximum Debt-to-Income Ratio %')} value={maxDTI} onChange={setMaxDTI} placeholder="36" error={errors.dtiRatio} />

            {/* ===== HOUSING EXPENSES ===== */}
            {sectionTitle(t('home_afford_housing_section', 'Monthly Housing Expenses'))}
            <div className="grid grid-cols-2 gap-3">
              <NumField isRTL={isRTL} label={t('home_afford_property_tax', 'Property Tax')} value={propertyTax} onChange={setPropertyTax} placeholder="0" suffix={`(${currencySymbol})`} />
              <NumField isRTL={isRTL} label={t('home_afford_insurance', 'Home Insurance')} value={insurance} onChange={setInsurance} placeholder="0" suffix={`(${currencySymbol})`} />
              <NumField isRTL={isRTL} label={t('home_afford_pmi', 'PMI')} value={pmi} onChange={setPmi} placeholder="0" suffix={`(${currencySymbol})`} />
              <NumField isRTL={isRTL} label={t('home_afford_hoa', 'HOA Fees')} value={hoa} onChange={setHoa} placeholder="0" suffix={`(${currencySymbol})`} />
            </div>
            <NumField isRTL={isRTL} label={t('home_afford_other_expenses', 'Other (Utilities, Repairs, etc.)')} value={otherExpenses} onChange={setOtherExpenses} placeholder="0" suffix={`(${currencySymbol})`} />

            {/* ===== AVAILABLE FUNDS ===== */}
            {sectionTitle(t('home_afford_funds_section', 'Available Funds'))}
            <NumField isRTL={isRTL} label={t('home_afford_available_funds', 'Available Funds')} value={availableFunds} onChange={setAvailableFunds} placeholder="0" suffix={`(${currencySymbol})`} />
            <div className="grid grid-cols-2 gap-3">
              <NumField isRTL={isRTL} label={t('home_afford_fixed_closing', 'Fixed Closing Costs')} value={fixedClosing} onChange={setFixedClosing} placeholder="0" suffix={`(${currencySymbol})`} />
              <NumField isRTL={isRTL} label={t('home_afford_variable_closing', 'Variable Closing %')} value={variableClosing} onChange={setVariableClosing} placeholder="4" />
            </div>
            <NumField isRTL={isRTL} label={t('home_afford_min_down', 'Minimum Down Payment %')} value={minDown} onChange={setMinDown} placeholder="20" error={errors.downPct} />

            {/* ===== FINANCING ===== */}
            {sectionTitle(t('home_afford_financing_section', 'Financing'))}
            <div className="grid grid-cols-2 gap-3">
              <NumField isRTL={isRTL} label={t('home_afford_mortgage_term', 'Term (years)')} value={mortgageTerm} onChange={setMortgageTerm} placeholder="30" error={errors.term} />
              <NumField isRTL={isRTL} label={t('home_afford_interest_rate', 'Interest Rate (%)')} value={interestRate} onChange={setInterestRate} placeholder="4" error={errors.rate} />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
              <button type="button" onClick={handleCalculate}
                onMouseEnter={() => setCalcHover(true)}
                onMouseLeave={() => setCalcHover(false)}
                style={{ flex: '1 1 auto', minWidth: '140px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '9px 18px', background: calcHover ? 'var(--ds-primary-hover)' : 'var(--ds-primary)', color: '#FFFFFF', fontSize: '13px', fontWeight: 500, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s ease' }}>
                <CalculatorIcon /> {t('home_afford_calculate', 'Calculate')}
              </button>
              <button type="button" onClick={handleReset}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '9px 18px', background: 'transparent', color: 'var(--ds-text-body)', fontSize: '13px', fontWeight: 500, border: '0.5px solid var(--ds-border)', borderRadius: '8px', cursor: 'pointer' }}
                className="hover:opacity-80 transition-opacity">
                {t('home_afford_reset', 'Reset')}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="col-span-1 lg:col-span-6">
          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              {/* Dark glass results card */}
              <div style={{ background: 'var(--ds-bg-card-dark)', border: '0.5px solid var(--ds-dark-card-border)', borderRadius: '16px', padding: '20px 24px', boxShadow: 'var(--ds-dark-card-glow)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                <h2 style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-dark-card-body)', textTransform: 'uppercase' as const, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--ds-primary-glow)' }}><CheckCircleIcon /></span>
                  {t('home_afford_results', 'Affordability Results')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SummaryItem label={t('home_afford_m1', 'Max Payment (Income)')} value={formatCurrencyValue(result.m1MaxPaymentIncome)} />
                  <SummaryItem label={t('home_afford_m2', 'Max Payment (DTI)')} value={formatCurrencyValue(result.m2MaxPaymentDTI)} />
                  <SummaryItem label={t('home_afford_max_monthly', 'Maximum Monthly Payment')} value={formatCurrencyValue(result.maxMonthlyPayment)} highlight />
                  <SummaryItem label={t('home_afford_current_debts', 'Current Monthly Debts')} value={formatCurrencyValue(result.currentMonthlyDebts)} />
                  <SummaryItem label={t('home_afford_m3', 'Max PI (Expenses)')} value={formatCurrencyValue(result.m3MaxPIExpenses)} />
                  <SummaryItem label={t('home_afford_m4', 'Max PI (Funds)')} value={formatCurrencyValue(result.m4MaxPIFunds)} />
                  <SummaryItem label={t('home_afford_max_pi', 'Maximum PI Payment')} value={formatCurrencyValue(result.maxPIPayment)} highlight />
                  <SummaryItem label={t('home_afford_loan_amount', 'Loan Amount')} value={formatCurrencyValue(result.loanAmount)} />
                  <SummaryItem label={t('home_afford_down_payment', 'Down Payment')} value={<>{formatCurrencyValue(result.downPaymentAmount)} ({intl.formatNumber(result.downPaymentPercent, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)</>} />
                  <SummaryItem label={t('home_afford_closing_costs', 'Closing Costs')} value={<>{formatCurrencyValue(result.estimatedClosingCosts)} ({intl.formatNumber(result.closingCostsPercent, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)</>} />
                </div>

                {/* Hero Result */}
                <div style={{ padding: '1rem 1.25rem', borderRadius: '16px', background: 'rgba(34,197,94,0.06)', border: '0.5px solid var(--ds-dark-card-border)', textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-dark-card-body)', marginBottom: '4px', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
                    {t('home_afford_max_price', 'Maximum Home Price')}
                  </p>
                  <p style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ds-primary-glow)' }}>
                    {formatCurrencyValue(result.maxHomePrice)}
                  </p>
                </div>

                {/* Download buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button type="button" onClick={handleDownloadPDF} disabled={isGeneratingPDF}
                    onMouseEnter={() => setPdfHover(true)}
                    onMouseLeave={() => setPdfHover(false)}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '8px 16px', background: isGeneratingPDF ? 'transparent' : (pdfHover ? 'rgba(34,197,94,0.1)' : 'transparent'), color: isGeneratingPDF ? '#9CA3AF' : 'var(--ds-primary-glow)', fontSize: '13px', fontWeight: 500, border: isGeneratingPDF ? '1.5px solid rgba(156,163,175,0.3)' : '1.5px solid rgba(74,222,128,0.3)', borderRadius: '8px', cursor: isGeneratingPDF ? 'not-allowed' : 'pointer', width: '100%', transition: 'background 0.15s ease', opacity: isGeneratingPDF ? 0.5 : 1 }}>
                    <DownloadIcon />
                    {isGeneratingPDF ? t('home_afford_generating', 'Generating...') : t('home_afford_download_report', 'Download PDF Report')}
                  </button>
                  <button type="button" onClick={handleDownloadCSV}
                    onMouseEnter={() => setCsvHover(true)}
                    onMouseLeave={() => setCsvHover(false)}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '8px 16px', background: csvHover ? 'rgba(96,165,250,0.1)' : 'transparent', color: 'rgba(147,197,253,0.9)', fontSize: '13px', fontWeight: 500, border: '1.5px solid rgba(96,165,250,0.3)', borderRadius: '8px', cursor: 'pointer', width: '100%', transition: 'background 0.15s ease' }}>
                    <DownloadIcon />
                    {isRTL ? 'تحميل CSV / Excel' : 'Download CSV / Excel'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '20px 24px', boxShadow: 'var(--ds-shadow-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '16px', background: 'var(--ds-bg-tinted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-primary)' }}>
                <HomeIcon />
              </div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-body)', textAlign: 'center' }}>
                {t('home_afford_enter_values', 'Enter Your Details')}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', textAlign: 'center', maxWidth: '320px' }}>
                {t('home_afford_subtitle', 'Determine how much home you can afford based on your income, debts, and available funds.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== STABLE SUB-COMPONENTS (outside page fn to prevent remount on re-render) ===== */

function toArabicNumerals(s: string): string {
  return s.replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
}

function NumField({ label, value, onChange, placeholder, error, suffix, isRTL }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
  error?: string; suffix?: string; isRTL?: boolean;
}) {
  const displayPlaceholder = isRTL ? toArabicNumerals(placeholder) : placeholder;
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '6px' }}>
        {label}{suffix ? ` ${suffix}` : ''}
      </label>
      <input type="text" inputMode="decimal" value={value} onChange={e => onChange(e.target.value)}
        placeholder={displayPlaceholder}
        style={{
          width: '100%', padding: '10px 14px', fontSize: '14px',
          border: `0.5px solid ${error ? 'var(--ds-error)' : 'var(--ds-border)'}`,
          borderRadius: '8px', backgroundColor: 'var(--ds-bg-input)',
          color: 'var(--ds-text-heading)', outline: 'none',
          textAlign: isRTL ? 'right' : 'left',
        }} />
      {error && <p style={{ fontSize: '12px', color: 'var(--ds-error)', marginTop: '4px' }}>{error}</p>}
    </div>
  );
}

function SummaryItem({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'transparent', border: '0.5px solid var(--ds-dark-card-border)' }}>
      <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-dark-card-body)', marginBottom: '4px', lineHeight: 1.3 }}>{label}</p>
      <p style={{ fontSize: '20px', fontWeight: 600, color: highlight ? 'var(--ds-primary-glow)' : 'var(--ds-dark-card-heading)', lineHeight: 1.3 }}>{value}</p>
    </div>
  );
}

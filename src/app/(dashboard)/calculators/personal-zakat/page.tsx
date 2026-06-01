'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useLanguage, useCurrency } from '@/store/useStore';
import { calculatePersonalZakat } from '@/calculators/personalZakatCalculator';
import type {
  PersonalZakatInput,
  PersonalZakatResult,
  ZakatAssetCategory,
} from '@/calculators/personalZakatCalculator';
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

const ZakatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

/* ===== ROW EDITOR STATE =====
 * Fixed seven-row layout, one per Excel-template category. The user
 * fills only the rows that apply; empty rows contribute zero to the
 * total. There is no add/remove — categories are stable.
 */

interface RowValues {
  description: string;
  weight: string;
  valuePerUnit: string;
}

interface CategoryDef {
  id: ZakatAssetCategory;
  labelKey: string;
  defaultLabel: string;
  hintKey: string;
  defaultHint: string;
}

// Order matches the Excel template (cash, gold purities high to low,
// other gold, silver, silver utensils).
const CATEGORY_ROWS: CategoryDef[] = [
  { id: 'cash',            labelKey: 'tools.zakat_cat_cash',            defaultLabel: 'Cash',                          hintKey: 'tools.zakat_row_hint_cash',            defaultHint: 'Cash on hand, checking, savings' },
  { id: 'gold_24k',        labelKey: 'tools.zakat_cat_gold_24k',        defaultLabel: 'Pure 24K Gold',                 hintKey: 'tools.zakat_row_hint_gold_24k',        defaultHint: 'Weight in grams of 24K gold' },
  { id: 'gold_21k',        labelKey: 'tools.zakat_cat_gold_21k',        defaultLabel: 'Pure 21K Gold',                 hintKey: 'tools.zakat_row_hint_gold_21k',        defaultHint: 'Weight in grams of 21K gold' },
  { id: 'gold_14k',        labelKey: 'tools.zakat_cat_gold_14k',        defaultLabel: 'Pure 14K Gold',                 hintKey: 'tools.zakat_row_hint_gold_14k',        defaultHint: 'Weight in grams of 14K gold' },
  { id: 'gold_other',      labelKey: 'tools.zakat_cat_gold_other',      defaultLabel: 'Other Gold (jewelry / coins)',  hintKey: 'tools.zakat_row_hint_gold_other',      defaultHint: 'Jewelry, coins, mixed-purity gold' },
  { id: 'silver_pure',     labelKey: 'tools.zakat_cat_silver_pure',     defaultLabel: 'Pure Silver',                   hintKey: 'tools.zakat_row_hint_silver_pure',     defaultHint: 'Weight in grams of pure silver' },
  { id: 'silver_utensils', labelKey: 'tools.zakat_cat_silver_utensils', defaultLabel: 'Silver Utensils',               hintKey: 'tools.zakat_row_hint_silver_utensils', defaultHint: 'Weight in grams of silver utensils' },
];

function emptyRowValues(): Record<ZakatAssetCategory, RowValues> {
  // Object literal is more readable than reduce here.
  return {
    cash:            { description: '', weight: '', valuePerUnit: '' },
    gold_24k:        { description: '', weight: '', valuePerUnit: '' },
    gold_21k:        { description: '', weight: '', valuePerUnit: '' },
    gold_14k:        { description: '', weight: '', valuePerUnit: '' },
    gold_other:      { description: '', weight: '', valuePerUnit: '' },
    silver_pure:     { description: '', weight: '', valuePerUnit: '' },
    silver_utensils: { description: '', weight: '', valuePerUnit: '' },
  };
}

interface FormErrors {
  goldPrice?: string;
  silverPrice?: string;
  rows?: string;
}

export default function PersonalZakatCalculatorPage() {
  const intl = useIntl();
  const language = useLanguage();
  const currency = useCurrency();
  const isRTL = language === 'ar';

  const currencyInfo = CURRENCIES.find((c) => c.code === currency);
  const currencySymbol = isRTL
    ? (currencyInfo?.symbolAr || currencyInfo?.symbol || currency)
    : (currencyInfo?.symbol || currency);

  const [goldPrice, setGoldPrice] = useState('');
  const [silverPrice, setSilverPrice] = useState('');
  const [rowValues, setRowValues] = useState<Record<ZakatAssetCategory, RowValues>>(() => emptyRowValues());

  const [result, setResult] = useState<PersonalZakatResult | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [calcBtnHover, setCalcBtnHover] = useState(false);
  const [pdfBtnHover, setPdfBtnHover] = useState(false);
  const [csvBtnHover, setCsvBtnHover] = useState(false);

  const t = (key: string, defaultMessage: string) =>
    intl.formatMessage({ id: `tools.${key}`, defaultMessage });

  const updateRow = (id: ZakatAssetCategory, patch: Partial<RowValues>) => {
    setRowValues((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!goldPrice || parseFloat(goldPrice) <= 0)
      newErrors.goldPrice = t('zakat_validation_gold_price', 'Gold price must be greater than 0');
    if (!silverPrice || parseFloat(silverPrice) <= 0)
      newErrors.silverPrice = t('zakat_validation_silver_price', 'Silver price must be greater than 0');
    // Pass when ANY row has a positive value. Empty rows are fine.
    const hasAnyValue = CATEGORY_ROWS.some((cat) => parseFloat(rowValues[cat.id].valuePerUnit) > 0);
    if (!hasAnyValue)
      newErrors.rows = t('zakat_validation_rows', 'Fill in at least one asset with a positive value');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildInput = useCallback((): PersonalZakatInput => ({
    goldPricePerGram: parseFloat(goldPrice) || 0,
    silverPricePerGram: parseFloat(silverPrice) || 0,
    rows: CATEGORY_ROWS.map((cat) => ({
      category: cat.id,
      description: rowValues[cat.id].description,
      weight: parseFloat(rowValues[cat.id].weight) || 0,
      valuePerUnit: parseFloat(rowValues[cat.id].valuePerUnit) || 0,
    })),
  }), [goldPrice, silverPrice, rowValues]);

  const handleCalculate = useCallback(() => {
    if (!validate()) return;
    setResult(calculatePersonalZakat(buildInput()));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goldPrice, silverPrice, rowValues]);

  const handleReset = () => {
    setGoldPrice('');
    setSilverPrice('');
    setRowValues(emptyRowValues());
    setResult(null);
    setErrors({});
  };

  const handleDownloadPDF = async () => {
    if (!result) return;
    setIsGeneratingPDF(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await downloadReport('personal-zakat', 'pdf', language, currencySymbol, buildInput() as any);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadCSV = async () => {
    if (!result) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await downloadReport('personal-zakat', 'xlsx', language, currencySymbol, buildInput() as any);
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
      <Link href="/tools" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-muted)', textDecoration: 'none', marginBottom: '12px' }}>
        <span style={{ transform: isRTL ? 'scaleX(-1)' : 'none', display: 'inline-flex' }}><ArrowLeftIcon /></span>
        {t('zakat_back_to_tools', 'Back to Tools')}
      </Link>

      {/* Page header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'var(--ds-bg-tinted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-primary)', flexShrink: 0 }}>
            <ZakatIcon />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', lineHeight: 1.2, fontFeatureSettings: '"kern" 1' }}>
              {t('zakat_title', 'Personal Zakat Calculator')}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', lineHeight: 1.6, marginTop: '4px' }}>
              {t('zakat_subtitle', 'Calculate your annual Zakat on cash, gold, and silver. Calculation engine, not a fatwa.')}
            </p>
          </div>
        </div>
      </div>

      {/* Form + results grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Input form */}
        <div className="col-span-1 lg:col-span-7">
          <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '20px 24px', boxShadow: 'var(--ds-shadow-card)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--ds-primary)' }}><CalculatorIcon /></span>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', fontFeatureSettings: '"kern" 1' }}>
                {t('zakat_enter_values', 'Enter Your Wealth Details')}
              </h2>
            </div>

            {/* Caution banner — mirrors the A1 / B1 caption in the
                Excel template. Lives right above the inputs so it's
                impossible to miss before the user clicks Calculate. */}
            <div
              role="note"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                background: 'rgba(217, 119, 6, 0.08)',
                border: '0.5px solid rgba(217, 119, 6, 0.35)',
                borderRadius: '10px',
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#D97706"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0, marginTop: '1px' }}
                aria-hidden="true"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text-heading)', margin: 0, lineHeight: 1.3 }}>
                  {t('zakat_caution_title', 'Calculation Engine')}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--ds-text-body)', margin: '2px 0 0 0', lineHeight: 1.5 }}>
                  {t('zakat_caution_body', 'For calculation purposes only and is not a substitute for an Islamic ruling (fatwa).')}
                </p>
              </div>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '6px' }}>
                  {t('zakat_gold_price', 'Gold Price (per 24K gram)')} ({currencySymbol})
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={goldPrice}
                  onChange={(e) => setGoldPrice(e.target.value)}
                  placeholder={t('zakat_gold_price_placeholder', 'e.g. 250')}
                  style={inputFieldStyle(!!errors.goldPrice)}
                />
                {errors.goldPrice && <p style={{ fontSize: '12px', color: 'var(--ds-error)', marginTop: '4px' }}>{errors.goldPrice}</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '6px' }}>
                  {t('zakat_silver_price', 'Silver Price (per gram)')} ({currencySymbol})
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={silverPrice}
                  onChange={(e) => setSilverPrice(e.target.value)}
                  placeholder={t('zakat_silver_price_placeholder', 'e.g. 3')}
                  style={inputFieldStyle(!!errors.silverPrice)}
                />
                {errors.silverPrice && <p style={{ fontSize: '12px', color: 'var(--ds-error)', marginTop: '4px' }}>{errors.silverPrice}</p>}
              </div>
            </div>

            {/* Asset rows — fixed seven categories. The user fills only
                the rows that apply; empty rows contribute zero. No
                add/remove. Layout: category label | notes | weight |
                value/unit. Cash row hides the weight input since it's
                not applicable. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ds-text-heading)' }}>
                {t('zakat_assets_heading', 'Your Zakat-able Assets')}
              </h3>

              {CATEGORY_ROWS.map((cat) => {
                const row = rowValues[cat.id];
                const isCash = cat.id === 'cash';
                return (
                  <div
                    key={cat.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.4fr 1fr 0.8fr 1fr',
                      gap: '6px',
                      alignItems: 'center',
                      padding: '10px',
                      background: 'var(--ds-bg-tinted)',
                      border: '0.5px solid var(--ds-border)',
                      borderRadius: '10px',
                    }}
                  >
                    {/* Category label + hint, replaces the dropdown. */}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text-heading)', margin: 0, lineHeight: 1.2 }}>
                        {intl.formatMessage({ id: cat.labelKey, defaultMessage: cat.defaultLabel })}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--ds-text-muted)', margin: '2px 0 0 0', lineHeight: 1.3 }}>
                        {intl.formatMessage({ id: cat.hintKey, defaultMessage: cat.defaultHint })}
                      </p>
                    </div>

                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => updateRow(cat.id, { description: e.target.value })}
                      placeholder={t('zakat_description_placeholder', 'Notes (optional)')}
                      style={{ ...inputFieldStyle(false), padding: '8px 10px', fontSize: '12px' }}
                    />

                    {/* Weight column. For cash, render an aligned dash so
                        the grid columns stay even across all rows. */}
                    {isCash ? (
                      <span
                        style={{
                          fontSize: '13px',
                          color: 'var(--ds-text-muted)',
                          textAlign: 'center',
                        }}
                        aria-hidden="true"
                      >
                        —
                      </span>
                    ) : (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.weight}
                        onChange={(e) => updateRow(cat.id, { weight: e.target.value })}
                        placeholder={t('zakat_weight_placeholder', 'g')}
                        style={{ ...inputFieldStyle(false), padding: '8px 10px', fontSize: '12px' }}
                      />
                    )}

                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.valuePerUnit}
                      onChange={(e) => updateRow(cat.id, { valuePerUnit: e.target.value })}
                      placeholder={isCash
                        ? t('zakat_cash_value_placeholder', 'Total cash')
                        : t('zakat_value_per_unit_placeholder', 'per gram')}
                      style={{ ...inputFieldStyle(false), padding: '8px 10px', fontSize: '12px' }}
                    />
                  </div>
                );
              })}
              {errors.rows && <p style={{ fontSize: '12px', color: 'var(--ds-error)', marginTop: '4px' }}>{errors.rows}</p>}
            </div>

            {/* The Calculation Engine caution banner above the inputs
                covers this disclaimer; the previous paragraph here is
                intentionally removed to avoid duplicating the message
                right next to the Calculate button. */}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleCalculate}
                onMouseEnter={() => setCalcBtnHover(true)}
                onMouseLeave={() => setCalcBtnHover(false)}
                style={{ flex: '1 1 auto', minWidth: '140px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '9px 18px', background: calcBtnHover ? 'var(--ds-primary-hover)' : 'var(--ds-primary)', color: '#FFFFFF', fontSize: '13px', fontWeight: 500, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s ease' }}
              >
                <CalculatorIcon /> {t('zakat_calculate', 'Calculate Zakat')}
              </button>
              <button
                type="button"
                onClick={handleReset}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '9px 18px', background: 'transparent', color: 'var(--ds-text-body)', fontSize: '13px', fontWeight: 500, border: '0.5px solid var(--ds-border)', borderRadius: '8px', cursor: 'pointer' }}
              >
                {t('zakat_reset', 'Reset')}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="col-span-1 lg:col-span-5">
          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'var(--ds-bg-card-dark)', border: '0.5px solid var(--ds-dark-card-border)', borderRadius: '16px', padding: '20px 24px', boxShadow: 'var(--ds-dark-card-glow)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h2 style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-dark-card-body)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--ds-primary-glow)' }}><CheckCircleIcon /></span>
                  {t('zakat_summary', 'Zakat Summary')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SummaryItem label={t('zakat_total_wealth', 'Total Net Wealth')} value={formatCurrency(result.totalWealth)} />
                  <SummaryItem label={t('zakat_effective_nisab', 'Effective Nisab')} value={formatCurrency(result.effectiveNisab)} />
                  <SummaryItem
                    label={t('zakat_status', 'Nisab Status')}
                    value={result.meetsNisab
                      ? t('zakat_status_meets', 'Meets Nisab')
                      : t('zakat_status_below', 'Below Nisab')}
                  />
                  <SummaryItem
                    label={t('zakat_due', 'Zakat Due (2.5%)')}
                    value={formatCurrency(result.zakatDue)}
                    highlight
                    accent
                  />
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
                    {isGeneratingPDF ? t('zakat_generating', 'Generating...') : t('zakat_download_report', 'Download PDF Report')}
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
                <ZakatIcon />
              </div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-body)', textAlign: 'center' }}>
                {t('zakat_enter_values', 'Enter Your Wealth Details')}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', textAlign: 'center', maxWidth: '320px' }}>
                {t('zakat_subtitle', 'Calculate your annual Zakat on cash, gold, and silver. Calculation engine, not a fatwa.')}
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

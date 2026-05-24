'use client';

import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { SUPPORTED_CURRENCY_CODES, getCurrencyDisplayName } from '@/lib/currencies';
import { useFxQuote } from '@/lib/fx/useFxQuote';
import { MoneyInput } from '@/components/MoneyInput';

/**
 * Inline currency + exchange-rate selector for transaction entry.
 *
 * Behaviour:
 *   - When the chosen currency equals the base currency, only the
 *     currency dropdown renders. No rate field, rate=1, source='cached'.
 *   - When the chosen currency differs from the base, the rate field
 *     auto-fills from /api/fx/quote (central bank → aggregator →
 *     cache). The user may overwrite it; doing so flips the source
 *     to 'manual' per the architecture document.
 *   - All four output values are reported via `onChange` so the
 *     parent form can stash them in submission state.
 */

export interface CurrencyRateValue {
  currency: string;
  exchangeRate: number;
  baseCurrency: string;
  source: 'central_bank' | 'aggregator' | 'manual' | 'cached';
}

interface Props {
  baseCurrency: string;
  date: string;
  language: 'en' | 'ar';
  country?: string | null;
  value: CurrencyRateValue;
  onChange: (value: CurrencyRateValue) => void;
  /** Visual variant — 'default' shows full controls, 'compact' shrinks margins. */
  variant?: 'default' | 'compact';
}

export function CurrencyAndRateField({
  baseCurrency,
  date,
  language,
  country = null,
  value,
  onChange,
  variant = 'default',
}: Props) {
  const intl = useIntl();
  const isForeign = value.currency !== baseCurrency;
  const [manualOverride, setManualOverride] = useState(false);

  const { quote, loading } = useFxQuote({
    from: value.currency,
    to: baseCurrency,
    date,
    country,
  });

  // When the resolver returns a rate and the user hasn't overridden,
  // auto-fill the rate field. Reset overrides when currency or date
  // change so a fresh resolver value is applied.
  useEffect(() => {
    setManualOverride(false);
  }, [value.currency, date, baseCurrency]);

  useEffect(() => {
    if (manualOverride) return;
    if (!quote) return;
    if (quote.rate === value.exchangeRate && quote.source === value.source) return;
    onChange({
      currency: value.currency,
      baseCurrency,
      exchangeRate: quote.rate,
      source: quote.source,
    });
    // We intentionally exclude `value` from deps to avoid a self-loop;
    // the manualOverride flag plus the rate/source equality guard keep
    // updates idempotent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote, manualOverride]);

  const handleCurrencyChange = (next: string) => {
    onChange({
      currency: next,
      baseCurrency,
      exchangeRate: next === baseCurrency ? 1 : value.exchangeRate,
      source: next === baseCurrency ? 'cached' : value.source,
    });
  };

  const handleRateChange = (raw: string) => {
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      onChange({ ...value, exchangeRate: 0, source: 'manual' });
      return;
    }
    setManualOverride(true);
    onChange({
      currency: value.currency,
      baseCurrency,
      exchangeRate: parsed,
      source: 'manual',
    });
  };

  return (
    <div style={{ marginBottom: variant === 'compact' ? '10px' : 'var(--spacing-2)' }}>
      <p
        style={{
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--ds-text-heading)',
          marginBottom: '6px',
        }}
      >
        {intl.formatMessage({ id: 'transactions.currency_label', defaultMessage: 'Currency' })}
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <select
          value={value.currency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          style={{
            flex: '0 0 auto',
            minWidth: '140px',
            padding: '10px 14px',
            fontSize: '14px',
            background: 'var(--ds-bg-input)',
            border: '0.5px solid var(--ds-border)',
            borderRadius: '8px',
            color: 'var(--ds-text-heading)',
          }}
        >
          {SUPPORTED_CURRENCY_CODES.map((code) => (
            <option key={code} value={code}>
              {getCurrencyDisplayName(code, language)}
            </option>
          ))}
        </select>

        {isForeign && (
          <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
            <MoneyInput
              value={value.exchangeRate ? String(value.exchangeRate) : ''}
              onChange={handleRateChange}
              placeholder="0.00"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                background: 'var(--ds-bg-input)',
                border: '0.5px solid var(--ds-border)',
                borderRadius: '8px',
                color: 'var(--ds-text-heading)',
              }}
            />
            <p style={{ fontSize: '11px', color: 'var(--ds-text-muted)', marginTop: '4px', lineHeight: 1.5 }}>
              {intl.formatMessage(
                {
                  id: 'transactions.fx_rate_hint',
                  defaultMessage: '1 {from} = {rate} {to} ({source})',
                },
                {
                  from: value.currency,
                  rate: value.exchangeRate.toFixed(4),
                  to: baseCurrency,
                  source: value.source,
                },
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

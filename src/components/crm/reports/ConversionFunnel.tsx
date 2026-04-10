'use client';

import { useIntl } from 'react-intl';

interface ConversionFunnelProps {
  data: { from: string; to: string; rate: number }[];
}

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  return (
    <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '1rem' }}>
        {t('crm.report.conversionFunnel', 'Conversion Funnel')}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {data.map((step, idx) => {
          const width = Math.max(20, step.rate);
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--ds-text-muted)', minWidth: '80px', textAlign: 'end' }}>
                {step.from}
              </div>
              <div style={{ flex: 1, height: '28px', background: 'var(--ds-bg-tinted)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${width}%`, height: '100%', background: 'var(--ds-accent-primary)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 600ms ease-out' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF' }}>
                    {new Intl.NumberFormat(intl.locale, { maximumFractionDigits: 0 }).format(step.rate)}%
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ds-text-muted)', minWidth: '80px' }}>
                {step.to}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

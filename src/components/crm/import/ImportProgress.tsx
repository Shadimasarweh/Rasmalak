'use client';

import { useIntl } from 'react-intl';
import { Loader2 } from 'lucide-react';

interface ImportProgressProps {
  current: number;
  total: number;
}

export function ImportProgress({ current, total }: ImportProgressProps) {
  const intl = useIntl();
  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '2rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <Loader2 size={32} style={{ color: 'var(--ds-accent-primary)', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />

      <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '1rem' }}>
        {t('crm.import.importing', 'Importing...')}
      </h3>

      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto', background: 'var(--ds-border)', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            background: 'var(--ds-accent-primary)',
            borderRadius: '8px',
            transition: 'width 300ms ease-out',
          }}
        />
      </div>

      <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginTop: '0.75rem' }}>
        {t('crm.import.progress', '{current} of {total} rows')
          .replace('{current}', new Intl.NumberFormat(intl.locale).format(current))
          .replace('{total}', new Intl.NumberFormat(intl.locale).format(total))}
      </p>
      <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', marginTop: '0.25rem' }}>
        {new Intl.NumberFormat(intl.locale).format(percent)}%
      </p>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

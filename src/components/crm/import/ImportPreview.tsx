'use client';

import { useIntl } from 'react-intl';
import type { FieldMapping } from '@/crm/migration/fieldMapper';

interface ImportPreviewProps {
  rows: Record<string, string>[];
  mapping: FieldMapping;
}

export function ImportPreview({ rows, mapping }: ImportPreviewProps) {
  const intl = useIntl();
  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  // Get mapped target fields (only those with mappings)
  const mappedFields = Object.entries(mapping)
    .filter(([, target]) => target)
    .map(([source, target]) => ({ source, target }));

  if (mappedFields.length === 0) return null;

  return (
    <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--ds-border)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
          {t('crm.import.previewRows', 'Preview (first 10 rows)')}
        </h3>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--ds-border)' }}>
              <th style={thStyle}>#</th>
              {mappedFields.map(f => (
                <th key={f.target} style={thStyle}>{f.target.replace(/_/g, ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--ds-border)' }}>
                <td style={tdStyle}>{idx + 1}</td>
                {mappedFields.map(f => (
                  <td key={f.target} style={tdStyle}>
                    {row[f.source] || <span style={{ color: 'var(--ds-text-muted)' }}>—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { textAlign: 'start', padding: '10px 14px', fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--ds-text-body)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' };

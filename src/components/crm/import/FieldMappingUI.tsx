'use client';

import { useIntl } from 'react-intl';
import { CONTACT_TARGET_FIELDS, type FieldMapping } from '@/crm/migration/fieldMapper';

interface FieldMappingUIProps {
  headers: string[];
  mapping: FieldMapping;
  onChange: (mapping: FieldMapping) => void;
}

export function FieldMappingUI({ headers, mapping, onChange }: FieldMappingUIProps) {
  const intl = useIntl();
  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  const handleChange = (sourceCol: string, targetField: string) => {
    onChange({ ...mapping, [sourceCol]: targetField });
  };

  return (
    <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '1rem' }}>
        {t('crm.import.fieldMapping', 'Field Mapping')}
      </h3>

      <div style={{ display: 'flex', gap: '1rem', padding: '8px 0', borderBottom: '1px solid var(--ds-border)', marginBottom: '8px' }}>
        <div style={{ flex: 1, fontSize: '12px', fontWeight: 500, color: 'var(--ds-text-muted)' }}>
          {t('crm.import.sourceField', 'Source Field')}
        </div>
        <div style={{ width: '24px' }} />
        <div style={{ flex: 1, fontSize: '12px', fontWeight: 500, color: 'var(--ds-text-muted)' }}>
          {t('crm.import.targetField', 'Target Field')}
        </div>
      </div>

      {headers.map(header => (
        <div key={header} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '6px 0' }}>
          <div style={{ flex: 1, fontSize: '13px', color: 'var(--ds-text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {header}
          </div>
          <span style={{ color: 'var(--ds-text-muted)', fontSize: '13px' }}>→</span>
          <select
            value={mapping[header] || ''}
            onChange={e => handleChange(header, e.target.value)}
            style={{
              flex: 1, padding: '6px 8px', fontSize: '13px',
              border: '1px solid var(--ds-border)', borderRadius: '6px',
              background: mapping[header] ? 'var(--ds-bg-tinted)' : 'var(--ds-bg-card)',
              color: mapping[header] ? 'var(--ds-accent-primary)' : 'var(--ds-text-muted)',
              outline: 'none',
            }}
          >
            <option value="">— Skip —</option>
            {CONTACT_TARGET_FIELDS.map(f => (
              <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

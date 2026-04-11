'use client';

import { useState } from 'react';
import { useIntl } from 'react-intl';
import { getAvailableFields } from '@/crm/documents/mergeFields';
import { Plus } from 'lucide-react';

interface TemplateEditorProps {
  content: string;
  onChange: (content: string) => void;
  language?: 'ar' | 'en';
}

export function TemplateEditor({ content, onChange, language = 'ar' }: TemplateEditorProps) {
  const intl = useIntl();
  const isAr = intl.locale.startsWith('ar');
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });
  const [showFields, setShowFields] = useState(false);
  const fields = getAvailableFields();

  const insertField = (path: string) => {
    onChange(content + `{{${path}}}`);
    setShowFields(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-text-muted)' }}>
          {t('documents.template.content', 'Template Content')}
        </label>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowFields(!showFields)}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px', background: 'none',
              border: '0.5px solid var(--ds-border)', borderRadius: '6px',
              padding: '4px 10px', fontSize: '11px', color: 'var(--ds-accent-primary)',
              cursor: 'pointer',
            }}
          >
            <Plus size={12} />
            {t('documents.template.insertField', 'Insert Field')}
          </button>

          {showFields && (
            <div style={{
              position: 'absolute', insetInlineEnd: 0, top: '100%', marginTop: '4px',
              background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)',
              borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              padding: '4px', zIndex: 10, width: '240px', maxHeight: '240px', overflowY: 'auto',
            }}>
              {fields.map(f => (
                <button
                  key={f.path}
                  onClick={() => insertField(f.path)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'start', padding: '6px 10px',
                    fontSize: '12px', color: 'var(--ds-text-body)', background: 'none',
                    border: 'none', cursor: 'pointer', borderRadius: '4px',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{isAr ? f.labelAr : f.label}</span>
                  <span style={{ color: 'var(--ds-text-muted)', marginInlineStart: '8px', fontSize: '10px' }}>
                    {`{{${f.path}}}`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <textarea
        value={content}
        onChange={e => onChange(e.target.value)}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
        style={{
          width: '100%', minHeight: '200px', padding: '14px', fontSize: '13px',
          borderRadius: '8px', border: '0.5px solid var(--ds-border)',
          background: 'var(--ds-bg-page)', color: 'var(--ds-text-body)',
          fontFamily: language === 'ar' ? 'var(--font-arabic, inherit)' : 'inherit',
          lineHeight: 1.8, resize: 'vertical',
        }}
        placeholder={t('documents.template.placeholder', 'Write your template here. Use {{field}} for merge fields.')}
      />
    </div>
  );
}

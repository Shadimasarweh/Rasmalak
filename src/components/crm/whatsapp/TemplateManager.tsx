'use client';

import { useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useWhatsApp } from '@/store/whatsappStore';
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

export function TemplateManager() {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });
  const { templates, accounts, fetchTemplates } = useWhatsApp();

  useEffect(() => {
    if (accounts.length > 0) fetchTemplates();
  }, [accounts, fetchTemplates]);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle size={14} color="var(--ds-accent-primary)" />;
      case 'rejected': return <XCircle size={14} color="#DC2626" />;
      default: return <Clock size={14} color="#F59E0B" />;
    }
  };

  if (templates.length === 0) {
    return (
      <div style={{
        background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
        padding: '3rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <FileText size={32} style={{ color: 'var(--ds-text-muted)', marginBottom: '8px' }} />
        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
          {t('whatsapp.templates.empty', 'No templates yet')}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginTop: '4px' }}>
          {t('whatsapp.templates.emptyDesc', 'Create templates in Meta Business Manager to use them here.')}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
        {t('whatsapp.templates.title', 'Message Templates')}
      </div>

      {templates.map(tpl => (
        <div key={tpl.id} style={{
          background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '12px',
          padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>{tpl.name}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--ds-text-muted)' }}>
              {statusIcon(tpl.status)}
              {tpl.status}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ds-text-body)', lineHeight: 1.5 }}>{tpl.body}</div>
          <div style={{ marginTop: '6px', display: 'flex', gap: '0.75rem', fontSize: '11px', color: 'var(--ds-text-muted)' }}>
            <span>{tpl.language}</span>
            <span>{tpl.category}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

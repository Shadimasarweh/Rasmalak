'use client';

import { useIntl } from 'react-intl';
import { X, ArrowRight, Zap, Columns, Settings2 } from 'lucide-react';

interface TemplatePreviewProps {
  template: {
    name: string;
    nameAr: string;
    description: string | null;
    descriptionAr: string | null;
    pipelineConfig: Record<string, unknown>;
    customFields: Record<string, unknown>;
    workflowTemplates: unknown[];
  };
  onClose: () => void;
  onInstall: () => void;
}

export function TemplatePreview({ template, onClose, onInstall }: TemplatePreviewProps) {
  const intl = useIntl();
  const isAr = intl.locale.startsWith('ar');
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  const pipeline = template.pipelineConfig as {
    name: string; nameAr: string;
    stages: Array<{ name: string; nameAr: string; probability: number; color: string }>;
  };
  const fields = template.customFields as Record<string, Array<{ key: string; label: string; labelAr: string }>>;
  const workflows = template.workflowTemplates as Array<{ name: string; nameAr?: string }>;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />

      {/* Modal */}
      <div style={{
        position: 'relative', background: 'var(--ds-bg-card)', borderRadius: '20px',
        padding: '24px 28px', width: '90%', maxWidth: '560px', maxHeight: '80vh', overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', insetInlineEnd: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-muted)' }}>
          <X size={20} />
        </button>

        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ds-text-heading)', marginBottom: '4px' }}>
          {isAr ? template.nameAr : template.name}
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginBottom: '20px' }}>
          {isAr ? template.descriptionAr : template.description}
        </p>

        {/* What will be created */}
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ds-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          {t('verticals.willCreate', 'This will create:')}
        </div>

        {/* Pipeline stages */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '8px' }}>
            <Columns size={14} /> {isAr ? pipeline.nameAr : pipeline.name}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {pipeline.stages.map((s, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{
                  fontSize: '11px', padding: '3px 10px', borderRadius: '999px',
                  background: `${s.color}15`, color: s.color, fontWeight: 500,
                }}>
                  {isAr ? s.nameAr : s.name}
                </span>
                {i < pipeline.stages.length - 1 && <ArrowRight size={10} color="var(--ds-text-muted)" />}
              </span>
            ))}
          </div>
        </div>

        {/* Custom fields */}
        {Object.keys(fields).length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '6px' }}>
              <Settings2 size={14} /> {t('verticals.customFields', 'Custom Fields')}
            </div>
            {Object.entries(fields).map(([entity, entityFields]) => (
              <div key={entity} style={{ marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--ds-text-muted)', textTransform: 'capitalize' }}>{entity}: </span>
                <span style={{ fontSize: '12px', color: 'var(--ds-text-body)' }}>
                  {entityFields.map(f => isAr ? f.labelAr : f.label).join(', ')}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Workflows */}
        {workflows.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '6px' }}>
              <Zap size={14} /> {t('verticals.workflows', 'Workflows')} ({workflows.length})
            </div>
            <ul style={{ margin: 0, paddingInlineStart: '20px', fontSize: '12px', color: 'var(--ds-text-body)', lineHeight: 1.8 }}>
              {workflows.map((wf, i) => (
                <li key={i}>{isAr && wf.nameAr ? wf.nameAr : wf.name}</li>
              ))}
            </ul>
          </div>
        )}

        <button onClick={onInstall} style={{
          width: '100%', padding: '10px', fontSize: '14px', fontWeight: 500, borderRadius: '10px',
          border: 'none', background: 'var(--ds-accent-primary)', color: '#FFFFFF', cursor: 'pointer',
        }}>
          {t('verticals.installNow', 'Install Template')}
        </button>
      </div>
    </div>
  );
}

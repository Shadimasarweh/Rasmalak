'use client';

import { useIntl } from 'react-intl';
import { ShieldCheck, Calendar, X } from 'lucide-react';
import type { UnifiedCalendarEvent } from '@/types/crm';

interface PrivacyPreviewProps {
  matched: UnifiedCalendarEvent[];
  unmatchedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PrivacyPreview({ matched, unmatchedCount, onConfirm, onCancel }: PrivacyPreviewProps) {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  const formatDate = (d: string) => {
    try { return new Intl.DateTimeFormat(intl.locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(d)); }
    catch { return d; }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'relative', zIndex: 101, background: 'var(--ds-bg-card)', borderRadius: '16px', padding: '1.5rem', maxWidth: '520px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
        <button onClick={onCancel} style={{ position: 'absolute', insetBlockStart: '16px', insetInlineEnd: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-muted)' }}>
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <ShieldCheck size={32} style={{ color: 'var(--ds-accent-primary)', margin: '0 auto 8px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)' }}>
            {t('integrations.privacy.title', 'Privacy Preview')}
          </h3>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', textAlign: 'center', lineHeight: 1.6, marginBottom: '1rem' }}>
          {t('integrations.privacy.explanation', 'Only events involving your CRM contacts will be synced. Personal events stay private.')}
        </p>

        {/* Matched events */}
        <div style={{ background: 'var(--ds-bg-tinted)', border: '1px solid #D1FAE5', borderRadius: '12px', padding: '14px 18px', marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-accent-primary)', marginBottom: '8px' }}>
            ✓ {t('integrations.privacy.matched', '{count} events match your CRM contacts').replace('{count}', String(matched.length))}
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {matched.slice(0, 20).map(event => (
              <div key={event.externalId} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--ds-text-body)' }}>
                <Calendar size={12} style={{ color: 'var(--ds-text-muted)', flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</span>
                <span style={{ color: 'var(--ds-text-muted)', flexShrink: 0 }}>{formatDate(event.startTime)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Unmatched */}
        <div style={{ background: 'var(--ds-bg-card)', border: '1px solid var(--ds-border)', borderRadius: '12px', padding: '14px 18px', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '13px', color: 'var(--ds-text-muted)' }}>
            🔒 {t('integrations.privacy.unmatched', '{count} personal events will NOT be synced').replace('{count}', String(unmatchedCount))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button onClick={onCancel} style={{ background: 'transparent', border: '1.5px solid var(--ds-border)', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer', color: 'var(--ds-text-body)' }}>
            {t('integrations.privacy.cancel', 'Cancel')}
          </button>
          <button onClick={onConfirm} style={{ background: 'var(--ds-accent-primary)', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
            {t('integrations.privacy.confirm', 'Confirm & Start Syncing')}
          </button>
        </div>
      </div>
    </div>
  );
}

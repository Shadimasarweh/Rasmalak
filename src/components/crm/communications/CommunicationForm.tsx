'use client';

import { useState } from 'react';
import { useIntl } from 'react-intl';
import { X, Phone, Mail, Calendar, FileText, MessageCircle, MessageSquare, MapPin } from 'lucide-react';
import { useCrm } from '@/store/crmStore';
import { WhatsAppImport } from './WhatsAppImport';
import type { CommunicationType, CreateCommunicationInput, WhatsAppMessage } from '@/types/crm';

interface CommunicationFormProps {
  contactId: string;
  dealId?: string;
  onClose: () => void;
}

const COMM_TYPES: { type: CommunicationType; icon: typeof Phone; key: string }[] = [
  { type: 'call', icon: Phone, key: 'crm.comm.type.call' },
  { type: 'email', icon: Mail, key: 'crm.comm.type.email' },
  { type: 'meeting', icon: Calendar, key: 'crm.comm.type.meeting' },
  { type: 'note', icon: FileText, key: 'crm.comm.type.note' },
  { type: 'whatsapp', icon: MessageCircle, key: 'crm.comm.type.whatsapp' },
  { type: 'sms', icon: MessageSquare, key: 'crm.comm.type.sms' },
  { type: 'site_visit', icon: MapPin, key: 'crm.comm.type.site_visit' },
];

const OUTCOMES = ['connected', 'no_answer', 'left_voicemail', 'follow_up_scheduled', 'deal_advanced'];

export function CommunicationForm({ contactId, dealId, onClose }: CommunicationFormProps) {
  const intl = useIntl();
  const { logCommunication, importWhatsAppChat } = useCrm();

  const [type, setType] = useState<CommunicationType>('call');
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('outbound');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [duration, setDuration] = useState('');
  const [outcome, setOutcome] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await logCommunication({
        contactId,
        type,
        direction,
        subject: subject.trim() || undefined,
        body: body.trim() || undefined,
        durationMins: duration ? parseInt(duration) : undefined,
        outcome: outcome || undefined,
        dealId: dealId || undefined,
      } as CreateCommunicationInput);
      onClose();
    } catch {
      // Error handled in store
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppImport = async (messages: WhatsAppMessage[], rawText: string) => {
    await importWhatsAppChat(contactId, rawText);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div
        className="crm-modal"
        style={{
          position: 'relative', zIndex: 101,
          background: 'var(--ds-bg-card)', borderRadius: '16px',
          maxWidth: '520px', width: '90%', maxHeight: '80vh',
          overflow: 'auto', padding: '1.5rem',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)' }}>
            {t('crm.comm.addComm', 'Log Communication')}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Type selector */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {COMM_TYPES.map(ct => {
            const Icon = ct.icon;
            const active = type === ct.type;
            return (
              <button
                key={ct.type}
                onClick={() => setType(ct.type)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '8px',
                  border: active ? '1.5px solid var(--ds-accent-primary)' : '1px solid var(--ds-border)',
                  background: active ? 'var(--ds-bg-tinted)' : 'var(--ds-bg-card)',
                  color: active ? 'var(--ds-accent-primary)' : 'var(--ds-text-body)',
                  fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                }}
              >
                <Icon size={14} />
                {t(ct.key, ct.type)}
              </button>
            );
          })}
        </div>

        {/* WhatsApp mode */}
        {type === 'whatsapp' ? (
          <WhatsAppImport onImport={handleWhatsAppImport} onCancel={() => setType('call')} />
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Direction */}
            <div>
              <label style={labelStyle}>{t('crm.comm.direction', 'Direction')}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['outbound', 'inbound'] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDirection(d)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '8px',
                      border: direction === d ? '1.5px solid var(--ds-accent-primary)' : '1px solid var(--ds-border)',
                      background: direction === d ? 'var(--ds-bg-tinted)' : 'transparent',
                      color: direction === d ? 'var(--ds-accent-primary)' : 'var(--ds-text-body)',
                      fontSize: '13px', cursor: 'pointer', fontWeight: 500,
                    }}
                  >
                    {t(`crm.comm.direction.${d}`, d)}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label style={labelStyle}>{t('crm.comm.subject', 'Subject')}</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} />
            </div>

            {/* Body */}
            <div>
              <label style={labelStyle}>{t('crm.comm.body', 'Body')}</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            {/* Duration (for calls) */}
            {type === 'call' && (
              <div>
                <label style={labelStyle}>{t('crm.comm.duration', 'Duration (minutes)')}</label>
                <input type="number" value={duration} onChange={e => setDuration(e.target.value)} min="0" style={inputStyle} />
              </div>
            )}

            {/* Outcome */}
            <div>
              <label style={labelStyle}>{t('crm.comm.outcome', 'Outcome')}</label>
              <select value={outcome} onChange={e => setOutcome(e.target.value)} style={inputStyle}>
                <option value="">—</option>
                {OUTCOMES.map(o => (
                  <option key={o} value={o}>{t(`crm.comm.outcome.${o}`, o)}</option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" onClick={onClose} style={{ background: 'transparent', border: '1.5px solid #86EFAC', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 500, color: 'var(--ds-accent-primary)', cursor: 'pointer' }}>
                {t('crm.action.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{ background: isSubmitting ? 'var(--ds-text-muted)' : 'var(--ds-accent-primary)', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 500, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
              >
                {t('crm.action.save', 'Save')}
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        @media (max-width: 767px) {
          .crm-modal { position: fixed !important; inset-block-end: 0 !important; inset-inline: 0 !important; max-width: 100% !important; width: 100% !important; border-radius: 16px 16px 0 0 !important; }
        }
      `}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--ds-text-muted)', marginBottom: '4px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', fontSize: '14px', color: 'var(--ds-text-body)', background: 'var(--ds-bg-card)', border: '1px solid var(--ds-border)', borderRadius: '8px', outline: 'none', boxSizing: 'border-box' as const };

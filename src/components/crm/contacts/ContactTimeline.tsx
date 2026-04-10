'use client';

import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Phone, Mail, MessageCircle, Calendar, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import type { CrmCommunication } from '@/types/crm';

interface ContactTimelineProps {
  communications: CrmCommunication[];
}

const TYPE_ICONS: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  whatsapp: MessageCircle,
  meeting: Calendar,
  note: FileText,
  sms: MessageCircle,
  site_visit: Calendar,
  other: FileText,
};

export function ContactTimeline({ communications }: ContactTimelineProps) {
  const intl = useIntl();
  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  const sorted = useMemo(
    () => [...communications].sort((a, b) =>
      new Date(b.occurredAt || b.createdAt).getTime() - new Date(a.occurredAt || a.createdAt).getTime()
    ),
    [communications]
  );

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat(intl.locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(dateStr));
    } catch { return dateStr; }
  };

  if (sorted.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)' }}>
          {t('crm.empty.comms.title', 'No communications logged')}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {sorted.map(comm => {
        const Icon = TYPE_ICONS[comm.type] || FileText;
        const DirectionIcon = comm.direction === 'outbound' ? ArrowUpRight : ArrowDownLeft;

        return (
          <div
            key={comm.id}
            style={{
              background: 'var(--ds-bg-tinted)',
              border: '1px solid #D1FAE5',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--ds-bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={16} style={{ color: 'var(--ds-accent-primary)' }} />
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
                  {t(`crm.comm.type.${comm.type}`, comm.type)}
                </span>
                {comm.direction && (
                  <DirectionIcon size={12} style={{ color: 'var(--ds-text-muted)' }} />
                )}
                {comm.durationMins && (
                  <span style={{ fontSize: '11px', color: 'var(--ds-text-muted)' }}>
                    {comm.durationMins} {t('crm.misc.minutes', 'min')}
                  </span>
                )}
              </div>
              {comm.subject && (
                <p style={{ fontSize: '13px', color: 'var(--ds-text-body)', marginBottom: '2px' }}>
                  {comm.subject}
                </p>
              )}
              {comm.body && (
                <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {comm.body.substring(0, 120)}{comm.body.length > 120 ? '...' : ''}
                </p>
              )}
              {comm.outcome && (
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: '4px',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--ds-accent-primary)',
                    background: 'var(--ds-bg-card)',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                  }}
                >
                  {t(`crm.comm.outcome.${comm.outcome}`, comm.outcome)}
                </span>
              )}
            </div>

            {/* Timestamp */}
            <div style={{ fontSize: '11px', color: 'var(--ds-text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>
              {formatDate(comm.occurredAt || comm.createdAt)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

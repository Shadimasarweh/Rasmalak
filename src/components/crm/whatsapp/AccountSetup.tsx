'use client';

import { useIntl } from 'react-intl';
import { useWhatsApp } from '@/store/whatsappStore';
import { Phone, CheckCircle, AlertCircle } from 'lucide-react';

export function AccountSetup() {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });
  const { accounts, isLoading } = useWhatsApp();

  if (isLoading) {
    return (
      <div style={{
        background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
        padding: '24px', height: '120px', animation: 'pulse 1.5s ease-in-out infinite',
      }} />
    );
  }

  if (accounts.length === 0) {
    return (
      <div style={{
        background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
        padding: '2rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <Phone size={32} style={{ color: 'var(--ds-text-muted)', marginBottom: '8px' }} />
        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
          {t('whatsapp.setup.title', 'Connect WhatsApp Business')}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginTop: '4px', maxWidth: '400px', marginInline: 'auto' }}>
          {t('whatsapp.setup.desc', 'Connect your Meta Business account to send and receive WhatsApp messages from your CRM.')}
        </div>
        <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--ds-bg-tinted)', borderRadius: '8px', fontSize: '12px', color: 'var(--ds-text-body)', textAlign: 'start' }}>
          <strong>{t('whatsapp.setup.requirements', 'Requirements:')}</strong>
          <ul style={{ margin: '8px 0 0', paddingInlineStart: '16px', lineHeight: 1.8 }}>
            <li>{t('whatsapp.setup.req1', 'Meta Business verified account')}</li>
            <li>{t('whatsapp.setup.req2', 'WhatsApp Business API access')}</li>
            <li>{t('whatsapp.setup.req3', 'Registered phone number')}</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
        {t('whatsapp.accounts.title', 'Connected Accounts')}
      </div>

      {accounts.map(acc => (
        <div key={acc.id} style={{
          background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '12px',
          padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Phone size={18} color="var(--ds-accent-primary)" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>{acc.phoneNumber}</div>
              <div style={{ fontSize: '11px', color: 'var(--ds-text-muted)' }}>WABA: {acc.wabaId} · {acc.numberModel}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {acc.status === 'active' ? (
              <><CheckCircle size={14} color="var(--ds-accent-primary)" /><span style={{ fontSize: '12px', color: 'var(--ds-accent-primary)' }}>{t('whatsapp.status.active', 'Active')}</span></>
            ) : (
              <><AlertCircle size={14} color="#F59E0B" /><span style={{ fontSize: '12px', color: '#F59E0B' }}>{acc.status}</span></>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

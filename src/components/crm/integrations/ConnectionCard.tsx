'use client';

import { useIntl } from 'react-intl';
import { Link2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import type { ServiceConnection } from '@/types/crm';

interface ConnectionCardProps {
  serviceName: string;
  serviceKey: string;
  connection: ServiceConnection | null;
  onConnect: () => void;
  onDisconnect: (id: string) => void;
}

export function ConnectionCard({ serviceName, serviceKey, connection, onConnect, onDisconnect }: ConnectionCardProps) {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });
  const isConnected = connection && connection.status === 'active';
  const isError = connection && (connection.status === 'error' || connection.status === 'token_expired');

  const formatDate = (d: string | null) => {
    if (!d) return '';
    try { return new Intl.DateTimeFormat(intl.locale, { dateStyle: 'medium' }).format(new Date(d)); }
    catch { return ''; }
  };

  return (
    <div
      style={{
        background: 'var(--ds-bg-card)',
        border: isError ? '1px solid #EF4444' : '0.5px solid var(--ds-border)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--ds-bg-tinted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Link2 size={18} style={{ color: 'var(--ds-accent-primary)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
            {t(`integrations.service.${serviceKey}`, serviceName)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>
            {t(`integrations.service.${serviceKey}.desc`, '')}
          </div>
        </div>
        {/* Status indicator */}
        {isConnected && <CheckCircle size={16} style={{ color: 'var(--ds-accent-primary)' }} />}
        {isError && <AlertCircle size={16} style={{ color: '#EF4444' }} />}
      </div>

      {/* Connected state */}
      {isConnected && connection && (
        <div style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>
          <div>{t('integrations.card.connectedAs', 'Connected as')} {connection.connectedEmail || '—'}</div>
          {connection.lastSyncAt && <div>{t('integrations.sync.lastSynced', 'Last synced')} {formatDate(connection.lastSyncAt)}</div>}
        </div>
      )}

      {/* Error state */}
      {isError && connection && (
        <div style={{ fontSize: '12px', color: '#EF4444' }}>
          {connection.errorMessage || t('integrations.status.error', 'Connection Error')}
        </div>
      )}

      {/* Action button */}
      {!connection && (
        <button
          onClick={onConnect}
          style={{ background: 'var(--ds-accent-primary)', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', width: '100%' }}
        >
          {t('integrations.action.connect', 'Connect')}
        </button>
      )}

      {isConnected && connection && (
        <button
          onClick={() => onDisconnect(connection.id)}
          style={{ background: 'transparent', border: '1px solid var(--ds-border)', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', color: 'var(--ds-text-muted)', cursor: 'pointer', width: '100%' }}
        >
          {t('integrations.action.disconnect', 'Disconnect')}
        </button>
      )}

      {isError && connection && (
        <button
          onClick={onConnect}
          style={{ background: '#EF4444', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', width: '100%' }}
        >
          {t('integrations.action.reconnect', 'Reconnect')}
        </button>
      )}
    </div>
  );
}

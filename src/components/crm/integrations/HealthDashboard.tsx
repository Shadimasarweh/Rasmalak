'use client';

import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { Activity, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/store/orgStore';
import { mapFromDb } from '@/types/crm';
import type { HealthEvent, ServiceConnection } from '@/types/crm';

export function HealthDashboard() {
  const intl = useIntl();
  const { currentOrg } = useOrg();
  const [connections, setConnections] = useState<ServiceConnection[]>([]);
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  useEffect(() => {
    if (!currentOrg) return;
    const load = async () => {
      const { data: conns } = await supabase.from('service_connections').select('*').eq('org_id', currentOrg.id);
      if (conns) setConnections(conns.map(r => mapFromDb<ServiceConnection>(r)));

      const { data: evts } = await supabase.from('health_events').select('*').eq('org_id', currentOrg.id).order('created_at', { ascending: false }).limit(50);
      if (evts) setEvents(evts.map(r => mapFromDb<HealthEvent>(r)));
    };
    load();
  }, [currentOrg]);

  const statusIcon = (status: string) => {
    if (status === 'active') return <CheckCircle size={16} style={{ color: 'var(--ds-accent-primary)' }} />;
    if (status === 'error' || status === 'token_expired') return <XCircle size={16} style={{ color: '#EF4444' }} />;
    return <AlertTriangle size={16} style={{ color: '#F59E0B' }} />;
  };

  const formatDate = (d: string) => {
    try { return new Intl.DateTimeFormat(intl.locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(d)); }
    catch { return d; }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
        <Activity size={20} style={{ color: 'var(--ds-accent-primary)' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)' }}>
          {t('integrations.health.title', 'System Health')}
        </h2>
      </div>

      {/* Connection status grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '1.5rem' }}>
        {connections.map(conn => (
          <div key={conn.id} style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '12px', padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {statusIcon(conn.status)}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
                {t(`integrations.service.${conn.provider}_${conn.serviceType}`, `${conn.provider} ${conn.serviceType}`)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--ds-text-muted)' }}>
                {t(`integrations.status.${conn.status}`, conn.status)}
              </div>
            </div>
          </div>
        ))}

        {connections.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--ds-text-muted)', fontSize: '13px' }}>
            {t('integrations.health.allHealthy', 'No connections configured')}
          </div>
        )}
      </div>

      {/* Health events log */}
      {events.length > 0 && (
        <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBlockEnd: '1px solid var(--ds-border)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>Recent Events</h3>
          </div>
          {events.slice(0, 20).map(event => (
            <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', borderBlockEnd: '1px solid var(--ds-border)', fontSize: '12px' }}>
              <span style={{ color: event.severity === 'error' || event.severity === 'critical' ? '#EF4444' : event.severity === 'warning' ? '#F59E0B' : 'var(--ds-text-muted)', fontWeight: 500, minWidth: '60px' }}>
                {event.severity}
              </span>
              <span style={{ flex: 1, color: 'var(--ds-text-body)' }}>{event.message}</span>
              <span style={{ color: 'var(--ds-text-muted)', flexShrink: 0 }}>{formatDate(event.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

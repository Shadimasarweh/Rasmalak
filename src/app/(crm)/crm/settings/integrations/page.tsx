'use client';

import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { mapFromDb } from '@/types/crm';
import type { ServiceConnection } from '@/types/crm';
import { ConnectionCard } from '@/components/crm/integrations/ConnectionCard';
import { Skeleton } from '@/components/ui/Skeleton';

const SERVICES = [
  { key: 'google_calendar', name: 'Google Calendar', provider: 'google', serviceType: 'calendar' },
  { key: 'microsoft_calendar', name: 'Microsoft Calendar', provider: 'microsoft', serviceType: 'calendar' },
  { key: 'gmail', name: 'Gmail', provider: 'google', serviceType: 'email' },
  { key: 'outlook', name: 'Outlook', provider: 'microsoft', serviceType: 'email' },
  { key: 'teams', name: 'Microsoft Teams', provider: 'microsoft', serviceType: 'teams' },
  { key: 'slack', name: 'Slack', provider: 'slack', serviceType: 'slack' },
  { key: 'zoom', name: 'Zoom', provider: 'zoom', serviceType: 'zoom' },
];

export default function IntegrationsPage() {
  const intl = useIntl();
  const user = useAuthStore(s => s.user);
  const [connections, setConnections] = useState<ServiceConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from('service_connections').select('*').eq('user_id', user.id);
      if (data) setConnections(data.map(r => mapFromDb<ServiceConnection>(r)));
      setLoading(false);
    };
    load();
  }, [user]);

  const getConnection = (provider: string, serviceType: string) =>
    connections.find(c => c.provider === provider && c.serviceType === serviceType) || null;

  const handleConnect = async (provider: string, serviceType: string) => {
    const res = await fetch(`/api/integrations/connect?provider=${provider}&serviceType=${serviceType}`);
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  const handleDisconnect = async (connectionId: string) => {
    await fetch(`/api/integrations/${connectionId}`, { method: 'DELETE' });
    setConnections(prev => prev.filter(c => c.id !== connectionId));
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ds-text-heading)', marginBottom: '4px', fontFeatureSettings: '"kern" 1' }}>
        {t('integrations.action.configure', 'Integrations')}
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginBottom: '1.5rem' }}>
        {intl.locale.startsWith('ar') ? 'ربط خدماتك الخارجية بنظام إدارة العملاء' : 'Connect your external services to CRM'}
      </p>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} width="100%" height="160px" borderRadius="16px" />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {SERVICES.map(svc => (
            <ConnectionCard
              key={svc.key}
              serviceName={svc.name}
              serviceKey={svc.key}
              connection={getConnection(svc.provider, svc.serviceType)}
              onConnect={() => handleConnect(svc.provider, svc.serviceType)}
              onDisconnect={handleDisconnect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

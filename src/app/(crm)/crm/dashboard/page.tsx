'use client';

import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/store/orgStore';
import {
  LayoutDashboard, TrendingUp, AlertTriangle, CheckSquare,
  MessageCircle, Zap, Activity,
} from 'lucide-react';

interface DashboardData {
  pipelineValue: number;
  weightedForecast: number;
  dealCount: number;
  currency: string;
  overdueTaskCount: number;
  recentActivity: Array<{
    id: string;
    type: string;
    contactName: string;
    body: string;
    createdAt: string;
  }>;
  atRiskDeals: Array<{
    id: string;
    title: string;
    value: number;
    score: number;
  }>;
  integrationHealth: Array<{
    provider: string;
    status: string;
  }>;
  todayTasks: number;
}

export default function CrmDashboardPage() {
  const intl = useIntl();
  const isAr = intl.locale.startsWith('ar');
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });
  const { currentOrg } = useOrg();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentOrg) return;
    loadDashboard(currentOrg.id, currentOrg.currency);
  }, [currentOrg]);

  const loadDashboard = async (orgId: string, currency: string) => {
    setIsLoading(true);
    try {
      // Pipeline summary
      const { data: deals } = await supabase
        .from('crm_deals')
        .select('id, title, value, probability, ai_score, stage_id')
        .eq('org_id', orgId)
        .not('status', 'in', '("won","lost")')
        .limit(200);

      const pipelineValue = (deals ?? []).reduce((s, d) => s + (d.value ?? 0), 0);
      const weightedForecast = (deals ?? []).reduce((s, d) => s + (d.value ?? 0) * ((d.probability ?? 50) / 100), 0);
      const atRiskDeals = (deals ?? [])
        .filter(d => d.ai_score != null && d.ai_score < 40)
        .sort((a, b) => (a.ai_score ?? 0) - (b.ai_score ?? 0))
        .slice(0, 5)
        .map(d => ({ id: d.id, title: d.title, value: d.value ?? 0, score: d.ai_score ?? 0 }));

      // Overdue tasks
      const { count: overdueCount } = await supabase
        .from('crm_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'pending')
        .lt('due_date', new Date().toISOString());

      // Today's tasks
      const tomorrow = new Date(Date.now() + 86400000).toISOString();
      const { count: todayCount } = await supabase
        .from('crm_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'pending')
        .lte('due_date', tomorrow);

      // Recent activity
      const { data: comms } = await supabase
        .from('crm_communications')
        .select('id, type, body, created_at, crm_contacts(name)')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10);

      const recentActivity = (comms ?? []).map(c => ({
        id: c.id,
        type: c.type,
        contactName: (c.crm_contacts as Record<string, unknown>)?.name as string ?? '',
        body: (c.body ?? '').slice(0, 100),
        createdAt: c.created_at,
      }));

      // Integration health
      const { data: connections } = await supabase
        .from('service_connections')
        .select('provider, status')
        .eq('org_id', orgId);

      const integrationHealth = (connections ?? []).map(c => ({
        provider: c.provider,
        status: c.status,
      }));

      setData({
        pipelineValue,
        weightedForecast,
        dealCount: deals?.length ?? 0,
        currency,
        overdueTaskCount: overdueCount ?? 0,
        recentActivity,
        atRiskDeals,
        integrationHealth,
        todayTasks: todayCount ?? 0,
      });
    } catch (err) {
      console.warn('[Dashboard] Load error:', err);
    }
    setIsLoading(false);
  };

  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat(intl.locale, {
        style: 'currency',
        currency: data?.currency ?? 'USD',
        maximumFractionDigits: 0,
      }).format(value);
    } catch { return `${value}`; }
  };

  if (isLoading || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ height: '36px', background: 'var(--ds-bg-card)', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: '100px', background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ds-text-heading)', fontFeatureSettings: '"kern" 1', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LayoutDashboard size={22} />
          {isAr ? 'لوحة المعلومات' : 'Dashboard'}
        </h1>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
        <KpiCard icon={<TrendingUp size={18} />} label={isAr ? 'قيمة خط المبيعات' : 'Pipeline Value'} value={formatCurrency(data.pipelineValue)} />
        <KpiCard icon={<Activity size={18} />} label={isAr ? 'التوقعات المرجّحة' : 'Weighted Forecast'} value={formatCurrency(data.weightedForecast)} />
        <KpiCard icon={<Zap size={18} />} label={isAr ? 'الصفقات المفتوحة' : 'Open Deals'} value={String(data.dealCount)} />
        <KpiCard
          icon={<CheckSquare size={18} />}
          label={isAr ? 'المهام المتأخرة' : 'Overdue Tasks'}
          value={String(data.overdueTaskCount)}
          alert={data.overdueTaskCount > 0}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* At-risk deals */}
        <div style={{
          background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
          padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={16} color="#DC2626" />
            {isAr ? 'صفقات معرّضة للخطر' : 'At-Risk Deals'}
          </div>
          {data.atRiskDeals.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--ds-text-muted)', fontStyle: 'italic' }}>
              {isAr ? 'لا توجد صفقات معرضة للخطر' : 'No at-risk deals'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {data.atRiskDeals.map(d => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ color: 'var(--ds-text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{d.title}</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--ds-text-muted)', fontSize: '12px' }}>{formatCurrency(d.value)}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '999px', background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}>{d.score}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div style={{
          background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
          padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageCircle size={16} color="var(--ds-accent-primary)" />
            {isAr ? 'النشاط الأخير' : 'Recent Activity'}
          </div>
          {data.recentActivity.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--ds-text-muted)', fontStyle: 'italic' }}>
              {isAr ? 'لا يوجد نشاط حديث' : 'No recent activity'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.recentActivity.slice(0, 6).map(a => (
                <div key={a.id} style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                  <span style={{
                    fontSize: '10px', fontWeight: 500, padding: '2px 6px', borderRadius: '4px',
                    background: 'var(--ds-bg-tinted)', color: 'var(--ds-accent-primary)',
                    textTransform: 'uppercase', flexShrink: 0,
                  }}>
                    {a.type}
                  </span>
                  <span style={{ color: 'var(--ds-text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {a.contactName && <strong>{a.contactName}: </strong>}
                    {a.body}
                  </span>
                  <span style={{ color: 'var(--ds-text-muted)', fontSize: '11px', flexShrink: 0 }}>
                    {new Date(a.createdAt).toLocaleTimeString(intl.locale, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Integration health bar */}
      {data.integrationHealth.length > 0 && (
        <div style={{
          background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
          padding: '12px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
            {isAr ? 'التكاملات' : 'Integrations'}
          </span>
          {data.integrationHealth.map((conn, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: conn.status === 'active' ? 'var(--ds-accent-primary)' : conn.status === 'error' ? '#DC2626' : '#F59E0B',
              }} />
              {conn.provider}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, alert = false }: { icon: React.ReactNode; label: string; value: string; alert?: boolean }) {
  return (
    <div style={{
      background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
      padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--ds-text-muted)' }}>
        {icon}
        <span style={{ fontSize: '12px' }}>{label}</span>
      </div>
      <div style={{
        fontSize: '22px', fontWeight: 600,
        color: alert ? '#DC2626' : 'var(--ds-text-heading)',
      }}>
        {value}
      </div>
    </div>
  );
}

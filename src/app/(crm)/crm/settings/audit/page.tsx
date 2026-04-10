'use client';

import { useState, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useOrg, useOrgPermission } from '@/store/orgStore';
import { mapFromDb } from '@/types/crm';
import { Skeleton } from '@/components/ui/Skeleton';
import type { CrmAuditEntry } from '@/types/crm';

const PAGE_SIZE = 50;

export default function AuditLogPage() {
  const intl = useIntl();
  const { currentOrg, orgMembers } = useOrg();
  const canView = useOrgPermission('audit.view');
  const [entries, setEntries] = useState<CrmAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterEntity, setFilterEntity] = useState('');

  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  useEffect(() => {
    if (!currentOrg || !canView) return;
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('crm_audit_log')
          .select('*')
          .eq('org_id', currentOrg.id)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE);

        if (filterEntity) query = query.eq('entity_type', filterEntity);

        const { data } = await query;
        if (data) setEntries(data.map(r => mapFromDb<CrmAuditEntry>(r)));
      } catch (err) {
        console.warn('[AuditLog] Error:', err);
      }
      setLoading(false);
    };
    load();
  }, [currentOrg, canView, filterEntity]);

  const getMemberName = (userId: string) => {
    const member = orgMembers.find(m => m.userId === userId);
    return member?.displayName || member?.displayNameAr || userId.substring(0, 8);
  };

  const formatTime = (ts: string) => {
    try { return new Intl.DateTimeFormat(intl.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts)); }
    catch { return ts; }
  };

  if (!canView) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ fontSize: '15px', color: 'var(--ds-text-heading)' }}>{t('crm.error.accessDenied', 'Access Denied')}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ds-text-heading)', marginBottom: '4px', fontFeatureSettings: '"kern" 1' }}>
        {t('org.settings.audit', 'Audit Log')}
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginBottom: '1.5rem' }}>
        {intl.locale.startsWith('ar') ? 'سجل المراجعة' : 'Activity audit trail'}
      </p>

      {/* Filter */}
      <div style={{ marginBottom: '1rem' }}>
        <select
          value={filterEntity}
          onChange={e => setFilterEntity(e.target.value)}
          style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid var(--ds-border)', borderRadius: '8px', background: 'var(--ds-bg-card)', color: 'var(--ds-text-body)' }}
        >
          <option value="">All Entities</option>
          {['contact', 'company', 'deal', 'task', 'communication', 'member'].map(e => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width="100%" height="52px" borderRadius="8px" />
          ))}
        </div>
      ) : (
        <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          {entries.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ds-text-muted)', fontSize: '13px' }}>
              {t('crm.misc.noData', 'No data')}
            </div>
          ) : (
            entries.map((entry, idx) => (
              <div key={entry.id} style={{ borderBottom: idx < entries.length - 1 ? '1px solid var(--ds-border)' : 'none' }}>
                <button
                  onClick={() => setExpandedId(prev => prev === entry.id ? null : entry.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
                    padding: '12px 16px', border: 'none', background: 'transparent',
                    cursor: 'pointer', textAlign: 'start', fontSize: '13px',
                  }}
                >
                  <span style={{ fontSize: '12px', color: 'var(--ds-text-muted)', minWidth: '120px' }}>
                    {formatTime(entry.createdAt)}
                  </span>
                  <span style={{ fontWeight: 500, color: 'var(--ds-text-heading)', minWidth: '80px' }}>
                    {getMemberName(entry.userId)}
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 500,
                    background: entry.action === 'delete' ? 'rgba(239,68,68,0.1)' : entry.action === 'create' ? 'rgba(34,197,94,0.1)' : 'var(--ds-bg-tinted)',
                    color: entry.action === 'delete' ? '#EF4444' : entry.action === 'create' ? '#22C55E' : 'var(--ds-text-muted)',
                  }}>
                    {entry.action}
                  </span>
                  <span style={{ color: 'var(--ds-text-body)' }}>{entry.entityType}</span>
                  <div style={{ flex: 1 }} />
                  {entry.changes && (expandedId === entry.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </button>

                {/* Expanded changes diff */}
                {expandedId === entry.id && entry.changes && (
                  <div style={{ padding: '0 16px 12px 16px' }}>
                    <div style={{ background: 'var(--ds-bg-tinted)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', fontFamily: 'monospace' }}>
                      {Object.entries(entry.changes).map(([field, change]) => (
                        <div key={field} style={{ marginBottom: '4px' }}>
                          <span style={{ color: 'var(--ds-text-muted)' }}>{field}: </span>
                          <span style={{ color: '#EF4444' }}>{JSON.stringify((change as Record<string, unknown>).old ?? '—')}</span>
                          <span style={{ color: 'var(--ds-text-muted)' }}> → </span>
                          <span style={{ color: '#22C55E' }}>{JSON.stringify((change as Record<string, unknown>).new ?? '—')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/store/orgStore';
import { FileText, Download, Clock } from 'lucide-react';

interface Doc {
  id: string;
  name: string;
  nameAr: string | null;
  status: string;
  version: number;
  fileUrl: string;
  language: string;
  generatedAt: string;
}

export function DocumentList({ dealId }: { dealId?: string }) {
  const intl = useIntl();
  const isAr = intl.locale.startsWith('ar');
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });
  const { currentOrg } = useOrg();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentOrg) return;
    loadDocs();
  }, [currentOrg, dealId]);

  const loadDocs = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('crm_documents').select('*').eq('org_id', currentOrg!.id).order('generated_at', { ascending: false });
      if (dealId) query = query.eq('deal_id', dealId);

      const { data } = await query.limit(50);
      if (data) {
        setDocs(data.map(d => ({
          id: d.id, name: d.name, nameAr: d.name_ar, status: d.status,
          version: d.version, fileUrl: d.file_url, language: d.language,
          generatedAt: d.generated_at,
        })));
      }
    } catch (err) {
      console.warn('[DocumentList] Error:', err);
    }
    setIsLoading(false);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'signed': return 'var(--ds-accent-primary)';
      case 'sent': case 'viewed': return '#F59E0B';
      default: return 'var(--ds-text-muted)';
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {[1, 2].map(i => (
          <div key={i} style={{ height: '56px', background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '12px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div style={{
        background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
        padding: '2rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <FileText size={28} style={{ color: 'var(--ds-text-muted)', marginBottom: '8px' }} />
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
          {t('documents.list.empty', 'No documents yet')}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--ds-text-muted)', marginTop: '4px' }}>
          {t('documents.list.emptyDesc', 'Generate a proposal or quote to see it here.')}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {docs.map(doc => (
        <div key={doc.id} style={{
          background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '12px',
          padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            <FileText size={16} color="var(--ds-accent-primary)" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isAr && doc.nameAr ? doc.nameAr : doc.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--ds-text-muted)', display: 'flex', gap: '8px' }}>
                <span>v{doc.version}</span>
                <span style={{ color: statusColor(doc.status) }}>{doc.status}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Clock size={10} />
                  {new Date(doc.generatedAt).toLocaleDateString(intl.locale, { dateStyle: 'medium' })}
                </span>
              </div>
            </div>
          </div>
          {doc.fileUrl && (
            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ds-accent-primary)', padding: '4px' }}>
              <Download size={16} />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

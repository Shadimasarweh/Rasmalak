'use client';

import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useOrg } from '@/store/orgStore';
import { ProposalGenerator } from '@/components/crm/documents/ProposalGenerator';
import { QuoteBuilder } from '@/components/crm/documents/QuoteBuilder';
import { DocumentList } from '@/components/crm/documents/DocumentList';
import { FileText } from 'lucide-react';

type Tab = 'documents' | 'generate' | 'quote';

export default function DocumentsPage() {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });
  const { currentOrg } = useOrg();
  const [tab, setTab] = useState<Tab>('documents');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ds-text-heading)', fontFeatureSettings: '"kern" 1', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={22} />
          {t('documents.title', 'Documents')}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)' }}>
          {t('documents.subtitle', 'Create proposals, quotes, and manage documents')}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--ds-border)' }}>
        {(['documents', 'generate', 'quote'] as Tab[]).map(tabId => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            style={{
              padding: '0.625rem 1.25rem', fontSize: '13px', fontWeight: tab === tabId ? 500 : 400,
              color: tab === tabId ? 'var(--ds-accent-primary)' : 'var(--ds-text-muted)',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === tabId ? '2px solid var(--ds-accent-primary)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {t(`documents.tab.${tabId}`, tabId)}
          </button>
        ))}
      </div>

      {tab === 'documents' && <DocumentList />}
      {tab === 'generate' && currentOrg && <ProposalGenerator orgId={currentOrg.id} />}
      {tab === 'quote' && <QuoteBuilder currency={currentOrg?.currency ?? 'USD'} />}
    </div>
  );
}

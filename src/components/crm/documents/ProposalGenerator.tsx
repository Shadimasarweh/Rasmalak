'use client';

import { useState } from 'react';
import { useIntl } from 'react-intl';
import { supabase } from '@/lib/supabaseClient';
import { parseTemplate } from '@/crm/documents/templateEngine';
import { getMergeContext } from '@/crm/documents/mergeFields';
import { FileText, Eye, Download } from 'lucide-react';

interface ProposalGeneratorProps {
  orgId: string;
}

export function ProposalGenerator({ orgId }: ProposalGeneratorProps) {
  const intl = useIntl();
  const isAr = intl.locale.startsWith('ar');
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  const [templates, setTemplates] = useState<Array<{ id: string; name: string; nameAr: string | null; content: string; contentAr: string | null; language: string }>>([]);
  const [deals, setDeals] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedDeal, setSelectedDeal] = useState('');
  const [preview, setPreview] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadData = async () => {
    if (loaded) return;
    try {
      const [tplRes, dealRes] = await Promise.all([
        supabase.from('crm_document_templates').select('id, name, name_ar, content, content_ar, language').eq('org_id', orgId).eq('is_active', true),
        supabase.from('crm_deals').select('id, title').eq('org_id', orgId).not('status', 'in', '("won","lost")').limit(50),
      ]);
      if (tplRes.data) setTemplates(tplRes.data);
      if (dealRes.data) setDeals(dealRes.data);
      setLoaded(true);
    } catch { /* handled by empty state */ }
  };

  const generatePreview = async () => {
    if (!selectedTemplate || !selectedDeal) return;
    setIsLoading(true);
    try {
      const tpl = templates.find(t => t.id === selectedTemplate);
      if (!tpl) return;

      const context = await getMergeContext(selectedDeal);
      const content = isAr && tpl.contentAr ? tpl.contentAr : tpl.content;
      const rendered = parseTemplate(content, context as unknown as Record<string, unknown>, {
        language: isAr ? 'ar' : 'en',
        currency: (context.org.currency as string) ?? 'USD',
      });
      setPreview(rendered);
    } catch (err) {
      console.warn('[ProposalGenerator] Preview error:', err);
    }
    setIsLoading(false);
  };

  // Load data on first interaction
  if (!loaded) loadData();

  const selectStyle = {
    width: '100%', padding: '10px 14px', fontSize: '13px', borderRadius: '8px',
    border: '0.5px solid var(--ds-border)', background: 'var(--ds-bg-page)', color: 'var(--ds-text-body)',
  };

  return (
    <div style={{
      background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
      padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FileText size={18} />
        {t('documents.generator.title', 'Generate Proposal')}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--ds-text-muted)', marginBottom: '4px' }}>
            {t('documents.generator.template', 'Template')}
          </label>
          <select style={selectStyle} value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
            <option value="">{t('documents.generator.selectTemplate', 'Select template...')}</option>
            {templates.map(tpl => (
              <option key={tpl.id} value={tpl.id}>{isAr && tpl.nameAr ? tpl.nameAr : tpl.name}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--ds-text-muted)', marginBottom: '4px' }}>
            {t('documents.generator.deal', 'Deal')}
          </label>
          <select style={selectStyle} value={selectedDeal} onChange={e => setSelectedDeal(e.target.value)}>
            <option value="">{t('documents.generator.selectDeal', 'Select deal...')}</option>
            {deals.map(d => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={generatePreview}
        disabled={!selectedTemplate || !selectedDeal || isLoading}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px',
          background: 'var(--ds-accent-primary)', color: '#FFFFFF', border: 'none',
          borderRadius: '8px', fontSize: '13px', fontWeight: 500,
          cursor: selectedTemplate && selectedDeal ? 'pointer' : 'not-allowed',
          opacity: selectedTemplate && selectedDeal ? 1 : 0.5,
          marginBottom: preview ? '16px' : 0,
        }}
      >
        <Eye size={14} />
        {t('documents.generator.preview', 'Preview')}
      </button>

      {preview && (
        <div style={{
          padding: '20px', background: 'var(--ds-bg-page)', border: '0.5px solid var(--ds-border)',
          borderRadius: '12px', fontSize: '13px', lineHeight: 1.8, whiteSpace: 'pre-wrap',
          direction: isAr ? 'rtl' : 'ltr', color: 'var(--ds-text-body)',
        }}>
          {preview}
        </div>
      )}
    </div>
  );
}

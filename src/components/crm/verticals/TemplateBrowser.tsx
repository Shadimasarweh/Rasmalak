'use client';

import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { supabase } from '@/lib/supabaseClient';
import { TemplatePreview } from './TemplatePreview';
import { Building2, HeartPulse, Store, Star } from 'lucide-react';

interface VerticalTemplate {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  description: string | null;
  descriptionAr: string | null;
  industry: string;
  region: string | null;
  icon: string | null;
  pipelineConfig: Record<string, unknown>;
  customFields: Record<string, unknown>;
  workflowTemplates: unknown[];
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Building2: <Building2 size={24} />,
  HeartPulse: <HeartPulse size={24} />,
  Store: <Store size={24} />,
};

export function TemplateBrowser({ onInstall }: { onInstall: (slug: string) => Promise<void> }) {
  const intl = useIntl();
  const isAr = intl.locale.startsWith('ar');
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  const [templates, setTemplates] = useState<VerticalTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.from('crm_vertical_templates').select('*').eq('is_published', true);
      if (data) setTemplates(data as unknown as VerticalTemplate[]);
    } catch { /* handled */ }
    setIsLoading(false);
  };

  const previewTemplate = templates.find(t => t.slug === previewSlug);

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: '200px', background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {templates.map(tpl => (
          <div key={tpl.id} style={{
            background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
            padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            display: 'flex', flexDirection: 'column', gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: 'var(--ds-accent-primary)' }}>
                {ICON_MAP[tpl.icon ?? ''] ?? <Star size={24} />}
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ds-text-heading)' }}>
                  {isAr ? tpl.nameAr : tpl.name}
                </div>
                {tpl.region && (
                  <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '999px', background: 'var(--ds-bg-tinted)', color: 'var(--ds-accent-primary)', textTransform: 'uppercase' }}>
                    {tpl.region}
                  </span>
                )}
              </div>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--ds-text-muted)', lineHeight: 1.5, flex: 1 }}>
              {isAr ? tpl.descriptionAr : tpl.description}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setPreviewSlug(tpl.slug)}
                style={{
                  flex: 1, padding: '8px', fontSize: '12px', fontWeight: 500, borderRadius: '8px',
                  border: '0.5px solid var(--ds-border)', background: 'transparent',
                  color: 'var(--ds-text-body)', cursor: 'pointer',
                }}
              >
                {t('verticals.preview', 'Preview')}
              </button>
              <button
                onClick={() => onInstall(tpl.slug)}
                style={{
                  flex: 1, padding: '8px', fontSize: '12px', fontWeight: 500, borderRadius: '8px',
                  border: 'none', background: 'var(--ds-accent-primary)',
                  color: '#FFFFFF', cursor: 'pointer',
                }}
              >
                {t('verticals.install', 'Install')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {previewTemplate && (
        <TemplatePreview
          template={previewTemplate}
          onClose={() => setPreviewSlug(null)}
          onInstall={() => { setPreviewSlug(null); onInstall(previewTemplate.slug); }}
        />
      )}
    </>
  );
}

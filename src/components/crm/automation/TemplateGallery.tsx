'use client';

import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useAutomation } from '@/store/automationStore';
import { Star, Download, Check } from 'lucide-react';
import type { CrmWorkflowTemplate } from '@/types/crm';

const CATEGORIES = ['all', 'mena', 'sales'] as const;

export function TemplateGallery() {
  const intl = useIntl();
  const isAr = intl.locale.startsWith('ar');
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });
  const { templates, workflows, fetchTemplates, installTemplate } = useAutomation();

  const [category, setCategory] = useState<string>('all');
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const filtered = category === 'all'
    ? templates
    : templates.filter(tpl => tpl.category === category);

  // Check which templates are already installed
  const installedSlugs = new Set(workflows.filter(w => w.installedFrom).map(w => w.installedFrom));

  const handleInstall = async (tpl: CrmWorkflowTemplate) => {
    setInstalling(tpl.slug);
    await installTemplate(tpl);
    setInstalling(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
          {t('automation.template.title', 'Workflow Templates')}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>
          {t('automation.template.subtitle', 'Pre-built workflows to get started quickly')}
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: '6px 14px', fontSize: '12px', fontWeight: category === cat ? 500 : 400,
              borderRadius: '999px', cursor: 'pointer',
              background: category === cat ? 'var(--ds-accent-primary)' : 'var(--ds-bg-card)',
              color: category === cat ? '#FFFFFF' : 'var(--ds-text-body)',
              border: category === cat ? 'none' : '0.5px solid var(--ds-border)',
            }}
          >
            {t(`automation.template.category.${cat}`, cat)}
          </button>
        ))}
      </div>

      {/* Template grid */}
      {filtered.length === 0 ? (
        <div style={{
          background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
          padding: '2rem', textAlign: 'center', color: 'var(--ds-text-muted)', fontSize: '13px',
        }}>
          {t('automation.template.empty', 'No templates found for this category.')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {filtered.map(tpl => {
            const isInstalled = installedSlugs.has(tpl.slug);
            return (
              <div
                key={tpl.id || tpl.slug}
                style={{
                  background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)',
                  borderRadius: '16px', padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  display: 'flex', flexDirection: 'column', gap: '8px',
                }}
              >
                {/* Top row: name + featured badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
                    {isAr ? tpl.nameAr : tpl.name}
                  </div>
                  {tpl.isFeatured && (
                    <Star size={14} fill="var(--ds-accent-gold)" color="var(--ds-accent-gold)" />
                  )}
                </div>

                {/* Description */}
                <div style={{ fontSize: '12px', color: 'var(--ds-text-muted)', lineHeight: 1.5, flex: 1 }}>
                  {isAr ? tpl.descriptionAr : tpl.description}
                </div>

                {/* Category + region badge */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '999px',
                    background: tpl.category === 'mena' ? 'var(--ds-bg-tinted)' : 'var(--ds-bg-page)',
                    color: tpl.category === 'mena' ? 'var(--ds-accent-primary)' : 'var(--ds-text-muted)',
                    textTransform: 'uppercase',
                  }}>
                    {tpl.category}
                  </span>
                  {tpl.region && (
                    <span style={{ fontSize: '10px', color: 'var(--ds-text-muted)' }}>{tpl.region}</span>
                  )}
                </div>

                {/* Install button */}
                <button
                  onClick={() => handleInstall(tpl)}
                  disabled={isInstalled || installing === tpl.slug}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    width: '100%', padding: '8px', fontSize: '12px', fontWeight: 500,
                    borderRadius: '8px', cursor: isInstalled ? 'default' : 'pointer',
                    border: isInstalled ? '0.5px solid var(--ds-border)' : 'none',
                    background: isInstalled ? 'transparent' : 'var(--ds-accent-primary)',
                    color: isInstalled ? 'var(--ds-accent-primary)' : '#FFFFFF',
                    opacity: installing === tpl.slug ? 0.7 : 1,
                  }}
                >
                  {isInstalled ? (
                    <><Check size={14} /> {t('automation.template.installed', 'Installed')}</>
                  ) : (
                    <><Download size={14} /> {t('automation.template.install', 'Install')}</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useIntl } from 'react-intl';
import { TemplateBrowser } from '@/components/crm/verticals/TemplateBrowser';
import { InstallWizard } from '@/components/crm/verticals/InstallWizard';
import { Layers } from 'lucide-react';

export default function VerticalsPage() {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });
  const [installing, setInstalling] = useState<string | null>(null);

  const handleInstall = async (slug: string) => {
    setInstalling(slug);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ds-text-heading)', fontFeatureSettings: '"kern" 1', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={22} />
          {t('verticals.title', 'Industry Templates')}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)' }}>
          {t('verticals.subtitle', 'Install pre-built pipelines and workflows for your industry')}
        </p>
      </div>

      {installing ? (
        <InstallWizard
          slug={installing}
          templateName={installing}
          onComplete={() => setInstalling(null)}
        />
      ) : (
        <TemplateBrowser onInstall={handleInstall} />
      )}
    </div>
  );
}

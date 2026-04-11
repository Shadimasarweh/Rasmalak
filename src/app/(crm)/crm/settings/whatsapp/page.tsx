'use client';

import { useIntl } from 'react-intl';
import { AccountSetup } from '@/components/crm/whatsapp/AccountSetup';
import { TemplateManager } from '@/components/crm/whatsapp/TemplateManager';

export default function WhatsAppSettingsPage() {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ds-text-heading)', fontFeatureSettings: '"kern" 1' }}>
          {t('whatsapp.settings.title', 'WhatsApp Business')}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)' }}>
          {t('whatsapp.settings.subtitle', 'Manage your WhatsApp Business integration')}
        </p>
      </div>

      <AccountSetup />
      <TemplateManager />
    </div>
  );
}

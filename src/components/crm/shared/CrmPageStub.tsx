'use client';

import { useIntl } from 'react-intl';
import { Clock } from 'lucide-react';

interface CrmPageStubProps {
  titleKey: string;
  titleDefault: string;
  subtitleKey: string;
  subtitleDefault: string;
}

/**
 * Temporary stub for CRM pages not yet built.
 * Shows bilingual title + "Coming soon" tinted card.
 */
export function CrmPageStub({ titleKey, titleDefault, subtitleKey, subtitleDefault }: CrmPageStubProps) {
  const intl = useIntl();
  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  return (
    <div>
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 600,
          color: 'var(--ds-text-heading)',
          lineHeight: 1.3,
          fontFeatureSettings: '"kern" 1',
          marginBottom: '4px',
        }}
      >
        {t(titleKey, titleDefault)}
      </h1>
      <p
        style={{
          fontSize: '13px',
          fontWeight: 400,
          color: 'var(--ds-text-muted)',
          marginBottom: '1.5rem',
        }}
      >
        {t(subtitleKey, subtitleDefault)}
      </p>

      {/* Tinted card (4c) — coming soon */}
      <div
        style={{
          background: 'var(--ds-bg-tinted)',
          border: '1px solid #D1FAE5',
          borderRadius: '12px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <Clock size={18} style={{ color: 'var(--ds-accent-primary)' }} />
        <span style={{ fontSize: '14px', color: 'var(--ds-text-body)' }}>
          {t('crm.comingSoon', 'Coming soon')}
        </span>
        <span style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginInlineStart: '0.25rem' }}>
          — {t('crm.comingSoonAr', 'قريباً')}
        </span>
      </div>
    </div>
  );
}

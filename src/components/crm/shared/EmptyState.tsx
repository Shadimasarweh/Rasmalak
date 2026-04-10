'use client';

import { useIntl } from 'react-intl';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  titleKey: string;
  titleDefault: string;
  bodyKey: string;
  bodyDefault: string;
  ctaKey?: string;
  ctaDefault?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  titleKey, titleDefault,
  bodyKey, bodyDefault,
  ctaKey, ctaDefault,
  onAction,
}: EmptyStateProps) {
  const intl = useIntl();
  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'var(--ds-bg-tinted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
        }}
      >
        <Icon size={24} style={{ color: 'var(--ds-accent-primary)' }} />
      </div>

      <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '0.25rem' }}>
        {t(titleKey, titleDefault)}
      </h3>
      <p style={{ fontSize: '13px', fontWeight: 400, color: 'var(--ds-text-muted)', maxWidth: '320px', lineHeight: 1.6 }}>
        {t(bodyKey, bodyDefault)}
      </p>

      {ctaKey && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: '1rem',
            background: 'var(--ds-accent-primary)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            padding: '9px 18px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 150ms ease',
          }}
        >
          {t(ctaKey, ctaDefault || '')}
        </button>
      )}
    </div>
  );
}

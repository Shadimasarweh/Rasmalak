'use client';

import { useIntl } from 'react-intl';
import { Clock } from 'lucide-react';
import { useBilling } from '@/store/billingStore';
import { useRouter } from 'next/navigation';

export function TrialBanner() {
  const intl = useIntl();
  const router = useRouter();
  const { subscription, trialDaysRemaining } = useBilling();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  if (!subscription || subscription.status !== 'trialing' || trialDaysRemaining === null) return null;

  return (
    <div
      style={{
        background: 'var(--ds-bg-tinted)',
        border: '1px solid #D1FAE5',
        borderRadius: '0',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontSize: '13px',
      }}
    >
      <Clock size={14} style={{ color: 'var(--ds-accent-primary)' }} />
      <span style={{ color: 'var(--ds-text-body)' }}>
        {t('billing.trial.banner', 'Trial: {days} days remaining').replace('{days}', String(trialDaysRemaining))}
      </span>
      <button
        onClick={() => router.push('/crm/settings/billing')}
        style={{
          background: 'var(--ds-accent-primary)',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '6px',
          padding: '4px 12px',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          marginInlineStart: '8px',
        }}
      >
        {t('billing.trial.upgradeNow', 'Upgrade Now')}
      </button>
    </div>
  );
}

'use client';

import { useIntl } from 'react-intl';
import { ArrowUp, X } from 'lucide-react';
import { useBilling } from '@/store/billingStore';

interface UpgradeModalProps {
  reason: 'seat_limit' | 'feature_blocked';
  featureName?: string;
  onClose: () => void;
}

export function UpgradeModal({ reason, featureName, onClose }: UpgradeModalProps) {
  const intl = useIntl();
  const { subscription, createCheckoutSession, changePlan } = useBilling();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  const nextTier = subscription?.plan === 'entrepreneur' ? 'organization' : 'enterprise';

  const handleUpgrade = async () => {
    if (subscription) {
      const success = await changePlan(nextTier);
      if (success) onClose();
    } else {
      const url = await createCheckoutSession(nextTier, 'monthly');
      if (url) window.location.href = url;
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'relative', zIndex: 101, background: 'var(--ds-bg-card)', borderRadius: '16px', padding: '2rem', maxWidth: '420px', width: '90%', textAlign: 'center' }}>
        <button onClick={onClose} style={{ position: 'absolute', insetBlockStart: '16px', insetInlineEnd: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-muted)' }}>
          <X size={20} />
        </button>

        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--ds-bg-tinted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <ArrowUp size={24} style={{ color: 'var(--ds-accent-primary)' }} />
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', marginBottom: '8px' }}>
          {reason === 'seat_limit'
            ? t('billing.seat.upgradeRequired', 'Upgrade required for more seats')
            : t('billing.action.upgrade', 'Upgrade')}
        </h3>

        <p style={{ fontSize: '14px', color: 'var(--ds-text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
          {reason === 'seat_limit'
            ? (intl.locale.startsWith('ar') ? 'لقد وصلت للحد الأقصى من المقاعد في خطتك الحالية. قم بالترقية للحصول على مقاعد إضافية.' : "You've reached the seat limit on your current plan. Upgrade to add more team members.")
            : (intl.locale.startsWith('ar') ? `ميزة ${featureName || ''} متاحة في الخطة الأعلى.` : `${featureName || 'This feature'} is available on a higher plan.`)}
        </p>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button onClick={onClose} style={{ background: 'transparent', border: '1.5px solid var(--ds-border)', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer', color: 'var(--ds-text-body)' }}>
            {t('crm.action.cancel', 'Cancel')}
          </button>
          <button onClick={handleUpgrade} style={{ background: 'var(--ds-accent-primary)', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
            {t('billing.action.upgrade', 'Upgrade')} → {t(`billing.plan.${nextTier}`, nextTier)}
          </button>
        </div>
      </div>
    </div>
  );
}

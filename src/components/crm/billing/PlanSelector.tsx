'use client';

import { useIntl } from 'react-intl';
import { Check } from 'lucide-react';
import { useBilling } from '@/store/billingStore';
import type { PlanTier } from '@/types/crm';

const PLANS: { tier: PlanTier; seats: string; contacts: string; featured: boolean }[] = [
  { tier: 'entrepreneur', seats: '3–10', contacts: '1,000', featured: false },
  { tier: 'organization', seats: '10–35', contacts: '10,000', featured: true },
  { tier: 'enterprise', seats: '25–150', contacts: 'Unlimited', featured: false },
];

export function PlanSelector() {
  const intl = useIntl();
  const { subscription, createCheckoutSession, changePlan } = useBilling();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });
  const currentPlan = subscription?.plan || null;

  const handleSelect = async (tier: PlanTier) => {
    if (tier === currentPlan) return;
    if (currentPlan) {
      await changePlan(tier);
    } else {
      const url = await createCheckoutSession(tier, 'monthly');
      if (url) window.location.href = url;
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
      {PLANS.map(plan => {
        const isCurrent = currentPlan === plan.tier;
        return (
          <div
            key={plan.tier}
            style={{
              background: 'var(--ds-bg-card)',
              border: isCurrent ? '2px solid var(--ds-accent-primary)' : '0.5px solid var(--ds-border)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              position: 'relative',
            }}
          >
            {plan.featured && (
              <div style={{ position: 'absolute', insetBlockStart: '-12px', insetInlineStart: '50%', transform: 'translateX(-50%)', background: 'var(--ds-accent-primary)', color: '#FFFFFF', padding: '2px 14px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600 }}>
                {intl.locale.startsWith('ar') ? 'الأكثر شيوعاً' : 'Most Popular'}
              </div>
            )}

            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', marginBottom: '4px' }}>
              {t(`billing.plan.${plan.tier}`, plan.tier)}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              {t(`billing.plan.${plan.tier}.desc`, '')}
            </p>

            <div style={{ fontSize: '13px', color: 'var(--ds-text-body)', marginBottom: '12px' }}>
              <div><strong>{plan.seats}</strong> {t('billing.seats', 'seats')}</div>
              <div><strong>{plan.contacts}</strong> {t('billing.contacts', 'contacts')}</div>
            </div>

            <button
              onClick={() => handleSelect(plan.tier)}
              disabled={isCurrent}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: isCurrent ? '1.5px solid var(--ds-accent-primary)' : 'none',
                background: isCurrent ? 'transparent' : 'var(--ds-accent-primary)',
                color: isCurrent ? 'var(--ds-accent-primary)' : '#FFFFFF',
                fontSize: '13px',
                fontWeight: 500,
                cursor: isCurrent ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              {isCurrent && <Check size={14} />}
              {isCurrent ? t('billing.subscription.plan', 'Current Plan') : t('billing.action.upgrade', 'Upgrade')}
            </button>
          </div>
        );
      })}
    </div>
  );
}

'use client';

import { useIntl } from 'react-intl';
import { PlanSelector } from '@/components/crm/billing/PlanSelector';
import { SeatManager } from '@/components/crm/billing/SeatManager';
import { InvoiceList } from '@/components/crm/billing/InvoiceList';
import { useBilling } from '@/store/billingStore';

export default function BillingPage() {
  const intl = useIntl();
  const { createPortalSession } = useBilling();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  const handleManagePayment = async () => {
    const url = await createPortalSession();
    if (url) window.location.href = url;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ds-text-heading)', fontFeatureSettings: '"kern" 1' }}>
          {t('billing.subscription.plan', 'Billing')}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)' }}>
          {intl.locale.startsWith('ar') ? 'الفوترة والاشتراك' : 'Billing & Subscription'}
        </p>
      </div>

      <PlanSelector />
      <SeatManager />

      {/* Payment method link */}
      <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>{t('billing.payment.title', 'Payment Method')}</div>
          <div style={{ fontSize: '13px', color: 'var(--ds-text-muted)' }}>{intl.locale.startsWith('ar') ? 'إدارة البطاقات وطرق الدفع' : 'Manage cards and payment methods'}</div>
        </div>
        <button onClick={handleManagePayment} style={{ background: 'var(--ds-accent-primary)', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
          {t('billing.action.managePayment', 'Manage')}
        </button>
      </div>

      <InvoiceList />
    </div>
  );
}

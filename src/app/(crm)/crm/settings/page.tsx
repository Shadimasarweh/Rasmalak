'use client';

import { useRouter } from 'next/navigation';
import { useIntl } from 'react-intl';
import { Kanban, Users, FileText, Shield, CreditCard, Link2, Activity } from 'lucide-react';

export default function CrmSettingsPage() {
  const intl = useIntl();
  const router = useRouter();
  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  const cards = [
    { path: '/crm/settings/pipeline', icon: Kanban, title: t('org.settings.pipeline', 'Pipeline Configuration'), titleAr: 'إعداد مسار المبيعات' },
    { path: '/crm/settings/team', icon: Users, title: t('org.settings.team', 'Team Management'), titleAr: 'إدارة الفريق' },
    { path: '/crm/settings/fields', icon: FileText, title: t('org.settings.fields', 'Custom Fields'), titleAr: 'الحقول المخصصة' },
    { path: '/crm/settings/audit', icon: Shield, title: t('org.settings.audit', 'Audit Log'), titleAr: 'سجل المراجعة' },
    { path: '/crm/settings/billing', icon: CreditCard, title: t('billing.subscription.plan', 'Billing'), titleAr: 'الفوترة' },
    { path: '/crm/settings/integrations', icon: Link2, title: t('integrations.action.configure', 'Integrations'), titleAr: 'التكاملات' },
    { path: '/crm/settings/health', icon: Activity, title: t('integrations.health.title', 'System Health'), titleAr: 'صحة النظام' },
  ];

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ds-text-heading)', marginBottom: '4px', fontFeatureSettings: '"kern" 1' }}>
        {t('crm.nav.settings', 'Settings')}
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginBottom: '1.5rem' }}>
        {t('org.settings.title', 'إعدادات المنظمة')}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <button
              key={card.path}
              onClick={() => router.push(card.path)}
              style={{
                background: 'var(--ds-bg-card)',
                border: '0.5px solid var(--ds-border)',
                borderRadius: '16px',
                padding: '20px 24px',
                cursor: 'pointer',
                textAlign: 'start',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'border-color 150ms ease',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--ds-bg-tinted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} style={{ color: 'var(--ds-accent-primary)' }} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>{card.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginTop: '2px' }}>{card.titleAr}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

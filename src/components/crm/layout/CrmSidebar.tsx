'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useIntl } from 'react-intl';
import {
  Kanban,
  Users,
  Handshake,
  CheckSquare,
  BarChart3,
  Upload,
  Settings,
  ArrowLeft,
  X,
} from 'lucide-react';

interface CrmSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { id: 'pipeline', path: '/crm', icon: Kanban, labelKey: 'crm.nav.pipeline', labelDefault: 'Pipeline' },
  { id: 'contacts', path: '/crm/contacts', icon: Users, labelKey: 'crm.nav.contacts', labelDefault: 'Contacts' },
  { id: 'deals', path: '/crm/deals', icon: Handshake, labelKey: 'crm.nav.deals', labelDefault: 'Deals' },
  { id: 'tasks', path: '/crm/tasks', icon: CheckSquare, labelKey: 'crm.nav.tasks', labelDefault: 'Tasks' },
  { id: 'reports', path: '/crm/reports', icon: BarChart3, labelKey: 'crm.nav.reports', labelDefault: 'Reports' },
] as const;

const SECONDARY_ITEMS = [
  { id: 'import', path: '/crm/import', icon: Upload, labelKey: 'crm.nav.import', labelDefault: 'Import Data' },
  { id: 'settings', path: '/crm/settings', icon: Settings, labelKey: 'crm.nav.settings', labelDefault: 'Settings' },
] as const;

export function CrmSidebar({ isOpen, onClose }: CrmSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const intl = useIntl();

  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  const isActive = (path: string) => {
    if (path === '/crm') return pathname === '/crm';
    return pathname.startsWith(path);
  };

  const navigate = (path: string) => {
    router.push(path);
    onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 60,
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: '15rem',
          minHeight: '100vh',
          background: 'var(--ds-bg-card)',
          borderInlineEnd: '0.5px solid var(--ds-border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem 0.75rem',
          position: 'fixed',
          insetBlockStart: 0,
          insetInlineStart: isOpen ? 0 : '-15rem',
          zIndex: 70,
          transition: 'inset-inline-start 200ms ease',
          overflowY: 'auto',
        }}
        className="crm-sidebar"
      >
        {/* Mobile close button */}
        <div
          style={{
            display: 'none',
            justifyContent: 'flex-end',
            marginBottom: '0.5rem',
          }}
          className="crm-sidebar-close"
        >
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              color: 'var(--ds-text-muted)',
            }}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Brand / CRM label */}
        <div style={{ paddingInlineStart: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ds-text-heading)' }}>
            Rasmalak CRM
          </div>
          <div style={{ fontSize: '11px', fontWeight: 400, color: 'var(--ds-text-muted)' }}>
            إدارة العملاء
          </div>
        </div>

        {/* Primary nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  paddingInlineStart: '0.75rem',
                  paddingInlineEnd: '0.75rem',
                  paddingBlock: '0.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: active ? 'var(--ds-bg-tinted)' : 'transparent',
                  color: active ? 'var(--ds-accent-primary)' : 'var(--ds-text-body)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: active ? 500 : 400,
                  textAlign: 'start',
                  width: '100%',
                  minHeight: '2.75rem',
                  transition: 'background 150ms ease',
                }}
              >
                <Icon size={18} />
                {t(item.labelKey, item.labelDefault)}
              </button>
            );
          })}

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--ds-border)', margin: '0.5rem 0.75rem' }} />

          {/* Secondary nav */}
          {SECONDARY_ITEMS.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  paddingInlineStart: '0.75rem',
                  paddingInlineEnd: '0.75rem',
                  paddingBlock: '0.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: active ? 'var(--ds-bg-tinted)' : 'transparent',
                  color: active ? 'var(--ds-accent-primary)' : 'var(--ds-text-body)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: active ? 500 : 400,
                  textAlign: 'start',
                  width: '100%',
                  minHeight: '2.75rem',
                  transition: 'background 150ms ease',
                }}
              >
                <Icon size={18} />
                {t(item.labelKey, item.labelDefault)}
              </button>
            );
          })}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--ds-border)', margin: '0.5rem 0.75rem' }} />

          {/* Back to Rasmalak */}
          <button
            onClick={() => router.push('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              paddingInlineStart: '0.75rem',
              paddingInlineEnd: '0.75rem',
              paddingBlock: '0.5rem',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: 'var(--ds-text-muted)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 400,
              textAlign: 'start',
              width: '100%',
              minHeight: '2.75rem',
              transition: 'background 150ms ease',
            }}
          >
            <ArrowLeft size={16} />
            {t('crm.nav.back', 'Back to Rasmalak')}
          </button>
        </nav>
      </aside>

      {/* CSS for responsive behavior */}
      <style>{`
        @media (min-width: 768px) {
          .crm-sidebar {
            position: relative !important;
            inset-inline-start: 0 !important;
          }
          .crm-sidebar-close {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          .crm-sidebar-close {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}

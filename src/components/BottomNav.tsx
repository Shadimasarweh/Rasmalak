'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useIntl } from 'react-intl';
import {
  LayoutDashboard,
  Receipt,
  Plus,
  MessageSquareText,
  Calculator,
} from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const intl = useIntl();

  // Hide bottom nav on auth pages
  if (pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password' || pathname === '/onboarding') {
    return null;
  }

  const navItems = [
    { id: 'dashboard', path: '/', labelKey: 'nav.dashboard', defaultLabel: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', path: '/transactions', labelKey: 'nav.transactions', defaultLabel: 'Transactions', icon: Receipt },
    { id: 'add', path: '/transactions/new', labelKey: 'nav.add', defaultLabel: 'Add', icon: Plus, isAction: true },
    { id: 'chat', path: '/chat', labelKey: 'nav.chat', defaultLabel: 'Mustasharak', icon: MessageSquareText },
    { id: 'tools', path: '/tools', labelKey: 'nav.tools', defaultLabel: 'Tools', icon: Calculator },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe lg:hidden"
      style={{ backgroundColor: 'var(--color-sidebar-bg)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', paddingBlock: 'var(--spacing-2)', paddingInline: 'var(--spacing-2)', maxWidth: '28rem', margin: '0 auto' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          const Icon = item.icon;
          const label = intl.formatMessage({ id: item.labelKey, defaultMessage: item.defaultLabel });

          // Center "Add" action button
          if ((item as { isAction?: boolean }).isAction) {
            return (
              <Link key={item.id} href={item.path} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '-1.25rem' }}>
                <div
                  className="active:scale-95 transition-transform duration-150"
                  style={{
                    width: '3.5rem',
                    height: '3.5rem',
                    borderRadius: 'var(--radius-xl)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--color-accent-growth)',
                    boxShadow: 'var(--shadow-lg)',
                  }}
                >
                  <Icon style={{ width: '1.5rem', height: '1.5rem', color: '#FFFFFF', strokeWidth: 2.5 }} />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.path}
              className="active:scale-95 transition-all duration-200"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                paddingBlock: 'var(--spacing-1_5)',
                paddingInline: 'var(--spacing-3)',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'var(--color-accent-growth)' : 'var(--color-sidebar-text-dim)',
                textDecoration: 'none',
              }}
            >
              <div className="relative">
                <Icon style={{ width: '1.25rem', height: '1.25rem', strokeWidth: isActive ? 2.5 : 1.5 }} />
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-0.25rem',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '0.25rem',
                      height: '0.25rem',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'var(--color-accent-growth)',
                    }}
                  />
                )}
              </div>
              <span style={{ fontSize: '0.625rem', marginTop: 'var(--spacing-1_5)', fontWeight: isActive ? 600 : 500 }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

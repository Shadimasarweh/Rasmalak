'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useIntl } from 'react-intl';

interface NavItem {
  id: string;
  labelKey: string;
  defaultLabel: string;
  href: string;
  icon: ReactNode;
  badge?: ReactNode;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    labelKey: 'nav.dashboard',
    defaultLabel: 'Dashboard',
    href: '/',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    id: 'transactions',
    labelKey: 'nav.transactions',
    defaultLabel: 'Transactions',
    href: '/transactions',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    id: 'learn',
    labelKey: 'nav.learn',
    defaultLabel: 'Learn',
    href: '/learn',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    id: 'mustasharak',
    labelKey: 'nav.chat',
    defaultLabel: 'Mustasharak',
    href: '/chat',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    badge: (
      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-brand-emerald text-[#FFFFFF] rounded-[var(--radius-pill)]">
        AI
      </span>
    ),
  },
  {
    id: 'tools',
    labelKey: 'nav.tools',
    defaultLabel: 'Tools',
    href: '/tools',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const bottomNavItems: NavItem[] = [
  {
    id: 'settings',
    labelKey: 'nav.settings',
    defaultLabel: 'Settings',
    href: '/settings',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'logout',
    labelKey: 'nav.logout',
    defaultLabel: 'Logout',
    href: '/login',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const intl = useIntl();
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-60 bg-brand-navy">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-[#FFFFFF]/10">
        <div className="w-8 h-8 rounded-[var(--radius-input)] bg-brand-emerald flex items-center justify-center">
          <span className="text-[#FFFFFF] font-bold text-sm">R</span>
        </div>
        <span className="text-[#FFFFFF] font-semibold">
          {intl.formatMessage({ id: 'app.name', defaultMessage: 'Rasmalak' })} <span className="text-brand-emerald">AI</span>
        </span>
      </div>

      {/* User Profile Section */}
      <div className="px-4 py-4 border-b border-[#FFFFFF]/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-input)] bg-brand-emerald/20 flex items-center justify-center text-brand-emerald font-semibold text-sm">
            SH
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#FFFFFF] truncate">Shadi</p>
            <p className="text-xs text-[#FFFFFF]/50 truncate">s.masarweh@synop...</p>
          </div>
        </div>
      </div>

      {/* Main Menu Label */}
      <div className="px-5 pt-4 pb-2">
        <span className="text-[10px] font-semibold text-[#FFFFFF]/40 uppercase tracking-wider">
          {intl.formatMessage({ id: 'nav.main_menu', defaultMessage: 'Main Menu' })}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-input)]
                transition-colors duration-150
                ${active
                  ? 'bg-brand-emerald text-[#FFFFFF]'
                  : 'text-[#FFFFFF]/70 hover:bg-[#FFFFFF]/5 hover:text-[#FFFFFF]'
                }
              `}
            >
              {item.icon}
              <span className="text-sm font-medium">
                {intl.formatMessage({ id: item.labelKey, defaultMessage: item.defaultLabel })}
              </span>
              {item.badge && <span className="ml-auto">{item.badge}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="px-3 py-4 border-t border-[#FFFFFF]/10 space-y-1">
        {bottomNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-input)]
                transition-colors duration-150
                ${active
                  ? 'bg-brand-emerald text-[#FFFFFF]'
                  : 'text-[#FFFFFF]/70 hover:bg-[#FFFFFF]/5 hover:text-[#FFFFFF]'
                }
              `}
            >
              {item.icon}
              <span className="text-sm font-medium">
                {intl.formatMessage({ id: item.labelKey, defaultMessage: item.defaultLabel })}
              </span>
            </Link>
          );
        })}

        {/* User Profile Bottom */}
        <div className="flex items-center gap-3 px-3 py-3 mt-2">
          <div className="w-8 h-8 rounded-[var(--radius-pill)] bg-brand-navy-light flex items-center justify-center text-[#FFFFFF]/70 text-xs font-medium">
            N
          </div>
          <div className="flex-1" />
          <button className="text-[#FFFFFF]/50 hover:text-[#FFFFFF]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}


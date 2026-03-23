'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Settings, Search, LogOut, Menu } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useUserName, useUser, useLogout, useLanguage, useStore } from '@/store/useStore';
import { Moon, Sun } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import NotificationPanel from '@/components/NotificationPanel';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = useNotificationStore(state => state.unreadCount());
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const userName = useUserName();
  const user = useUser();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();
  const language = useLanguage();

  const PAGE_TITLES: Record<string, { ar: string; en: string }> = {
    '/': { ar: 'الرئيسية', en: 'Dashboard' },
    '/transactions': { ar: 'المعاملات', en: 'Transactions' },
    '/budgets': { ar: 'الميزانيات', en: 'Budgets' },
    '/budget': { ar: 'الميزانية', en: 'Budget' },
    '/learn': { ar: 'تعلّم', en: 'Learn' },
    '/chat': { ar: 'مستشارك', en: 'Mustasharak' },
    '/tools': { ar: 'الأدوات', en: 'Tools' },
    '/calculators': { ar: 'الحاسبات', en: 'Calculators' },
    '/goals': { ar: 'الأهداف', en: 'Goals' },
    '/settings': { ar: 'الإعدادات', en: 'Settings' },
    '/community': { ar: 'المجتمع', en: 'Community' },
  };

  const getPageTitle = () => {
    if (PAGE_TITLES[pathname]) {
      return language === 'ar' ? PAGE_TITLES[pathname].ar : PAGE_TITLES[pathname].en;
    }
    const base = Object.keys(PAGE_TITLES).find(key => key !== '/' && pathname.startsWith(key));
    if (base) {
      return language === 'ar' ? PAGE_TITLES[base].ar : PAGE_TITLES[base].en;
    }
    return null;
  };

  const pageTitle = getPageTitle();

  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const setLanguage = useStore((s) => s.setLanguage);

  const displayName = user?.name || userName;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header
      className="sticky top-0 z-30"
      style={{
        height: '4rem',
        backgroundColor: 'var(--color-bg-surface-1)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingInline: 'var(--spacing-4)', gap: 'var(--spacing-4)' }}>
        {/* Mobile menu button */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden"
          style={{ padding: 'var(--spacing-2)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)' }}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Current page title — visible on mobile and tablet, hidden on desktop where sidebar shows */}
        {pageTitle && (
          <span
            className="lg:hidden"
            style={{
              fontSize: '15px',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
            }}
          >
            {pageTitle}
          </span>
        )}

        {/* Search */}
        <div className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <div
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <Search className="w-5 h-5" />
            </div>
            <input
              type="search"
              placeholder={language === 'ar' ? 'ابحث في المعاملات، الأدوات...' : 'Search transactions, tools...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
              name="dashboard-search"
              style={{
                width: '100%',
                paddingInlineStart: '2.5rem',
                paddingInlineEnd: 'var(--spacing-4)',
                paddingBlock: 'var(--spacing-2)',
                fontSize: '0.875rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg-input)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Spacer on mobile when search is hidden */}
        <div className="flex-1 sm:hidden" />

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
          {/* Notifications */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(prev => !prev)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                position: 'relative', padding: '6px', borderRadius: '8px',
                color: 'var(--color-text-secondary)',
              }}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute', top: '2px', right: '2px',
                  minWidth: '18px', height: '18px', borderRadius: '50%',
                  background: '#DC2626',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#FFFFFF' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </div>
              )}
            </button>
            {showNotifications && (
              <NotificationPanel onClose={() => setShowNotifications(false)} />
            )}
          </div>

          {/* Settings - visible on mobile only */}
          <Link
            href="/settings"
            className="lg:hidden"
            style={{ padding: 'var(--spacing-2)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)' }}
          >
            <Settings className="w-5 h-5" />
          </Link>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            aria-label={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
            style={{
              padding: '4px 10px',
              borderRadius: '8px',
              background: 'none',
              border: '0.5px solid var(--color-border)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-surface-2, #F0F7F4)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            {language === 'ar' ? 'EN' : 'ع'}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? (language === 'ar' ? 'التبديل إلى الوضع الفاتح' : 'Switch to light mode') : (language === 'ar' ? 'التبديل إلى الوضع الداكن' : 'Switch to dark mode')}
            style={{ padding: 'var(--spacing-2)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* User Avatar */}
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--color-accent-growth)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: '0.875rem',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
              <div
                className="absolute z-20"
                style={{
                  insetInlineEnd: 'var(--spacing-6)',
                  top: '3.75rem',
                  width: '12rem',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--color-bg-surface-1)',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-lg)',
                  paddingBlock: 'var(--spacing-1)',
                }}
              >
                <div
                  style={{
                    paddingInline: 'var(--spacing-3)',
                    paddingBlock: 'var(--spacing-2)',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName || (language === 'ar' ? 'مستخدم' : 'User')}
                  </p>
                  {user?.email && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 'var(--spacing-0_5)' }}>
                      {user.email}
                    </p>
                  )}
                </div>
                <Link
                  href="/settings"
                  onClick={() => setShowUserMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                    paddingInline: 'var(--spacing-3)',
                    paddingBlock: 'var(--spacing-2)',
                    fontSize: '0.875rem',
                    color: 'var(--color-text-secondary)',
                    textDecoration: 'none',
                  }}
                >
                  <Settings className="w-4 h-4" />
                  {language === 'ar' ? 'الإعدادات' : 'Settings'}
                </Link>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                    paddingInline: 'var(--spacing-3)',
                    paddingBlock: 'var(--spacing-2)',
                    fontSize: '0.875rem',
                    color: 'var(--color-danger-text)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  {language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

'use client';

import { useState } from 'react';
import { Bell, Settings, Search, X, ChevronDown, User, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useUserName, useUser, useLogout } from '@/store/useStore';
import { useTranslation } from '@/hooks/useTranslation';

interface HeaderProps {
  showGreeting?: boolean;
  title?: string;
}

export default function Header({ showGreeting = true, title }: HeaderProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const userName = useUserName();
  const user = useUser();
  const logout = useLogout();
  const router = useRouter();
  const { t, language, isRTL } = useTranslation();

  const displayName = user?.name || userName;
  const isDashboard = pathname === '/';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (language === 'ar') {
      if (hour < 12) return 'صباح الخير';
      return 'مساء الخير';
    } else {
      if (hour < 12) return 'Good morning';
      if (hour < 18) return 'Good afternoon';
      return 'Good evening';
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className={`sticky top-0 z-40 bg-[var(--color-bg-primary)]/95 backdrop-blur-sm border-b border-[var(--color-border)] ${isDashboard ? 'hidden' : ''}`}>
      <div className="flex items-center justify-between px-5 py-3 gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {showGreeting && !isDashboard ? (
            <div className="animate-fadeIn min-w-0">
              <p className="text-sm text-[var(--color-text-secondary)] font-medium truncate">
                {getGreeting()}
              </p>
              <h1 className="text-lg font-bold text-[var(--color-text-primary)] truncate">
                {displayName || t.dashboard.guestUser}
              </h1>
            </div>
          ) : (
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] truncate">
              {title || t.appName}
            </h1>
          )}
        </div>

        {/* Search Bar - Hidden on dashboard as it will be in banner */}
        {!isDashboard && (
          <div className="hidden md:flex items-center flex-1 max-w-md">
            <div className="relative w-full">
              <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]`} />
              <input
                type="text"
                placeholder={language === 'ar' ? 'ابحث...' : 'Search...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${isRTL ? 'pr-12' : 'pl-12'} pr-4 py-2.5 bg-[var(--color-bg-card)] border border-[var(--color-border-light)] rounded-xl text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile Search Button - Hidden on dashboard */}
          {!isDashboard && (
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="md:hidden w-10 h-10 rounded-xl bg-[var(--color-bg-card)] flex items-center justify-center shadow-sm border border-[var(--color-border-light)] transition-all hover:shadow-md hover:border-[var(--color-border)]"
              aria-label={language === 'ar' ? 'بحث' : 'Search'}
            >
              <Search className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </button>
          )}

          {/* Notifications */}
          <button className="relative w-10 h-10 rounded-xl bg-[var(--color-bg-card)] flex items-center justify-center shadow-sm border border-[var(--color-border-light)] transition-all hover:shadow-md hover:border-[var(--color-border)]">
            <Bell className="w-5 h-5 text-[var(--color-text-secondary)]" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--color-danger)] ring-2 ring-[var(--color-bg-card)]" />
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-bg-card)] shadow-sm border border-[var(--color-border-light)] transition-all hover:shadow-md hover:border-[var(--color-border)]"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center text-white text-xs font-semibold">
                {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <ChevronDown className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full mt-2 w-56 bg-[var(--color-bg-card)] rounded-xl shadow-lg border border-[var(--color-border-light)] py-2 z-20 animate-fadeInDown`}>
                  <div className="px-4 py-3 border-b border-[var(--color-border-light)]">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                      {displayName || t.dashboard.guestUser}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate">
                      {user?.email || ''}
                    </p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>{t.settings.title}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t.auth.logout}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Bar - Hidden on dashboard */}
      {showSearch && !isDashboard && (
        <div className="md:hidden px-6 pb-4 animate-fadeInDown">
          <div className="relative">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]`} />
            <input
              type="text"
              placeholder={language === 'ar' ? 'ابحث...' : 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isRTL ? 'pr-12' : 'pl-12'} pr-4 py-2.5 bg-[var(--color-bg-card)] border border-[var(--color-border-light)] rounded-xl text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all`}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

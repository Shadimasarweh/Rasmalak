'use client';

import { useState, useEffect } from 'react';
import { Bell, Settings, Search, X, ChevronDown, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useUserName, useUser, useLogout } from '@/store/useStore';
import { useTranslation } from '@/hooks/useTranslation';

export default function Header() {
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const userName = useUserName();
  const user = useUser();
  const logout = useLogout();
  const router = useRouter();
  const { t, language, isRTL } = useTranslation();

  const displayName = user?.name || userName;
  const isDashboard = pathname === '/';

  // Scroll detection for glass effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Hide header on dashboard (dashboard has its own hero)
  if (isDashboard) return null;

  return (
    <header 
      className={`sticky top-0 z-40 h-14 transition-all duration-200 ease-out ${
        isScrolled 
          ? 'bg-[var(--color-glass)] backdrop-blur-xl border-b border-[var(--color-border-light)] shadow-[var(--elevation-2)]' 
          : 'bg-[var(--color-bg-primary)] border-b border-[var(--color-border)]'
      }`}
    >
      <div className="h-full flex items-center justify-between px-5 gap-4">
        {/* Left: App name */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-base font-semibold text-[var(--color-text-primary)]">
            {t.appName}
          </span>
        </div>

        {/* Center: Search (desktop only) */}
        <div className="hidden md:flex items-center flex-1 max-w-sm mx-4">
          <div className="relative w-full group">
            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] transition-colors group-focus-within:text-[var(--color-primary)]`} />
            <input
              type="text"
              placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full h-9 ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'} bg-[var(--color-bg-secondary)] border border-transparent rounded-lg text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:bg-[var(--color-bg-card)] transition-all duration-200`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 hover:text-[var(--color-text-primary)] transition-colors`}
              >
                <X className="w-4 h-4 text-[var(--color-text-muted)]" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Mobile Search */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--color-bg-secondary)] active:scale-95 transition-all duration-150"
          >
            <Search className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>

          {/* Notifications */}
          <button className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--color-bg-secondary)] active:scale-95 transition-all duration-150">
            <Bell className="w-5 h-5 text-[var(--color-text-secondary)]" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--color-danger)] animate-pulse" />
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] active:scale-98 transition-all duration-150"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <ChevronDown className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full mt-2 w-48 bg-[var(--color-bg-card)] rounded-xl shadow-lg border border-[var(--color-border)] py-1 z-20 animate-scale-in origin-top-right`}>
                  <div className="px-3 py-2.5 border-b border-[var(--color-border)]">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                      {displayName || t.dashboard.guestUser}
                    </p>
                    {user?.email && (
                      <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                        {user.email}
                      </p>
                    )}
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    {t.settings.title}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {t.auth.logout}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {showSearch && (
        <div className="md:hidden px-5 pb-3 bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] animate-fade-in-down">
          <div className="relative">
            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]`} />
            <input
              type="text"
              placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full h-9 ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'} bg-[var(--color-bg-secondary)] border-none rounded-lg text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]`}
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
}

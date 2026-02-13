'use client';

import { useState } from 'react';
import { Bell, Settings, Search, LogOut, Menu } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserName, useUser, useLogout } from '@/store/useStore';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const userName = useUserName();
  const user = useUser();
  const logout = useLogout();
  const router = useRouter();

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
              placeholder="Search transactions, tools..."
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
          <button
            className="relative"
            style={{ padding: 'var(--spacing-2)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)' }}
          >
            <Bell className="w-5 h-5" />
            <span
              className="absolute"
              style={{
                top: '0.375rem',
                insetInlineEnd: '0.375rem',
                width: '0.5rem',
                height: '0.5rem',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--color-danger-text)',
              }}
            />
          </button>

          {/* Settings - visible on mobile only */}
          <Link
            href="/settings"
            className="lg:hidden"
            style={{ padding: 'var(--spacing-2)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)' }}
          >
            <Settings className="w-5 h-5" />
          </Link>

          {/* Theme Toggle - desktop only */}
          <button
            className="hidden lg:block"
            style={{ padding: 'var(--spacing-2)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
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
                    {displayName || 'User'}
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
                  Settings
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
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

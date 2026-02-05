'use client';

import { useState } from 'react';
import { Bell, Settings, Search, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserName, useUser, useLogout } from '@/store/useStore';

export default function Header() {
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
      className="sticky top-0 z-30 h-16 border-b"
      style={{ 
        backgroundColor: 'var(--theme-bg-card)', 
        borderColor: 'var(--theme-border)' 
      }}
    >

      <div className="h-full flex items-center justify-between px-3 sm:px-6 gap-2 sm:gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <div 
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Search transactions, tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-[var(--radius-input)] focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
              style={{
                backgroundColor: 'var(--theme-bg-input)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text-primary)',
                border: '1px solid var(--theme-border)',
              }}
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button 
            className="relative p-2 rounded-[var(--radius-input)]"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF4444] rounded-[var(--radius-pill)]" />
          </button>

          {/* Settings - visible on mobile only (lg:hidden) */}
          <Link 
            href="/settings"
            className="p-2 rounded-[var(--radius-input)] lg:hidden"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            <Settings className="w-5 h-5" />
          </Link>

          {/* Theme Toggle - hidden on mobile, visible on desktop */}
          <button 
            className="p-2 rounded-[var(--radius-input)] hidden lg:block"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>

          {/* User Avatar */}
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-8 h-8 rounded-[var(--radius-pill)] bg-[#10B981] flex items-center justify-center text-[#FFFFFF] text-sm font-medium"
          >
            {displayName ? displayName.charAt(0).toUpperCase() : 'S'}
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
              <div 
                className="absolute right-6 top-14 mt-2 w-48 rounded-[var(--radius-card)] shadow-lg py-1 z-20"
                style={{
                  backgroundColor: 'var(--theme-bg-card)',
                  border: '1px solid var(--theme-border)',
                }}
              >
                <div 
                  className="px-3 py-2.5 border-b"
                  style={{ borderColor: 'var(--theme-border)' }}
                >
                  <p 
                    className="text-sm font-medium truncate"
                    style={{ color: 'var(--theme-text-primary)' }}
                  >
                    {displayName || 'User'}
                  </p>
                  {user?.email && (
                    <p 
                      className="text-xs truncate mt-0.5"
                      style={{ color: 'var(--theme-text-muted)' }}
                    >
                      {user.email}
                    </p>
                  )}
                </div>
                <Link
                  href="/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm"
                  style={{ color: 'var(--theme-text-secondary)' }}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[#EF4444] hover:bg-[#EF4444]/5"
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

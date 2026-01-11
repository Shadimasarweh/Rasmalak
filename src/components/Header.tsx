'use client';

import { Bell, Settings } from 'lucide-react';
import Link from 'next/link';
import { useUserName, useUser } from '@/store/useStore';
import { useTranslation } from '@/hooks/useTranslation';

interface HeaderProps {
  showGreeting?: boolean;
  title?: string;
}

export default function Header({ showGreeting = true, title }: HeaderProps) {
  const userName = useUserName();
  const user = useUser();
  const { t, language } = useTranslation();

  const displayName = user?.name || userName;

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

  return (
    <header className="sticky top-0 z-40 header-glass">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <Link href="/" className="relative group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
              <span className="text-white font-bold text-xl">{language === 'ar' ? 'ر' : 'R'}</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--color-gold)] border-2 border-[var(--color-bg-primary)]" />
          </Link>

          {showGreeting ? (
            <div className="animate-fadeIn">
              <p className="text-sm text-[var(--color-text-secondary)] font-medium">
                {getGreeting()}
              </p>
              <h1 className="text-lg font-bold text-[var(--color-text-primary)]">
                {displayName || t.dashboard.guestUser}
              </h1>
            </div>
          ) : (
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              {title || t.appName}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button className="relative w-11 h-11 rounded-2xl bg-[var(--color-bg-card)] flex items-center justify-center shadow-sm border border-[var(--color-border-light)] transition-all hover:shadow-md hover:border-[var(--color-border)]">
            <Bell className="w-5 h-5 text-[var(--color-text-secondary)]" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--color-danger)]" />
          </button>
          <Link
            href="/settings"
            className="w-11 h-11 rounded-2xl bg-[var(--color-bg-card)] flex items-center justify-center shadow-sm border border-[var(--color-border-light)] transition-all hover:shadow-md hover:border-[var(--color-border)]"
          >
            <Settings className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </Link>
        </div>
      </div>
    </header>
  );
}

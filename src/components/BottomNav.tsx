'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Receipt,
  Plus,
  GraduationCap,
  MessageCircle,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  // Hide bottom nav on auth pages
  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  const navItems = [
    { id: 'home', path: '/', label: t.nav.home, icon: Home },
    { id: 'transactions', path: '/transactions', label: t.nav.transactions, icon: Receipt },
    { id: 'add', path: '/transactions/new', label: t.nav.add, icon: Plus, isAction: true },
    { id: 'learn', path: '/learn', label: t.nav.learn, icon: GraduationCap },
    { id: 'chat', path: '/chat', label: t.nav.chat, icon: MessageCircle },
  ];

  return (
    <nav 
      className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[var(--color-bg-card)] rounded-full shadow-lg border border-[var(--color-border)] px-4 py-2 z-50" 
      dir="ltr"
    >
      <div className="flex items-center justify-center gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.path ||
            (item.path !== '/' && pathname.startsWith(item.path));
          const Icon = item.icon;

          if (item.isAction) {
            return (
              <Link
                key={item.id}
                href={item.path}
                className="flex items-center justify-center mx-1"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] flex items-center justify-center shadow-md">
                  <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.path}
              className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-colors ${
                isActive
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
              <span className={`text-[10px] mt-0.5 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

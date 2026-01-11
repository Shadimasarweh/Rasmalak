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
    { id: 'learn', path: '/learn', label: t.nav.learn || 'تعلّم', icon: GraduationCap },
    { id: 'chat', path: '/chat', label: 'المستشار', icon: MessageCircle },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bottom-nav pb-safe z-50">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path ||
            (item.path !== '/' && pathname.startsWith(item.path));
          const Icon = item.icon;

          if (item.isAction) {
            return (
              <Link
                key={item.id}
                href={item.path}
                className="flex flex-col items-center justify-center -mt-8"
              >
                <div className="nav-fab w-14 h-14 rounded-2xl flex items-center justify-center">
                  <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.path}
              className={`nav-item flex-1 max-w-[72px] ${
                isActive
                  ? 'nav-item-active'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              <div className={`relative ${isActive ? 'scale-110' : ''} transition-transform`}>
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--color-primary)]" />
                )}
              </div>
              <span className={`text-[10px] mt-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

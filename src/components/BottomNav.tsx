'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  Plus,
  GraduationCap,
  MessageSquareText,
  Settings,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function BottomNav() {
  const pathname = usePathname();
  const { language } = useTranslation();

  // Hide bottom nav on auth pages
  if (pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password') {
    return null;
  }

  const navItems = [
    { 
      id: 'home', 
      path: '/', 
      labelAr: 'الرئيسية', 
      labelEn: 'Home',
      icon: LayoutDashboard 
    },
    { 
      id: 'transactions', 
      path: '/transactions', 
      labelAr: 'المعاملات', 
      labelEn: 'Transactions',
      icon: Receipt 
    },
    { 
      id: 'add', 
      path: '/transactions/new', 
      labelAr: 'إضافة', 
      labelEn: 'Add',
      icon: Plus, 
      isAction: true 
    },
    { 
      id: 'learn', 
      path: '/learn', 
      labelAr: 'تعلّم', 
      labelEn: 'Learn',
      icon: GraduationCap 
    },
    { 
      id: 'settings', 
      path: '/settings', 
      labelAr: 'الإعدادات', 
      labelEn: 'Settings',
      icon: Settings 
    },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-[var(--color-bg-card)] border-t border-[var(--color-border)] z-50 pb-safe" 
    >
      <div className="flex items-center justify-around py-2 px-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path ||
            (item.path !== '/' && pathname.startsWith(item.path));
          const Icon = item.icon;
          const label = language === 'ar' ? item.labelAr : item.labelEn;

          if (item.isAction) {
            return (
              <Link
                key={item.id}
                href={item.path}
                className="flex items-center justify-center -mt-4"
              >
                <div className="w-14 h-14 rounded-full bg-[var(--color-primary)] flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/30">
                  <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.path}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
                isActive
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
              <span className={`text-[10px] mt-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

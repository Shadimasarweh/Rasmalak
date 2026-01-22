'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  Plus,
  GraduationCap,
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
      className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-[var(--color-border-light)] z-50 pb-safe lg:hidden" 
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
                className="flex items-center justify-center -mt-5"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-500/30 active:scale-95 transition-transform duration-150">
                  <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.path}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              <div className={`relative ${isActive ? '' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-500" />
                )}
              </div>
              <span className={`text-[10px] mt-1.5 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

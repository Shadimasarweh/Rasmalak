'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  Plus,
  MessageSquareText,
  Calculator,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function BottomNav() {
  const pathname = usePathname();
  const { language } = useTranslation();

  // Hide bottom nav on auth pages
  if (pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password' || pathname === '/onboarding') {
    return null;
  }

  const navItems = [
    { 
      id: 'dashboard', 
      path: '/', 
      labelAr: 'الرئيسية', 
      labelEn: 'Dashboard',
      icon: LayoutDashboard 
    },
    { 
      id: 'budgets', 
      path: '/transactions', 
      labelAr: 'الميزانيات', 
      labelEn: 'Budgets',
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
      id: 'chat', 
      path: '/chat', 
      labelAr: 'مستشارك', 
      labelEn: 'Mustasharak',
      icon: MessageSquareText 
    },
    { 
      id: 'tools', 
      path: '/tools', 
      labelAr: 'الأدوات', 
      labelEn: 'Tools',
      icon: Calculator 
    },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe lg:hidden"
      style={{ backgroundColor: 'var(--theme-bg-sidebar)' }}
    >
      <div className="flex items-center justify-around py-2 px-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path ||
            (item.path !== '/' && pathname.startsWith(item.path));
          const Icon = item.icon;
          const label = language === 'ar' ? item.labelAr : item.labelEn;

          // Center "Add" action button with emerald color (matching sidebar accent)
          if (item.isAction) {
            return (
              <Link
                key={item.id}
                href={item.path}
                className="flex items-center justify-center -mt-5"
              >
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform duration-150"
                  style={{ backgroundColor: '#10B981' }}
                >
                  <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.path}
              className="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-95"
              style={{
                color: isActive ? '#10B981' : 'rgba(255, 255, 255, 0.7)',
              }}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                {isActive && (
                  <div 
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ backgroundColor: '#10B981' }}
                  />
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

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  GraduationCap,
  Calculator,
  MessageSquareText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useUserName, useUser, useLogout } from '@/store/useStore';

const navItems = [
  { 
    id: 'dashboard', 
    path: '/', 
    icon: LayoutDashboard, 
    labelAr: 'الرئيسية', 
    labelEn: 'Dashboard' 
  },
  { 
    id: 'transactions', 
    path: '/transactions', 
    icon: Receipt, 
    labelAr: 'المعاملات', 
    labelEn: 'Transactions' 
  },
  { 
    id: 'learn', 
    path: '/learn', 
    icon: GraduationCap, 
    labelAr: 'تعلّم', 
    labelEn: 'Learn' 
  },
  { 
    id: 'chat', 
    path: '/chat', 
    icon: MessageSquareText, 
    labelAr: 'المستشار', 
    labelEn: 'Advisor' 
  },
  { 
    id: 'calculators', 
    path: '/calculators', 
    icon: Calculator, 
    labelAr: 'الحاسبات', 
    labelEn: 'Tools' 
  },
];

const bottomNavItems = [
  { 
    id: 'settings', 
    path: '/settings', 
    icon: Settings, 
    labelAr: 'الإعدادات', 
    labelEn: 'Settings' 
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { language, isRTL } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  const userName = useUserName();
  const user = useUser();
  const logout = useLogout();
  const displayName = user?.name || userName || (language === 'ar' ? 'مستخدم' : 'User');

  const ToggleIcon = isRTL
    ? (isExpanded ? ChevronRight : ChevronLeft)
    : (isExpanded ? ChevronLeft : ChevronRight);

  // Get initials for avatar
  const getInitials = (name: string) => {
    if (!name) return isRTL ? 'ر' : 'R';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <aside
      className={`
        sticky top-0 h-screen flex-shrink-0
        bg-[var(--sidebar-bg)]
        flex flex-col
        transition-all duration-300 ease-in-out
        hidden lg:flex
        ${isExpanded ? 'w-60' : 'w-[72px]'}
      `}
    >
      {/* Logo */}
      <div className={`h-16 flex items-center border-b border-[var(--sidebar-border)] ${isExpanded ? 'px-4 gap-3' : 'justify-center'}`}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center shadow-lg flex-shrink-0">
          <span className="text-white font-bold text-lg">ر</span>
        </div>
        {isExpanded && (
          <div className="animate-fadeIn">
            <span className="text-white font-semibold text-base">Rasmalak</span>
            <span className="text-[var(--color-primary)] font-semibold text-base"> AI</span>
          </div>
        )}
      </div>

      {/* User Profile Section */}
      <div className={`border-b border-[var(--sidebar-border)] ${isExpanded ? 'p-3' : 'p-2'}`}>
        <div className={`
          flex items-center rounded-xl transition-colors
          ${isExpanded ? 'gap-3 p-2.5 bg-[var(--sidebar-bg-hover)]' : 'justify-center p-2'}
        `}>
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center text-white font-medium text-sm shadow-md">
              {getInitials(displayName)}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[var(--sidebar-bg)]" />
          </div>
          {isExpanded && (
            <div className="flex-1 min-w-0 animate-fadeIn">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs text-[var(--sidebar-text)] truncate">
                {user?.email || (language === 'ar' ? 'حساب شخصي' : 'Personal Account')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-3 space-y-1 overflow-y-auto ${isExpanded ? 'px-3' : 'px-2'}`}>
        {/* Section Label */}
        {isExpanded && (
          <p className="px-3 py-2 text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider">
            {language === 'ar' ? 'القائمة' : 'Menu'}
          </p>
        )}

        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          const label = language === 'ar' ? item.labelAr : item.labelEn;

          return (
            <Link
              key={item.id}
              href={item.path}
              className={`
                flex items-center min-h-[42px] rounded-lg
                transition-all duration-150
                ${isExpanded ? 'gap-3 px-3' : 'justify-center px-0'}
                ${active
                  ? 'bg-[var(--sidebar-bg-active)] text-[var(--color-primary)]'
                  : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-bg-hover)] hover:text-white'
                }
              `}
              title={!isExpanded ? label : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'stroke-[2px]' : ''}`} />
              {isExpanded && (
                <span className={`text-sm truncate ${active ? 'font-medium' : ''}`}>{label}</span>
              )}
              {active && isExpanded && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className={`border-t border-[var(--sidebar-border)] py-3 ${isExpanded ? 'px-3' : 'px-2'}`}>
        {bottomNavItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          const label = language === 'ar' ? item.labelAr : item.labelEn;

          return (
            <Link
              key={item.id}
              href={item.path}
              className={`
                flex items-center min-h-[42px] rounded-lg
                transition-all duration-150
                ${isExpanded ? 'gap-3 px-3' : 'justify-center px-0'}
                ${active
                  ? 'bg-[var(--sidebar-bg-active)] text-[var(--color-primary)]'
                  : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-bg-hover)] hover:text-white'
                }
              `}
              title={!isExpanded ? label : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'stroke-[2px]' : ''}`} />
              {isExpanded && (
                <span className={`text-sm truncate ${active ? 'font-medium' : ''}`}>{label}</span>
              )}
            </Link>
          );
        })}

        {/* Logout Button */}
        <button
          onClick={() => logout()}
          className={`
            w-full flex items-center min-h-[42px] rounded-lg
            transition-all duration-150 mt-1
            text-[var(--sidebar-text)] hover:bg-red-500/10 hover:text-red-400
            ${isExpanded ? 'gap-3 px-3' : 'justify-center px-0'}
          `}
          title={!isExpanded ? (language === 'ar' ? 'تسجيل الخروج' : 'Logout') : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isExpanded && (
            <span className="text-sm truncate">
              {language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
            </span>
          )}
        </button>
      </div>

      {/* Toggle Button */}
      <div className={`border-t border-[var(--sidebar-border)] ${isExpanded ? 'p-3' : 'p-2'}`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`
            w-full flex items-center justify-center min-h-[40px] rounded-lg
            text-[var(--sidebar-text)] hover:bg-[var(--sidebar-bg-hover)] hover:text-white
            transition-all duration-150
          `}
          aria-label={isExpanded ? (language === 'ar' ? 'طي القائمة' : 'Collapse') : (language === 'ar' ? 'توسيع القائمة' : 'Expand')}
        >
          <ToggleIcon className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}

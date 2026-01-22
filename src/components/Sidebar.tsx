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
  Users,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useUserName, useUser, useLogout, useOnboardingData } from '@/store/useStore';

const navItems = [
  { 
    id: 'dashboard', 
    path: '/', 
    icon: LayoutDashboard, 
    labelAr: 'الرئيسية', 
    labelEn: 'Dashboard',
    smeOnly: false,
  },
  { 
    id: 'transactions', 
    path: '/transactions', 
    icon: Receipt, 
    labelAr: 'المعاملات', 
    labelEn: 'Transactions',
    smeOnly: false,
  },
  { 
    id: 'learn', 
    path: '/learn', 
    icon: GraduationCap, 
    labelAr: 'تعلّم', 
    labelEn: 'Learn',
    smeOnly: false,
  },
  { 
    id: 'chat', 
    path: '/chat', 
    icon: MessageSquareText, 
    labelAr: 'مستشارك', 
    labelEn: 'Mustasharak',
    smeOnly: false,
  },
  { 
    id: 'calculators', 
    path: '/calculators', 
    icon: Calculator, 
    labelAr: 'الحاسبات', 
    labelEn: 'Tools',
    smeOnly: false,
  },
  { 
    id: 'community', 
    path: '/community', 
    icon: Users, 
    labelAr: 'المجتمع', 
    labelEn: 'Community',
    smeOnly: true,
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
  const onboardingData = useOnboardingData();
  const displayName = user?.name || userName || (language === 'ar' ? 'مستخدم' : 'User');
  
  const isSmeUser = onboardingData?.segment === 'sme' || onboardingData?.segment === 'self_employed';
  const visibleNavItems = navItems.filter(item => !item.smeOnly || isSmeUser);

  const ToggleIcon = isRTL
    ? (isExpanded ? ChevronRight : ChevronLeft)
    : (isExpanded ? ChevronLeft : ChevronRight);

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
        flex flex-col
        transition-all duration-300 ease-out
        hidden lg:flex
        ${isExpanded ? 'w-60' : 'w-[72px]'}
      `}
      style={{
        background: 'var(--gradient-sidebar)',
        boxShadow: isRTL 
          ? '-4px 0 24px rgba(0, 0, 0, 0.15)' 
          : '4px 0 24px rgba(0, 0, 0, 0.15)',
      }}
    >
      {/* Logo */}
      <div className={`h-20 flex items-center border-b border-[var(--sidebar-border)] ${isExpanded ? 'px-5 gap-3' : 'justify-center'}`}>
        <div className="relative">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center shadow-lg flex-shrink-0">
            <span className="text-white font-bold text-xl">ر</span>
          </div>
          {/* Subtle glow behind logo */}
          <div className="absolute inset-0 rounded-xl bg-[var(--color-primary)] blur-xl opacity-30 -z-10" />
        </div>
        {isExpanded && (
          <div className="animate-fade-in">
            <span className="text-white font-semibold text-lg tracking-tight">Rasmalak</span>
            <span className="text-[var(--color-primary-light)] font-semibold text-lg"> AI</span>
          </div>
        )}
      </div>

      {/* User Profile Section */}
      <div className={`border-b border-[var(--sidebar-border)] ${isExpanded ? 'p-4' : 'p-2'}`}>
        <div className={`
          flex items-center rounded-xl transition-all duration-200
          ${isExpanded ? 'gap-3 p-3 bg-white/5 hover:bg-white/8' : 'justify-center p-2'}
        `}>
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center text-white font-semibold text-sm shadow-md">
              {getInitials(displayName)}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#1e293b] animate-pulse" />
          </div>
          {isExpanded && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {user?.email || (language === 'ar' ? 'حساب شخصي' : 'Personal Account')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${isExpanded ? 'px-3' : 'px-2'}`}>
        {isExpanded && (
          <p className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            {language === 'ar' ? 'القائمة الرئيسية' : 'Main Menu'}
          </p>
        )}

        {visibleNavItems.map((item, index) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          const label = language === 'ar' ? item.labelAr : item.labelEn;

          return (
            <Link
              key={item.id}
              href={item.path}
              className={`
                group relative flex items-center min-h-[44px] rounded-xl
                transition-all duration-200 ease-out
                ${isExpanded ? 'gap-3 px-3' : 'justify-center px-0'}
                ${active
                  ? 'bg-[var(--color-primary)]/15 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }
              `}
              style={{ animationDelay: `${index * 30}ms` }}
              title={!isExpanded ? label : undefined}
            >
              {/* Active indicator bar */}
              {active && (
                <div 
                  className={`absolute ${isRTL ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'} top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary)]`}
                />
              )}
              
              <div className={`relative ${active ? '' : 'group-hover:scale-110'} transition-transform duration-200`}>
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[var(--color-primary)]' : ''}`} />
              </div>
              
              {isExpanded && (
                <span className={`text-sm truncate ${active ? 'font-semibold' : 'font-medium'}`}>
                  {label}
                </span>
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
                group relative flex items-center min-h-[44px] rounded-xl
                transition-all duration-200 ease-out
                ${isExpanded ? 'gap-3 px-3' : 'justify-center px-0'}
                ${active
                  ? 'bg-[var(--color-primary)]/15 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }
              `}
              title={!isExpanded ? label : undefined}
            >
              {active && (
                <div 
                  className={`absolute ${isRTL ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'} top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary)]`}
                />
              )}
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[var(--color-primary)]' : ''}`} />
              {isExpanded && (
                <span className={`text-sm truncate ${active ? 'font-semibold' : 'font-medium'}`}>
                  {label}
                </span>
              )}
            </Link>
          );
        })}

        {/* Logout Button */}
        <button
          onClick={() => logout()}
          className={`
            w-full flex items-center min-h-[44px] rounded-xl
            transition-all duration-200 mt-1
            text-slate-400 hover:bg-red-500/10 hover:text-red-400
            ${isExpanded ? 'gap-3 px-3' : 'justify-center px-0'}
          `}
          title={!isExpanded ? (language === 'ar' ? 'تسجيل الخروج' : 'Logout') : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isExpanded && (
            <span className="text-sm font-medium truncate">
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
            w-full flex items-center justify-center min-h-[42px] rounded-xl
            text-slate-400 hover:bg-white/5 hover:text-white
            transition-all duration-200 active:scale-95
          `}
          aria-label={isExpanded ? (language === 'ar' ? 'طي القائمة' : 'Collapse') : (language === 'ar' ? 'توسيع القائمة' : 'Expand')}
        >
          <ToggleIcon className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}

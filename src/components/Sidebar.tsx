'use client';

import { useState, useEffect } from 'react';
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
  X,
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
    id: 'budgets', 
    path: '/transactions', 
    icon: Receipt, 
    labelAr: 'الميزانيات', 
    labelEn: 'Budgets',
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
    id: 'tools', 
    path: '/tools', 
    icon: Calculator, 
    labelAr: 'الأدوات', 
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

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
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

  // Close mobile sidebar on route change
  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

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

  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Logo */}
      <div 
        className={`h-16 flex items-center ${(!isMobile && !isExpanded) ? 'justify-center' : 'px-5 gap-3'}`}
        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}
      >
        <div className="w-8 h-8 rounded-[var(--radius-input)] bg-[#10B981] flex items-center justify-center flex-shrink-0">
          <span className="text-[#FFFFFF] font-bold text-sm">R</span>
        </div>
        {(isMobile || isExpanded) && (
          <span className="text-[#FFFFFF] font-semibold flex-1">
            Rasmalak <span className="text-[#10B981]">AI</span>
          </span>
        )}
        {isMobile && (
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg text-[#FFFFFF]/60 hover:text-[#FFFFFF] hover:bg-[#FFFFFF]/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User Profile Section */}
      <div 
        className={`${(!isMobile && !isExpanded) ? 'p-2' : 'px-4 py-4'}`}
        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}
      >
        <div className={`flex items-center ${(!isMobile && !isExpanded) ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 rounded-[var(--radius-input)] bg-[#10B981]/20 flex items-center justify-center text-[#10B981] font-semibold text-sm flex-shrink-0">
            {getInitials(displayName)}
          </div>
          {(isMobile || isExpanded) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#FFFFFF] truncate">{displayName}</p>
              <p className="text-xs text-[#FFFFFF]/50 truncate">
                {user?.email || (language === 'ar' ? 'حساب شخصي' : 'Free Account')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${(!isMobile && !isExpanded) ? 'px-2' : 'px-3'}`}>
        {(isMobile || isExpanded) && (
          <p className="px-3 py-2 text-[10px] font-semibold text-[#FFFFFF]/40 uppercase tracking-wider">
            {language === 'ar' ? 'القائمة الرئيسية' : 'Main Menu'}
          </p>
        )}

        {visibleNavItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          const label = language === 'ar' ? item.labelAr : item.labelEn;
          const showLabel = isMobile || isExpanded;

          return (
            <Link
              key={item.id}
              href={item.path}
              className={`
                flex items-center rounded-[var(--radius-input)] min-h-[44px]
                transition-colors duration-150
                ${showLabel ? 'gap-3 px-3' : 'justify-center px-0'}
                ${active
                  ? 'bg-[#10B981] text-[#FFFFFF]'
                  : 'text-[#FFFFFF]/70 hover:bg-[#FFFFFF]/5 hover:text-[#FFFFFF]'
                }
              `}
              title={!showLabel ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {showLabel && (
                <span className="text-sm font-medium truncate">{label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div 
        className={`py-3 space-y-1 ${(!isMobile && !isExpanded) ? 'px-2' : 'px-3'}`}
        style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}
      >
        {bottomNavItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          const label = language === 'ar' ? item.labelAr : item.labelEn;
          const showLabel = isMobile || isExpanded;

          return (
            <Link
              key={item.id}
              href={item.path}
              className={`
                flex items-center rounded-[var(--radius-input)] min-h-[44px]
                transition-colors duration-150
                ${showLabel ? 'gap-3 px-3' : 'justify-center px-0'}
                ${active
                  ? 'bg-[#10B981] text-[#FFFFFF]'
                  : 'text-[#FFFFFF]/70 hover:bg-[#FFFFFF]/5 hover:text-[#FFFFFF]'
                }
              `}
              title={!showLabel ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {showLabel && (
                <span className="text-sm font-medium truncate">{label}</span>
              )}
            </Link>
          );
        })}

        {/* Logout Button */}
        <button
          onClick={() => logout()}
          className={`
            w-full flex items-center rounded-[var(--radius-input)] min-h-[44px]
            transition-colors duration-150
            text-[#FFFFFF]/70 hover:bg-[#FFFFFF]/5 hover:text-[#FFFFFF]
            ${(!isMobile && !isExpanded) ? 'justify-center px-0' : 'gap-3 px-3'}
          `}
          title={(!isMobile && !isExpanded) ? (language === 'ar' ? 'تسجيل الخروج' : 'Logout') : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {(isMobile || isExpanded) && (
            <span className="text-sm font-medium truncate">
              {language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
            </span>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar - always visible on lg+ */}
      <aside
        className={`
          sticky top-0 h-screen flex-shrink-0
          flex flex-col
          transition-all duration-300 ease-out
          hidden lg:flex
          ${isExpanded ? 'w-60' : 'w-[72px]'}
        `}
        style={{ backgroundColor: 'var(--theme-bg-sidebar)' }}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile Sidebar Drawer - overlay on small screens */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/50 lg:hidden"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <aside
            className="fixed inset-y-0 z-[70] w-72 flex flex-col lg:hidden"
            style={{
              backgroundColor: 'var(--theme-bg-sidebar)',
              [isRTL ? 'right' : 'left']: 0,
            }}
          >
            {sidebarContent(true)}
          </aside>
        </>
      )}
    </>
  );
}

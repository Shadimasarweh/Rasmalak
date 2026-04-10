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
  Briefcase,
  X,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useUserName, useUser, useLogout, useOnboardingData } from '@/store/useStore';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { id: 'dashboard', path: '/', icon: LayoutDashboard, labelAr: 'الرئيسية', labelEn: 'Dashboard', smeOnly: false },
  { id: 'budgets', path: '/transactions', icon: Receipt, labelAr: 'الميزانيات', labelEn: 'Budgets', smeOnly: false },
  { id: 'learn', path: '/learn', icon: GraduationCap, labelAr: 'تعلّم', labelEn: 'Learn', smeOnly: false },
  { id: 'chat', path: '/chat', icon: MessageSquareText, labelAr: 'مستشارك', labelEn: 'Mustasharak', smeOnly: false },
  { id: 'tools', path: '/tools', icon: Calculator, labelAr: 'الأدوات', labelEn: 'Tools', smeOnly: false },
  { id: 'community', path: '/community', icon: Users, labelAr: 'المجتمع', labelEn: 'Community', smeOnly: true },
  { id: 'crm', path: '/crm', icon: Briefcase, labelAr: 'إدارة العملاء', labelEn: 'CRM', smeOnly: false, crmOnly: true },
];

const bottomNavItems = [
  { id: 'settings', path: '/settings', icon: Settings, labelAr: 'الإعدادات', labelEn: 'Settings' },
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
  const [isCrmUser, setIsCrmUser] = useState(false);
  const authUser = useAuthStore((state) => state.user);

  // Check if user belongs to any org (for crmOnly nav gating)
  useEffect(() => {
    const checkCrmAccess = async () => {
      if (!authUser) { setIsCrmUser(false); return; }
      try {
        const { data, error } = await supabase
          .from('org_members')
          .select('id')
          .eq('user_id', authUser.id)
          .eq('is_active', true)
          .limit(1);
        if (!error && data && data.length > 0) {
          setIsCrmUser(true);
        }
      } catch {
        // Silently fail — CRM link just won't show
      }
    };
    checkCrmAccess();
  }, [authUser]);

  const visibleNavItems = navItems.filter(item => {
    if ((item as Record<string, unknown>).crmOnly) return isCrmUser;
    if (item.smeOnly) return isSmeUser;
    return true;
  });

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
        className={`h-16 flex items-center ${(!isMobile && !isExpanded) ? 'justify-center' : 'gap-3'}`}
        style={{
          borderBottom: '1px solid var(--color-sidebar-border)',
          paddingInline: (!isMobile && !isExpanded) ? undefined : 'var(--spacing-5)',
        }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: '2rem',
            height: '2rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent-growth)',
          }}
        >
          <span style={{ color: 'var(--color-sidebar-text)', fontWeight: 700, fontSize: '0.875rem' }}>R</span>
        </div>
        {(isMobile || isExpanded) && (
          <span style={{ color: 'var(--color-sidebar-text)', fontWeight: 600 }}>
            Rasmalak <span style={{ color: 'var(--color-accent-growth)' }}>AI</span>
          </span>
        )}
        {isMobile && (
          <button
            onClick={onMobileClose}
            style={{ color: 'var(--color-sidebar-text-dim)' }}
            className="p-1.5 rounded-lg transition-colors"
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--color-sidebar-text)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-sidebar-text-dim)'}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User Profile Section */}
      <div
        style={{
          borderBottom: '1px solid var(--color-sidebar-border)',
          padding: (!isMobile && !isExpanded) ? 'var(--spacing-2)' : 'var(--spacing-4)',
        }}
      >
        <div className={`flex items-center ${(!isMobile && !isExpanded) ? 'justify-center' : 'gap-3'}`}>
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-accent-growth-subtle)',
              color: 'var(--color-accent-growth)',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            {getInitials(displayName)}
          </div>
          {(isMobile || isExpanded) && (
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-sidebar-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-sidebar-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email || (language === 'ar' ? 'حساب شخصي' : 'Free Account')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto"
        style={{
          paddingBlock: 'var(--spacing-4)',
          paddingInline: (!isMobile && !isExpanded) ? 'var(--spacing-2)' : 'var(--spacing-3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-1)',
        }}
      >
        {(isMobile || isExpanded) && (
          <p style={{
            paddingInline: 'var(--spacing-3)',
            paddingBlock: 'var(--spacing-2)',
            fontSize: '0.625rem',
            fontWeight: 600,
            color: 'var(--color-sidebar-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
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
              className="transition-colors duration-150"
              style={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: 'var(--radius-md)',
                minHeight: '2.75rem',
                gap: showLabel ? 'var(--spacing-3)' : undefined,
                paddingInline: showLabel ? 'var(--spacing-3)' : undefined,
                justifyContent: showLabel ? undefined : 'center',
                background: active ? 'var(--color-sidebar-active)' : 'transparent',
                color: active ? 'var(--color-sidebar-text)' : 'var(--color-sidebar-text-dim)',
              }}
              title={!showLabel ? label : undefined}
              onMouseOver={(e) => { if (!active) e.currentTarget.style.background = 'var(--color-sidebar-hover)'; e.currentTarget.style.color = 'var(--color-sidebar-text)'; }}
              onMouseOut={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = active ? 'var(--color-sidebar-text)' : 'var(--color-sidebar-text-dim)'; }}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {showLabel && (
                <span style={{ fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div
        style={{
          borderTop: '1px solid var(--color-sidebar-border)',
          paddingBlock: 'var(--spacing-3)',
          paddingInline: (!isMobile && !isExpanded) ? 'var(--spacing-2)' : 'var(--spacing-3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-1)',
        }}
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
              className="transition-colors duration-150"
              style={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: 'var(--radius-md)',
                minHeight: '2.75rem',
                gap: showLabel ? 'var(--spacing-3)' : undefined,
                paddingInline: showLabel ? 'var(--spacing-3)' : undefined,
                justifyContent: showLabel ? undefined : 'center',
                background: active ? 'var(--color-sidebar-active)' : 'transparent',
                color: active ? 'var(--color-sidebar-text)' : 'var(--color-sidebar-text-dim)',
              }}
              title={!showLabel ? label : undefined}
              onMouseOver={(e) => { if (!active) e.currentTarget.style.background = 'var(--color-sidebar-hover)'; e.currentTarget.style.color = 'var(--color-sidebar-text)'; }}
              onMouseOut={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = active ? 'var(--color-sidebar-text)' : 'var(--color-sidebar-text-dim)'; }}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {showLabel && (
                <span style={{ fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
              )}
            </Link>
          );
        })}

        {/* Logout Button */}
        <button
          onClick={() => logout()}
          className="transition-colors duration-150"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            borderRadius: 'var(--radius-md)',
            minHeight: '2.75rem',
            gap: (!mobileOpen && !isExpanded) ? undefined : 'var(--spacing-3)',
            paddingInline: (!mobileOpen && !isExpanded) ? undefined : 'var(--spacing-3)',
            justifyContent: (!mobileOpen && !isExpanded) ? 'center' : undefined,
            background: 'transparent',
            color: 'var(--color-sidebar-text-dim)',
            border: 'none',
            cursor: 'pointer',
          }}
          title={(!mobileOpen && !isExpanded) ? (language === 'ar' ? 'تسجيل الخروج' : 'Logout') : undefined}
          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--color-sidebar-hover)'; e.currentTarget.style.color = 'var(--color-sidebar-text)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-sidebar-text-dim)'; }}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {(mobileOpen || isExpanded) && (
            <span style={{ fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
            </span>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="sticky top-0 h-screen flex-shrink-0 flex-col transition-all duration-300 ease-out hidden lg:flex"
        style={{
          width: isExpanded ? '15rem' : '4.5rem',
          backgroundColor: 'var(--color-sidebar-bg)',
        }}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] lg:hidden"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <aside
            className="fixed inset-y-0 z-[70] flex flex-col lg:hidden"
            style={{
              width: '18rem',
              backgroundColor: 'var(--color-sidebar-bg)',
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

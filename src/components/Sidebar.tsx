'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  Circle,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useUserName, useUser } from '@/store/useStore';

const navItems = [
  { id: 'dashboard', path: '/', icon: LayoutDashboard, labelAr: 'الرئيسية', labelEn: 'Dashboard' },
  { id: 'transactions', path: '/transactions', icon: Receipt, labelAr: 'المعاملات', labelEn: 'Transactions' },
  { id: 'learn', path: '/learn', icon: GraduationCap, labelAr: 'تعلّم', labelEn: 'Learn' },
  { id: 'settings', path: '/settings', icon: Settings, labelAr: 'الإعدادات', labelEn: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { language, isRTL } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  const userName = useUserName();
  const user = useUser();
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

  return (
    <aside
      className={`
        h-screen flex-shrink-0
        bg-[var(--color-primary)]
        flex flex-col
        transition-all duration-300 ease-in-out
        ${isExpanded ? 'w-64' : 'w-20'}
        border-r border-white/10
      `}
    >
      {/* Logo & User Profile */}
      <div className="border-b border-white/10">
        {/* Logo */}
        <div className={`h-16 flex items-center justify-center ${isExpanded ? 'px-4' : ''}`}>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">{isRTL ? 'ر' : 'R'}</span>
          </div>
        </div>

        {/* User Profile Section */}
        {isExpanded && (
          <div className="px-4 pb-4 animate-fadeIn">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                  {getInitials(displayName)}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[var(--color-primary)] shadow-sm">
                  <Circle className="w-full h-full fill-emerald-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                <p className="text-xs text-white/60 truncate">{language === 'ar' ? 'متصل' : 'Online'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${isExpanded ? 'px-3' : 'px-0'}`}>
        {navItems.map((item) => {
          const isActive = pathname === item.path || 
            (item.path !== '/' && pathname.startsWith(item.path));
          const Icon = item.icon;
          const label = language === 'ar' ? item.labelAr : item.labelEn;

          return (
            <Link
              key={item.id}
              href={item.path}
              className={`
                flex items-center min-h-[44px] rounded-xl
                transition-all duration-200
                ${isExpanded ? 'gap-3 px-3' : 'justify-center px-0'}
                ${isActive
                  ? 'bg-white/20 text-white shadow-lg shadow-black/10'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                }
              `}
              title={!isExpanded ? label : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'stroke-[2.5px]' : ''}`} />
              {isExpanded && (
                <span className="text-sm font-medium truncate">{label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Toggle Button */}
      <div className={`border-t border-white/10 ${isExpanded ? 'p-3' : 'p-0'}`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full flex items-center justify-center min-h-[44px] rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors ${isExpanded ? '' : 'mx-auto'}`}
          aria-label={isExpanded ? (language === 'ar' ? 'طي القائمة' : 'Collapse menu') : (language === 'ar' ? 'توسيع القائمة' : 'Expand menu')}
        >
          <ToggleIcon className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}

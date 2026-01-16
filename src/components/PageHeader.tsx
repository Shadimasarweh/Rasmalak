'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Show back button (default: false) */
  showBack?: boolean;
  /** Custom back URL (default: "/") */
  backUrl?: string;
  /** Right-side actions (buttons, icons, etc.) */
  actions?: ReactNode;
  /** Optional toolbar row below the header (e.g., search bar, filters) */
  toolbar?: ReactNode;
}

/**
 * PageHeader - Consistent page header for desktop dashboard
 * 
 * Features:
 * - Title with optional back button (RTL/LTR aware)
 * - Right-side actions area (never overlaps title)
 * - Optional toolbar row for search/filters (sits below header row)
 * - Sticky glass effect
 * - Desktop padding (px-6)
 */
export default function PageHeader({ 
  title, 
  showBack = false, 
  backUrl = '/',
  actions,
  toolbar,
}: PageHeaderProps) {
  const { isRTL } = useTranslation();
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <header className="sticky top-0 z-40 header-glass">
      {/* Main header row: title + actions */}
      <div className="flex items-center justify-between px-6 py-5 gap-6">
        {/* Left side: Back button (optional) + Title */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {showBack && (
            <Link
              href={backUrl}
              className="flex-shrink-0 w-11 h-11 rounded-2xl bg-[var(--color-bg-card)] flex items-center justify-center shadow-sm border border-[var(--color-border-light)] transition-all hover:shadow-md hover:border-[var(--color-border)]"
            >
              <BackArrow className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </Link>
          )}
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] truncate">
            {title}
          </h1>
        </div>

        {/* Right side: Actions (never overlaps title due to flex gap) */}
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Toolbar row (search, filters, etc.) - separate row below header */}
      {toolbar && (
        <div className="px-6 pb-4">
          {toolbar}
        </div>
      )}
    </header>
  );
}

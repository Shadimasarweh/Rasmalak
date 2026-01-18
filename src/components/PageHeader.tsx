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
 * - Clean white header with subtle border
 * - Uses page-container for consistent gutters
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
    <header className="sticky top-0 z-40 bg-[var(--color-bg-primary)]/95 backdrop-blur-sm border-b border-[var(--color-border)]">
      {/* Main header row: title + actions */}
      <div className="page-container">
        <div className="flex items-center justify-between py-4 gap-6">
          {/* Left side: Back button (optional) + Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {showBack && (
              <Link
                href={backUrl}
                className="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--color-bg-card)] flex items-center justify-center border border-[var(--color-border)] transition-all hover:border-[var(--color-border-dark)] hover:shadow-sm"
              >
                <BackArrow className="w-4 h-4 text-[var(--color-text-secondary)]" />
              </Link>
            )}
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)] truncate">
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
          <div className="pb-4">
            {toolbar}
          </div>
        )}
      </div>
    </header>
  );
}

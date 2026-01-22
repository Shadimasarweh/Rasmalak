'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle (muted, smaller) */
  subtitle?: string;
  /** Show back button (default: false) */
  showBack?: boolean;
  /** Custom back URL (default: "/") */
  backUrl?: string;
  /** Right-side actions (buttons, icons, etc.) */
  actions?: ReactNode;
  /** Optional toolbar row below the header (e.g., search bar, filters) */
  toolbar?: ReactNode;
  /** Compact mode for minimal headers (default: false) */
  compact?: boolean;
}

/**
 * PageHeader - Consistent local page header
 * 
 * Features:
 * - Title with optional subtitle and back button (RTL/LTR aware)
 * - Right-side actions area
 * - Optional toolbar row for search/filters
 * - Does NOT stick — global header is sticky
 */
export default function PageHeader({ 
  title, 
  subtitle,
  showBack = false, 
  backUrl = '/',
  actions,
  toolbar,
  compact = false,
}: PageHeaderProps) {
  const { isRTL } = useTranslation();
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <header className={`bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] ${compact ? 'py-3' : 'py-5'}`}>
      <div className="page-container">
        {/* Main header row: title + actions */}
        <div className="flex items-center justify-between gap-4 animate-fade-in">
          {/* Left side: Back button (optional) + Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {showBack && (
              <Link
                href={backUrl}
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 border border-[var(--color-border)] hover:border-[var(--color-border-dark)] hover:shadow-sm transition-all duration-200 active:scale-95"
              >
                <BackArrow className="w-4 h-4 text-[var(--color-text-secondary)]" />
              </Link>
            )}
            <div className="min-w-0">
              <h1 className={`font-bold text-[var(--color-text-primary)] truncate tracking-tight ${compact ? 'text-lg' : 'text-2xl'}`}>
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mt-0.5 font-medium">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right side: Actions */}
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>

        {/* Toolbar row (search, filters, etc.) */}
        {toolbar && (
          <div className="mt-5">
            {toolbar}
          </div>
        )}
      </div>
    </header>
  );
}

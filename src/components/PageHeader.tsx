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
  /** Hero mode with gradient background (default: false) */
  hero?: boolean;
}

/**
 * PageHeader - Consistent page header with visual energy
 * 
 * The header serves as the "visual heartbeat" of each page:
 * - Provides tonal depth and energy at the top
 * - Everything below remains calmer
 * - Creates a recognizable, consistent identity across pages
 */
export default function PageHeader({ 
  title, 
  subtitle,
  showBack = false, 
  backUrl = '/',
  actions,
  toolbar,
  compact = false,
  hero = false,
}: PageHeaderProps) {
  const { isRTL } = useTranslation();
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  // Hero mode: dark gradient with subtle depth
  if (hero) {
    return (
      <header className="relative overflow-hidden">
        {/* Gradient background - the visual energy source */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800" />
        
        {/* Subtle ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 1) 0%, transparent 70%)' }}
          />
          <div 
            className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, rgba(245, 158, 11, 1) 0%, transparent 70%)' }}
          />
        </div>

        <div className={`relative page-container ${compact ? 'py-4' : 'py-6'}`}>
          {/* Main header row */}
          <div className="flex items-center justify-between gap-4">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {showBack && (
                <Link
                  href={backUrl}
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 hover:border-white/20 transition-all active:scale-95"
                >
                  <BackArrow className="w-4 h-4 text-white/80" />
                </Link>
              )}
              <div className="min-w-0">
                <h1 className={`font-semibold text-white truncate tracking-tight ${compact ? 'text-lg' : 'text-xl'}`}>
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm text-slate-400 mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            {actions && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {actions}
              </div>
            )}
          </div>

          {/* Toolbar */}
          {toolbar && (
            <div className="mt-5">
              {toolbar}
            </div>
          )}
        </div>
      </header>
    );
  }

  // Standard mode: warm gradient with subtle tonal depth
  return (
    <header className="relative overflow-hidden">
      {/* Subtle gradient background - warm, confident */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg-card)] to-[var(--color-bg-primary)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--color-primary)]/[0.02] to-transparent" />
      
      {/* Bottom border with subtle gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />

      <div className={`relative page-container ${compact ? 'py-4' : 'py-5'}`}>
        {/* Main header row */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {showBack && (
              <Link
                href={backUrl}
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-bg-card)] transition-all active:scale-95"
              >
                <BackArrow className="w-4 h-4 text-[var(--color-text-secondary)]" />
              </Link>
            )}
            <div className="min-w-0">
              <h1 className={`font-semibold text-[var(--color-text-primary)] truncate tracking-tight ${compact ? 'text-lg' : 'text-xl'}`}>
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>

        {/* Toolbar */}
        {toolbar && (
          <div className="mt-5">
            {toolbar}
          </div>
        )}
      </div>
    </header>
  );
}

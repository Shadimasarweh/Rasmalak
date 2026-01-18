'use client';

import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  /** Additional classes for custom styling */
  className?: string;
  /** Whether to remove max-width constraint (for full-bleed layouts) */
  fullWidth?: boolean;
  /** Whether to apply app-surface background (default: true) */
  withSurface?: boolean;
}

/**
 * PageContainer - Consistent page wrapper with gutters
 * 
 * Provides:
 * - Max-width 1440px centered (via .page-container)
 * - Consistent horizontal padding (24px mobile, 32px desktop)
 * - Top padding for spacing below header (py-6)
 * - Bottom padding for content clearance (pb-24 for FAB clearance)
 * - Vertical spacing between children (space-y-6)
 * - Optional app-surface background for card anchoring
 * - Fade-in animation
 */
export default function PageContainer({ 
  children, 
  className = '',
  fullWidth = false,
  withSurface = true
}: PageContainerProps) {
  return (
    <main className={`w-full py-6 pb-24 space-y-6 animate-fadeInUp ${withSurface ? 'app-surface' : ''} ${fullWidth ? 'px-6 lg:px-8' : 'page-container'} ${className}`}>
      {children}
    </main>
  );
}

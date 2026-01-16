'use client';

import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  /** Additional classes for custom styling */
  className?: string;
}

/**
 * PageContainer - Full-width page wrapper
 * 
 * Provides:
 * - Full width (no max-width)
 * - Horizontal padding (px-6)
 * - Top padding for spacing below header (pt-6)
 * - Bottom padding for content clearance (pb-8)
 * - Vertical spacing between children (space-y-6)
 * - Fade-in animation
 */
export default function PageContainer({ 
  children, 
  className = '' 
}: PageContainerProps) {
  return (
    <main className={`w-full px-6 pt-6 pb-8 space-y-6 animate-fadeInUp ${className}`}>
      {children}
    </main>
  );
}

'use client';

import { ReactNode, CSSProperties } from 'react';

interface SectionCardProps {
  children: ReactNode;
  /** Optional title for the section */
  title?: string;
  /** Optional right-side action (link, button, etc.) */
  action?: ReactNode;
  /** Additional classes for custom styling */
  className?: string;
  /** Padding size: 'sm' | 'md' | 'lg' (default: 'md') */
  padding?: 'sm' | 'md' | 'lg';
  /** Use elevated shadow style */
  elevated?: boolean;
  /** Inline styles (for animation delays, etc.) */
  style?: CSSProperties;
}

/**
 * SectionCard - Consistent card surface for dashboard sections (desktop)
 * 
 * Provides:
 * - Rounded corners (radius-2xl)
 * - Border and shadow
 * - Optional title with action
 * - Configurable padding (desktop-sized)
 */
export default function SectionCard({ 
  children, 
  title,
  action,
  className = '',
  padding = 'md',
  elevated = false,
  style,
}: SectionCardProps) {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div 
      className={`
        bg-[var(--color-bg-card)] 
        rounded-2xl 
        border border-[var(--color-border-light)]
        ${elevated ? 'shadow-md' : 'shadow-sm'}
        ${paddingClasses[padding]}
        ${className}
      `}
      style={style}
    >
      {/* Section header with title and action */}
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              {title}
            </h2>
          )}
          {action && (
            <div className="flex-shrink-0">
              {action}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

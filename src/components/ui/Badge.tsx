import { ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-brand-accent text-brand-emerald-dark',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
  neutral: 'bg-brand-bg text-brand-navy/60',
};

export function Badge({
  variant = 'neutral',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center
        px-2.5 py-0.5
        text-sm font-medium
        rounded-[var(--radius-pill)]
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}


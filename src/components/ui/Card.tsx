import { ReactNode } from 'react';

type CardVariant = 'default' | 'small';

interface CardProps {
  variant?: CardVariant;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'p-6 rounded-[var(--radius-card)]',
  small: 'p-4 rounded-[var(--radius-input)]',
};

export function Card({
  variant = 'default',
  header,
  footer,
  children,
  className = '',
}: CardProps) {
  return (
    <div
      className={`
        bg-[#FFFFFF]
        border border-brand-navy/10
        shadow-[var(--shadow-card)]
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {header && (
        <div className="mb-4 pb-4 border-b border-brand-navy/10">{header}</div>
      )}
      {children}
      {footer && (
        <div className="mt-4 pt-4 border-t border-brand-navy/10">{footer}</div>
      )}
    </div>
  );
}


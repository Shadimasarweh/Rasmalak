import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-emerald text-[#FFFFFF] hover:bg-brand-emerald-dark disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'bg-transparent text-brand-navy border border-brand-navy hover:bg-brand-navy/5 disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'bg-transparent text-brand-navy/70 hover:bg-brand-bg disabled:opacity-50 disabled:cursor-not-allowed',
  danger:
    'bg-danger text-[#FFFFFF] hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-2
          font-medium
          rounded-[var(--radius-input)]
          shadow-[var(--shadow-soft)]
          transition-colors duration-150
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-[var(--radius-pill)] animate-spin" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';


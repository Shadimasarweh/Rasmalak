import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = 'text',
      error = false,
      disabled = false,
      leadingIcon,
      trailingIcon,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <div className="relative">
        {leadingIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-navy/40 pointer-events-none">
            {leadingIcon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          className={`
            w-full
            px-4 py-3
            text-base
            bg-[#FFFFFF]
            border
            rounded-[var(--radius-input)]
            transition-colors duration-150
            placeholder:text-brand-navy/40
            ${leadingIcon ? 'pl-10' : ''}
            ${trailingIcon ? 'pr-10' : ''}
            ${
              error
                ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
                : 'border-brand-navy/20 focus:border-brand-emerald focus:ring-2 focus:ring-brand-accent'
            }
            ${disabled ? 'bg-brand-bg text-brand-navy/50 cursor-not-allowed' : ''}
            focus:outline-none
            ${className}
          `}
          {...props}
        />
        {trailingIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-navy/40">
            {trailingIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';


import { ReactNode } from 'react';

type TrendDirection = 'up' | 'down';

interface StatCardProps {
  icon?: ReactNode;
  label: string;
  value: string | number;
  trend?: {
    direction: TrendDirection;
    value?: string;
  };
  className?: string;
}

export function StatCard({
  icon,
  label,
  value,
  trend,
  className = '',
}: StatCardProps) {
  return (
    <div
      className={`
        bg-[#FFFFFF]
        border border-brand-navy/10
        shadow-[var(--shadow-card)]
        rounded-[var(--radius-card)]
        p-4
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-[var(--radius-input)] bg-brand-accent flex items-center justify-center text-brand-emerald">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-brand-navy/60 truncate">{label}</p>
          <p className="text-2xl font-semibold text-brand-navy mt-1">{value}</p>
        </div>
        {trend && (
          <div
            className={`
              flex items-center gap-1 text-sm font-medium
              ${trend.direction === 'up' ? 'text-success' : 'text-danger'}
            `}
          >
            {trend.direction === 'up' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l5-5 5 5" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-5 5-5-5" />
              </svg>
            )}
            {trend.value && <span>{trend.value}</span>}
          </div>
        )}
      </div>
    </div>
  );
}


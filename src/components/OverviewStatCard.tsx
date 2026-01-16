'use client';

import { LucideIcon } from 'lucide-react';

interface OverviewStatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'danger' | 'gold';
}

export default function OverviewStatCard({
  label,
  value,
  icon: Icon,
  trend,
  variant = 'default',
}: OverviewStatCardProps) {
  const iconBgClasses = {
    default: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
    success: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
    danger: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
    gold: 'bg-[var(--color-gold)]/10 text-[var(--color-gold)]',
  };

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBgClasses[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            trend.isPositive 
              ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' 
              : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
          }`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-[var(--color-text-muted)] mb-1">{label}</p>
        <p className="text-lg font-bold text-[var(--color-text-primary)] ltr-nums">{value}</p>
      </div>
    </div>
  );
}



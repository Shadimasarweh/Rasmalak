'use client';

import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/store/useStore';

interface StatsCardProps {
  type: 'income' | 'expense' | 'balance' | 'savings';
  value: number;
  label: string;
  percentage?: number;
}

const config = {
  income: {
    icon: TrendingUp,
    iconClass: 'stat-icon-income',
    valueColor: 'text-[var(--color-success)]',
  },
  expense: {
    icon: TrendingDown,
    iconClass: 'stat-icon-expense',
    valueColor: 'text-[var(--color-danger)]',
  },
  balance: {
    icon: Wallet,
    iconClass: 'stat-icon-balance',
    valueColor: 'text-[var(--color-primary)]',
  },
  savings: {
    icon: PiggyBank,
    iconClass: 'stat-icon-savings',
    valueColor: 'text-[var(--color-gold)]',
  },
};

export default function StatsCard({ type, value, label, percentage }: StatsCardProps) {
  const currency = useCurrency();
  const { icon: Icon, iconClass, valueColor } = config[type];

  return (
    <div className="card card-elevated group">
      <div className="flex items-start justify-between mb-3">
        <div className={`stat-icon ${iconClass} transition-transform group-hover:scale-110`}>
          <Icon className="w-5 h-5" />
        </div>
        {percentage !== undefined && (
          <span className={`badge ${
            percentage >= 0 ? 'badge-success' : 'badge-danger'
          }`}>
            {percentage >= 0 ? '+' : ''}{percentage.toFixed(1)}%
          </span>
        )}
      </div>

      <p className="text-sm text-[var(--color-text-secondary)] mb-1 font-medium">{label}</p>
      <p className={`text-xl font-bold ${valueColor} ltr-nums`}>
        {formatCurrency(value, currency)}
      </p>
    </div>
  );
}

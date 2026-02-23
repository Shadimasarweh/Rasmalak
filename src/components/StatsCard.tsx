'use client';

import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
import { useIntl } from 'react-intl';
import { useCurrency, useStore } from '@/store/useStore';
import { styledNum } from '@/components/StyledNumber';

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
  const intl = useIntl();
  const currency = useCurrency();
  const language = useStore((state) => state.language);
  const { icon: Icon, iconClass, valueColor } = config[type];

  // Format percentage with locale-appropriate percent sign
  const formatPercentage = (pct: number) => {
    const formatted = intl.formatNumber(Math.abs(pct), { maximumFractionDigits: 1 });
    const sign = pct >= 0 ? '+' : '-';
    const percentSign = language === 'ar' ? '٪' : '%';
    return `${sign}${formatted}${percentSign}`;
  };

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
            {formatPercentage(percentage)}
          </span>
        )}
      </div>

      <p className="text-sm text-[var(--color-text-secondary)] mb-1 font-medium">{label}</p>
      <p className={`text-xl font-bold ${valueColor} ltr-nums`}>
        {styledNum(intl.formatNumber(value, { style: 'currency', currency }))}
      </p>
    </div>
  );
}

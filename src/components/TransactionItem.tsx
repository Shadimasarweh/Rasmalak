'use client';

import {
  Utensils,
  Car,
  ShoppingBag,
  FileText,
  HeartPulse,
  Gamepad2,
  GraduationCap,
  Home,
  Sparkles,
  MoreHorizontal,
  Briefcase,
  Laptop,
  TrendingUp,
  Building,
  Gift,
  Award,
} from 'lucide-react';
import { useIntl } from 'react-intl';
import { Transaction } from '@/types';
import { getRelativeTime, getCategoryById, convertCurrency } from '@/lib/utils';
import { useCurrency, useBaseCurrency } from '@/store/useStore';
import { useTranslation } from '@/hooks/useTranslation';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  utensils: Utensils,
  car: Car,
  'shopping-bag': ShoppingBag,
  'file-text': FileText,
  'heart-pulse': HeartPulse,
  'gamepad-2': Gamepad2,
  'graduation-cap': GraduationCap,
  home: Home,
  sparkles: Sparkles,
  'more-horizontal': MoreHorizontal,
  briefcase: Briefcase,
  laptop: Laptop,
  'trending-up': TrendingUp,
  building: Building,
  gift: Gift,
  award: Award,
};

interface TransactionItemProps {
  transaction: Transaction;
  onClick?: () => void;
}

export default function TransactionItem({ transaction, onClick }: TransactionItemProps) {
  const intl = useIntl();
  const currency = useCurrency();
  const baseCurrency = useBaseCurrency();
  const { language } = useTranslation();
  const category = getCategoryById(transaction.category);

  const Icon = category ? iconMap[category.icon] || MoreHorizontal : MoreHorizontal;
  const isIncome = transaction.type === 'income';

  const categoryName = language === 'ar' ? category?.nameAr : category?.name;

  // Convert and format amount using intl
  const convertedAmount = convertCurrency(transaction.amount, transaction.currency || baseCurrency, currency);
  const formattedAmount = intl.formatNumber(convertedAmount, { style: 'currency', currency });

  return (
    <button
      onClick={onClick}
      className="transaction-item w-full text-right group"
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
        style={{ backgroundColor: `${category?.color}15` }}
      >
        <Icon className="w-6 h-6" style={{ color: category?.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[var(--color-text-primary)] truncate">
          {categoryName || transaction.category}
        </p>
        <p className="text-sm text-[var(--color-text-secondary)] truncate">
          {transaction.description || getRelativeTime(transaction.date)}
        </p>
      </div>

      <div className="text-left flex-shrink-0">
        <p
          className={`font-bold ltr-nums text-base ${
            isIncome ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
          }`}
        >
          {isIncome ? '+' : '-'}{formattedAmount}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {getRelativeTime(transaction.date)}
        </p>
      </div>
    </button>
  );
}

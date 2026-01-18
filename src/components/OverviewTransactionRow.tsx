'use client';

import {
  Utensils,
  Car,
  ShoppingBag,
  Receipt,
  Heart,
  Film,
  GraduationCap,
  Home,
  User,
  MoreHorizontal,
  Briefcase,
  Laptop,
  TrendingUp,
  Building,
  Gift,
  Award,
} from 'lucide-react';
import { useCurrency } from '@/store/useStore';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface OverviewTransactionRowProps {
  category: string;
  description: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
}

const categoryIcons: Record<string, { icon: typeof Utensils; color: string }> = {
  food: { icon: Utensils, color: '#f97316' },
  transport: { icon: Car, color: '#3b82f6' },
  shopping: { icon: ShoppingBag, color: '#ec4899' },
  bills: { icon: Receipt, color: '#6366f1' },
  health: { icon: Heart, color: '#ef4444' },
  entertainment: { icon: Film, color: '#8b5cf6' },
  education: { icon: GraduationCap, color: '#14b8a6' },
  housing: { icon: Home, color: '#f59e0b' },
  personal: { icon: User, color: '#06b6d4' },
  other: { icon: MoreHorizontal, color: '#64748b' },
  salary: { icon: Briefcase, color: '#10b981' },
  freelance: { icon: Laptop, color: '#22c55e' },
  investments: { icon: TrendingUp, color: '#059669' },
  rental: { icon: Building, color: '#0d9488' },
  gifts: { icon: Gift, color: '#f472b6' },
  bonus: { icon: Award, color: '#fbbf24' },
};

export default function OverviewTransactionRow({
  category,
  description,
  date,
  amount,
  type,
}: OverviewTransactionRowProps) {
  const currency = useCurrency();
  const { t, language } = useTranslation();

  const categoryInfo = categoryIcons[category] || categoryIcons.other;
  const Icon = categoryInfo.icon;
  const categoryName = t.categories[category as keyof typeof t.categories] || category;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return t.common.today;
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return t.common.yesterday;
    }
    return d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="transaction-item">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${categoryInfo.color}12` }}
      >
        <Icon className="w-5 h-5" style={{ color: categoryInfo.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
          {description || categoryName}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{formatDate(date)}</p>
      </div>
      <span
        className={`text-sm font-semibold ltr-nums flex-shrink-0 ${
          type === 'income' ? 'text-[var(--color-success)]' : 'text-[var(--color-text-secondary)]'
        }`}
      >
        {type === 'income' ? '+' : '-'}{formatCurrency(amount, currency)}
      </span>
    </div>
  );
}

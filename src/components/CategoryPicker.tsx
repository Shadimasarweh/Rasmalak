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
import { Category, TransactionType } from '@/types';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
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

interface CategoryPickerProps {
  type: TransactionType;
  selectedCategory: string;
  onSelect: (categoryId: string) => void;
}

export default function CategoryPicker({
  type,
  selectedCategory,
  onSelect,
}: CategoryPickerProps) {
  const { language } = useTranslation();
  const categories = type === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;

  return (
    <div className="grid grid-cols-4 gap-3">
      {categories.map((category) => {
        const Icon = iconMap[category.icon] || MoreHorizontal;
        const isSelected = selectedCategory === category.id;
        const categoryName = language === 'ar' ? category.nameAr : category.name;

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
              isSelected
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-elevated)]'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isSelected ? 'bg-white/20' : ''
              }`}
              style={{
                backgroundColor: isSelected ? undefined : `${category.color}20`,
              }}
            >
              <Icon
                className="w-5 h-5"
                style={{ color: isSelected ? 'white' : category.color }}
              />
            </div>
            <span className={`text-xs font-medium text-center leading-tight ${
              isSelected ? 'text-white' : 'text-[var(--color-text-primary)]'
            }`}>
              {categoryName}
            </span>
          </button>
        );
      })}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Target, Check, PiggyBank, AlertTriangle } from 'lucide-react';
import { useCurrency } from '@/store/useStore';
import { useBudget } from '@/store/budgetStore';
import { useTranslation } from '@/hooks/useTranslation';
import { CURRENCIES, DEFAULT_EXPENSE_CATEGORIES } from '@/lib/constants';
import { styledNum } from '@/components/StyledNumber';

export default function BudgetSettingsPage() {
  const router = useRouter();
  const { t, language, isRTL } = useTranslation();
  const currency = useCurrency();
  const { monthlyBudget, categoryBudgets, saveAll } = useBudget();

  const [tempMonthlyBudget, setTempMonthlyBudget] = useState(monthlyBudget.toString());
  const [tempCategoryBudgets, setTempCategoryBudgets] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);

  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;
  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.[language === 'ar' ? 'symbolAr' : 'symbol'] || currency;

  // Initialize category budgets
  useEffect(() => {
    const initial: Record<string, string> = {};
    DEFAULT_EXPENSE_CATEGORIES.forEach((cat) => {
      initial[cat.id] = categoryBudgets[cat.id]?.toString() || '';
    });
    setTempCategoryBudgets(initial);
  }, [categoryBudgets]);

  const handleSave = async () => {
    const monthly = parseFloat(tempMonthlyBudget) || 0;
    const categories: Record<string, number> = {};
    Object.entries(tempCategoryBudgets).forEach(([categoryId, value]) => {
      const amount = parseFloat(value) || 0;
      if (amount > 0) {
        categories[categoryId] = amount;
      }
    });
    await saveAll(monthly, categories);

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      router.push('/');
    }, 1500);
  };

  const handleReset = () => {
    setTempMonthlyBudget('0');
    const reset: Record<string, string> = {};
    DEFAULT_EXPENSE_CATEGORIES.forEach((cat) => {
      reset[cat.id] = '';
    });
    setTempCategoryBudgets(reset);
  };

  const totalCategoryBudget = Object.values(tempCategoryBudgets).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  );
  const monthlyBudgetValue = parseFloat(tempMonthlyBudget) || 0;
  const hasOverflow = totalCategoryBudget > monthlyBudgetValue && monthlyBudgetValue > 0;

  return (
    <div className="min-h-screen app-surface">
      {/* Header */}
      <div className="bg-[var(--color-bg-card)] border-b border-[var(--color-border)]">
        <div className="page-container">
          <div className="flex items-center gap-4 py-4">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-lg bg-[var(--color-bg-secondary)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <ArrowBack className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
                {t.budget.title}
              </h1>
              <p className="text-sm text-[var(--color-text-muted)]">
                {t.budget.subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="page-container py-6">
        {/* Monthly Budget Card */}
        <div className="bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border)] p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-indigo-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {t.budget.monthlyBudget}
              </h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                {t.budget.monthlyBudgetDesc}
              </p>
            </div>
          </div>

          <div className="relative">
            <span className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-lg font-medium text-[var(--color-text-muted)]`}>
              {currencySymbol}
            </span>
            <input
              type="number"
              value={tempMonthlyBudget}
              onChange={(e) => setTempMonthlyBudget(e.target.value)}
              placeholder="0"
              className={`input ${isRTL ? 'pr-14' : 'pl-14'} text-2xl font-bold h-16`}
            />
          </div>
        </div>

        {/* Category Budgets Card */}
        <div className="bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border)] p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <PiggyBank className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {t.budget.categoryBudgets}
              </h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                {t.budget.categoryBudgetsDesc}
              </p>
            </div>
          </div>

          {/* Warning if category total exceeds monthly */}
          {hasOverflow && (
            <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                <p className="text-sm font-medium">
                  {language === 'ar' 
                    ? 'مجموع ميزانيات الفئات يتجاوز الميزانية الشهرية'
                    : 'Category budgets exceed monthly budget'
                  }
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {DEFAULT_EXPENSE_CATEGORIES.map((category) => (
              <div key={category.id} className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: category.color + '15' }}
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {language === 'ar' ? category.nameAr : category.name}
                  </p>
                </div>
                <div className="relative w-32">
                  <span className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)]`}>
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    value={tempCategoryBudgets[category.id] || ''}
                    onChange={(e) => setTempCategoryBudgets({
                      ...tempCategoryBudgets,
                      [category.id]: e.target.value,
                    })}
                    placeholder="0"
                    className={`input ${isRTL ? 'pr-10' : 'pl-10'} py-2 text-sm font-medium`}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 pt-4 border-t border-[var(--color-border-light)] flex items-center justify-between">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              {language === 'ar' ? 'المجموع' : 'Total'}
            </p>
            <p className={`text-lg font-bold ltr-nums ${hasOverflow ? 'text-amber-600' : 'text-[var(--color-text-primary)]'}`}>
              {styledNum(new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US').format(totalCategoryBudget))} {currencySymbol}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 btn btn-secondary"
          >
            {t.budget.reset}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaved}
            className={`flex-1 btn btn-primary flex items-center justify-center gap-2 ${
              isSaved ? 'bg-indigo-500' : ''
            }`}
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4" />
                {t.budget.saved}
              </>
            ) : (
              t.budget.save
            )}
          </button>
        </div>
      </div>
    </div>
  );
}



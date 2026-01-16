import { Category } from '@/types';

// Default Categories
export const DEFAULT_EXPENSE_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food & Dining', nameAr: 'الطعام والمطاعم', icon: 'utensils', color: '#F59E0B', type: 'expense' },
  { id: 'transport', name: 'Transportation', nameAr: 'المواصلات', icon: 'car', color: '#3B82F6', type: 'expense' },
  { id: 'shopping', name: 'Shopping', nameAr: 'التسوق', icon: 'shopping-bag', color: '#EC4899', type: 'expense' },
  { id: 'bills', name: 'Bills & Utilities', nameAr: 'الفواتير والخدمات', icon: 'file-text', color: '#8B5CF6', type: 'expense' },
  { id: 'health', name: 'Health & Medical', nameAr: 'الصحة والطب', icon: 'heart-pulse', color: '#EF4444', type: 'expense' },
  { id: 'entertainment', name: 'Entertainment', nameAr: 'الترفيه', icon: 'gamepad-2', color: '#10B981', type: 'expense' },
  { id: 'education', name: 'Education', nameAr: 'التعليم', icon: 'graduation-cap', color: '#6366F1', type: 'expense' },
  { id: 'housing', name: 'Housing & Rent', nameAr: 'السكن والإيجار', icon: 'home', color: '#14B8A6', type: 'expense' },
  { id: 'personal', name: 'Personal Care', nameAr: 'العناية الشخصية', icon: 'sparkles', color: '#F472B6', type: 'expense' },
  { id: 'other-expense', name: 'Other', nameAr: 'أخرى', icon: 'more-horizontal', color: '#6B7280', type: 'expense' },
];

export const DEFAULT_INCOME_CATEGORIES: Category[] = [
  { id: 'salary', name: 'Salary', nameAr: 'الراتب', icon: 'briefcase', color: '#10B981', type: 'income' },
  { id: 'freelance', name: 'Freelance', nameAr: 'العمل الحر', icon: 'laptop', color: '#3B82F6', type: 'income' },
  { id: 'investment', name: 'Investments', nameAr: 'الاستثمارات', icon: 'trending-up', color: '#8B5CF6', type: 'income' },
  { id: 'rental', name: 'Rental Income', nameAr: 'دخل الإيجار', icon: 'building', color: '#F59E0B', type: 'income' },
  { id: 'gift', name: 'Gifts', nameAr: 'الهدايا', icon: 'gift', color: '#EC4899', type: 'income' },
  { id: 'bonus', name: 'Bonus', nameAr: 'المكافآت', icon: 'award', color: '#14B8A6', type: 'income' },
  { id: 'other-income', name: 'Other', nameAr: 'أخرى', icon: 'more-horizontal', color: '#6B7280', type: 'income' },
];

export const ALL_CATEGORIES = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];

// Currency Options
export const CURRENCIES = [
  { code: 'SAR', name: 'Saudi Riyal', nameAr: 'ريال سعودي', symbol: 'SAR', symbolAr: 'ر.س' },
  { code: 'AED', name: 'UAE Dirham', nameAr: 'درهم إماراتي', symbol: 'AED', symbolAr: 'د.إ' },
  { code: 'KWD', name: 'Kuwaiti Dinar', nameAr: 'دينار كويتي', symbol: 'KWD', symbolAr: 'د.ك' },
  { code: 'BHD', name: 'Bahraini Dinar', nameAr: 'دينار بحريني', symbol: 'BHD', symbolAr: 'د.ب' },
  { code: 'QAR', name: 'Qatari Riyal', nameAr: 'ريال قطري', symbol: 'QAR', symbolAr: 'ر.ق' },
  { code: 'OMR', name: 'Omani Rial', nameAr: 'ريال عماني', symbol: 'OMR', symbolAr: 'ر.ع' },
  { code: 'JOD', name: 'Jordanian Dinar', nameAr: 'دينار أردني', symbol: 'JOD', symbolAr: 'د.أ' },
  { code: 'EGP', name: 'Egyptian Pound', nameAr: 'جنيه مصري', symbol: 'EGP', symbolAr: 'ج.م' },
  { code: 'IQD', name: 'Iraqi Dinar', nameAr: 'دينار عراقي', symbol: 'IQD', symbolAr: 'د.ع' },
  { code: 'LBP', name: 'Lebanese Pound', nameAr: 'ليرة لبنانية', symbol: 'LBP', symbolAr: 'ل.ل' },
  { code: 'USD', name: 'US Dollar', nameAr: 'دولار أمريكي', symbol: '$', symbolAr: '$' },
  { code: 'EUR', name: 'Euro', nameAr: 'يورو', symbol: '€', symbolAr: '€' },
];

// Default Settings
export const DEFAULT_CURRENCY = 'SAR';
export const DEFAULT_LANGUAGE = 'ar';

// Date Formats
export const DATE_FORMAT = 'yyyy-MM-dd';
export const DISPLAY_DATE_FORMAT = 'dd MMMM yyyy';

// Navigation Items
export const NAV_ITEMS = [
  { id: 'home', path: '/', labelAr: 'الرئيسية', icon: 'home' },
  { id: 'transactions', path: '/transactions', labelAr: 'المعاملات', icon: 'receipt' },
  { id: 'add', path: '/transactions/new', labelAr: 'إضافة', icon: 'plus-circle', isAction: true },
  { id: 'calculators', path: '/calculators', labelAr: 'الحاسبات', icon: 'calculator' },
  { id: 'settings', path: '/settings', labelAr: 'الإعدادات', icon: 'settings' },
];

// Chart Colors
export const CHART_COLORS = [
  '#1B4D3E',
  '#C9A227',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#6366F1',
];

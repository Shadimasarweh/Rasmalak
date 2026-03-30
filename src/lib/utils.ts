import { Transaction, DashboardStats, ChartDataPoint, Category } from '@/types';
import { ALL_CATEGORIES, DEFAULT_CURRENCY, CURRENCIES, EXCHANGE_RATES } from './constants';

// Helper to get transaction's currency (defaults to baseCurrency for old transactions)
function getTransactionCurrency(transaction: Transaction, baseCurrency: string = DEFAULT_CURRENCY): string {
  return transaction.currency || baseCurrency;
}

// Format currency with Arabic locale
export function formatCurrency(amount: number, currencyCode: string = DEFAULT_CURRENCY): string {
  const currency = CURRENCIES.find(c => c.code === currencyCode);
  const formatted = new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  return `${formatted} ${currency?.symbol || currencyCode}`;
}

// Format number with Arabic locale
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ar-SA').format(num);
}

/**
 * Locale-aware number formatting.
 * Arabic → Arabic-Indic numerals (٠١٢٣٤), English → Western (01234).
 */
export function fmtNum(value: number, language: 'ar' | 'en', decimals?: number): string {
  const locale = language === 'ar' ? 'ar-u-nu-arab' : 'en-US';
  const opts: Intl.NumberFormatOptions = {};
  if (decimals != null) {
    opts.minimumFractionDigits = decimals;
    opts.maximumFractionDigits = decimals;
  }
  return new Intl.NumberFormat(locale, opts).format(value);
}

/**
 * Locale-aware percentage formatting.
 * Returns e.g. "٢٥٫٣%" for Arabic or "25.3%" for English.
 */
export function fmtPct(value: number, language: 'ar' | 'en', decimals: number = 1): string {
  return `${fmtNum(value, language, decimals)}%`;
}

/**
 * Locale-aware currency formatting with symbol.
 */
export function fmtCurrencyLocale(amount: number, currencyCode: string, language: 'ar' | 'en'): string {
  const currency = CURRENCIES.find(c => c.code === currencyCode);
  const formatted = fmtNum(Math.abs(amount), language, 2);
  return `${formatted} ${currency?.symbol || currencyCode}`;
}

/**
 * Convert an amount from one currency to another
 * @param amount - The amount to convert
 * @param fromCurrency - The source currency code
 * @param toCurrency - The target currency code
 * @returns The converted amount
 */
export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return amount;
  
  const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
  const toRate = EXCHANGE_RATES[toCurrency] || 1;
  
  // Convert to USD first, then to target currency
  const amountInUSD = amount / fromRate;
  const convertedAmount = amountInUSD * toRate;
  
  return convertedAmount;
}

/**
 * Get the exchange rate between two currencies
 * @param fromCurrency - The source currency code
 * @param toCurrency - The target currency code
 * @returns The exchange rate (1 fromCurrency = X toCurrency)
 */
export function getExchangeRate(fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return 1;
  
  const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
  const toRate = EXCHANGE_RATES[toCurrency] || 1;
  
  return toRate / fromRate;
}

// Format percentage (legacy — prefer fmtPct for locale-aware formatting)
export function formatPercentage(value: number, language: 'ar' | 'en' = 'en'): string {
  return fmtPct(value, language, 1);
}

// Format date in Arabic
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

// Format date short
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ar-SA', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

// Get relative time (e.g., "منذ 3 أيام")
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'اليوم';
  if (diffInDays === 1) return 'أمس';
  if (diffInDays < 7) return `منذ ${diffInDays} أيام`;
  if (diffInDays < 30) return `منذ ${Math.floor(diffInDays / 7)} أسابيع`;
  return formatDateShort(dateString);
}

// Calculate dashboard statistics with optional currency conversion
// baseCurrency is used as fallback for transactions without a stored currency
export function calculateStats(transactions: Transaction[], displayCurrency?: string, baseCurrency?: string): DashboardStats {
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => {
      // Convert to display currency if specified
      const fromCurrency = getTransactionCurrency(t, baseCurrency);
      const amount = displayCurrency 
        ? convertCurrency(t.amount, fromCurrency, displayCurrency)
        : t.amount;
      return sum + amount;
    }, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => {
      // Convert to display currency if specified
      const fromCurrency = getTransactionCurrency(t, baseCurrency);
      const amount = displayCurrency 
        ? convertCurrency(t.amount, fromCurrency, displayCurrency)
        : t.amount;
      return sum + amount;
    }, 0);

  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  return {
    totalIncome,
    totalExpenses,
    balance,
    savingsRate: Math.max(0, savingsRate),
  };
}

// Group transactions by category for charts with optional currency conversion
// baseCurrency is used as fallback for transactions without a stored currency
export function groupByCategory(transactions: Transaction[], type: 'income' | 'expense', displayCurrency?: string, baseCurrency?: string): ChartDataPoint[] {
  const filtered = transactions.filter(t => t.type === type);
  const grouped = filtered.reduce((acc, t) => {
    // Convert to display currency if specified
    const fromCurrency = getTransactionCurrency(t, baseCurrency);
    const amount = displayCurrency 
      ? convertCurrency(t.amount, fromCurrency, displayCurrency)
      : t.amount;
    acc[t.category] = (acc[t.category] || 0) + amount;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(grouped)
    .map(([categoryId, value]) => {
      const category = ALL_CATEGORIES.find(c => c.id === categoryId);
      return {
        name: categoryId, // Store the category ID for lookup
        value,
        color: category?.color,
      };
    })
    .sort((a, b) => b.value - a.value);
}

// Get category by ID
export function getCategoryById(categoryId: string): Category | undefined {
  return ALL_CATEGORIES.find(c => c.id === categoryId);
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get current month transactions
export function getCurrentMonthTransactions(transactions: Transaction[]): Transaction[] {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return transactions.filter(t => {
    const date = new Date(t.date);
    return date >= startOfMonth && date <= endOfMonth;
  });
}

// Get monthly data for charts
export function getMonthlyData(transactions: Transaction[], months: number = 6, language: 'ar' | 'en' = 'ar'): { month: string; income: number; expenses: number }[] {
  const result: { month: string; income: number; expenses: number }[] = [];
  const now = new Date();
  const locale = language === 'ar' ? 'ar-SA' : 'en-US';

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = new Intl.DateTimeFormat(locale, { month: 'short' }).format(date);

    const monthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear();
    });

    const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    result.push({ month: monthName, income, expenses });
  }

  return result;
}

// Get weekly data for charts
export function getWeeklyData(transactions: Transaction[], weeks: number = 8, language: 'ar' | 'en' = 'ar'): { month: string; income: number; expenses: number }[] {
  const result: { month: string; income: number; expenses: number }[] = [];
  const now = new Date();
  const locale = language === 'ar' ? 'ar-SA' : 'en-US';

  for (let i = weeks - 1; i >= 0; i--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - (i * 7));
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);

    const weekLabel = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(weekStart);

    const weekTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= weekStart && tDate <= weekEnd;
    });

    const income = weekTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = weekTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    result.push({ month: weekLabel, income, expenses });
  }

  return result;
}

// Get daily data for charts
export function getDailyData(transactions: Transaction[], days: number = 14, language: 'ar' | 'en' = 'ar'): { month: string; income: number; expenses: number }[] {
  const result: { month: string; income: number; expenses: number }[] = [];
  const now = new Date();
  const locale = language === 'ar' ? 'ar-SA' : 'en-US';

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayLabel = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date);

    const dayTransactions = transactions.filter(t => t.date === dateStr);

    const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    result.push({ month: dayLabel, income, expenses });
  }

  return result;
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Clamp number between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Loan calculation
export function calculateLoan(principal: number, annualRate: number, termMonths: number) {
  const monthlyRate = annualRate / 100 / 12;

  if (monthlyRate === 0) {
    const monthlyPayment = principal / termMonths;
    return {
      principal,
      interestRate: annualRate,
      termMonths,
      monthlyPayment,
      totalPayment: principal,
      totalInterest: 0,
    };
  }

  const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  const totalPayment = monthlyPayment * termMonths;
  const totalInterest = totalPayment - principal;

  return {
    principal,
    interestRate: annualRate,
    termMonths,
    monthlyPayment,
    totalPayment,
    totalInterest,
  };
}

// Savings calculation with compound interest
export function calculateSavings(initialAmount: number, monthlyContribution: number, annualRate: number, termYears: number) {
  const monthlyRate = annualRate / 100 / 12;
  const totalMonths = termYears * 12;

  let balance = initialAmount;
  for (let i = 0; i < totalMonths; i++) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;
  }

  const totalContributions = initialAmount + (monthlyContribution * totalMonths);
  const totalInterest = balance - totalContributions;

  return {
    initialAmount,
    monthlyContribution,
    interestRate: annualRate,
    termYears,
    finalAmount: balance,
    totalContributions,
    totalInterest,
  };
}

// Home affordability calculation
export function calculateHomeAffordability(
  monthlyIncome: number,
  monthlyDebts: number,
  downPayment: number,
  interestRate: number,
  termYears: number = 25
) {
  // Using 28% front-end ratio and 36% back-end ratio
  const maxMonthlyPayment = Math.min(
    monthlyIncome * 0.28,
    monthlyIncome * 0.36 - monthlyDebts
  );

  const monthlyRate = interestRate / 100 / 12;
  const totalMonths = termYears * 12;

  // Calculate max loan amount
  let maxLoan: number;
  if (monthlyRate === 0) {
    maxLoan = maxMonthlyPayment * totalMonths;
  } else {
    maxLoan = maxMonthlyPayment * (Math.pow(1 + monthlyRate, totalMonths) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, totalMonths));
  }

  const maxHomePrice = maxLoan + downPayment;

  return {
    maxMonthlyPayment,
    maxLoanAmount: maxLoan,
    maxHomePrice,
    downPayment,
    downPaymentPercentage: (downPayment / maxHomePrice) * 100,
  };
}

// Local storage helpers
export function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;

  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

/**
 * Validate password meets security requirements:
 * 8+ characters, at least one uppercase, one lowercase, one number.
 */
export function validatePassword(password: string): boolean {
  return password.length >= 8
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /[0-9]/.test(password);
}

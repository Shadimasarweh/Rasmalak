// Transaction Types
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

// Category Types
export interface Category {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  color: string;
  type: TransactionType;
}

// Budget Types
export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  spent: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
}

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  currency: string;
  language: string;
  createdAt: string;
}

// Dashboard Stats
export interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
}

// Calculator Types
export interface LoanCalculation {
  principal: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
}

export interface SavingsCalculation {
  initialAmount: number;
  monthlyContribution: number;
  interestRate: number;
  termYears: number;
  finalAmount: number;
  totalContributions: number;
  totalInterest: number;
}

// Chart Data Types
export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
  [key: string]: string | number | undefined;
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// Form Types
export interface TransactionFormData {
  type: TransactionType;
  amount: string;
  category: string;
  description: string;
  date: string;
}

// Auth Types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
}

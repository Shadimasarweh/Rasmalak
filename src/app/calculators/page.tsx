'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Calculator, Home, PiggyBank, TrendingUp } from 'lucide-react';
import { BottomNav } from '@/components';
import { calculateLoan, calculateSavings, calculateHomeAffordability, formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/store/useStore';

type CalculatorType = 'loan' | 'savings' | 'home';

export default function CalculatorsPage() {
  const currency = useCurrency();
  const [activeCalculator, setActiveCalculator] = useState<CalculatorType>('loan');

  // Loan Calculator State
  const [loanAmount, setLoanAmount] = useState('100000');
  const [loanRate, setLoanRate] = useState('5');
  const [loanTerm, setLoanTerm] = useState('60');

  // Savings Calculator State
  const [initialSavings, setInitialSavings] = useState('10000');
  const [monthlySavings, setMonthlySavings] = useState('1000');
  const [savingsRate, setSavingsRate] = useState('3');
  const [savingsTerm, setSavingsTerm] = useState('5');

  // Home Affordability State
  const [monthlyIncome, setMonthlyIncome] = useState('15000');
  const [monthlyDebts, setMonthlyDebts] = useState('2000');
  const [downPayment, setDownPayment] = useState('100000');
  const [homeRate, setHomeRate] = useState('4.5');

  // Calculate results
  const loanResult = calculateLoan(
    parseFloat(loanAmount) || 0,
    parseFloat(loanRate) || 0,
    parseInt(loanTerm) || 1
  );

  const savingsResult = calculateSavings(
    parseFloat(initialSavings) || 0,
    parseFloat(monthlySavings) || 0,
    parseFloat(savingsRate) || 0,
    parseInt(savingsTerm) || 1
  );

  const homeResult = calculateHomeAffordability(
    parseFloat(monthlyIncome) || 0,
    parseFloat(monthlyDebts) || 0,
    parseFloat(downPayment) || 0,
    parseFloat(homeRate) || 0
  );

  const calculators = [
    { id: 'loan' as CalculatorType, name: 'حاسبة القرض', icon: Calculator, color: '#3B82F6' },
    { id: 'savings' as CalculatorType, name: 'حاسبة الادخار', icon: PiggyBank, color: '#10B981' },
    { id: 'home' as CalculatorType, name: 'القدرة على شراء منزل', icon: Home, color: '#8B5CF6' },
  ];

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--color-bg-primary)]">
        <div className="flex items-center gap-3 px-4 py-4">
          <Link
            href="/"
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"
          >
            <ArrowRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </Link>
          <h1 className="text-xl font-bold">الحاسبات المالية</h1>
        </div>

        {/* Calculator Tabs */}
        <div className="px-4 pb-4 flex gap-2 overflow-x-auto hide-scrollbar">
          {calculators.map((calc) => {
            const Icon = calc.icon;
            const isActive = activeCalculator === calc.id;
            return (
              <button
                key={calc.id}
                onClick={() => setActiveCalculator(calc.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-white text-[var(--color-text-secondary)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {calc.name}
              </button>
            );
          })}
        </div>
      </header>

      <main className="px-4 space-y-4">
        {/* Loan Calculator */}
        {activeCalculator === 'loan' && (
          <>
            <div className="card space-y-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-500" />
                حاسبة القرض
              </h2>

              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                  مبلغ القرض (ر.س)
                </label>
                <input
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                  معدل الفائدة السنوي (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={loanRate}
                  onChange={(e) => setLoanRate(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                  مدة السداد (شهر)
                </label>
                <input
                  type="number"
                  value={loanTerm}
                  onChange={(e) => setLoanTerm(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div className="card bg-blue-50 border border-blue-100">
              <h3 className="font-bold mb-4 text-blue-800">النتائج</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-blue-600">القسط الشهري</p>
                  <p className="text-xl font-bold text-blue-800 ltr-nums">
                    {formatCurrency(loanResult.monthlyPayment, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-600">إجمالي المدفوعات</p>
                  <p className="text-xl font-bold text-blue-800 ltr-nums">
                    {formatCurrency(loanResult.totalPayment, currency)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-blue-600">إجمالي الفوائد</p>
                  <p className="text-xl font-bold text-red-600 ltr-nums">
                    {formatCurrency(loanResult.totalInterest, currency)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Savings Calculator */}
        {activeCalculator === 'savings' && (
          <>
            <div className="card space-y-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-green-500" />
                حاسبة الادخار
              </h2>

              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                  المبلغ الأولي (ر.س)
                </label>
                <input
                  type="number"
                  value={initialSavings}
                  onChange={(e) => setInitialSavings(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                  الإيداع الشهري (ر.س)
                </label>
                <input
                  type="number"
                  value={monthlySavings}
                  onChange={(e) => setMonthlySavings(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                  معدل العائد السنوي (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={savingsRate}
                  onChange={(e) => setSavingsRate(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                  مدة الادخار (سنة)
                </label>
                <input
                  type="number"
                  value={savingsTerm}
                  onChange={(e) => setSavingsTerm(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div className="card bg-green-50 border border-green-100">
              <h3 className="font-bold mb-4 text-green-800">النتائج</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <p className="text-sm text-green-600">القيمة النهائية</p>
                  <p className="text-2xl font-bold text-green-800 ltr-nums">
                    {formatCurrency(savingsResult.finalAmount, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-green-600">إجمالي المساهمات</p>
                  <p className="text-xl font-bold text-green-700 ltr-nums">
                    {formatCurrency(savingsResult.totalContributions, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-green-600">الأرباح المكتسبة</p>
                  <p className="text-xl font-bold text-green-700 ltr-nums">
                    {formatCurrency(savingsResult.totalInterest, currency)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Home Affordability Calculator */}
        {activeCalculator === 'home' && (
          <>
            <div className="card space-y-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Home className="w-5 h-5 text-purple-500" />
                القدرة على شراء منزل
              </h2>

              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                  الدخل الشهري (ر.س)
                </label>
                <input
                  type="number"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                  الديون الشهرية (ر.س)
                </label>
                <input
                  type="number"
                  value={monthlyDebts}
                  onChange={(e) => setMonthlyDebts(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                  الدفعة المقدمة (ر.س)
                </label>
                <input
                  type="number"
                  value={downPayment}
                  onChange={(e) => setDownPayment(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                  معدل الفائدة (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={homeRate}
                  onChange={(e) => setHomeRate(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div className="card bg-purple-50 border border-purple-100">
              <h3 className="font-bold mb-4 text-purple-800">النتائج</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <p className="text-sm text-purple-600">أقصى سعر للمنزل</p>
                  <p className="text-2xl font-bold text-purple-800 ltr-nums">
                    {formatCurrency(homeResult.maxHomePrice, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-purple-600">أقصى مبلغ للقرض</p>
                  <p className="text-xl font-bold text-purple-700 ltr-nums">
                    {formatCurrency(homeResult.maxLoanAmount, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-purple-600">القسط الشهري المقدر</p>
                  <p className="text-xl font-bold text-purple-700 ltr-nums">
                    {formatCurrency(homeResult.maxMonthlyPayment, currency)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Info Card */}
        <div className="card bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20">
          <p className="text-sm text-[var(--color-text-secondary)]">
            <strong className="text-[var(--color-text-primary)]">ملاحظة:</strong> هذه الحسابات تقديرية وقد تختلف عن العروض الفعلية من البنوك والمؤسسات المالية.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

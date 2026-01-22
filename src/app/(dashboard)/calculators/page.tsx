'use client';

import { useState } from 'react';
import { Calculator, Home, PiggyBank, DollarSign, Percent, Calendar, TrendingUp, Download, ArrowRight, ArrowLeft, Info } from 'lucide-react';
import { PageHeader } from '@/components';
import { calculateLoan, calculateSavings, calculateHomeAffordability, formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/store/useStore';
import { useTranslation } from '@/hooks/useTranslation';

type CalculatorType = 'loan' | 'savings' | 'home';

export default function CalculatorsPage() {
  const currency = useCurrency();
  const { language, isRTL } = useTranslation();
  const [activeCalculator, setActiveCalculator] = useState<CalculatorType>('loan');

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

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
    { 
      id: 'loan' as CalculatorType, 
      name: language === 'ar' ? 'حاسبة القرض' : 'Loan Calculator', 
      icon: Calculator, 
      color: '#3b82f6',
      descAr: 'احسب أقساطك الشهرية',
      descEn: 'Calculate your monthly payments',
    },
    { 
      id: 'savings' as CalculatorType, 
      name: language === 'ar' ? 'حاسبة الادخار' : 'Savings Calculator', 
      icon: PiggyBank, 
      color: '#10b981',
      descAr: 'تتبع نمو مدخراتك',
      descEn: 'Track your savings growth',
    },
    { 
      id: 'home' as CalculatorType, 
      name: language === 'ar' ? 'القدرة الشرائية' : 'Home Affordability', 
      icon: Home, 
      color: '#8b5cf6',
      descAr: 'اعرف ميزانية منزلك',
      descEn: 'Know your home budget',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <PageHeader 
        title={language === 'ar' ? 'الأدوات المالية' : 'Financial Tools'}
        hero
      />

      <div className="page-container py-6 space-y-6">
        {/* Calculator Selection Cards */}
        <div className="grid grid-cols-3 gap-4">
          {calculators.map((calc) => {
            const Icon = calc.icon;
            const isActive = activeCalculator === calc.id;
            return (
              <button
                key={calc.id}
                onClick={() => setActiveCalculator(calc.id)}
                className={`card p-5 text-start transition-all ${
                  isActive
                    ? 'ring-2 ring-[var(--color-primary)] border-transparent shadow-lg'
                    : 'hover:border-[var(--color-border-dark)]'
                }`}
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${calc.color}15` }}
                >
                  <Icon className="w-6 h-6" style={{ color: calc.color }} />
                </div>
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                  {calc.name}
                </h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {language === 'ar' ? calc.descAr : calc.descEn}
                </p>
              </button>
            );
          })}
        </div>

        {/* Loan Calculator */}
        {activeCalculator === 'loan' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
            <div className="card">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg text-[var(--color-text-primary)]">
                    {language === 'ar' ? 'حاسبة القرض' : 'Loan Calculator'}
                  </h2>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {language === 'ar' ? 'احسب أقساطك الشهرية' : 'Calculate your monthly payments'}
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="label flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    {language === 'ar' ? 'مبلغ القرض' : 'Loan Amount'}
                  </label>
                  <input
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="input"
                    placeholder="100,000"
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    {language === 'ar' ? 'معدل الفائدة السنوي (%)' : 'Annual Interest Rate (%)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={loanRate}
                    onChange={(e) => setLoanRate(e.target.value)}
                    className="input"
                    placeholder="5"
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {language === 'ar' ? 'مدة السداد (شهر)' : 'Loan Term (months)'}
                  </label>
                  <input
                    type="number"
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(e.target.value)}
                    className="input"
                    placeholder="60"
                  />
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <h3 className="font-semibold text-lg mb-6 opacity-90">
                {language === 'ar' ? 'النتائج' : 'Results'}
              </h3>
              
              <div className="space-y-6">
                <div>
                  <p className="text-sm opacity-80 mb-1">{language === 'ar' ? 'القسط الشهري' : 'Monthly Payment'}</p>
                  <p className="text-4xl font-bold ltr-nums">
                    {formatCurrency(loanResult.monthlyPayment, currency)}
                  </p>
                </div>

                <div className="h-px bg-white/20" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm opacity-80 mb-1">{language === 'ar' ? 'إجمالي المدفوعات' : 'Total Payment'}</p>
                    <p className="text-2xl font-bold ltr-nums">
                      {formatCurrency(loanResult.totalPayment, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm opacity-80 mb-1">{language === 'ar' ? 'إجمالي الفوائد' : 'Total Interest'}</p>
                    <p className="text-2xl font-bold ltr-nums text-red-200">
                      {formatCurrency(loanResult.totalInterest, currency)}
                    </p>
                  </div>
                </div>
              </div>

              <button className="btn btn-secondary w-full mt-6 bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Download className="w-4 h-4" />
                {language === 'ar' ? 'تحميل جدول الأقساط' : 'Download Schedule'}
              </button>
            </div>
          </div>
        )}

        {/* Savings Calculator */}
        {activeCalculator === 'savings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
            <div className="card">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <PiggyBank className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg text-[var(--color-text-primary)]">
                    {language === 'ar' ? 'حاسبة الادخار' : 'Savings Calculator'}
                  </h2>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {language === 'ar' ? 'تتبع نمو مدخراتك' : 'Track your savings growth'}
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="label flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    {language === 'ar' ? 'المبلغ الأولي' : 'Initial Amount'}
                  </label>
                  <input
                    type="number"
                    value={initialSavings}
                    onChange={(e) => setInitialSavings(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    {language === 'ar' ? 'الإيداع الشهري' : 'Monthly Deposit'}
                  </label>
                  <input
                    type="number"
                    value={monthlySavings}
                    onChange={(e) => setMonthlySavings(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    {language === 'ar' ? 'معدل العائد السنوي (%)' : 'Annual Return Rate (%)'}
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
                  <label className="label flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {language === 'ar' ? 'مدة الادخار (سنة)' : 'Savings Period (years)'}
                  </label>
                  <input
                    type="number"
                    value={savingsTerm}
                    onChange={(e) => setSavingsTerm(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
              <h3 className="font-semibold text-lg mb-6 opacity-90">
                {language === 'ar' ? 'النتائج' : 'Results'}
              </h3>
              
              <div className="space-y-6">
                <div>
                  <p className="text-sm opacity-80 mb-1">{language === 'ar' ? 'القيمة النهائية' : 'Final Value'}</p>
                  <p className="text-4xl font-bold ltr-nums">
                    {formatCurrency(savingsResult.finalAmount, currency)}
                  </p>
                </div>

                <div className="h-px bg-white/20" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm opacity-80 mb-1">{language === 'ar' ? 'إجمالي المساهمات' : 'Total Contributions'}</p>
                    <p className="text-2xl font-bold ltr-nums">
                      {formatCurrency(savingsResult.totalContributions, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm opacity-80 mb-1">{language === 'ar' ? 'الأرباح المكتسبة' : 'Earnings'}</p>
                    <p className="text-2xl font-bold ltr-nums text-indigo-200">
                      {formatCurrency(savingsResult.totalInterest, currency)}
                    </p>
                  </div>
                </div>
              </div>

              <button className="btn btn-secondary w-full mt-6 bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Download className="w-4 h-4" />
                {language === 'ar' ? 'تحميل التقرير' : 'Download Report'}
              </button>
            </div>
          </div>
        )}

        {/* Home Affordability Calculator */}
        {activeCalculator === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
            <div className="card">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Home className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg text-[var(--color-text-primary)]">
                    {language === 'ar' ? 'القدرة على شراء منزل' : 'Home Affordability'}
                  </h2>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {language === 'ar' ? 'اعرف ميزانية منزلك' : 'Know your home budget'}
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="label flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    {language === 'ar' ? 'الدخل الشهري' : 'Monthly Income'}
                  </label>
                  <input
                    type="number"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    {language === 'ar' ? 'الديون الشهرية' : 'Monthly Debts'}
                  </label>
                  <input
                    type="number"
                    value={monthlyDebts}
                    onChange={(e) => setMonthlyDebts(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    {language === 'ar' ? 'الدفعة المقدمة' : 'Down Payment'}
                  </label>
                  <input
                    type="number"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    {language === 'ar' ? 'معدل الفائدة (%)' : 'Interest Rate (%)'}
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
            </div>

            <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <h3 className="font-semibold text-lg mb-6 opacity-90">
                {language === 'ar' ? 'النتائج' : 'Results'}
              </h3>
              
              <div className="space-y-6">
                <div>
                  <p className="text-sm opacity-80 mb-1">{language === 'ar' ? 'أقصى سعر للمنزل' : 'Max Home Price'}</p>
                  <p className="text-4xl font-bold ltr-nums">
                    {formatCurrency(homeResult.maxHomePrice, currency)}
                  </p>
                </div>

                <div className="h-px bg-white/20" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm opacity-80 mb-1">{language === 'ar' ? 'أقصى مبلغ للقرض' : 'Max Loan Amount'}</p>
                    <p className="text-2xl font-bold ltr-nums">
                      {formatCurrency(homeResult.maxLoanAmount, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm opacity-80 mb-1">{language === 'ar' ? 'القسط الشهري المقدر' : 'Est. Monthly Payment'}</p>
                    <p className="text-2xl font-bold ltr-nums">
                      {formatCurrency(homeResult.maxMonthlyPayment, currency)}
                    </p>
                  </div>
                </div>
              </div>

              <button className="btn btn-secondary w-full mt-6 bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Download className="w-4 h-4" />
                {language === 'ar' ? 'تحميل التقرير' : 'Download Report'}
              </button>
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="card border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h4 className="font-medium text-[var(--color-text-primary)] mb-1">
                {language === 'ar' ? 'ملاحظة هامة' : 'Important Note'}
              </h4>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {language === 'ar' 
                  ? 'هذه الحسابات تقديرية للأغراض التعليمية فقط وقد تختلف عن العروض الفعلية من البنوك والمؤسسات المالية. يرجى استشارة متخصص مالي للحصول على نصائح دقيقة.'
                  : 'These calculations are estimates for educational purposes only and may differ from actual offers from banks and financial institutions. Please consult a financial professional for accurate advice.'}
              </p>
            </div>
          </div>
        </div>

        {/* More Tools Coming Soon */}
        <div className="card card-gradient text-center py-8">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
            <Calculator className="w-8 h-8 text-amber-400" />
          </div>
          <h3 className="font-bold text-xl mb-2">
            {language === 'ar' ? 'المزيد من الأدوات قريباً' : 'More Tools Coming Soon'}
          </h3>
          <p className="text-slate-400 max-w-md mx-auto mb-4">
            {language === 'ar'
              ? 'نعمل على إضافة المزيد من الأدوات المالية المفيدة مثل حاسبة الزكاة وأداة المقارنة'
              : 'We are working on adding more useful financial tools like Zakat Calculator and Comparison Tool'}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-indigo-400">
            <span>{language === 'ar' ? 'تابعنا للتحديثات' : 'Stay tuned for updates'}</span>
            <ArrowIcon className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

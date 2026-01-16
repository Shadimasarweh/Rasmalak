'use client';

import { useState } from 'react';
import { Calculator, Home, PiggyBank } from 'lucide-react';
import { PageHeader, PageContainer, SectionCard } from '@/components';
import { calculateLoan, calculateSavings, calculateHomeAffordability, formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/store/useStore';
import { useTranslation } from '@/hooks/useTranslation';

type CalculatorType = 'loan' | 'savings' | 'home';

export default function CalculatorsPage() {
  const currency = useCurrency();
  const { language } = useTranslation();
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
    { id: 'loan' as CalculatorType, name: language === 'ar' ? 'حاسبة القرض' : 'Loan Calculator', icon: Calculator, color: '#3B82F6' },
    { id: 'savings' as CalculatorType, name: language === 'ar' ? 'حاسبة الادخار' : 'Savings Calculator', icon: PiggyBank, color: '#10B981' },
    { id: 'home' as CalculatorType, name: language === 'ar' ? 'القدرة على شراء منزل' : 'Home Affordability', icon: Home, color: '#8B5CF6' },
  ];

  // Calculator tabs as toolbar
  const calculatorTabs = (
    <div className="flex gap-3">
      {calculators.map((calc) => {
        const Icon = calc.icon;
        const isActive = activeCalculator === calc.id;
        return (
          <button
            key={calc.id}
            onClick={() => setActiveCalculator(calc.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all ${
              isActive
                ? 'bg-[var(--color-primary)] text-white shadow-lg'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-[var(--color-border-light)] hover:border-[var(--color-border)]'
            }`}
          >
            <Icon className="w-5 h-5" />
            {calc.name}
          </button>
        );
      })}
    </div>
  );

  return (
    <div>
      <PageHeader 
        title={language === 'ar' ? 'الحاسبات المالية' : 'Financial Calculators'}
        showBack
        backUrl="/"
        toolbar={calculatorTabs}
      />

      <PageContainer>
        {/* Loan Calculator */}
        {activeCalculator === 'loan' && (
          <div className="grid grid-cols-2 gap-6">
            <SectionCard padding="lg">
              <h2 className="font-bold text-xl flex items-center gap-3 mb-6">
                <Calculator className="w-6 h-6 text-blue-500" />
                {language === 'ar' ? 'حاسبة القرض' : 'Loan Calculator'}
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                    {language === 'ar' ? 'مبلغ القرض (ر.س)' : 'Loan Amount (SAR)'}
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
                    {language === 'ar' ? 'معدل الفائدة السنوي (%)' : 'Annual Interest Rate (%)'}
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
                    {language === 'ar' ? 'مدة السداد (شهر)' : 'Loan Term (months)'}
                  </label>
                  <input
                    type="number"
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard padding="lg" className="bg-blue-50 border-blue-100">
              <h3 className="font-bold text-xl mb-6 text-blue-800">
                {language === 'ar' ? 'النتائج' : 'Results'}
              </h3>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-sm text-blue-600 mb-1">{language === 'ar' ? 'القسط الشهري' : 'Monthly Payment'}</p>
                  <p className="text-2xl font-bold text-blue-800 ltr-nums">
                    {formatCurrency(loanResult.monthlyPayment, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-600 mb-1">{language === 'ar' ? 'إجمالي المدفوعات' : 'Total Payment'}</p>
                  <p className="text-2xl font-bold text-blue-800 ltr-nums">
                    {formatCurrency(loanResult.totalPayment, currency)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-blue-600 mb-1">{language === 'ar' ? 'إجمالي الفوائد' : 'Total Interest'}</p>
                  <p className="text-2xl font-bold text-red-600 ltr-nums">
                    {formatCurrency(loanResult.totalInterest, currency)}
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* Savings Calculator */}
        {activeCalculator === 'savings' && (
          <div className="grid grid-cols-2 gap-6">
            <SectionCard padding="lg">
              <h2 className="font-bold text-xl flex items-center gap-3 mb-6">
                <PiggyBank className="w-6 h-6 text-green-500" />
                {language === 'ar' ? 'حاسبة الادخار' : 'Savings Calculator'}
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                    {language === 'ar' ? 'المبلغ الأولي (ر.س)' : 'Initial Amount (SAR)'}
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
                    {language === 'ar' ? 'الإيداع الشهري (ر.س)' : 'Monthly Deposit (SAR)'}
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
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
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
            </SectionCard>

            <SectionCard padding="lg" className="bg-green-50 border-green-100">
              <h3 className="font-bold text-xl mb-6 text-green-800">
                {language === 'ar' ? 'النتائج' : 'Results'}
              </h3>
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <p className="text-sm text-green-600 mb-1">{language === 'ar' ? 'القيمة النهائية' : 'Final Value'}</p>
                  <p className="text-3xl font-bold text-green-800 ltr-nums">
                    {formatCurrency(savingsResult.finalAmount, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-green-600 mb-1">{language === 'ar' ? 'إجمالي المساهمات' : 'Total Contributions'}</p>
                  <p className="text-2xl font-bold text-green-700 ltr-nums">
                    {formatCurrency(savingsResult.totalContributions, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-green-600 mb-1">{language === 'ar' ? 'الأرباح المكتسبة' : 'Earnings'}</p>
                  <p className="text-2xl font-bold text-green-700 ltr-nums">
                    {formatCurrency(savingsResult.totalInterest, currency)}
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* Home Affordability Calculator */}
        {activeCalculator === 'home' && (
          <div className="grid grid-cols-2 gap-6">
            <SectionCard padding="lg">
              <h2 className="font-bold text-xl flex items-center gap-3 mb-6">
                <Home className="w-6 h-6 text-purple-500" />
                {language === 'ar' ? 'القدرة على شراء منزل' : 'Home Affordability'}
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                    {language === 'ar' ? 'الدخل الشهري (ر.س)' : 'Monthly Income (SAR)'}
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
                    {language === 'ar' ? 'الديون الشهرية (ر.س)' : 'Monthly Debts (SAR)'}
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
                    {language === 'ar' ? 'الدفعة المقدمة (ر.س)' : 'Down Payment (SAR)'}
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
            </SectionCard>

            <SectionCard padding="lg" className="bg-purple-50 border-purple-100">
              <h3 className="font-bold text-xl mb-6 text-purple-800">
                {language === 'ar' ? 'النتائج' : 'Results'}
              </h3>
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <p className="text-sm text-purple-600 mb-1">{language === 'ar' ? 'أقصى سعر للمنزل' : 'Max Home Price'}</p>
                  <p className="text-3xl font-bold text-purple-800 ltr-nums">
                    {formatCurrency(homeResult.maxHomePrice, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-purple-600 mb-1">{language === 'ar' ? 'أقصى مبلغ للقرض' : 'Max Loan Amount'}</p>
                  <p className="text-2xl font-bold text-purple-700 ltr-nums">
                    {formatCurrency(homeResult.maxLoanAmount, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-purple-600 mb-1">{language === 'ar' ? 'القسط الشهري المقدر' : 'Est. Monthly Payment'}</p>
                  <p className="text-2xl font-bold text-purple-700 ltr-nums">
                    {formatCurrency(homeResult.maxMonthlyPayment, currency)}
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* Info Card */}
        <SectionCard className="bg-[var(--color-gold)]/10 border-[var(--color-gold)]/20">
          <p className="text-sm text-[var(--color-text-secondary)]">
            <strong className="text-[var(--color-text-primary)]">
              {language === 'ar' ? 'ملاحظة:' : 'Note:'}
            </strong>{' '}
            {language === 'ar' 
              ? 'هذه الحسابات تقديرية وقد تختلف عن العروض الفعلية من البنوك والمؤسسات المالية.'
              : 'These calculations are estimates and may differ from actual offers from banks and financial institutions.'}
          </p>
        </SectionCard>
      </PageContainer>
    </div>
  );
}

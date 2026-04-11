/**
 * CSV / Excel export for all calculators.
 * No external dependencies — uses Blob + createObjectURL.
 * Adds UTF-8 BOM so Excel opens Arabic text correctly.
 */

import type { SimpleLoanResult } from './simpleLoanCalculator';
import type { CreditCardResult } from './creditCardCalculator';
import type { CompoundSavingsResult } from './compoundSavingsCalculator';
import type { HomeAffordabilityResult } from './homeAffordabilityCalculator';
import type { MortgagePayoffResult } from './mortgagePayoffCalculator';

type Cell = string | number;

function escapeCell(value: Cell): string {
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCSV(filename: string, rows: Cell[][]): void {
  const bom = '\uFEFF';
  const csv = bom + rows.map(row => row.map(escapeCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function cur(value: number, sym: string): string {
  return `${sym} ${value.toFixed(2)}`;
}

// ── Simple Loan ────────────────────────────────────────────────────────────

export function exportSimpleLoanCSV(
  result: SimpleLoanResult,
  locale: string,
  currencySymbol: string,
): void {
  const ar = locale === 'ar';

  const summaryRows: Cell[][] = ar
    ? [
        ['ملخص القرض', ''],
        ['الدفعة الشهرية', cur(result.summary.monthlyPayment, currencySymbol)],
        ['عدد الدفعات', result.summary.numberOfPayments],
        ['إجمالي الفائدة', cur(result.summary.totalInterest, currencySymbol)],
        ['التكلفة الإجمالية', cur(result.summary.totalCost, currencySymbol)],
        [],
      ]
    : [
        ['Loan Summary', ''],
        ['Monthly Payment', cur(result.summary.monthlyPayment, currencySymbol)],
        ['Number of Payments', result.summary.numberOfPayments],
        ['Total Interest', cur(result.summary.totalInterest, currencySymbol)],
        ['Total Cost of Loan', cur(result.summary.totalCost, currencySymbol)],
        [],
      ];

  const headers: Cell[] = ar
    ? ['رقم', 'تاريخ الدفعة', 'الرصيد الافتتاحي', 'الدفعة', 'المبلغ الأصلي', 'الفائدة', 'الرصيد الختامي']
    : ['No.', 'Payment Date', 'Beginning Balance', 'Payment', 'Principal', 'Interest', 'Ending Balance'];

  const scheduleRows: Cell[][] = result.schedule.map(row => [
    row.paymentNumber,
    fmtDate(row.paymentDate),
    row.beginningBalance,
    row.payment,
    row.principal,
    row.interest,
    row.endingBalance,
  ]);

  downloadCSV(
    ar ? 'تقرير_القرض_البسيط.csv' : 'Simple_Loan_Report.csv',
    [...summaryRows, headers, ...scheduleRows],
  );
}

// ── Credit Card ────────────────────────────────────────────────────────────

export function exportCreditCardCSV(
  result: CreditCardResult,
  locale: string,
  currencySymbol: string,
): void {
  const ar = locale === 'ar';

  const summaryRows: Cell[][] = ar
    ? [
        ['ملخص بطاقة الائتمان', ''],
        ['أول دفعة', cur(result.summary.firstPayment, currencySymbol)],
        ['أعلى دفعة', cur(result.summary.maxPayment, currencySymbol)],
        ['عدد الأشهر حتى السداد', result.summary.monthsToPayOff],
        ['عدد السنوات حتى السداد', result.summary.yearsToPayOff],
        ['إجمالي الفوائد المدفوعة', cur(result.summary.totalInterestPaid, currencySymbol)],
        ['إجمالي المبلغ المدفوع', cur(result.summary.totalAmountPaid, currencySymbol)],
        [],
      ]
    : [
        ['Credit Card Summary', ''],
        ['First Payment', cur(result.summary.firstPayment, currencySymbol)],
        ['Max Payment', cur(result.summary.maxPayment, currencySymbol)],
        ['Months to Pay Off', result.summary.monthsToPayOff],
        ['Years to Pay Off', result.summary.yearsToPayOff],
        ['Total Interest Paid', cur(result.summary.totalInterestPaid, currencySymbol)],
        ['Total Amount Paid', cur(result.summary.totalAmountPaid, currencySymbol)],
        [],
      ];

  const headers: Cell[] = ar
    ? ['رقم', 'معدل الفائدة %', 'الدفعة', 'دفعة إضافية', 'إجمالي الدفعة', 'الفائدة المدفوعة', 'الأصل المدفوع', 'الرصيد']
    : ['No.', 'Rate %', 'Payment', 'Extra Payment', 'Total Payment', 'Interest Paid', 'Principal Paid', 'Balance'];

  const scheduleRows: Cell[][] = result.schedule.map(row => [
    row.paymentNumber,
    (row.rate * 100).toFixed(2),
    row.payment,
    row.extraPayment,
    row.totalPayment,
    row.interestPaid,
    row.principalPaid,
    row.balance,
  ]);

  downloadCSV(
    ar ? 'تقرير_بطاقة_الائتمان.csv' : 'Credit_Card_Report.csv',
    [...summaryRows, headers, ...scheduleRows],
  );
}

// ── Compound Savings ───────────────────────────────────────────────────────

export function exportCompoundSavingsCSV(
  result: CompoundSavingsResult,
  locale: string,
  currencySymbol: string,
): void {
  const ar = locale === 'ar';

  const summaryRows: Cell[][] = ar
    ? [
        ['ملخص المدخرات المركبة', ''],
        ['القيمة المستقبلية', cur(result.summary.futureValue, currencySymbol)],
        ['إجمالي الاستثمار', cur(result.summary.totalInvested, currencySymbol)],
        ['الفائدة المكتسبة', cur(result.summary.interestEarned, currencySymbol)],
        [],
      ]
    : [
        ['Compound Savings Summary', ''],
        ['Future Value', cur(result.summary.futureValue, currencySymbol)],
        ['Total Invested', cur(result.summary.totalInvested, currencySymbol)],
        ['Interest Earned', cur(result.summary.interestEarned, currencySymbol)],
        [],
      ];

  const headers: Cell[] = ar
    ? ['السنة', 'معدل الفائدة %', 'الفائدة', 'الودائع المجدولة', 'وديعة إضافية', 'الرصيد', 'إجمالي المساهمات', 'إجمالي الفائدة']
    : ['Year', 'Rate %', 'Interest', 'Scheduled Deposits', 'Extra Deposit', 'Balance', 'Cumulative Contributions', 'Cumulative Interest'];

  const scheduleRows: Cell[][] = result.schedule.map(row => [
    row.year,
    (row.rate * 100).toFixed(2),
    row.interest,
    row.scheduledDeposits,
    row.extraDeposit,
    row.balance,
    row.cumulativeContribution,
    row.cumulativeInterest,
  ]);

  downloadCSV(
    ar ? 'تقرير_المدخرات_المركبة.csv' : 'Compound_Savings_Report.csv',
    [...summaryRows, headers, ...scheduleRows],
  );
}

// ── Home Affordability ─────────────────────────────────────────────────────

export function exportHomeAffordabilityCSV(
  result: HomeAffordabilityResult,
  locale: string,
  currencySymbol: string,
): void {
  const ar = locale === 'ar';

  const rows: Cell[][] = ar
    ? [
        ['نتائج القدرة على شراء منزل', ''],
        [],
        ['النتيجة الرئيسية', ''],
        ['الحد الأقصى لسعر المنزل', cur(result.maxHomePrice, currencySymbol)],
        ['مبلغ القرض', cur(result.loanAmount, currencySymbol)],
        ['الدفعة الأولى', cur(result.downPaymentAmount, currencySymbol)],
        ['نسبة الدفعة الأولى', `${result.downPaymentPercent.toFixed(1)}%`],
        ['تكاليف الإغلاق المقدرة', cur(result.estimatedClosingCosts, currencySymbol)],
        ['نسبة تكاليف الإغلاق', `${result.closingCostsPercent.toFixed(1)}%`],
        [],
        ['القيود المحسوبة', ''],
        ['الديون الشهرية الحالية', cur(result.currentMonthlyDebts, currencySymbol)],
        ['الحد الأقصى للدفعة (الدخل)', cur(result.m1MaxPaymentIncome, currencySymbol)],
        ['الحد الأقصى للدفعة (نسبة الدين)', cur(result.m2MaxPaymentDTI, currencySymbol)],
        ['الحد الأقصى للدفعة الشهرية', cur(result.maxMonthlyPayment, currencySymbol)],
        ['إجمالي مصاريف السكن', cur(result.totalHousingExpenses, currencySymbol)],
        ['الحد الأقصى لـ PI (المصاريف)', cur(result.m3MaxPIExpenses, currencySymbol)],
        ['الحد الأقصى للسعر (الأموال)', cur(result.maxHomePriceBasedOnFunds, currencySymbol)],
        ['الحد الأقصى لـ PI (الأموال)', cur(result.m4MaxPIFunds, currencySymbol)],
        ['الحد الأقصى لدفعة PI', cur(result.maxPIPayment, currencySymbol)],
      ]
    : [
        ['Home Affordability Results', ''],
        [],
        ['Key Results', ''],
        ['Max Home Price', cur(result.maxHomePrice, currencySymbol)],
        ['Loan Amount', cur(result.loanAmount, currencySymbol)],
        ['Down Payment', cur(result.downPaymentAmount, currencySymbol)],
        ['Down Payment %', `${result.downPaymentPercent.toFixed(1)}%`],
        ['Estimated Closing Costs', cur(result.estimatedClosingCosts, currencySymbol)],
        ['Closing Costs %', `${result.closingCostsPercent.toFixed(1)}%`],
        [],
        ['Computed Constraints', ''],
        ['Current Monthly Debts', cur(result.currentMonthlyDebts, currencySymbol)],
        ['Max Payment (Income)', cur(result.m1MaxPaymentIncome, currencySymbol)],
        ['Max Payment (DTI)', cur(result.m2MaxPaymentDTI, currencySymbol)],
        ['Max Monthly Payment', cur(result.maxMonthlyPayment, currencySymbol)],
        ['Total Housing Expenses', cur(result.totalHousingExpenses, currencySymbol)],
        ['Max PI (Expenses)', cur(result.m3MaxPIExpenses, currencySymbol)],
        ['Max Home Price (Funds)', cur(result.maxHomePriceBasedOnFunds, currencySymbol)],
        ['Max PI (Funds)', cur(result.m4MaxPIFunds, currencySymbol)],
        ['Max PI Payment', cur(result.maxPIPayment, currencySymbol)],
      ];

  downloadCSV(
    ar ? 'تقرير_القدرة_على_شراء_منزل.csv' : 'Home_Affordability_Report.csv',
    rows,
  );
}

// ── Mortgage Payoff ────────────────────────────────────────────────────────

export function exportMortgagePayoffCSV(
  result: MortgagePayoffResult,
  locale: string,
  currencySymbol: string,
): void {
  const ar = locale === 'ar';

  const summaryRows: Cell[][] = ar
    ? [
        ['ملخص سداد الرهن', ''],
        ['الدفعة المجدولة', cur(result.summary.scheduledPayment, currencySymbol)],
        ['عدد الدفعات المجدولة', result.summary.scheduledNumberOfPayments],
        ['عدد الدفعات الفعلية', result.summary.actualNumberOfPayments],
        ['السنوات الموفرة', result.summary.yearsSaved],
        ['إجمالي الدفعات المبكرة', cur(result.summary.totalEarlyPayments, currencySymbol)],
        ['إجمالي الفائدة', cur(result.summary.totalInterest, currencySymbol)],
        ['إجمالي المدفوع', cur(result.summary.totalPaid, currencySymbol)],
        [],
      ]
    : [
        ['Mortgage Payoff Summary', ''],
        ['Scheduled Payment', cur(result.summary.scheduledPayment, currencySymbol)],
        ['Scheduled Number of Payments', result.summary.scheduledNumberOfPayments],
        ['Actual Number of Payments', result.summary.actualNumberOfPayments],
        ['Years Saved', result.summary.yearsSaved],
        ['Total Early Payments', cur(result.summary.totalEarlyPayments, currencySymbol)],
        ['Total Interest', cur(result.summary.totalInterest, currencySymbol)],
        ['Total Paid', cur(result.summary.totalPaid, currencySymbol)],
        [],
      ];

  const headers: Cell[] = ar
    ? ['رقم', 'تاريخ الدفعة', 'الرصيد الافتتاحي', 'الدفعة المجدولة', 'دفعة إضافية', 'إجمالي الدفعة', 'الأصل', 'الفائدة', 'الرصيد الختامي', 'إجمالي الفائدة التراكمية']
    : ['No.', 'Payment Date', 'Beginning Balance', 'Scheduled Payment', 'Extra Payment', 'Total Payment', 'Principal', 'Interest', 'Ending Balance', 'Cumulative Interest'];

  const scheduleRows: Cell[][] = result.schedule.map(row => [
    row.paymentNumber,
    fmtDate(row.paymentDate),
    row.beginningBalance,
    row.scheduledPayment,
    row.extraPayment,
    row.totalPayment,
    row.principal,
    row.interest,
    row.endingBalance,
    row.cumulativeInterest,
  ]);

  downloadCSV(
    ar ? 'تقرير_سداد_الرهن.csv' : 'Mortgage_Payoff_Report.csv',
    [...summaryRows, headers, ...scheduleRows],
  );
}

/**
 * XLSX report generators for all 5 calculators.
 * Returns a Buffer — no browser APIs used.
 */

import type { SimpleLoanResult } from '@/calculators/simpleLoanCalculator';
import type { CreditCardResult } from '@/calculators/creditCardCalculator';
import type { CompoundSavingsResult } from '@/calculators/compoundSavingsCalculator';
import type { HomeAffordabilityResult } from '@/calculators/homeAffordabilityCalculator';
import type { MortgagePayoffResult } from '@/calculators/mortgagePayoffCalculator';
import type { PersonalZakatInput, PersonalZakatResult } from '@/calculators/personalZakatCalculator';
import type { UaeGratuityInput, UaeGratuityResult } from '@/calculators/uaeGratuityCalculator';

import {
  XlsxWorkbook,
  bold, cell, header,
  currencyCell, intCell, numCell, pctCell, dateCell,
} from './builder';

// ── Simple Loan ───────────────────────────────────────────────────────────────

export function simpleLoanXlsx(
  result: SimpleLoanResult,
  locale: string,
  currencySymbol: string,
): Buffer {
  const ar = locale === 'ar';
  const wb = new XlsxWorkbook();

  // Summary sheet
  const summarySheet = wb.addSheet(ar ? 'ملخص' : 'Summary', { rtl: ar });
  summarySheet.setColWidths([{ col: 1, width: 30 }, { col: 2, width: 20 }]);

  summarySheet.addRow([bold(ar ? 'ملخص القرض' : 'Loan Summary')]);
  summarySheet.addRow([cell(ar ? 'الدفعة الشهرية' : 'Monthly Payment'), currencyCell(result.summary.monthlyPayment, locale, currencySymbol)]);
  summarySheet.addRow([cell(ar ? 'عدد الدفعات' : 'Number of Payments'), intCell(result.summary.numberOfPayments, locale)]);
  summarySheet.addRow([cell(ar ? 'إجمالي الفائدة' : 'Total Interest'), currencyCell(result.summary.totalInterest, locale, currencySymbol)]);
  summarySheet.addRow([cell(ar ? 'التكلفة الإجمالية' : 'Total Cost of Loan'), currencyCell(result.summary.totalCost, locale, currencySymbol)]);

  // Schedule sheet
  const schedSheet = wb.addSheet(ar ? 'جدول السداد' : 'Schedule', { rtl: ar });
  schedSheet.setColWidths([
    { col: 1, width: 8 }, { col: 2, width: 14 }, { col: 3, width: 20 },
    { col: 4, width: 16 }, { col: 5, width: 16 }, { col: 6, width: 16 }, { col: 7, width: 20 },
  ]);

  const hdrs = ar
    ? ['رقم', 'تاريخ الدفعة', 'الرصيد الافتتاحي', 'الدفعة', 'المبلغ الأصلي', 'الفائدة', 'الرصيد الختامي']
    : ['No.', 'Payment Date', 'Beginning Balance', 'Payment', 'Principal', 'Interest', 'Ending Balance'];
  schedSheet.addRow(hdrs.map(h => header(h)));

  for (const row of result.schedule) {
    schedSheet.addRow([
      intCell(row.paymentNumber, locale),
      dateCell(row.paymentDate, locale),
      currencyCell(row.beginningBalance, locale, currencySymbol),
      currencyCell(row.payment, locale, currencySymbol),
      currencyCell(row.principal, locale, currencySymbol),
      currencyCell(row.interest, locale, currencySymbol),
      currencyCell(row.endingBalance, locale, currencySymbol),
    ]);
  }

  return wb.build();
}

// ── Credit Card ───────────────────────────────────────────────────────────────

export function creditCardXlsx(
  result: CreditCardResult,
  locale: string,
  currencySymbol: string,
): Buffer {
  const ar = locale === 'ar';
  const wb = new XlsxWorkbook();

  const summarySheet = wb.addSheet(ar ? 'ملخص' : 'Summary', { rtl: ar });
  summarySheet.setColWidths([{ col: 1, width: 32 }, { col: 2, width: 20 }]);

  summarySheet.addRow([bold(ar ? 'ملخص بطاقة الائتمان' : 'Credit Card Summary')]);
  summarySheet.addRow([cell(ar ? 'أول دفعة' : 'First Payment'), currencyCell(result.summary.firstPayment, locale, currencySymbol)]);
  summarySheet.addRow([cell(ar ? 'أعلى دفعة' : 'Max Payment'), currencyCell(result.summary.maxPayment, locale, currencySymbol)]);
  summarySheet.addRow([cell(ar ? 'عدد الأشهر حتى السداد' : 'Months to Pay Off'), intCell(result.summary.monthsToPayOff, locale)]);
  summarySheet.addRow([cell(ar ? 'عدد السنوات حتى السداد' : 'Years to Pay Off'), numCell(result.summary.yearsToPayOff, 1, locale)]);
  summarySheet.addRow([cell(ar ? 'إجمالي الفوائد المدفوعة' : 'Total Interest Paid'), currencyCell(result.summary.totalInterestPaid, locale, currencySymbol)]);
  summarySheet.addRow([cell(ar ? 'إجمالي المبلغ المدفوع' : 'Total Amount Paid'), currencyCell(result.summary.totalAmountPaid, locale, currencySymbol)]);

  const schedSheet = wb.addSheet(ar ? 'جدول السداد' : 'Schedule', { rtl: ar });
  schedSheet.setColWidths(Array.from({ length: 8 }, (_, i) => ({ col: i + 1, width: i === 0 ? 8 : 16 })));

  const hdrs = ar
    ? ['رقم', 'معدل الفائدة', 'الدفعة', 'دفعة إضافية', 'إجمالي الدفعة', 'الفائدة المدفوعة', 'الأصل المدفوع', 'الرصيد']
    : ['No.', 'Interest Rate', 'Payment', 'Extra Payment', 'Total Payment', 'Interest Paid', 'Principal Paid', 'Balance'];
  schedSheet.addRow(hdrs.map(h => header(h)));

  for (const row of result.schedule) {
    schedSheet.addRow([
      intCell(row.paymentNumber, locale),
      pctCell(row.rate, locale),
      currencyCell(row.payment, locale, currencySymbol),
      currencyCell(row.extraPayment, locale, currencySymbol),
      currencyCell(row.totalPayment, locale, currencySymbol),
      currencyCell(row.interestPaid, locale, currencySymbol),
      currencyCell(row.principalPaid, locale, currencySymbol),
      currencyCell(row.balance, locale, currencySymbol),
    ]);
  }

  return wb.build();
}

// ── Compound Savings ──────────────────────────────────────────────────────────

export function compoundSavingsXlsx(
  result: CompoundSavingsResult,
  locale: string,
  currencySymbol: string,
): Buffer {
  const ar = locale === 'ar';
  const wb = new XlsxWorkbook();

  const summarySheet = wb.addSheet(ar ? 'ملخص' : 'Summary', { rtl: ar });
  summarySheet.setColWidths([{ col: 1, width: 30 }, { col: 2, width: 20 }]);

  summarySheet.addRow([bold(ar ? 'ملخص المدخرات المركبة' : 'Compound Savings Summary')]);
  summarySheet.addRow([cell(ar ? 'القيمة المستقبلية' : 'Future Value'), currencyCell(result.summary.futureValue, locale, currencySymbol)]);
  summarySheet.addRow([cell(ar ? 'إجمالي الاستثمار' : 'Total Invested'), currencyCell(result.summary.totalInvested, locale, currencySymbol)]);
  summarySheet.addRow([cell(ar ? 'الفائدة المكتسبة' : 'Interest Earned'), currencyCell(result.summary.interestEarned, locale, currencySymbol)]);

  const schedSheet = wb.addSheet(ar ? 'جدول المدخرات' : 'Schedule', { rtl: ar });
  schedSheet.setColWidths([
    { col: 1, width: 10 }, { col: 2, width: 14 }, { col: 3, width: 18 },
    { col: 4, width: 22 }, { col: 5, width: 16 }, { col: 6, width: 18 },
    { col: 7, width: 26 }, { col: 8, width: 24 },
  ]);

  const hdrs = ar
    ? ['السنة', 'معدل الفائدة', 'الفائدة', 'الودائع المجدولة', 'وديعة إضافية', 'الرصيد', 'إجمالي المساهمات', 'إجمالي الفائدة']
    : ['Year', 'Rate', 'Interest', 'Scheduled Deposits', 'Extra Deposit', 'Balance', 'Cumulative Contributions', 'Cumulative Interest'];
  schedSheet.addRow(hdrs.map(h => header(h)));

  for (const row of result.schedule) {
    schedSheet.addRow([
      intCell(row.year, locale),
      pctCell(row.rate, locale),
      currencyCell(row.interest, locale, currencySymbol),
      currencyCell(row.scheduledDeposits, locale, currencySymbol),
      currencyCell(row.extraDeposit, locale, currencySymbol),
      currencyCell(row.balance, locale, currencySymbol),
      currencyCell(row.cumulativeContribution, locale, currencySymbol),
      currencyCell(row.cumulativeInterest, locale, currencySymbol),
    ]);
  }

  return wb.build();
}

// ── Home Affordability ────────────────────────────────────────────────────────

export function homeAffordabilityXlsx(
  result: HomeAffordabilityResult,
  locale: string,
  currencySymbol: string,
): Buffer {
  const ar = locale === 'ar';
  const wb = new XlsxWorkbook();

  const sheet = wb.addSheet(ar ? 'نتائج' : 'Results', { rtl: ar });
  sheet.setColWidths([{ col: 1, width: 38 }, { col: 2, width: 22 }]);

  const row = (label: string, value: number | string) => {
    const valCell = typeof value === 'number'
      ? currencyCell(value, locale, currencySymbol)
      : cell(value);
    sheet.addRow([cell(label), valCell]);
  };

  sheet.addRow([bold(ar ? 'نتائج القدرة على شراء منزل' : 'Home Affordability Results')]);
  sheet.addBlank();

  if (ar) {
    row('الحد الأقصى لسعر المنزل', result.maxHomePrice);
    row('مبلغ القرض', result.loanAmount);
    row('الدفعة الأولى', result.downPaymentAmount);
    row('نسبة الدفعة الأولى', `${result.downPaymentPercent.toFixed(1)}%`);
    row('تكاليف الإغلاق المقدرة', result.estimatedClosingCosts);
    row('نسبة تكاليف الإغلاق', `${result.closingCostsPercent.toFixed(1)}%`);
    sheet.addBlank();
    sheet.addRow([bold('القيود المحسوبة')]);
    row('الديون الشهرية الحالية', result.currentMonthlyDebts);
    row('الحد الأقصى للدفعة (الدخل)', result.m1MaxPaymentIncome);
    row('الحد الأقصى للدفعة (نسبة الدين)', result.m2MaxPaymentDTI);
    row('الحد الأقصى للدفعة الشهرية', result.maxMonthlyPayment);
    row('إجمالي مصاريف السكن', result.totalHousingExpenses);
    row('الحد الأقصى لـ PI (المصاريف)', result.m3MaxPIExpenses);
    row('الحد الأقصى للسعر (الأموال)', result.maxHomePriceBasedOnFunds);
    row('الحد الأقصى لـ PI (الأموال)', result.m4MaxPIFunds);
    row('الحد الأقصى لدفعة PI', result.maxPIPayment);
  } else {
    row('Max Home Price', result.maxHomePrice);
    row('Loan Amount', result.loanAmount);
    row('Down Payment', result.downPaymentAmount);
    row('Down Payment %', `${result.downPaymentPercent.toFixed(1)}%`);
    row('Estimated Closing Costs', result.estimatedClosingCosts);
    row('Closing Costs %', `${result.closingCostsPercent.toFixed(1)}%`);
    sheet.addBlank();
    sheet.addRow([bold('Computed Constraints')]);
    row('Current Monthly Debts', result.currentMonthlyDebts);
    row('Max Payment (Income)', result.m1MaxPaymentIncome);
    row('Max Payment (DTI)', result.m2MaxPaymentDTI);
    row('Max Monthly Payment', result.maxMonthlyPayment);
    row('Total Housing Expenses', result.totalHousingExpenses);
    row('Max PI (Expenses)', result.m3MaxPIExpenses);
    row('Max Home Price (Funds)', result.maxHomePriceBasedOnFunds);
    row('Max PI (Funds)', result.m4MaxPIFunds);
    row('Max PI Payment', result.maxPIPayment);
  }

  return wb.build();
}

// ── Mortgage Payoff ───────────────────────────────────────────────────────────

export function mortgagePayoffXlsx(
  result: MortgagePayoffResult,
  locale: string,
  currencySymbol: string,
): Buffer {
  const ar = locale === 'ar';
  const wb = new XlsxWorkbook();

  const summarySheet = wb.addSheet(ar ? 'ملخص' : 'Summary', { rtl: ar });
  summarySheet.setColWidths([{ col: 1, width: 36 }, { col: 2, width: 20 }]);

  summarySheet.addRow([bold(ar ? 'ملخص سداد الرهن' : 'Mortgage Payoff Summary')]);
  summarySheet.addRow([cell(ar ? 'الدفعة المجدولة' : 'Scheduled Payment'), currencyCell(result.summary.scheduledPayment, locale, currencySymbol)]);
  summarySheet.addRow([cell(ar ? 'عدد الدفعات المجدولة' : 'Scheduled Number of Payments'), intCell(result.summary.scheduledNumberOfPayments, locale)]);
  summarySheet.addRow([cell(ar ? 'عدد الدفعات الفعلية' : 'Actual Number of Payments'), intCell(result.summary.actualNumberOfPayments, locale)]);
  summarySheet.addRow([cell(ar ? 'السنوات الموفرة' : 'Years Saved'), numCell(result.summary.yearsSaved, 1, locale)]);
  summarySheet.addRow([cell(ar ? 'إجمالي الدفعات المبكرة' : 'Total Early Payments'), currencyCell(result.summary.totalEarlyPayments, locale, currencySymbol)]);
  summarySheet.addRow([cell(ar ? 'إجمالي الفائدة' : 'Total Interest'), currencyCell(result.summary.totalInterest, locale, currencySymbol)]);
  summarySheet.addRow([cell(ar ? 'إجمالي المدفوع' : 'Total Paid'), currencyCell(result.summary.totalPaid, locale, currencySymbol)]);

  const schedSheet = wb.addSheet(ar ? 'جدول السداد' : 'Schedule', { rtl: ar });
  schedSheet.setColWidths([
    { col: 1, width: 8 }, { col: 2, width: 14 }, { col: 3, width: 20 },
    { col: 4, width: 20 }, { col: 5, width: 16 }, { col: 6, width: 16 },
    { col: 7, width: 16 }, { col: 8, width: 16 }, { col: 9, width: 20 }, { col: 10, width: 24 },
  ]);

  const hdrs = ar
    ? ['رقم', 'تاريخ الدفعة', 'الرصيد الافتتاحي', 'الدفعة المجدولة', 'دفعة إضافية', 'إجمالي الدفعة', 'الأصل', 'الفائدة', 'الرصيد الختامي', 'إجمالي الفائدة التراكمية']
    : ['No.', 'Payment Date', 'Beginning Balance', 'Scheduled Payment', 'Extra Payment', 'Total Payment', 'Principal', 'Interest', 'Ending Balance', 'Cumulative Interest'];
  schedSheet.addRow(hdrs.map(h => header(h)));

  for (const row of result.schedule) {
    schedSheet.addRow([
      intCell(row.paymentNumber, locale),
      dateCell(row.paymentDate, locale),
      currencyCell(row.beginningBalance, locale, currencySymbol),
      currencyCell(row.scheduledPayment, locale, currencySymbol),
      currencyCell(row.extraPayment, locale, currencySymbol),
      currencyCell(row.totalPayment, locale, currencySymbol),
      currencyCell(row.principal, locale, currencySymbol),
      currencyCell(row.interest, locale, currencySymbol),
      currencyCell(row.endingBalance, locale, currencySymbol),
      currencyCell(row.cumulativeInterest, locale, currencySymbol),
    ]);
  }

  return wb.build();
}

// ── Personal Zakat ────────────────────────────────────────────────────────────

export function personalZakatXlsx(
  input: PersonalZakatInput,
  result: PersonalZakatResult,
  locale: string,
  currencySymbol: string,
): Buffer {
  const ar = locale === 'ar';
  const wb = new XlsxWorkbook();

  // Summary sheet — nisab + total + zakat due.
  const summary = wb.addSheet(ar ? 'ملخص الزكاة' : 'Zakat Summary', { rtl: ar });
  summary.setColWidths([{ col: 1, width: 36 }, { col: 2, width: 22 }]);
  summary.addRow([bold(ar ? 'محرك حساب الزكاة (للحساب فقط، ليس فتوى)' : 'Calculation Engine (for calculation only, not a fatwa)')]);
  summary.addRow([cell(ar ? 'سعر الذهب (للجرام عيار 24)' : 'Gold Price (per 24K gram)'), currencyCell(input.goldPricePerGram, locale, currencySymbol)]);
  summary.addRow([cell(ar ? 'سعر الفضة (للجرام)' : 'Silver Price (per gram)'), currencyCell(input.silverPricePerGram, locale, currencySymbol)]);
  summary.addRow([cell(ar ? 'نصاب الذهب (85 جرام)' : 'Gold Nisab (85g)'), currencyCell(result.nisabGold, locale, currencySymbol)]);
  summary.addRow([cell(ar ? 'نصاب الفضة (595 جرام)' : 'Silver Nisab (595g)'), currencyCell(result.nisabSilver, locale, currencySymbol)]);
  summary.addRow([cell(ar ? 'النصاب المعتمد' : 'Effective Nisab'), currencyCell(result.effectiveNisab, locale, currencySymbol)]);
  summary.addRow([cell(ar ? 'إجمالي الثروة الصافية' : 'Total Net Wealth'), currencyCell(result.totalWealth, locale, currencySymbol)]);
  summary.addRow([
    cell(ar ? 'حالة النصاب' : 'Nisab Status'),
    cell(result.meetsNisab ? (ar ? 'بلغت النصاب' : 'Meets Nisab') : (ar ? 'لم تبلغ النصاب' : 'Below Nisab')),
  ]);
  summary.addRow([cell(ar ? 'الزكاة المستحقة (2.5%)' : 'Zakat Due (2.5%)'), currencyCell(result.zakatDue, locale, currencySymbol)]);

  // Asset breakdown sheet — one row per asset.
  const assets = wb.addSheet(ar ? 'تفصيل الأصول' : 'Assets', { rtl: ar });
  assets.setColWidths([
    { col: 1, width: 18 }, { col: 2, width: 32 }, { col: 3, width: 14 },
    { col: 4, width: 18 }, { col: 5, width: 22 },
  ]);
  const hdrs = ar
    ? ['الفئة', 'الوصف', 'الوزن (جم)', 'سعر الوحدة', 'القيمة الصافية']
    : ['Category', 'Description', 'Weight (g)', 'Value/Unit', 'Net Value'];
  assets.addRow(hdrs.map((h) => header(h)));
  for (const row of result.rows) {
    assets.addRow([
      cell(row.category),
      cell(row.description || '-'),
      row.category === 'cash' ? cell('-') : numCell(row.weight, 2, locale),
      currencyCell(row.valuePerUnit, locale, currencySymbol),
      currencyCell(row.netValue, locale, currencySymbol),
    ]);
  }

  return wb.build();
}

// ── UAE Gratuity ──────────────────────────────────────────────────────────────

export function uaeGratuityXlsx(
  input: UaeGratuityInput,
  result: UaeGratuityResult,
  locale: string,
  currencySymbol: string,
): Buffer {
  const ar = locale === 'ar';
  const wb = new XlsxWorkbook();

  const sheet = wb.addSheet(ar ? 'مكافأة نهاية الخدمة' : 'Gratuity', { rtl: ar });
  sheet.setColWidths([{ col: 1, width: 32 }, { col: 2, width: 22 }]);

  sheet.addRow([bold(ar ? 'حاسبة مكافأة نهاية الخدمة (الإمارات)' : 'UAE Gratuity Calculator')]);
  sheet.addRow([
    cell(ar ? 'نوع العقد' : 'Contract Type'),
    cell(input.contractType === 'limited' ? (ar ? 'محدود' : 'Limited') : (ar ? 'غير محدود' : 'Unlimited')),
  ]);
  sheet.addRow([cell(ar ? 'تاريخ المباشرة' : 'Joining Date'), dateCell(new Date(input.joiningDate), locale)]);
  sheet.addRow([cell(ar ? 'تاريخ الانتهاء' : 'End Date'), dateCell(new Date(input.endDate), locale)]);
  sheet.addRow([cell(ar ? 'الراتب الأساسي' : 'Basic Salary'), currencyCell(input.basicSalary, locale, currencySymbol)]);
  sheet.addRow([cell(ar ? 'بدل السكن' : 'Housing Allowance'), currencyCell(input.housing, locale, currencySymbol)]);
  sheet.addRow([cell(ar ? 'بدل المواصلات' : 'Transportation'), currencyCell(input.transportation, locale, currencySymbol)]);
  sheet.addRow([cell(ar ? 'إجمالي الراتب' : 'Total Salary'), currencyCell(result.totalSalary, locale, currencySymbol)]);
  sheet.addRow([cell(ar ? 'أشهر الخدمة' : 'Months of Service'), intCell(result.monthsOfService, locale)]);
  sheet.addRow([cell(ar ? 'سنوات الخدمة' : 'Years of Service'), numCell(result.yearsOfService, 2, locale)]);
  sheet.addRow([cell(ar ? 'الأيام المعادلة' : 'Equivalent Days of Basic'), numCell(result.equivalentDaysOfBasic, 1, locale)]);
  sheet.addRow([cell(ar ? 'مكافأة نهاية الخدمة' : 'Gratuity Amount'), currencyCell(result.gratuity, locale, currencySymbol)]);

  return wb.build();
}

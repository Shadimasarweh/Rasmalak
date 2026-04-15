/**
 * Excel (.xlsx) export for all calculators.
 * Uses SheetJS (xlsx) to produce properly formatted workbooks:
 *   - Actual .xlsx binary (not CSV)
 *   - Numbers stored as numbers, not strings, with currency/percent cell formats
 *   - Column widths sized to content
 *   - RTL worksheet flag for Arabic
 *   - Two sheets for calculators with schedules: Summary + Schedule
 */

import * as XLSX from 'xlsx';

import type { SimpleLoanResult } from './simpleLoanCalculator';
import type { CreditCardResult } from './creditCardCalculator';
import type { CompoundSavingsResult } from './compoundSavingsCalculator';
import type { HomeAffordabilityResult } from './homeAffordabilityCalculator';
import type { MortgagePayoffResult } from './mortgagePayoffCalculator';

// ── Helpers ─────────────────────────────────────────────────────────────────

const CURRENCY_FMT = '#,##0.00';
const PERCENT_FMT = '0.00%';
const INTEGER_FMT = '#,##0';

type CellValue = string | number | null;

/**
 * Create a worksheet from a 2-D array, then apply column widths, RTL flag,
 * and per-column number formats.
 */
function buildSheet(
  data: CellValue[][],
  opts: {
    rtl?: boolean;
    colWidths: number[]; // character widths
    // Each entry applies `fmt` to every numeric cell in `col` starting at `fromRow`
    colFmts?: Array<{ col: number; fmt: string; fromRow?: number }>;
  },
): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = opts.colWidths.map(wch => ({ wch }));

  if (opts.rtl) {
    ws['!rtl'] = true;
  }

  if (opts.colFmts) {
    const nRows = data.length;
    for (const { col, fmt, fromRow = 0 } of opts.colFmts) {
      for (let r = fromRow; r < nRows; r++) {
        const ref = XLSX.utils.encode_cell({ r, c: col });
        const cell: XLSX.CellObject | undefined = ws[ref];
        if (cell && typeof cell.v === 'number') {
          cell.z = fmt;
        }
      }
    }
  }

  return ws;
}

/** Write workbook to an .xlsx blob and trigger browser download. */
function triggerDownload(wb: XLSX.WorkBook, filename: string): void {
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
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

// ── Simple Loan ──────────────────────────────────────────────────────────────

export function exportSimpleLoanCSV(
  result: SimpleLoanResult,
  locale: string,
  _currencySymbol: string,
): void {
  const ar = locale === 'ar';
  const wb = XLSX.utils.book_new();

  // — Summary sheet —
  const summaryData: CellValue[][] = ar
    ? [
        ['ملخص القرض', ''],
        ['الدفعة الشهرية', result.summary.monthlyPayment],
        ['عدد الدفعات', result.summary.numberOfPayments],
        ['إجمالي الفائدة', result.summary.totalInterest],
        ['التكلفة الإجمالية', result.summary.totalCost],
      ]
    : [
        ['Loan Summary', ''],
        ['Monthly Payment', result.summary.monthlyPayment],
        ['Number of Payments', result.summary.numberOfPayments],
        ['Total Interest', result.summary.totalInterest],
        ['Total Cost of Loan', result.summary.totalCost],
      ];

  const summarySheet = buildSheet(summaryData, {
    rtl: ar,
    colWidths: [28, 18],
    colFmts: [
      { col: 1, fmt: CURRENCY_FMT, fromRow: 1 },
      // Override the integer row (row 2, "Number of Payments") with integer format
      // — handled below after sheet creation
    ],
  });
  // "Number of Payments" is an integer — override its format
  const nPaymentsRef = XLSX.utils.encode_cell({ r: 2, c: 1 });
  if (summarySheet[nPaymentsRef]) summarySheet[nPaymentsRef].z = INTEGER_FMT;

  XLSX.utils.book_append_sheet(wb, summarySheet, ar ? 'ملخص' : 'Summary');

  // — Schedule sheet —
  const headers: CellValue[] = ar
    ? ['رقم', 'تاريخ الدفعة', 'الرصيد الافتتاحي', 'الدفعة', 'المبلغ الأصلي', 'الفائدة', 'الرصيد الختامي']
    : ['No.', 'Payment Date', 'Beginning Balance', 'Payment', 'Principal', 'Interest', 'Ending Balance'];

  const scheduleData: CellValue[][] = [
    headers,
    ...result.schedule.map(row => [
      row.paymentNumber,
      fmtDate(row.paymentDate),
      row.beginningBalance,
      row.payment,
      row.principal,
      row.interest,
      row.endingBalance,
    ]),
  ];

  const scheduleSheet = buildSheet(scheduleData, {
    rtl: ar,
    colWidths: [8, 14, 22, 16, 16, 16, 20],
    colFmts: [
      { col: 2, fmt: CURRENCY_FMT, fromRow: 1 },
      { col: 3, fmt: CURRENCY_FMT, fromRow: 1 },
      { col: 4, fmt: CURRENCY_FMT, fromRow: 1 },
      { col: 5, fmt: CURRENCY_FMT, fromRow: 1 },
      { col: 6, fmt: CURRENCY_FMT, fromRow: 1 },
    ],
  });

  XLSX.utils.book_append_sheet(wb, scheduleSheet, ar ? 'جدول السداد' : 'Schedule');

  triggerDownload(wb, ar ? 'تقرير_القرض_البسيط.xlsx' : 'Simple_Loan_Report.xlsx');
}

// ── Credit Card ──────────────────────────────────────────────────────────────

export function exportCreditCardCSV(
  result: CreditCardResult,
  locale: string,
  _currencySymbol: string,
): void {
  const ar = locale === 'ar';
  const wb = XLSX.utils.book_new();

  // — Summary sheet —
  const summaryData: CellValue[][] = ar
    ? [
        ['ملخص بطاقة الائتمان', ''],
        ['أول دفعة', result.summary.firstPayment],
        ['أعلى دفعة', result.summary.maxPayment],
        ['عدد الأشهر حتى السداد', result.summary.monthsToPayOff],
        ['عدد السنوات حتى السداد', result.summary.yearsToPayOff],
        ['إجمالي الفوائد المدفوعة', result.summary.totalInterestPaid],
        ['إجمالي المبلغ المدفوع', result.summary.totalAmountPaid],
      ]
    : [
        ['Credit Card Summary', ''],
        ['First Payment', result.summary.firstPayment],
        ['Max Payment', result.summary.maxPayment],
        ['Months to Pay Off', result.summary.monthsToPayOff],
        ['Years to Pay Off', result.summary.yearsToPayOff],
        ['Total Interest Paid', result.summary.totalInterestPaid],
        ['Total Amount Paid', result.summary.totalAmountPaid],
      ];

  const summarySheet = buildSheet(summaryData, {
    rtl: ar,
    colWidths: [30, 18],
    colFmts: [{ col: 1, fmt: CURRENCY_FMT, fromRow: 1 }],
  });
  // Months/years are not currency amounts — override with integer/decimal formats
  const monthsRef = XLSX.utils.encode_cell({ r: 3, c: 1 });
  const yearsRef = XLSX.utils.encode_cell({ r: 4, c: 1 });
  if (summarySheet[monthsRef]) summarySheet[monthsRef].z = INTEGER_FMT;
  if (summarySheet[yearsRef]) summarySheet[yearsRef].z = '0.0';

  XLSX.utils.book_append_sheet(wb, summarySheet, ar ? 'ملخص' : 'Summary');

  // — Schedule sheet —
  // row.rate is decimal (e.g. 0.21 = 21%) — store as-is with percent format
  const headers: CellValue[] = ar
    ? ['رقم', 'معدل الفائدة', 'الدفعة', 'دفعة إضافية', 'إجمالي الدفعة', 'الفائدة المدفوعة', 'الأصل المدفوع', 'الرصيد']
    : ['No.', 'Interest Rate', 'Payment', 'Extra Payment', 'Total Payment', 'Interest Paid', 'Principal Paid', 'Balance'];

  const scheduleData: CellValue[][] = [
    headers,
    ...result.schedule.map(row => [
      row.paymentNumber,
      row.rate,
      row.payment,
      row.extraPayment,
      row.totalPayment,
      row.interestPaid,
      row.principalPaid,
      row.balance,
    ]),
  ];

  const scheduleSheet = buildSheet(scheduleData, {
    rtl: ar,
    colWidths: [8, 16, 16, 16, 16, 16, 16, 16],
    colFmts: [
      { col: 1, fmt: PERCENT_FMT, fromRow: 1 },
      { col: 2, fmt: CURRENCY_FMT, fromRow: 1 },
      { col: 3, fmt: CURRENCY_FMT, fromRow: 1 },
      { col: 4, fmt: CURRENCY_FMT, fromRow: 1 },
      { col: 5, fmt: CURRENCY_FMT, fromRow: 1 },
      { col: 6, fmt: CURRENCY_FMT, fromRow: 1 },
      { col: 7, fmt: CURRENCY_FMT, fromRow: 1 },
    ],
  });

  XLSX.utils.book_append_sheet(wb, scheduleSheet, ar ? 'جدول السداد' : 'Schedule');

  triggerDownload(wb, ar ? 'تقرير_بطاقة_الائتمان.xlsx' : 'Credit_Card_Report.xlsx');
}

// ── Compound Savings ─────────────────────────────────────────────────────────

export function exportCompoundSavingsCSV(
  result: CompoundSavingsResult,
  locale: string,
  _currencySymbol: string,
): void {
  const ar = locale === 'ar';
  const wb = XLSX.utils.book_new();

  // — Summary sheet —
  const summaryData: CellValue[][] = ar
    ? [
        ['ملخص المدخرات المركبة', ''],
        ['القيمة المستقبلية', result.summary.futureValue],
        ['إجمالي الاستثمار', result.summary.totalInvested],
        ['الفائدة المكتسبة', result.summary.interestEarned],
      ]
    : [
        ['Compound Savings Summary', ''],
        ['Future Value', result.summary.futureValue],
        ['Total Invested', result.summary.totalInvested],
        ['Interest Earned', result.summary.interestEarned],
      ];

  const summarySheet = buildSheet(summaryData, {
    rtl: ar,
    colWidths: [28, 18],
    colFmts: [{ col: 1, fmt: CURRENCY_FMT, fromRow: 1 }],
  });

  XLSX.utils.book_append_sheet(wb, summarySheet, ar ? 'ملخص' : 'Summary');

  // — Schedule sheet —
  const headers: CellValue[] = ar
    ? ['السنة', 'معدل الفائدة', 'الفائدة', 'الودائع المجدولة', 'وديعة إضافية', 'الرصيد', 'إجمالي المساهمات', 'إجمالي الفائدة']
    : ['Year', 'Rate', 'Interest', 'Scheduled Deposits', 'Extra Deposit', 'Balance', 'Cumulative Contributions', 'Cumulative Interest'];

  const scheduleData: CellValue[][] = [
    headers,
    ...result.schedule.map(row => [
      row.year,
      row.rate,
      row.interest,
      row.scheduledDeposits,
      row.extraDeposit,
      row.balance,
      row.cumulativeContribution,
      row.cumulativeInterest,
    ]),
  ];

  const scheduleSheet = buildSheet(scheduleData, {
    rtl: ar,
    colWidths: [10, 14, 16, 24, 16, 16, 26, 24],
    colFmts: [
      { col: 1, fmt: PERCENT_FMT, fromRow: 1 },
      { col: 2, fmt: CURRENCY_FMT, fromRow: 1 },
      { col: 3, fmt: CURRENCY_FMT, fromRow: 1 },
      { col: 4, fmt: CURRENCY_FMT, fromRow: 1 },
      { col: 5, fmt: CURRENCY_FMT, fromRow: 1 },
      { col: 6, fmt: CURRENCY_FMT, fromRow: 1 },
      { col: 7, fmt: CURRENCY_FMT, fromRow: 1 },
    ],
  });

  XLSX.utils.book_append_sheet(wb, scheduleSheet, ar ? 'جدول المدخرات' : 'Schedule');

  triggerDownload(wb, ar ? 'تقرير_المدخرات_المركبة.xlsx' : 'Compound_Savings_Report.xlsx');
}

// ── Home Affordability ───────────────────────────────────────────────────────

export function exportHomeAffordabilityCSV(
  result: HomeAffordabilityResult,
  locale: string,
  _currencySymbol: string,
): void {
  const ar = locale === 'ar';
  const wb = XLSX.utils.book_new();

  // Single sheet — label/value pairs, currency amounts as numbers, percentages as strings
  const data: CellValue[][] = ar
    ? [
        ['نتائج القدرة على شراء منزل', ''],
        ['', ''],
        ['الحد الأقصى لسعر المنزل', result.maxHomePrice],
        ['مبلغ القرض', result.loanAmount],
        ['الدفعة الأولى', result.downPaymentAmount],
        ['نسبة الدفعة الأولى', `${result.downPaymentPercent.toFixed(1)}%`],
        ['تكاليف الإغلاق المقدرة', result.estimatedClosingCosts],
        ['نسبة تكاليف الإغلاق', `${result.closingCostsPercent.toFixed(1)}%`],
        ['', ''],
        ['القيود المحسوبة', ''],
        ['الديون الشهرية الحالية', result.currentMonthlyDebts],
        ['الحد الأقصى للدفعة (الدخل)', result.m1MaxPaymentIncome],
        ['الحد الأقصى للدفعة (نسبة الدين)', result.m2MaxPaymentDTI],
        ['الحد الأقصى للدفعة الشهرية', result.maxMonthlyPayment],
        ['إجمالي مصاريف السكن', result.totalHousingExpenses],
        ['الحد الأقصى لـ PI (المصاريف)', result.m3MaxPIExpenses],
        ['الحد الأقصى للسعر (الأموال)', result.maxHomePriceBasedOnFunds],
        ['الحد الأقصى لـ PI (الأموال)', result.m4MaxPIFunds],
        ['الحد الأقصى لدفعة PI', result.maxPIPayment],
      ]
    : [
        ['Home Affordability Results', ''],
        ['', ''],
        ['Max Home Price', result.maxHomePrice],
        ['Loan Amount', result.loanAmount],
        ['Down Payment', result.downPaymentAmount],
        ['Down Payment %', `${result.downPaymentPercent.toFixed(1)}%`],
        ['Estimated Closing Costs', result.estimatedClosingCosts],
        ['Closing Costs %', `${result.closingCostsPercent.toFixed(1)}%`],
        ['', ''],
        ['Computed Constraints', ''],
        ['Current Monthly Debts', result.currentMonthlyDebts],
        ['Max Payment (Income)', result.m1MaxPaymentIncome],
        ['Max Payment (DTI)', result.m2MaxPaymentDTI],
        ['Max Monthly Payment', result.maxMonthlyPayment],
        ['Total Housing Expenses', result.totalHousingExpenses],
        ['Max PI (Expenses)', result.m3MaxPIExpenses],
        ['Max Home Price (Funds)', result.maxHomePriceBasedOnFunds],
        ['Max PI (Funds)', result.m4MaxPIFunds],
        ['Max PI Payment', result.maxPIPayment],
      ];

  const ws = buildSheet(data, {
    rtl: ar,
    colWidths: [36, 20],
    colFmts: [{ col: 1, fmt: CURRENCY_FMT, fromRow: 1 }],
  });

  XLSX.utils.book_append_sheet(wb, ws, ar ? 'نتائج' : 'Results');

  triggerDownload(
    wb,
    ar ? 'تقرير_القدرة_على_شراء_منزل.xlsx' : 'Home_Affordability_Report.xlsx',
  );
}

// ── Mortgage Payoff ──────────────────────────────────────────────────────────

export function exportMortgagePayoffCSV(
  result: MortgagePayoffResult,
  locale: string,
  _currencySymbol: string,
): void {
  const ar = locale === 'ar';
  const wb = XLSX.utils.book_new();

  // — Summary sheet —
  const summaryData: CellValue[][] = ar
    ? [
        ['ملخص سداد الرهن', ''],
        ['الدفعة المجدولة', result.summary.scheduledPayment],
        ['عدد الدفعات المجدولة', result.summary.scheduledNumberOfPayments],
        ['عدد الدفعات الفعلية', result.summary.actualNumberOfPayments],
        ['السنوات الموفرة', result.summary.yearsSaved],
        ['إجمالي الدفعات المبكرة', result.summary.totalEarlyPayments],
        ['إجمالي الفائدة', result.summary.totalInterest],
        ['إجمالي المدفوع', result.summary.totalPaid],
      ]
    : [
        ['Mortgage Payoff Summary', ''],
        ['Scheduled Payment', result.summary.scheduledPayment],
        ['Scheduled Number of Payments', result.summary.scheduledNumberOfPayments],
        ['Actual Number of Payments', result.summary.actualNumberOfPayments],
        ['Years Saved', result.summary.yearsSaved],
        ['Total Early Payments', result.summary.totalEarlyPayments],
        ['Total Interest', result.summary.totalInterest],
        ['Total Paid', result.summary.totalPaid],
      ];

  const summarySheet = buildSheet(summaryData, {
    rtl: ar,
    colWidths: [34, 18],
    colFmts: [{ col: 1, fmt: CURRENCY_FMT, fromRow: 1 }],
  });
  // Payment counts and years saved are not currency
  const intRows = [2, 3]; // scheduledNumberOfPayments, actualNumberOfPayments
  intRows.forEach(r => {
    const ref = XLSX.utils.encode_cell({ r, c: 1 });
    if (summarySheet[ref]) summarySheet[ref].z = INTEGER_FMT;
  });
  const yearsSavedRef = XLSX.utils.encode_cell({ r: 4, c: 1 });
  if (summarySheet[yearsSavedRef]) summarySheet[yearsSavedRef].z = '0.0';

  XLSX.utils.book_append_sheet(wb, summarySheet, ar ? 'ملخص' : 'Summary');

  // — Schedule sheet —
  const headers: CellValue[] = ar
    ? ['رقم', 'تاريخ الدفعة', 'الرصيد الافتتاحي', 'الدفعة المجدولة', 'دفعة إضافية', 'إجمالي الدفعة', 'الأصل', 'الفائدة', 'الرصيد الختامي', 'إجمالي الفائدة التراكمية']
    : ['No.', 'Payment Date', 'Beginning Balance', 'Scheduled Payment', 'Extra Payment', 'Total Payment', 'Principal', 'Interest', 'Ending Balance', 'Cumulative Interest'];

  const scheduleData: CellValue[][] = [
    headers,
    ...result.schedule.map(row => [
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
    ]),
  ];

  const scheduleSheet = buildSheet(scheduleData, {
    rtl: ar,
    colWidths: [8, 14, 20, 20, 16, 16, 16, 16, 20, 24],
    colFmts: [
      { col: 2, fmt: CURRENCY_FMT, fromRow: 1 },
      { col: 3, fmt: CURRENCY_FMT, fromRow: 1 },
      { col: 4, fmt: CURRENCY_FMT, fromRow: 1 },
      { col: 5, fmt: CURRENCY_FMT, fromRow: 1 },
      { col: 6, fmt: CURRENCY_FMT, fromRow: 1 },
      { col: 7, fmt: CURRENCY_FMT, fromRow: 1 },
      { col: 8, fmt: CURRENCY_FMT, fromRow: 1 },
      { col: 9, fmt: CURRENCY_FMT, fromRow: 1 },
    ],
  });

  XLSX.utils.book_append_sheet(wb, scheduleSheet, ar ? 'جدول السداد' : 'Schedule');

  triggerDownload(wb, ar ? 'تقرير_سداد_الرهن.xlsx' : 'Mortgage_Payoff_Report.xlsx');
}

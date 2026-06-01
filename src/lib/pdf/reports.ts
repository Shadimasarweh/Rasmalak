/**
 * PDF report generators for all 5 calculators.
 * Each function returns a Buffer — no browser APIs used.
 */

import type { SimpleLoanInput, SimpleLoanResult } from '@/calculators/simpleLoanCalculator';
import type { CreditCardInput, CreditCardResult } from '@/calculators/creditCardCalculator';
import type { CompoundSavingsInput, CompoundSavingsResult } from '@/calculators/compoundSavingsCalculator';
import type { HomeAffordabilityInput, HomeAffordabilityResult } from '@/calculators/homeAffordabilityCalculator';
import type { MortgagePayoffInput, MortgagePayoffResult } from '@/calculators/mortgagePayoffCalculator';
import type { PersonalZakatInput, PersonalZakatResult } from '@/calculators/personalZakatCalculator';
import type { UaeGratuityInput, UaeGratuityResult } from '@/calculators/uaeGratuityCalculator';

import { ReportDocument, buildScheduleColumns, AVAIL_H } from './builder';
import { MARGIN_X, MARGIN_TOP, CONTENT_W, PAGE_H, MARGIN_BOTTOM, COLORS } from './layout';
import type { PageContext } from './layout';
import { drawTable } from './layout';
import type { TableRow } from './layout';

const HEADER_H = 44;   // navy bar + accent + spacing
const SECTION_H = 28;  // section heading + spacing
const SUMMARY_H = 110; // two-column summary block

/**
 * Draws a tinted caution callout (title in bold + one line of body).
 * Used by the Personal Zakat report to mirror the in-app banner and
 * the A1 caption from the source Excel template.
 */
function drawCautionCallout(
  ctx: PageContext,
  title: string,
  body: string,
  ar: boolean,
): void {
  const padX = 8;
  const padY = 6;
  const titleSize = 9;
  const bodySize = 8.5;
  const lineGap = 4;
  const boxH = padY * 2 + titleSize + lineGap + bodySize;
  const x = MARGIN_X;
  const y = ctx.y;

  // Light amber/gold tint (alpha-free RGB approximation).
  const fill: [number, number, number] = [0.992, 0.957, 0.871];
  ctx.drawRect(x, y, CONTENT_W, boxH, fill);

  const align = ar ? ('right' as const) : ('left' as const);
  const textX = ar ? x + CONTENT_W - padX : x + padX;
  const maxW = CONTENT_W - padX * 2;
  ctx.drawText(title, textX, y + padY, {
    size: titleSize,
    bold: true,
    color: COLORS.navy,
    align,
    maxWidth: maxW,
  });
  ctx.drawText(body, textX, y + padY + titleSize + lineGap, {
    size: bodySize,
    color: COLORS.black,
    align,
    maxWidth: maxW,
  });

  // Advance the cursor past the callout (drawText / drawRect don't
  // auto-advance, so we bump by the full box height + spacer).
  ctx.advanceY(boxH + 8);
}

// ── Simple Loan ───────────────────────────────────────────────────────────────

export function simpleLoanPdf(
  input: SimpleLoanInput,
  result: SimpleLoanResult,
  locale: string,
  currencySymbol: string,
): Buffer {
  const ar = locale === 'ar';
  const doc = new ReportDocument({ locale, currencySymbol });

  // ── Page 1: header + summary ──
  const p1 = doc.newPage(true);
  doc.drawPageHeader(p1, ar ? 'جدول سداد القرض' : 'Loan Amortization Schedule', ar ? 'تقرير القرض البسيط' : 'Simple Loan Report');

  doc.drawSummaryColumns(
    p1,
    ar ? 'بيانات المدخلات' : 'Input Parameters',
    [
      [ar ? 'مبلغ القرض' : 'Loan Amount', doc.fmtCurrency(input.loanAmount)],
      [ar ? 'نسبة الفائدة السنوية' : 'Annual Interest Rate', `${doc.fmtNum(input.annualInterestRate)}%`],
      [ar ? 'مدة القرض' : 'Loan Period', `${doc.fmtInt(input.loanPeriodYears)} ${ar ? 'سنة' : 'years'}`],
      [ar ? 'تاريخ بداية القرض' : 'Start Date', doc.fmtDate(new Date(input.startDate))],
    ],
    ar ? 'ملخص القرض' : 'Loan Summary',
    [
      [ar ? 'الدفعة الشهرية' : 'Monthly Payment', doc.fmtCurrency(result.summary.monthlyPayment)],
      [ar ? 'عدد الدفعات' : 'Number of Payments', doc.fmtInt(result.summary.numberOfPayments)],
      [ar ? 'إجمالي الفائدة' : 'Total Interest', doc.fmtCurrency(result.summary.totalInterest)],
      [ar ? 'التكلفة الإجمالية' : 'Total Cost of Loan', doc.fmtCurrency(result.summary.totalCost)],
    ],
  );

  // Schedule table — may span multiple pages
  doc.drawSectionHeading(p1, ar ? 'جدول الأقساط' : 'Amortization Schedule');

  const hdrs = ar
    ? ['الرصيد الختامي', 'الفائدة', 'المبلغ الأصلي', 'الدفعة', 'الرصيد الافتتاحي', 'تاريخ الدفعة', 'رقم']
    : ['No.', 'Payment Date', 'Beginning Balance', 'Payment', 'Principal', 'Interest', 'Ending Balance'];
  const colW = CONTENT_W / 7;
  const cols = buildScheduleColumns(ar ? [...hdrs].reverse() : hdrs, Array(7).fill(colW));

  const schedRows: TableRow[] = result.schedule.map((row, i) => ({
    cells: [
      doc.fmtInt(row.paymentNumber),
      doc.fmtDate(row.paymentDate),
      doc.fmtCurrency(row.beginningBalance),
      doc.fmtCurrency(row.payment),
      doc.fmtCurrency(row.principal),
      doc.fmtCurrency(row.interest),
      doc.fmtCurrency(row.endingBalance),
    ],
    altFill: i % 2 === 1,
  }));

  renderSchedulePages(doc, p1, cols, schedRows, 1);

  return doc.build();
}

// ── Credit Card ───────────────────────────────────────────────────────────────

export function creditCardPdf(
  input: CreditCardInput,
  result: CreditCardResult,
  locale: string,
  currencySymbol: string,
): Buffer {
  const ar = locale === 'ar';
  const doc = new ReportDocument({ locale, currencySymbol });

  const p1 = doc.newPage(true);
  doc.drawPageHeader(p1, ar ? 'جدول سداد بطاقة الائتمان' : 'Credit Card Payment Schedule', ar ? 'تقرير سداد بطاقة الائتمان' : 'Credit Card Payoff Report');

  doc.drawSummaryColumns(
    p1,
    ar ? 'بيانات البطاقة' : 'Card Details',
    [
      [ar ? 'الرصيد الحالي' : 'Current Balance', doc.fmtCurrency(input.currentBalance)],
      [ar ? 'نسبة الفائدة' : 'Interest Rate', `${doc.fmtNum(input.annualInterestRate)}%`],
      [ar ? 'نسبة الحد الأدنى' : 'Min Payment %', `${doc.fmtNum(input.minPaymentPercent)}%`],
      [ar ? 'الحد الأدنى للدفعة' : 'Min Payment Floor', doc.fmtCurrency(input.minPaymentFloor)],
    ],
    ar ? 'ملخص السداد' : 'Payoff Summary',
    [
      [ar ? 'الدفعة الأولى' : 'First Payment', doc.fmtCurrency(result.summary.firstPayment)],
      [ar ? 'أعلى دفعة' : 'Max Payment', doc.fmtCurrency(result.summary.maxPayment)],
      [ar ? 'أشهر السداد' : 'Months to Pay Off', doc.fmtInt(result.summary.monthsToPayOff)],
      [ar ? 'إجمالي الفائدة المدفوعة' : 'Total Interest Paid', doc.fmtCurrency(result.summary.totalInterestPaid)],
      [ar ? 'إجمالي المبلغ المدفوع' : 'Total Amount Paid', doc.fmtCurrency(result.summary.totalAmountPaid)],
    ],
  );

  doc.drawSectionHeading(p1, ar ? 'جدول الدفعات' : 'Payment Schedule');

  const hdrs = ar
    ? ['الرصيد', 'الأصل المدفوع', 'الفائدة المدفوعة', 'إجمالي الدفعة', 'دفعة إضافية', 'الدفعة', 'معدل الفائدة', 'رقم']
    : ['No.', 'Interest Rate', 'Payment', 'Extra Payment', 'Total Payment', 'Interest Paid', 'Principal Paid', 'Balance'];
  const colW = CONTENT_W / 8;
  const cols = buildScheduleColumns(ar ? [...hdrs].reverse() : hdrs, Array(8).fill(colW));

  const schedRows: TableRow[] = result.schedule.map((row, i) => ({
    cells: [
      doc.fmtInt(row.paymentNumber),
      doc.fmtPct(row.rate),
      doc.fmtCurrency(row.payment),
      doc.fmtCurrency(row.extraPayment),
      doc.fmtCurrency(row.totalPayment),
      doc.fmtCurrency(row.interestPaid),
      doc.fmtCurrency(row.principalPaid),
      doc.fmtCurrency(row.balance),
    ],
    altFill: i % 2 === 1,
  }));

  renderSchedulePages(doc, p1, cols, schedRows, 1);

  return doc.build();
}

// ── Compound Savings ──────────────────────────────────────────────────────────

export function compoundSavingsPdf(
  input: CompoundSavingsInput,
  result: CompoundSavingsResult,
  locale: string,
  currencySymbol: string,
): Buffer {
  const ar = locale === 'ar';
  const doc = new ReportDocument({ locale, currencySymbol });

  const p1 = doc.newPage(true);
  doc.drawPageHeader(p1, ar ? 'تقرير الادخار بالفائدة المركبة' : 'Compound Savings Report', ar ? 'توقع نمو الادخار' : 'Savings Growth Projection');

  const freqMap: Record<string, string> = { monthly: ar ? 'شهري' : 'Monthly', quarterly: ar ? 'ربع سنوي' : 'Quarterly', annually: ar ? 'سنوي' : 'Annually' };

  doc.drawSummaryColumns(
    p1,
    ar ? 'مدخلات خطة التوفير' : 'Savings Plan Inputs',
    [
      [ar ? 'سنوات الاستثمار' : 'Years to Invest', `${doc.fmtInt(input.yearsToInvest)} ${ar ? 'سنة' : 'years'}`],
      [ar ? 'الاستثمار الأولي' : 'Initial Investment', doc.fmtCurrency(input.initialInvestment)],
      [ar ? 'نسبة الفائدة السنوية' : 'Annual Interest Rate', doc.fmtPct(input.annualInterestRate)],
      [ar ? 'مبلغ الإيداع' : 'Deposit Amount', doc.fmtCurrency(input.depositAmount)],
      [ar ? 'تكرار الإيداع' : 'Deposit Frequency', freqMap[input.depositFrequency] ?? input.depositFrequency],
    ],
    ar ? 'ملخص النتائج' : 'Summary of Results',
    [
      [ar ? 'القيمة المستقبلية المقدرة' : 'Estimated Future Value', doc.fmtCurrency(result.summary.futureValue)],
      [ar ? 'المبلغ المستثمر' : 'Total Invested', doc.fmtCurrency(result.summary.totalInvested)],
      [ar ? 'الفائدة المقدرة' : 'Interest Earned', doc.fmtCurrency(result.summary.interestEarned)],
    ],
  );

  doc.drawSectionHeading(p1, ar ? 'جدول نمو الادخار' : 'Savings Growth Schedule');

  const hdrs = ar
    ? ['مجموع الفائدة', 'مجموع الإيداع', 'الرصيد', 'إيداع إضافي', 'الإيداع', 'قيمة الفائدة', 'النسبة', 'السنة']
    : ['Year', 'Rate', 'Interest', 'Scheduled Deposits', 'Extra Deposit', 'Balance', 'Cumulative Contributions', 'Cumulative Interest'];
  const colW = CONTENT_W / 8;
  const cols = buildScheduleColumns(ar ? [...hdrs].reverse() : hdrs, Array(8).fill(colW));

  const schedRows: TableRow[] = result.schedule.map((row, i) => ({
    cells: [
      doc.fmtInt(row.year),
      doc.fmtPct(row.rate),
      doc.fmtCurrency(row.interest),
      doc.fmtCurrency(row.scheduledDeposits),
      doc.fmtCurrency(row.extraDeposit),
      doc.fmtCurrency(row.balance),
      doc.fmtCurrency(row.cumulativeContribution),
      doc.fmtCurrency(row.cumulativeInterest),
    ],
    altFill: i % 2 === 1,
  }));

  renderSchedulePages(doc, p1, cols, schedRows, 1);

  return doc.build();
}

// ── Home Affordability ────────────────────────────────────────────────────────

export function homeAffordabilityPdf(
  input: HomeAffordabilityInput,
  result: HomeAffordabilityResult,
  locale: string,
  currencySymbol: string,
): Buffer {
  const ar = locale === 'ar';
  const doc = new ReportDocument({ locale, currencySymbol });

  const p1 = doc.newPage(true);
  doc.drawPageHeader(p1, ar ? 'تقرير القدرة على شراء منزل' : 'Home Affordability Report', ar ? 'نتائج تفصيلية' : 'Detailed Results');

  // Key results
  doc.drawSummaryColumns(
    p1,
    ar ? 'النتيجة الرئيسية' : 'Key Results',
    [
      [ar ? 'الحد الأقصى لسعر المنزل' : 'Max Home Price', doc.fmtCurrency(result.maxHomePrice)],
      [ar ? 'مبلغ القرض' : 'Loan Amount', doc.fmtCurrency(result.loanAmount)],
      [ar ? 'الدفعة الأولى' : 'Down Payment', doc.fmtCurrency(result.downPaymentAmount)],
      [ar ? 'نسبة الدفعة الأولى' : 'Down Payment %', `${doc.fmtNum(result.downPaymentPercent, 1)}%`],
      [ar ? 'تكاليف الإغلاق المقدرة' : 'Estimated Closing Costs', doc.fmtCurrency(result.estimatedClosingCosts)],
    ],
    ar ? 'القيود المحسوبة' : 'Computed Constraints',
    [
      [ar ? 'الديون الشهرية الحالية' : 'Current Monthly Debts', doc.fmtCurrency(result.currentMonthlyDebts)],
      [ar ? 'الحد الأقصى للدفعة (الدخل)' : 'Max Payment (Income)', doc.fmtCurrency(result.m1MaxPaymentIncome)],
      [ar ? 'الحد الأقصى للدفعة (DTI)' : 'Max Payment (DTI)', doc.fmtCurrency(result.m2MaxPaymentDTI)],
      [ar ? 'الحد الأقصى للدفعة الشهرية' : 'Max Monthly Payment', doc.fmtCurrency(result.maxMonthlyPayment)],
      [ar ? 'الحد الأقصى لدفعة PI' : 'Max PI Payment', doc.fmtCurrency(result.maxPIPayment)],
    ],
  );

  const totalPages = 1;
  doc.finalizePage(p1, 1, totalPages);
  return doc.build();
}

// ── Mortgage Payoff ───────────────────────────────────────────────────────────

export function mortgagePayoffPdf(
  input: MortgagePayoffInput,
  result: MortgagePayoffResult,
  locale: string,
  currencySymbol: string,
): Buffer {
  const ar = locale === 'ar';
  const doc = new ReportDocument({ locale, currencySymbol });

  const p1 = doc.newPage(true);
  doc.drawPageHeader(p1, ar ? 'جدول سداد الرهن العقاري' : 'Mortgage Amortization Schedule', ar ? 'تقرير سداد الرهن' : 'Mortgage Payoff Report');

  doc.drawSummaryColumns(
    p1,
    ar ? 'بيانات المدخلات' : 'Input Parameters',
    [
      [ar ? 'مبلغ القرض' : 'Loan Amount', doc.fmtCurrency(input.loanAmount)],
      [ar ? 'نسبة الفائدة' : 'Interest Rate', `${doc.fmtNum(input.annualInterestRate)}%`],
      [ar ? 'مدة القرض' : 'Loan Term', `${doc.fmtInt(input.loanTermYears)} ${ar ? 'سنة' : 'years'}`],
    ],
    ar ? 'ملخص سداد الرهن' : 'Payoff Summary',
    [
      [ar ? 'الدفعة المجدولة' : 'Scheduled Payment', doc.fmtCurrency(result.summary.scheduledPayment)],
      [ar ? 'عدد الدفعات المجدولة' : 'Scheduled Payments', doc.fmtInt(result.summary.scheduledNumberOfPayments)],
      [ar ? 'عدد الدفعات الفعلية' : 'Actual Payments', doc.fmtInt(result.summary.actualNumberOfPayments)],
      [ar ? 'السنوات الموفرة' : 'Years Saved', doc.fmtNum(result.summary.yearsSaved, 1)],
      [ar ? 'إجمالي الفائدة' : 'Total Interest', doc.fmtCurrency(result.summary.totalInterest)],
      [ar ? 'إجمالي المدفوع' : 'Total Paid', doc.fmtCurrency(result.summary.totalPaid)],
    ],
  );

  doc.drawSectionHeading(p1, ar ? 'جدول السداد' : 'Amortization Schedule');

  const hdrs = ar
    ? ['إجمالي الفائدة', 'الرصيد الختامي', 'الفائدة', 'الأصل', 'إجمالي الدفعة', 'دفعة إضافية', 'الدفعة المجدولة', 'الرصيد الافتتاحي', 'تاريخ الدفعة', 'رقم']
    : ['No.', 'Payment Date', 'Beginning Balance', 'Scheduled Payment', 'Extra Payment', 'Total Payment', 'Principal', 'Interest', 'Ending Balance', 'Cumulative Interest'];
  const colW = CONTENT_W / 10;
  const cols = buildScheduleColumns(ar ? [...hdrs].reverse() : hdrs, Array(10).fill(colW));

  const schedRows: TableRow[] = result.schedule.map((row, i) => ({
    cells: [
      doc.fmtInt(row.paymentNumber),
      doc.fmtDate(row.paymentDate),
      doc.fmtCurrency(row.beginningBalance),
      doc.fmtCurrency(row.scheduledPayment),
      doc.fmtCurrency(row.extraPayment),
      doc.fmtCurrency(row.totalPayment),
      doc.fmtCurrency(row.principal),
      doc.fmtCurrency(row.interest),
      doc.fmtCurrency(row.endingBalance),
      doc.fmtCurrency(row.cumulativeInterest),
    ],
    altFill: i % 2 === 1,
  }));

  renderSchedulePages(doc, p1, cols, schedRows, 1);

  return doc.build();
}

// ── Personal Zakat ────────────────────────────────────────────────────────────

export function personalZakatPdf(
  input: PersonalZakatInput,
  result: PersonalZakatResult,
  locale: string,
  currencySymbol: string,
): Buffer {
  const ar = locale === 'ar';
  const doc = new ReportDocument({ locale, currencySymbol });

  const p1 = doc.newPage(true);
  doc.drawPageHeader(
    p1,
    ar ? 'حاسبة الزكاة الشخصية' : 'Personal Zakat Calculator',
    ar
      ? 'احتساب الزكاة \u2014 حساب تقديري فقط ولا يعتبر بديلاً عن الفتاوى الشرعية'
      : 'Calculation Engine \u2014 For calculation purposes only and is not a fatwa',
  );

  // Caution callout — drawn between the header and the summary
  // columns. Mirrors the banner the user sees in the web UI and
  // matches the A1 caption in the source Excel template.
  drawCautionCallout(
    p1,
    ar ? 'احتساب الزكاة' : 'Calculation Engine',
    ar
      ? 'حساب تقديري فقط ولا يعتبر بديلاً عن الفتاوى الشرعية.'
      : 'For calculation purposes only and is not a substitute for an Islamic ruling (fatwa).',
    ar,
  );

  doc.drawSummaryColumns(
    p1,
    ar ? 'النصاب والمعطيات' : 'Nisab & Inputs',
    [
      [ar ? 'سعر الذهب (للجرام عيار 24)' : 'Gold Price (per 24K gram)', doc.fmtCurrency(input.goldPricePerGram)],
      [ar ? 'سعر الفضة (للجرام)' : 'Silver Price (per gram)', doc.fmtCurrency(input.silverPricePerGram)],
      [ar ? 'نصاب الذهب (85 جرام)' : 'Gold Nisab (85g)', doc.fmtCurrency(result.nisabGold)],
      [ar ? 'نصاب الفضة (595 جرام)' : 'Silver Nisab (595g)', doc.fmtCurrency(result.nisabSilver)],
      [ar ? 'النصاب المعتمد' : 'Effective Nisab', doc.fmtCurrency(result.effectiveNisab)],
    ],
    ar ? 'النتيجة' : 'Result',
    [
      [ar ? 'إجمالي الثروة الصافية' : 'Total Net Wealth', doc.fmtCurrency(result.totalWealth)],
      [
        ar ? 'حالة النصاب' : 'Nisab Status',
        result.meetsNisab
          ? (ar ? 'بلغت النصاب' : 'Meets Nisab')
          : (ar ? 'لم تبلغ النصاب' : 'Below Nisab'),
      ],
      [ar ? 'نسبة الزكاة' : 'Zakat Rate', '2.5%'],
      [ar ? 'الزكاة المستحقة' : 'Zakat Due', doc.fmtCurrency(result.zakatDue)],
    ],
  );

  doc.drawSectionHeading(p1, ar ? 'تفصيل الأصول' : 'Asset Breakdown');

  const hdrs = ar
    ? ['القيمة الصافية', 'سعر الوحدة', 'الوزن (جم)', 'الوصف', 'الفئة']
    : ['Category', 'Description', 'Weight (g)', 'Value/Unit', 'Net Value'];
  const colW = CONTENT_W / 5;
  const cols = buildScheduleColumns(ar ? [...hdrs].reverse() : hdrs, Array(5).fill(colW));

  const rows: TableRow[] = result.rows.map((r, i) => ({
    cells: [
      r.category,
      r.description || '-',
      r.category === 'cash' ? '-' : doc.fmtNum(r.weight, 2),
      doc.fmtCurrency(r.valuePerUnit),
      doc.fmtCurrency(r.netValue),
    ],
    altFill: i % 2 === 1,
  }));

  drawTable(p1, MARGIN_X, p1.y, cols, [{ cells: cols.map((c) => c.label), isHeader: true }, ...rows], { fontSize: 8, rowHeight: 14 });
  doc.finalizePage(p1, 1, 1);
  return doc.build();
}

// ── UAE Gratuity ──────────────────────────────────────────────────────────────

export function uaeGratuityPdf(
  input: UaeGratuityInput,
  result: UaeGratuityResult,
  locale: string,
  currencySymbol: string,
): Buffer {
  const ar = locale === 'ar';
  const doc = new ReportDocument({ locale, currencySymbol });

  const p1 = doc.newPage(true);
  doc.drawPageHeader(
    p1,
    ar ? 'حاسبة مكافأة نهاية الخدمة (الإمارات)' : 'UAE Gratuity Calculator',
    ar ? 'تقرير نهاية الخدمة وفق قانون العمل الإماراتي' : 'End-of-service report per UAE Labour Law',
  );

  const contractLabel = input.contractType === 'limited'
    ? (ar ? 'عقد محدود المدة' : 'Limited contract')
    : (ar ? 'عقد غير محدود المدة' : 'Unlimited contract');

  doc.drawSummaryColumns(
    p1,
    ar ? 'بيانات الموظف' : 'Employee Inputs',
    [
      [ar ? 'نوع العقد' : 'Contract Type', contractLabel],
      [ar ? 'تاريخ المباشرة' : 'Joining Date', doc.fmtDate(new Date(input.joiningDate))],
      [ar ? 'تاريخ الانتهاء' : 'End Date', doc.fmtDate(new Date(input.endDate))],
      [ar ? 'الراتب الأساسي' : 'Basic Salary', doc.fmtCurrency(input.basicSalary)],
      [ar ? 'بدل السكن' : 'Housing Allowance', doc.fmtCurrency(input.housing)],
      [ar ? 'بدل المواصلات' : 'Transportation', doc.fmtCurrency(input.transportation)],
      [ar ? 'إجمالي الراتب' : 'Total Salary', doc.fmtCurrency(result.totalSalary)],
    ],
    ar ? 'النتيجة' : 'Result',
    [
      [ar ? 'أشهر الخدمة' : 'Months of Service', doc.fmtInt(result.monthsOfService)],
      [ar ? 'سنوات الخدمة' : 'Years of Service', doc.fmtNum(result.yearsOfService, 2)],
      [ar ? 'الأيام المعادلة' : 'Equivalent Days of Basic', doc.fmtNum(result.equivalentDaysOfBasic, 1)],
      [ar ? 'مكافأة نهاية الخدمة' : 'Gratuity Amount', doc.fmtCurrency(result.gratuity)],
    ],
  );

  doc.finalizePage(p1, 1, 1);
  return doc.build();
}

// ── Multi-page schedule renderer ──────────────────────────────────────────────

const ROW_H = 12;
const HEADER_ROW_H = 14;

function renderSchedulePages(
  doc: ReportDocument,
  firstPage: ReturnType<ReportDocument['newPage']>,
  cols: ReturnType<typeof buildScheduleColumns>,
  rows: TableRow[],
  startPageNum: number,
): void {
  // Estimate rows that fit on first page (after header + summary already drawn)
  const usedOnP1 = firstPage.y + HEADER_ROW_H;
  const availP1 = PAGE_H - MARGIN_BOTTOM - usedOnP1;
  const rowsP1 = Math.max(0, Math.floor(availP1 / ROW_H));

  // Remaining pages: full height minus header and footer
  const availRest = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM - 20;
  const rowsPerPage = Math.floor(availRest / ROW_H);

  // Split rows into page chunks
  const chunks: TableRow[][] = [];
  chunks.push(rows.slice(0, rowsP1));
  let offset = rowsP1;
  while (offset < rows.length) {
    chunks.push(rows.slice(offset, offset + rowsPerPage));
    offset += rowsPerPage;
  }

  const totalPages = startPageNum - 1 + chunks.length;
  let pageNum = startPageNum;
  let ctx = firstPage;

  for (const chunk of chunks) {
    const tableRows: TableRow[] = [
      { cells: cols.map(c => c.label), isHeader: true },
      ...chunk,
    ];
    drawTable(ctx, MARGIN_X, ctx.y, cols, tableRows, { fontSize: 6.5, rowHeight: ROW_H });
    doc.finalizePage(ctx, pageNum, totalPages);
    pageNum++;

    if (pageNum <= totalPages) {
      ctx = doc.newPage(false);
    }
  }
}

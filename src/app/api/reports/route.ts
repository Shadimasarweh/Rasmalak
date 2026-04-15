/**
 * Report generation API route.
 *
 * POST /api/reports
 * Body: { calculator, format, locale, currency, input, result }
 *
 * Returns a binary PDF or XLSX file with correct Content-Type and
 * Content-Disposition headers so the browser triggers a download.
 *
 * All generation is server-side using our internal lib — no external
 * PDF or Excel dependencies.
 */

import { NextRequest, NextResponse } from 'next/server';

import { calculateSimpleLoan } from '@/calculators/simpleLoanCalculator';
import { calculateCreditCard } from '@/calculators/creditCardCalculator';
import { calculateCompoundSavings } from '@/calculators/compoundSavingsCalculator';
import { calculateHomeAffordability } from '@/calculators/homeAffordabilityCalculator';
import { calculateMortgagePayoff } from '@/calculators/mortgagePayoffCalculator';

import { simpleLoanPdf, creditCardPdf, compoundSavingsPdf, homeAffordabilityPdf, mortgagePayoffPdf } from '@/lib/pdf/reports';
import { simpleLoanXlsx, creditCardXlsx, compoundSavingsXlsx, homeAffordabilityXlsx, mortgagePayoffXlsx } from '@/lib/xlsx/reports';

// ── Types ─────────────────────────────────────────────────────────────────────

type Calculator = 'simple-loan' | 'credit-card' | 'compound-savings' | 'home-affordability' | 'mortgage-payoff';
type Format = 'pdf' | 'xlsx';

interface ReportRequest {
  calculator: Calculator;
  format: Format;
  locale: string;
  currency: string;
  input: Record<string, unknown>;
}

// ── File metadata ─────────────────────────────────────────────────────────────

const FILENAMES: Record<Calculator, Record<'ar' | 'en', Record<Format, string>>> = {
  'simple-loan': {
    ar: { pdf: 'تقرير_القرض_البسيط.pdf', xlsx: 'تقرير_القرض_البسيط.xlsx' },
    en: { pdf: 'Simple_Loan_Report.pdf', xlsx: 'Simple_Loan_Report.xlsx' },
  },
  'credit-card': {
    ar: { pdf: 'تقرير_بطاقة_الائتمان.pdf', xlsx: 'تقرير_بطاقة_الائتمان.xlsx' },
    en: { pdf: 'Credit_Card_Report.pdf', xlsx: 'Credit_Card_Report.xlsx' },
  },
  'compound-savings': {
    ar: { pdf: 'تقرير_الادخار_المركب.pdf', xlsx: 'تقرير_الادخار_المركب.xlsx' },
    en: { pdf: 'Compound_Savings_Report.pdf', xlsx: 'Compound_Savings_Report.xlsx' },
  },
  'home-affordability': {
    ar: { pdf: 'تقرير_القدرة_الشرائية.pdf', xlsx: 'تقرير_القدرة_الشرائية.xlsx' },
    en: { pdf: 'Home_Affordability_Report.pdf', xlsx: 'Home_Affordability_Report.xlsx' },
  },
  'mortgage-payoff': {
    ar: { pdf: 'تقرير_سداد_الرهن.pdf', xlsx: 'تقرير_سداد_الرهن.xlsx' },
    en: { pdf: 'Mortgage_Payoff_Report.pdf', xlsx: 'Mortgage_Payoff_Report.xlsx' },
  },
};

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: ReportRequest;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { calculator, format, locale, currency, input } = body;

  if (!calculator || !format || !locale || !currency || !input) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!['pdf', 'xlsx'].includes(format)) {
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  }

  const lang = locale === 'ar' ? 'ar' : 'en';

  try {
    const buffer = await generateReport(calculator, format, locale, currency, input);
    const filename = FILENAMES[calculator]?.[lang]?.[format] ?? `report.${format}`;

    const contentType = format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[reports] generation error:', err);
    return NextResponse.json(
      { error: 'Report generation failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

// ── Generator dispatch ────────────────────────────────────────────────────────

async function generateReport(
  calculator: Calculator,
  format: Format,
  locale: string,
  currency: string,
  rawInput: Record<string, unknown>,
): Promise<Buffer> {
  switch (calculator) {
    case 'simple-loan': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const input = rawInput as any;
      const result = calculateSimpleLoan(input);
      return format === 'pdf'
        ? simpleLoanPdf(input, result, locale, currency)
        : simpleLoanXlsx(result, locale, currency);
    }

    case 'credit-card': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const input = rawInput as any;
      const result = calculateCreditCard(input);
      return format === 'pdf'
        ? creditCardPdf(input, result, locale, currency)
        : creditCardXlsx(result, locale, currency);
    }

    case 'compound-savings': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const input = rawInput as any;
      const result = calculateCompoundSavings(input);
      return format === 'pdf'
        ? compoundSavingsPdf(input, result, locale, currency)
        : compoundSavingsXlsx(result, locale, currency);
    }

    case 'home-affordability': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const input = rawInput as any;
      const result = calculateHomeAffordability(input);
      return format === 'pdf'
        ? homeAffordabilityPdf(input, result, locale, currency)
        : homeAffordabilityXlsx(result, locale, currency);
    }

    case 'mortgage-payoff': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const input = rawInput as any;
      const result = calculateMortgagePayoff(input);
      return format === 'pdf'
        ? mortgagePayoffPdf(input, result, locale, currency)
        : mortgagePayoffXlsx(result, locale, currency);
    }

    default:
      throw new Error(`Unknown calculator: ${calculator}`);
  }
}

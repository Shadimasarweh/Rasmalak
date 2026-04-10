/**
 * Shared PDF Report Utilities
 *
 * Common font loading, styling, and helpers used by all calculator PDF reports.
 * Uses pdfmake 0.3.x API.
 */

import {
  formatNumber,
  formatNumberArabic,
  formatDate,
  formatDateArabic,
  toArabicNumerals,
  loadArabicFonts,
  rtl,
} from './arabicPdfHelper';

// ===== COLORS =====
export const NAVY = '#0A192F';
export const EMERALD = '#10B981';
export const WHITE = '#FFFFFF';
export const LIGHT_GRAY = '#F8FAFC';
export const ALT_ROW_GREEN = '#F5FAF8';
export const ALT_ROW_BLUE = '#F0F4FF';

// ===== RE-EXPORTS =====
export { formatNumber, formatNumberArabic, formatDate, formatDateArabic, toArabicNumerals, rtl };

// ===== HELPERS =====

/** Format a currency value */
export function fmtCurrency(value: number, currencySymbol: string, isArabic: boolean): string {
  if (isArabic) {
    return rtl(`${formatNumberArabic(value)} ${currencySymbol}`);
  }
  return `${currencySymbol} ${formatNumber(value)}`;
}

/** Format a number, RTL-embedded for Arabic */
export function fmtNum(value: number, isArabic: boolean, decimals: number = 2): string {
  if (isArabic) return rtl(formatNumberArabic(value, decimals));
  return formatNumber(value, decimals);
}

/** Format a date, RTL-embedded for Arabic */
export function fmtDate(date: Date, isArabic: boolean): string {
  if (isArabic) return rtl(formatDateArabic(date));
  return formatDate(date);
}

/** Wrap a label with RTL marker when Arabic */
export function lbl(text: string, isArabic: boolean): string {
  return isArabic ? rtl(text) : text;
}

// ===== TABLE LAYOUTS =====

export const thinGridLayout = {
  hLineColor: () => '#E5E7EB',
  vLineColor: () => '#E5E7EB',
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 3,
  paddingBottom: () => 3,
};

export const amortGridLayout = {
  hLineColor: () => '#D1D5DB',
  vLineColor: () => '#D1D5DB',
  hLineWidth: () => 0.3,
  vLineWidth: () => 0.3,
  paddingLeft: () => 2,
  paddingRight: () => 2,
  paddingTop: () => 1.5,
  paddingBottom: () => 1.5,
};

// ===== PDFMAKE INITIALIZATION =====

export interface PdfMakeInstance {
  virtualfs: {
    writeFileSync(filename: string, data: string, encoding: string): void;
  };
  fonts: Record<string, { normal: string; bold: string; italics: string; bolditalics: string }>;
  createPdf(docDefinition: unknown, options?: Record<string, unknown>): {
    download(filename?: string): void;
  };
}

/**
 * Dynamically import pdfmake, load fonts, and return the instance.
 */
export async function initPdfMake(isArabic: boolean): Promise<PdfMakeInstance> {
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const pdfMake = pdfMakeModule.default || pdfMakeModule;

  // Load default VFS fonts (Roboto)
  const vfsFonts = await import('pdfmake/build/vfs_fonts');
  const vfsData = vfsFonts.default || vfsFonts;
  for (const [fileName, data] of Object.entries(vfsData)) {
    if (typeof data === 'string') {
      pdfMake.virtualfs.writeFileSync(fileName, data, 'base64');
    }
  }

  // Load Arabic fonts if needed
  if (isArabic) {
    const arabicFonts = await loadArabicFonts();
    pdfMake.virtualfs.writeFileSync('Amiri-Regular.ttf', arabicFonts.regular, 'base64');
    pdfMake.virtualfs.writeFileSync('Amiri-Bold.ttf', arabicFonts.bold, 'base64');
    pdfMake.fonts.Amiri = {
      normal: 'Amiri-Regular.ttf',
      bold: 'Amiri-Bold.ttf',
      italics: 'Amiri-Regular.ttf',
      bolditalics: 'Amiri-Bold.ttf',
    };
  }

  return pdfMake as PdfMakeInstance;
}

// ===== COMMON DOC PARTS =====

/** Build the header content block (navy bar with title + Rasmalak branding) */
export function buildHeaderContent(
  title: string,
  subtitle: string,
  generatedDateStr: string,
  isArabic: boolean,
  fontFamily: string,
) {
  const titleCol = {
    stack: [
      { text: lbl(title, isArabic), fontSize: 16, bold: true, color: WHITE, alignment: 'right' as const },
      { text: lbl(subtitle, isArabic), fontSize: 9, color: '#CCCCCC', alignment: 'right' as const, marginTop: 2 },
    ],
    width: '*',
  };

  const brandCol = {
    stack: [
      { text: 'Rasmalak AI', fontSize: 11, bold: true, color: WHITE, alignment: 'left' as const, font: 'Roboto' },
      { text: generatedDateStr, fontSize: 7, color: '#CCCCCC', alignment: 'left' as const, marginTop: 2, font: fontFamily },
    ],
    width: 'auto',
  };

  // For Arabic (RTL): brand on left, title on right.
  // For English (LTR): title on left, brand on right — swap alignments and column order.
  const columns = isArabic
    ? [brandCol, titleCol]
    : [
        { ...titleCol, stack: titleCol.stack.map(t => ({ ...t, alignment: 'left' as const })) },
        { ...brandCol, stack: brandCol.stack.map(t => ({ ...t, alignment: 'right' as const })) },
      ];

  return {
    stack: [{ columns }],
    marginBottom: 15,
  };
}

/** Build the background (navy bar + emerald line on first page, landscape A4) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildBackground(currentPage: number): any {
  if (currentPage === 1) {
    return {
      canvas: [
        { type: 'rect', x: 0, y: 0, w: 842, h: 32, color: NAVY },
        { type: 'rect', x: 0, y: 32, w: 842, h: 2, color: EMERALD },
      ],
      absolutePosition: { x: 0, y: 0 },
    };
  }
  return null;
}

/** Build footer with page numbers */
export function buildFooter(
  generatedByLabel: string,
  pageLabel: string,
  ofLabel: string,
  isArabic: boolean,
  fontFamily: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (currentPage: number, pageCount: number): any => {
    const pageNum = isArabic ? toArabicNumerals(String(currentPage)) : String(currentPage);
    const totalPages = isArabic ? toArabicNumerals(String(pageCount)) : String(pageCount);
    const pageText = isArabic
      ? rtl(`${pageLabel} ${pageNum} ${ofLabel} ${totalPages}`)
      : `${pageLabel} ${pageNum} ${ofLabel} ${totalPages}`;

    return {
      columns: [
        {
          text: lbl(generatedByLabel, isArabic),
          alignment: isArabic ? 'right' : 'left',
          fontSize: 7,
          color: '#808080',
          margin: isArabic ? [0, 5, 15, 0] : [15, 5, 0, 0],
          font: fontFamily,
        },
        {
          text: pageText,
          alignment: isArabic ? 'left' : 'right',
          fontSize: 7,
          color: '#808080',
          margin: isArabic ? [15, 5, 0, 0] : [0, 5, 15, 0],
          font: fontFamily,
        },
      ],
    };
  };
}




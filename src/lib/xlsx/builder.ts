/**
 * High-level XLSX workbook builder.
 *
 * Usage:
 *   const wb = new XlsxWorkbook();
 *   const sheet = wb.addSheet('Summary', { rtl: true });
 *   sheet.addRow([{ v: 'Label', s: 1 }, { v: 1234.56, s: 2 }]);
 *   sheet.setColWidths([{ col: 1, width: 30 }, { col: 2, width: 18 }]);
 *   const buffer = wb.build();
 */

import { ZipWriter } from './zip';
import {
  contentTypes,
  rootRels,
  workbookRels,
  workbook,
  styles,
  sharedStrings as buildSharedStrings,
  worksheet,
  xmlEsc,
  type Cell,
  type ColWidth,
  type CellStyle,
  type CellValue,
} from './xml';

export type { Cell, CellStyle, CellValue, ColWidth };

// ── Arabic-Indic numeral conversion ──────────────────────────────────────────

const AR_DIGITS: Record<string, string> = {
  '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
  '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩',
};

export function toArabicNumerals(s: string): string {
  return s.replace(/[0-9]/g, d => AR_DIGITS[d]);
}

/** Format a number as Arabic-Indic numeral string with thousands separator */
export function fmtArabicNumber(value: number, decimals = 2): string {
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return toArabicNumerals(formatted);
}

/** Format currency: Arabic → "١٬٢٣٤٫٥٦ JOD", English → number cell */
export function fmtCurrencyString(value: number, symbol: string): string {
  return `${fmtArabicNumber(value)} ${symbol}`;
}

// ── Sheet builder ─────────────────────────────────────────────────────────────

export interface SheetOptions {
  rtl?: boolean;
}

export class XlsxSheet {
  private rows: Cell[][] = [];
  private colWidths: ColWidth[] = [];
  readonly rtl: boolean;
  readonly name: string;

  constructor(name: string, opts: SheetOptions = {}) {
    this.name = name;
    this.rtl = opts.rtl ?? false;
  }

  addRow(cells: Cell[]): this {
    this.rows.push(cells);
    return this;
  }

  /** Blank separator row */
  addBlank(): this {
    this.rows.push([]);
    return this;
  }

  setColWidths(widths: ColWidth[]): this {
    this.colWidths = widths;
    return this;
  }

  getRows(): Cell[][] { return this.rows; }
  getColWidths(): ColWidth[] { return this.colWidths; }
}

// ── Workbook builder ──────────────────────────────────────────────────────────

export class XlsxWorkbook {
  private sheets: XlsxSheet[] = [];

  addSheet(name: string, opts: SheetOptions = {}): XlsxSheet {
    const sheet = new XlsxSheet(name, opts);
    this.sheets.push(sheet);
    return sheet;
  }

  build(): Buffer {
    // Collect all unique strings across all sheets
    const stringSet: string[] = [];
    const stringMap = new Map<string, number>();

    const intern = (s: string): number => {
      if (!stringMap.has(s)) {
        stringMap.set(s, stringSet.length);
        stringSet.push(s);
      }
      return stringMap.get(s)!;
    };

    // Pre-pass to register all strings
    for (const sheet of this.sheets) {
      for (const row of sheet.getRows()) {
        for (const cell of row) {
          if (typeof cell.v === 'string' && cell.v !== '') intern(cell.v);
        }
      }
    }

    // Build ZIP
    const zip = new ZipWriter();

    zip.add('[Content_Types].xml', contentTypes(this.sheets.length));
    zip.add('_rels/.rels', rootRels());
    zip.add('xl/_rels/workbook.xml.rels', workbookRels(this.sheets.length));
    zip.add('xl/workbook.xml', workbook(this.sheets.map(s => ({ name: s.name }))));
    zip.add('xl/styles.xml', styles());
    zip.add('xl/sharedStrings.xml', buildSharedStrings(stringSet));

    for (let i = 0; i < this.sheets.length; i++) {
      const sheet = this.sheets[i];
      const xml = worksheet(sheet.getRows(), sheet.getColWidths(), sheet.rtl, stringMap);
      zip.add(`xl/worksheets/sheet${i + 1}.xml`, xml);
    }

    return zip.build();
  }
}

// ── Report helpers (shared across all 5 calculators) ─────────────────────────

/** Normal text cell */
export const cell = (v: CellValue, s: CellStyle = 0): Cell => ({ v, s });

/** Bold text cell (titles, labels) */
export const bold = (v: CellValue): Cell => ({ v, s: 1 });

/** Schedule header cell: navy fill, white bold, centered */
export const header = (v: CellValue): Cell => ({ v, s: 5 });

/** Currency amount cell — EN: number with format; AR: formatted string */
export function currencyCell(value: number, locale: string, symbol: string): Cell {
  if (locale === 'ar') {
    return { v: fmtCurrencyString(value, symbol), s: 0 };
  }
  return { v: value, s: 2 };
}

/** Integer cell — EN: number; AR: Arabic-Indic string */
export function intCell(value: number, locale: string): Cell {
  if (locale === 'ar') return { v: toArabicNumerals(String(value)), s: 0 };
  return { v: value, s: 3 };
}

/** Decimal cell — EN: number; AR: Arabic-Indic string */
export function numCell(value: number, decimals: number, locale: string): Cell {
  if (locale === 'ar') return { v: fmtArabicNumber(value, decimals), s: 0 };
  return { v: value, s: 0 };
}

/** Percent cell — EN: decimal number with % format; AR: Arabic-Indic string */
export function pctCell(rate: number, locale: string): Cell {
  if (locale === 'ar') return { v: toArabicNumerals((rate * 100).toFixed(2)) + '%', s: 0 };
  return { v: rate, s: 4 };
}

/** Date string cell */
export function dateCell(date: Date, locale: string): Cell {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  const formatted = `${dd}/${mm}/${yyyy}`;
  if (locale === 'ar') return { v: toArabicNumerals(formatted), s: 0 };
  return { v: formatted, s: 0 };
}

/**
 * High-level PDF report builder.
 *
 * Orchestrates the writer, layout engine, and Arabic shaper into
 * complete multi-page financial reports.
 */

import {
  PdfWriter,
  ContentStream,
  ref, arr, dict, num, name,
} from './writer';

import {
  PageContext, FontSet, TableColumn, TableRow,
  COLORS, CONTENT_W, MARGIN_X, MARGIN_TOP, PAGE_W, PAGE_H, MARGIN_BOTTOM,
  loadFonts, drawTable, buildPage,
} from './layout';

import { fmtNumber, fmtNumberAr, fmtDate, fmtDateAr, toArabicNumerals } from './arabic';

// ── Report config ─────────────────────────────────────────────────────────────

export interface ReportConfig {
  locale: string;
  currencySymbol: string;
}

// ── Main report document ──────────────────────────────────────────────────────

export class ReportDocument {
  readonly writer: PdfWriter;
  readonly fonts: FontSet;
  readonly isArabic: boolean;
  readonly currency: string;
  private pageIds: number[] = [];
  private totalPagesRef: number; // used for "Page X of Y"
  private readonly pagesId: number; // pre-allocated so pages can reference /Parent

  constructor(config: ReportConfig) {
    this.writer = new PdfWriter();
    this.isArabic = config.locale === 'ar';
    this.currency = config.currencySymbol;
    this.fonts = loadFonts(this.writer);
    this.totalPagesRef = 0; // will be resolved at build time
    this.pagesId = this.writer.allocId(); // reserve ID before any page objects
  }

  // ── Header (first page) ───────────────────────────────────────────────────

  drawPageHeader(
    ctx: PageContext,
    title: string,
    subtitle: string,
  ): void {
    const headerH = 30;
    const accentH = 2;
    const ar = this.isArabic;

    // Navy bar
    ctx.drawRect(0, 0, PAGE_W, headerH, COLORS.navy);
    // Emerald accent
    ctx.drawRect(0, headerH, PAGE_W, accentH, COLORS.emerald);

    // Title — left (EN) or right (AR)
    const titleX = ar ? PAGE_W - MARGIN_X : MARGIN_X;
    ctx.drawText(title, titleX, 7, {
      size: 14,
      bold: true,
      color: COLORS.white,
      align: ar ? 'right' : 'left',
    });

    ctx.drawText(subtitle, titleX, 20, {
      size: 8,
      color: [0.8, 0.8, 0.8],
      align: ar ? 'right' : 'left',
    });

    // Rasmalak AI branding — always opposite side
    const brandX = ar ? MARGIN_X : PAGE_W - MARGIN_X;
    ctx.drawText('Rasmalak AI', brandX, 8, {
      size: 10,
      bold: true,
      color: COLORS.white,
      align: ar ? 'left' : 'right',
    });

    const now = new Date();
    const dateStr = ar ? fmtDateAr(now) : fmtDate(now);
    ctx.drawText(dateStr, brandX, 21, {
      size: 7,
      color: [0.8, 0.8, 0.8],
      align: ar ? 'left' : 'right',
    });

    ctx.advanceY(headerH + accentH + 12);
  }

  // ── Section heading ────────────────────────────────────────────────────────

  drawSectionHeading(ctx: PageContext, text: string): void {
    const ar = this.isArabic;
    const x = ar ? MARGIN_X + CONTENT_W : MARGIN_X;
    ctx.drawText(text, x, ctx.y, {
      size: 11,
      bold: true,
      color: COLORS.navy,
      align: ar ? 'right' : 'left',
    });
    ctx.advanceY(16);
  }

  // ── Two-column summary section ─────────────────────────────────────────────

  drawSummaryColumns(
    ctx: PageContext,
    leftTitle: string,
    leftRows: [string, string][],
    rightTitle: string,
    rightRows: [string, string][],
  ): void {
    const ar = this.isArabic;
    const colW = CONTENT_W / 2 - 8;
    const leftX = MARGIN_X;
    const rightX = MARGIN_X + CONTENT_W / 2 + 8;
    const labelW = colW * 0.52;
    const valueW = colW * 0.48;
    const rowH = 14;
    const startY = ctx.y;

    const drawKeyValue = (
      title: string,
      rows: [string, string][],
      originX: number,
      altColor: [number, number, number],
    ) => {
      const titleX = ar ? originX + colW : originX;
      ctx.drawText(title, titleX, startY - 14, {
        size: 10,
        bold: true,
        color: COLORS.navy,
        align: ar ? 'right' : 'left',
      });

      rows.forEach(([label, value], idx) => {
        const rowY = startY + idx * rowH;
        if (idx % 2 === 1) ctx.drawRect(originX, rowY, colW, rowH, altColor);

        // In AR: value on left, label on right (visually)
        const labelX = ar ? originX + colW - 4 : originX + 4;
        const valX = ar ? originX + 4 : originX + colW - 4;

        ctx.drawText(label, labelX, rowY + 3, {
          size: 7.5,
          bold: true,
          color: COLORS.black,
          align: ar ? 'right' : 'left',
        });
        ctx.drawText(value, valX, rowY + 3, {
          size: 7.5,
          color: COLORS.black,
          align: ar ? 'left' : 'right',
        });
      });
    };

    if (ar) {
      drawKeyValue(leftTitle, leftRows, rightX, COLORS.altBlue);
      drawKeyValue(rightTitle, rightRows, leftX, COLORS.altGreen);
    } else {
      drawKeyValue(leftTitle, leftRows, leftX, COLORS.altGreen);
      drawKeyValue(rightTitle, rightRows, rightX, COLORS.altBlue);
    }

    const maxRows = Math.max(leftRows.length, rightRows.length);
    ctx.advanceY(maxRows * rowH + 14);
  }

  // ── Footer ─────────────────────────────────────────────────────────────────

  drawFooter(ctx: PageContext, pageNum: number, totalPages: number): void {
    const ar = this.isArabic;
    const footerY = PAGE_H - MARGIN_BOTTOM + 4;

    const brandLabel = ar ? 'تم إنشاؤه بواسطة رسملك' : 'Generated by Rasmalak';
    const pageNumStr = ar
      ? `${toArabicNumerals(String(totalPages))} ${toArabicNumerals('من')} ${toArabicNumerals(String(pageNum))}`
      : `Page ${pageNum} of ${totalPages}`;

    ctx.drawText(brandLabel, ar ? PAGE_W - MARGIN_X : MARGIN_X, footerY, {
      size: 7,
      color: COLORS.gray,
      align: ar ? 'right' : 'left',
    });

    ctx.drawText(pageNumStr, ar ? MARGIN_X : PAGE_W - MARGIN_X, footerY, {
      size: 7,
      color: COLORS.gray,
      align: ar ? 'left' : 'right',
    });
  }

  // ── Finalize page and add to document ─────────────────────────────────────

  finalizePage(ctx: PageContext, pageNum: number, totalPages: number): number {
    this.drawFooter(ctx, pageNum, totalPages);

    // Deduplicate font IDs (latin and arabic may share the same embedded font)
    const fontEntries = new Map<string, number>();
    fontEntries.set(this.fonts.arabicRegular.name, this.fonts.arabicRegular.dictId);
    fontEntries.set(this.fonts.arabicBold.name, this.fonts.arabicBold.dictId);
    if (this.fonts.latin.name !== this.fonts.arabicRegular.name) {
      fontEntries.set(this.fonts.latin.name, this.fonts.latin.dictId);
    }
    const resourceIds: Record<string, number> = Object.fromEntries(fontEntries);

    const pageId = buildPage(
      this.writer,
      this.fonts,
      ctx.cs.toBuffer(),
      resourceIds,
      this.pagesId,
    );
    this.pageIds.push(pageId);
    return pageId;
  }

  // ── Build final PDF buffer ─────────────────────────────────────────────────

  build(): Buffer {
    // Pages dictionary — uses the pre-allocated ID so pages already have /Parent
    this.writer.addObject(this.pagesId, dict({
      Type: name('Pages'),
      Kids: arr(this.pageIds.map(id => ref(id))),
      Count: num(this.pageIds.length),
    }));

    const catalogId = this.writer.allocId();
    this.writer.addObject(catalogId, dict({
      Type: name('Catalog'),
      Pages: ref(this.pagesId),
    }));

    return this.writer.build(catalogId);
  }

  // ── Currency / number formatters ───────────────────────────────────────────

  fmtCurrency(value: number): string {
    if (this.isArabic) {
      return `${fmtNumberAr(value)} ${this.currency}`;
    }
    return `${this.currency} ${fmtNumber(value)}`;
  }

  fmtNum(value: number, decimals = 2): string {
    return this.isArabic ? fmtNumberAr(value, decimals) : fmtNumber(value, decimals);
  }

  fmtPct(rate: number): string {
    const pct = (rate * 100).toFixed(2);
    return this.isArabic ? `${toArabicNumerals(pct)}%` : `${pct}%`;
  }

  fmtDate(date: Date): string {
    return this.isArabic ? fmtDateAr(date) : fmtDate(date);
  }

  fmtInt(value: number): string {
    return this.isArabic ? toArabicNumerals(String(value)) : String(value);
  }

  newPage(isFirstPage = false): PageContext {
    return new PageContext(
      this.writer,
      this.fonts,
      this.isArabic,
      isFirstPage ? MARGIN_TOP : MARGIN_TOP + 10,
    );
  }
}

// ── Schedule table helper ─────────────────────────────────────────────────────

export const AVAIL_H = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM; // usable height per page

export function buildScheduleColumns(
  headers: string[],
  widths: number[],
): TableColumn[] {
  return headers.map((label, i) => ({
    label,
    width: widths[i] ?? (CONTENT_W / headers.length),
    align: 'center' as const,
  }));
}

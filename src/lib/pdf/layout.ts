/**
 * PDF layout engine.
 *
 * Coordinate system: PDF origin is bottom-left.
 * We work in top-left coordinates internally and convert on output.
 * Page size: A4 landscape = 841.89 × 595.28 pt.
 */

import { PdfWriter, ContentStream, EmbeddedFont, embedTTF, ref, arr, dict, num, name } from './writer';
import { shapeArabic, toGlyphStream } from './arabic';
import { join } from 'path';

// ── Page dimensions ───────────────────────────────────────────────────────────

export const PAGE_W = 841.89;
export const PAGE_H = 595.28;
export const MARGIN_X = 18;
export const MARGIN_TOP = 18;
export const MARGIN_BOTTOM = 28;
export const CONTENT_W = PAGE_W - MARGIN_X * 2;

// ── Colors (RGB 0-1) ──────────────────────────────────────────────────────────

export const COLORS = {
  navy:       [0.039, 0.098, 0.184] as [number, number, number],
  emerald:    [0.063, 0.725, 0.506] as [number, number, number],
  white:      [1, 1, 1]             as [number, number, number],
  black:      [0, 0, 0]             as [number, number, number],
  gray:       [0.5, 0.5, 0.5]      as [number, number, number],
  lightGray:  [0.949, 0.961, 0.973] as [number, number, number],
  altGreen:   [0.957, 0.980, 0.969] as [number, number, number],
  altBlue:    [0.941, 0.957, 1.0]   as [number, number, number],
  gridLine:   [0.82, 0.835, 0.859]  as [number, number, number],
};

// ── Font registry ─────────────────────────────────────────────────────────────

export interface FontSet {
  latin: EmbeddedFont;         // Helvetica-like (embedded) for EN
  arabicRegular: EmbeddedFont;
  arabicBold: EmbeddedFont;
}

export function loadFonts(writer: PdfWriter): FontSet {
  const fontsDir = join(process.cwd(), 'public', 'fonts');
  // Amiri supports both Arabic and Latin characters — use it for both locales.
  const regular = embedTTF(writer, 'AmiriRegular', join(fontsDir, 'Amiri-Regular.ttf'));
  const bold = embedTTF(writer, 'AmiriBold', join(fontsDir, 'Amiri-Bold.ttf'));
  return {
    latin: regular,
    arabicRegular: regular,
    arabicBold: bold,
  };
}

// ── Page context ──────────────────────────────────────────────────────────────

export class PageContext {
  readonly cs: ContentStream;
  private topY: number; // current Y position from top

  constructor(
    public readonly writer: PdfWriter,
    public readonly fonts: FontSet,
    public readonly isArabic: boolean,
    initialY = MARGIN_TOP,
  ) {
    this.cs = new ContentStream();
    this.topY = initialY;
  }

  get y(): number { return this.topY; }
  advanceY(delta: number): void { this.topY += delta; }

  /** Convert top-left Y to PDF bottom-left Y */
  pdfY(topY: number, height = 0): number {
    return PAGE_H - topY - height;
  }

  selectFont(bold: boolean): string {
    return bold ? this.fonts.arabicBold.name : this.fonts.arabicRegular.name;
  }

  /**
   * Draw text at position (x from left, y from top).
   * For Arabic: text is shaped and rendered RTL.
   * Returns the text width estimate (approximate).
   */
  drawText(
    text: string,
    x: number,
    topY: number,
    opts: {
      size?: number;
      bold?: boolean;
      color?: [number, number, number];
      align?: 'left' | 'right' | 'center';
      maxWidth?: number;
    } = {},
  ): void {
    const size = opts.size ?? 8;
    const color = opts.color ?? COLORS.black;
    const font = (opts.bold ?? false) ? this.fonts.arabicBold : this.fonts.arabicRegular;
    const fontName = font.name;
    const codepoints = toGlyphStream(text, this.isArabic, font.glyphMap);

    // Measure text width using actual glyph advance widths from the font's hmtx table.
    const scale = size / font.unitsPerEm;
    const textW = codepoints.reduce(
      (sum, glyphId) => sum + (font.advanceWidths.get(glyphId) ?? font.unitsPerEm * 0.6) * scale,
      0,
    );

    let drawX = x;
    if (opts.align === 'right') drawX = x - textW;
    else if (opts.align === 'center') drawX = x - textW / 2;

    const pdfYPos = this.pdfY(topY + size * 0.75); // baseline

    this.cs
      .saveState()
      .fillColor(...color)
      .beginText()
      .setFont(fontName, size)
      .moveText(drawX, pdfYPos)
      .showTextHex(codepoints)
      .endText()
      .restoreState();
  }

  /** Draw a filled rectangle (top-left coords) */
  drawRect(x: number, topY: number, w: number, h: number, color: [number, number, number]): void {
    this.cs
      .saveState()
      .fillColor(...color)
      .rect(x, this.pdfY(topY, h), w, h)
      .fill()
      .restoreState();
  }

  /** Draw a horizontal line */
  drawHLine(x: number, topY: number, w: number, color: [number, number, number], lineW = 0.5): void {
    const py = this.pdfY(topY);
    this.cs
      .saveState()
      .strokeColor(...color)
      .lineWidth(lineW)
      .moveTo(x, py)
      .lineTo(x + w, py)
      .stroke()
      .restoreState();
  }
}

// ── Table drawing ─────────────────────────────────────────────────────────────

export interface TableColumn {
  label: string;
  width: number; // pt
  align?: 'left' | 'right' | 'center';
}

export interface TableRow {
  cells: string[];
  isHeader?: boolean;
  altFill?: boolean;
}

export function drawTable(
  ctx: PageContext,
  startX: number,
  startY: number,
  columns: TableColumn[],
  rows: TableRow[],
  opts: { fontSize?: number; rowHeight?: number } = {},
): number {
  const fontSize = opts.fontSize ?? 6.5;
  const rowH = opts.rowHeight ?? 13;
  const totalW = columns.reduce((s, c) => s + c.width, 0);
  const padX = 3;

  let y = startY;

  for (const row of rows) {
    const isAr = ctx.isArabic;

    // Background fill
    if (row.isHeader) {
      ctx.drawRect(startX, y, totalW, rowH, COLORS.navy);
    } else if (row.altFill) {
      ctx.drawRect(startX, y, totalW, rowH, COLORS.lightGray);
    }

    // Draw cells (reversed for Arabic)
    const cols = isAr ? [...columns].reverse() : columns;
    const cells = isAr ? [...row.cells].reverse() : row.cells;
    let cellX = startX;

    for (let ci = 0; ci < cols.length; ci++) {
      const col = cols[ci];
      const cellText = cells[ci] ?? '';
      const color = row.isHeader ? COLORS.white : COLORS.black;
      const align = col.align ?? (isAr ? 'right' : 'left');
      const textSize = row.isHeader ? fontSize : fontSize;

      let textX: number;
      if (align === 'left') textX = cellX + padX;
      else if (align === 'right') textX = cellX + col.width - padX;
      else textX = cellX + col.width / 2;

      ctx.drawText(cellText, textX, y + (rowH - textSize) / 2, {
        size: textSize,
        bold: row.isHeader,
        color,
        align,
      });

      // Vertical grid line (right edge of cell)
      if (ci < cols.length - 1) {
        const lineX = cellX + col.width;
        const py1 = ctx.pdfY(y);
        const py2 = ctx.pdfY(y + rowH);
        ctx.cs
          .saveState()
          .strokeColor(...COLORS.gridLine)
          .lineWidth(0.3)
          .moveTo(lineX, py1)
          .lineTo(lineX, py2)
          .stroke()
          .restoreState();
      }

      cellX += col.width;
    }

    // Bottom horizontal grid line
    ctx.drawHLine(startX, y + rowH, totalW, COLORS.gridLine, 0.3);

    y += rowH;
  }

  return y; // return bottom Y after table
}

// ── Page factory ──────────────────────────────────────────────────────────────

export function buildPage(
  writer: PdfWriter,
  fonts: FontSet,
  contentBuf: Buffer,
  resourceIds: Record<string, number>,
  parentId: number,
): number {
  const streamId = writer.allocId();
  writer.addObject(streamId, {
    type: 'stream',
    dict: {},
    data: contentBuf,
  });

  const pageId = writer.allocId();
  writer.addObject(pageId, dict({
    Type: name('Page'),
    Parent: ref(parentId),
    MediaBox: arr([num(0), num(0), num(PAGE_W), num(PAGE_H)]),
    Contents: ref(streamId),
    Resources: dict({
      Font: dict(
        Object.fromEntries(
          Object.entries(resourceIds).map(([alias, id]) => [alias, ref(id)])
        )
      ),
    }),
  }));

  return pageId;
}

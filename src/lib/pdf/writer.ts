/**
 * Low-level PDF binary writer.
 *
 * Implements enough of PDF 1.4 to produce multi-page reports with
 * embedded fonts, colored rectangles, lines, and positioned text.
 * No external dependencies — pure Node.js Buffer operations.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { parseCmap, parseHmtx } from './ttf';

// ── PDF object types ──────────────────────────────────────────────────────────

type PdfValue =
  | { type: 'num'; v: number }
  | { type: 'str'; v: string }
  | { type: 'name'; v: string }
  | { type: 'bool'; v: boolean }
  | { type: 'null' }
  | { type: 'ref'; id: number }
  | { type: 'array'; v: PdfValue[] }
  | { type: 'dict'; v: Record<string, PdfValue> }
  | { type: 'stream'; dict: Record<string, PdfValue>; data: Buffer }
  | { type: 'raw'; v: string }; // pre-serialized PDF syntax (e.g. large W arrays)

export const num = (v: number): PdfValue => ({ type: 'num', v });
export const str = (v: string): PdfValue => ({ type: 'str', v });
export const name = (v: string): PdfValue => ({ type: 'name', v });
export const bool = (v: boolean): PdfValue => ({ type: 'bool', v });
export const ref = (id: number): PdfValue => ({ type: 'ref', id });
export const arr = (v: PdfValue[]): PdfValue => ({ type: 'array', v });
export const dict = (v: Record<string, PdfValue>): PdfValue => ({ type: 'dict', v });
export const raw = (v: string): PdfValue => ({ type: 'raw', v });
export const pdfNull: PdfValue = { type: 'null' };

function serialize(v: PdfValue): string {
  switch (v.type) {
    case 'num': return Number.isInteger(v.v) ? String(v.v) : v.v.toFixed(4);
    case 'str': return `(${v.v.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')})`;
    case 'name': return `/${v.v}`;
    case 'bool': return v.v ? 'true' : 'false';
    case 'null': return 'null';
    case 'ref': return `${v.id} 0 R`;
    case 'array': return `[${v.v.map(serialize).join(' ')}]`;
    case 'dict': {
      const entries = Object.entries(v.v).map(([k, val]) => `/${k} ${serialize(val)}`).join('\n');
      return `<<\n${entries}\n>>`;
    }
    case 'stream': {
      const dictStr = Object.entries(v.dict).map(([k, val]) => `/${k} ${serialize(val)}`).join('\n');
      return `<<\n${dictStr}\n/Length ${v.data.length}\n>>\nstream\n`;
    }
    case 'raw': return v.v;
  }
}

// ── Writer ────────────────────────────────────────────────────────────────────

export class PdfWriter {
  private objects: Array<{ id: number; data: Buffer }> = [];
  private nextId = 1;
  private offsets: number[] = [];

  allocId(): number {
    return this.nextId++;
  }

  addObject(id: number, value: PdfValue): void {
    let objStr: string;
    let extra: Buffer | null = null;

    if (value.type === 'stream') {
      // serialize() ends with "stream\n"; data follows immediately (no extra \n).
      // PDF spec: Length counts bytes from after "stream\n" to before the \n preceding endstream.
      objStr = `${id} 0 obj\n${serialize(value)}`;
      extra = Buffer.concat([value.data, Buffer.from('\nendstream\nendobj\n')]);
    } else {
      objStr = `${id} 0 obj\n${serialize(value)}\nendobj\n`;
    }

    const parts = extra
      ? [Buffer.from(objStr, 'latin1'), extra]
      : [Buffer.from(objStr + '\n', 'latin1')];

    this.objects.push({ id, data: Buffer.concat(parts) });
  }

  build(catalogId: number): Buffer {
    const header = Buffer.from('%PDF-1.4\n%\xff\xff\xff\xff\n', 'latin1');
    const parts: Buffer[] = [header];
    let offset = header.length;

    // Sort objects by id
    const sorted = [...this.objects].sort((a, b) => a.id - b.id);
    const xrefOffsets = new Array(this.nextId).fill(0);

    for (const obj of sorted) {
      xrefOffsets[obj.id] = offset;
      parts.push(obj.data);
      offset += obj.data.length;
    }

    // Cross-reference table
    const xrefOffset = offset;
    let xref = `xref\n0 ${this.nextId}\n`;
    xref += '0000000000 65535 f \n';
    for (let i = 1; i < this.nextId; i++) {
      xref += `${String(xrefOffsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    parts.push(Buffer.from(xref, 'latin1'));

    // Trailer
    const trailer = `trailer\n<<\n/Size ${this.nextId}\n/Root ${catalogId} 0 R\n>>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    parts.push(Buffer.from(trailer, 'latin1'));

    return Buffer.concat(parts);
  }
}

// ── Content stream builder ────────────────────────────────────────────────────

export class ContentStream {
  private ops: string[] = [];

  // Graphics state
  saveState(): this { this.ops.push('q'); return this; }
  restoreState(): this { this.ops.push('Q'); return this; }

  // Color (RGB, values 0-1)
  fillColor(r: number, g: number, b: number): this {
    this.ops.push(`${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)} rg`);
    return this;
  }

  strokeColor(r: number, g: number, b: number): this {
    this.ops.push(`${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)} RG`);
    return this;
  }

  lineWidth(w: number): this {
    this.ops.push(`${w.toFixed(4)} w`);
    return this;
  }

  // Rectangle: x, y from bottom-left (PDF coords)
  rect(x: number, y: number, w: number, h: number): this {
    this.ops.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    return this;
  }

  fill(): this { this.ops.push('f'); return this; }
  stroke(): this { this.ops.push('S'); return this; }
  fillStroke(): this { this.ops.push('B'); return this; }

  // Line
  moveTo(x: number, y: number): this {
    this.ops.push(`${x.toFixed(2)} ${y.toFixed(2)} m`);
    return this;
  }

  lineTo(x: number, y: number): this {
    this.ops.push(`${x.toFixed(2)} ${y.toFixed(2)} l`);
    return this;
  }

  // Text
  beginText(): this { this.ops.push('BT'); return this; }
  endText(): this { this.ops.push('ET'); return this; }

  setFont(fontName: string, size: number): this {
    this.ops.push(`/${fontName} ${size.toFixed(2)} Tf`);
    return this;
  }

  moveText(x: number, y: number): this {
    this.ops.push(`${x.toFixed(2)} ${y.toFixed(2)} Td`);
    return this;
  }

  /** Show text as PDF hex string (UTF-16BE encoded for CID fonts) */
  showTextHex(codepoints: number[]): this {
    const hex = codepoints.map(cp => cp.toString(16).padStart(4, '0')).join('');
    this.ops.push(`<${hex}> Tj`);
    return this;
  }

  /** Show text as PDF literal string (for simple Latin fonts) */
  showText(text: string): this {
    const escaped = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    this.ops.push(`(${escaped}) Tj`);
    return this;
  }

  toBuffer(): Buffer {
    return Buffer.from(this.ops.join('\n') + '\n', 'latin1');
  }
}

// ── Font handling ─────────────────────────────────────────────────────────────

export interface EmbeddedFont {
  dictId: number;
  name: string;
  /** Unicode codepoint → glyph ID map parsed from the font's cmap table. */
  glyphMap: Map<number, number>;
  /** Glyph ID → advance width in font units. */
  advanceWidths: Map<number, number>;
  /** Font design units per em (from head table). */
  unitsPerEm: number;
}

/**
 * Embed a TrueType font as a CIDFont (Type0) for Unicode text.
 * This enables correct rendering of Arabic, Latin, and mixed text.
 */
export function embedTTF(
  writer: PdfWriter,
  fontName: string,
  ttfPath: string,
): EmbeddedFont {
  const ttfData = readFileSync(ttfPath);

  // Parse font metrics first so we can build accurate PDF dicts.
  const glyphMap = parseCmap(ttfData);
  const { advanceWidths, unitsPerEm } = parseHmtx(ttfData);

  // Build /W array: [0 [w0 w1 ... wN]] with actual per-glyph advance widths.
  // Without this, DW=1000 makes the renderer space every glyph 1 full em apart,
  // which is 2-5× too wide for Arabic glyphs (actual widths: 190-568 units).
  let maxGlyphId = 0;
  for (const id of advanceWidths.keys()) if (id > maxGlyphId) maxGlyphId = id;
  const widths: number[] = [];
  for (let i = 0; i <= maxGlyphId; i++) {
    widths.push(advanceWidths.get(i) ?? 1000);
  }
  const wRaw = raw(`[0 [${widths.join(' ')}]]`);

  // Font file stream
  const fontFileId = writer.allocId();
  writer.addObject(fontFileId, {
    type: 'stream',
    dict: {
      Subtype: name('OpenType'),
      Length1: num(ttfData.length),
    },
    data: ttfData,
  });

  // CIDFont descriptor
  const descriptorId = writer.allocId();
  writer.addObject(descriptorId, dict({
    Type: name('FontDescriptor'),
    FontName: name(fontName),
    Flags: num(4), // symbolic
    FontBBox: arr([num(-1000), num(-200), num(1000), num(900)]),
    ItalicAngle: num(0),
    Ascent: num(900),
    Descent: num(-200),
    CapHeight: num(700),
    StemV: num(80),
    FontFile3: ref(fontFileId),
  }));

  // CIDFont dictionary — DW is 1000 as fallback; W overrides per-glyph
  const cidFontId = writer.allocId();
  writer.addObject(cidFontId, dict({
    Type: name('Font'),
    Subtype: name('CIDFontType2'),
    BaseFont: name(fontName),
    CIDSystemInfo: dict({
      Registry: str('Adobe'),
      Ordering: str('Identity'),
      Supplement: num(0),
    }),
    FontDescriptor: ref(descriptorId),
    DW: num(1000),
    W: wRaw,
    CIDToGIDMap: name('Identity'),
  }));

  // Type0 (composite) font — wraps the CIDFont
  const fontDictId = writer.allocId();
  writer.addObject(fontDictId, dict({
    Type: name('Font'),
    Subtype: name('Type0'),
    BaseFont: name(fontName),
    Encoding: name('Identity-H'),
    DescendantFonts: arr([ref(cidFontId)]),
  }));

  return { dictId: fontDictId, name: fontName, glyphMap, advanceWidths, unitsPerEm };
}

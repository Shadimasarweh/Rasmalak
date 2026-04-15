/**
 * Minimal TTF/OTF cmap table parser.
 *
 * Parses the 'cmap' table from a TrueType font buffer and returns a map of
 * Unicode codepoint → glyph ID. This is required because CIDFontType2 with
 * Identity-H encoding needs actual glyph IDs in the content stream hex string,
 * NOT Unicode codepoints.
 */

/** Read a big-endian uint16 from a Buffer at the given offset. */
function u16(buf: Buffer, off: number): number {
  return (buf[off] << 8) | buf[off + 1];
}

/** Read a big-endian uint32 from a Buffer at the given offset. */
function u32(buf: Buffer, off: number): number {
  return ((buf[off] << 24) | (buf[off + 1] << 16) | (buf[off + 2] << 8) | buf[off + 3]) >>> 0;
}

/** Read a big-endian int16 (signed) from a Buffer at the given offset. */
function i16(buf: Buffer, off: number): number {
  const v = u16(buf, off);
  return v >= 0x8000 ? v - 0x10000 : v;
}

/**
 * Find a named table in the TTF font and return its offset and length.
 * TTF table directory is at offset 12, each entry is 16 bytes.
 */
function findTable(buf: Buffer, tag: string): { offset: number; length: number } | null {
  const numTables = u16(buf, 4);
  const tagBytes = Buffer.from(tag, 'ascii');
  for (let i = 0; i < numTables; i++) {
    const entryOffset = 12 + i * 16;
    if (
      buf[entryOffset] === tagBytes[0] &&
      buf[entryOffset + 1] === tagBytes[1] &&
      buf[entryOffset + 2] === tagBytes[2] &&
      buf[entryOffset + 3] === tagBytes[3]
    ) {
      return {
        offset: u32(buf, entryOffset + 8),
        length: u32(buf, entryOffset + 12),
      };
    }
  }
  return null;
}

/**
 * Parse cmap format 4 subtable and add mappings to the output map.
 * Format 4 is the standard Windows/Unicode BMP encoding.
 */
function parseFmt4(buf: Buffer, subtableOffset: number, out: Map<number, number>): void {
  const segCount = u16(buf, subtableOffset + 6) >> 1;
  const endCountOffset = subtableOffset + 14;
  const startCountOffset = endCountOffset + segCount * 2 + 2;
  const idDeltaOffset = startCountOffset + segCount * 2;
  const idRangeOffsetOffset = idDeltaOffset + segCount * 2;
  const glyphIdArrayOffset = idRangeOffsetOffset + segCount * 2;

  for (let i = 0; i < segCount; i++) {
    const endCode = u16(buf, endCountOffset + i * 2);
    const startCode = u16(buf, startCountOffset + i * 2);
    const idDelta = i16(buf, idDeltaOffset + i * 2);
    const idRangeOffset = u16(buf, idRangeOffsetOffset + i * 2);

    if (startCode === 0xffff) break;

    for (let c = startCode; c <= endCode; c++) {
      let glyphId: number;
      if (idRangeOffset === 0) {
        glyphId = (c + idDelta) & 0xffff;
      } else {
        // Offset from the position of the idRangeOffset field to the glyph ID
        const glyphIdIndex =
          idRangeOffsetOffset + i * 2 + idRangeOffset + (c - startCode) * 2;
        glyphId = u16(buf, glyphIdIndex);
        if (glyphId !== 0) {
          glyphId = (glyphId + idDelta) & 0xffff;
        }
      }
      if (glyphId !== 0) {
        out.set(c, glyphId);
      }
    }
  }
}

/**
 * Parse the cmap table of a TTF buffer and return a Unicode codepoint → glyph ID map.
 * Tries format 4 subtables in order of preference: platform 3 (Windows Unicode BMP),
 * then platform 0 (Unicode).
 */
export function parseCmap(buf: Buffer): Map<number, number> {
  const table = findTable(buf, 'cmap');
  if (!table) return new Map();

  const cmapBase = table.offset;
  const numSubtables = u16(buf, cmapBase + 2);

  // Collect candidate subtables, prefer platform 3 encoding 1 (Windows Unicode BMP)
  interface Candidate { platformId: number; encodingId: number; offset: number }
  const candidates: Candidate[] = [];

  for (let i = 0; i < numSubtables; i++) {
    const recOff = cmapBase + 4 + i * 8;
    const platformId = u16(buf, recOff);
    const encodingId = u16(buf, recOff + 2);
    const offset = u32(buf, recOff + 4);
    candidates.push({ platformId, encodingId, offset: cmapBase + offset });
  }

  // Priority: platform 3 encoding 1, then platform 0 encoding 3, then any format 4
  const preferred = [
    candidates.find(c => c.platformId === 3 && c.encodingId === 1),
    candidates.find(c => c.platformId === 0 && c.encodingId === 3),
    candidates.find(c => u16(buf, c.offset) === 4),
  ].filter(Boolean) as Candidate[];

  const result = new Map<number, number>();

  for (const cand of preferred) {
    const fmt = u16(buf, cand.offset);
    if (fmt === 4) {
      parseFmt4(buf, cand.offset, result);
      if (result.size > 0) break;
    }
  }

  return result;
}

/**
 * Parse the hmtx table and return a map of glyph ID → advance width in font units.
 * Also returns unitsPerEm from the head table so callers can convert to points.
 *
 * Advance width in pt = (advanceWidth / unitsPerEm) * fontSize
 */
export function parseHmtx(buf: Buffer): { advanceWidths: Map<number, number>; unitsPerEm: number } {
  const advanceWidths = new Map<number, number>();

  // unitsPerEm is in the head table at offset 18
  const headTable = findTable(buf, 'head');
  const unitsPerEm = headTable ? u16(buf, headTable.offset + 18) : 1000;

  // numberOfHMetrics is in the hhea table at offset 34
  const hheaTable = findTable(buf, 'hhea');
  if (!hheaTable) return { advanceWidths, unitsPerEm };
  const numberOfHMetrics = u16(buf, hheaTable.offset + 34);

  // hmtx table: numberOfHMetrics × {advanceWidth u16, lsb i16}
  const hmtxTable = findTable(buf, 'hmtx');
  if (!hmtxTable) return { advanceWidths, unitsPerEm };

  let lastAdvance = 0;
  for (let i = 0; i < numberOfHMetrics; i++) {
    const advW = u16(buf, hmtxTable.offset + i * 4);
    advanceWidths.set(i, advW);
    lastAdvance = advW;
  }

  // Glyphs beyond numberOfHMetrics share the last advanceWidth (monospaced tail)
  // We cap at glyph 10000 to avoid allocating huge maps
  const maxGlyph = Math.min(10000, numberOfHMetrics + 500);
  for (let i = numberOfHMetrics; i < maxGlyph; i++) {
    advanceWidths.set(i, lastAdvance);
  }

  return { advanceWidths, unitsPerEm };
}

/**
 * XLSX XML generators.
 * Builds every XML file required inside an .xlsx ZIP container.
 */

// ── Escaping ─────────────────────────────────────────────────────────────────

export function xmlEsc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── [Content_Types].xml ───────────────────────────────────────────────────────

export function contentTypes(sheetCount: number): string {
  const sheets = Array.from({ length: sheetCount }, (_, i) =>
    `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  ${sheets}
</Types>`;
}

// ── _rels/.rels ───────────────────────────────────────────────────────────────

export function rootRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

// ── xl/_rels/workbook.xml.rels ────────────────────────────────────────────────

export function workbookRels(sheetCount: number): string {
  const sheets = Array.from({ length: sheetCount }, (_, i) =>
    `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
  ).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets}
  <Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId${sheetCount + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;
}

// ── xl/workbook.xml ───────────────────────────────────────────────────────────

export function workbook(sheets: Array<{ name: string }>): string {
  const sheetEls = sheets
    .map((s, i) => `<sheet name="${xmlEsc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetEls}</sheets>
</workbook>`;
}

// ── xl/styles.xml ─────────────────────────────────────────────────────────────
//
// Style index map (used when building cells):
//   0 = normal
//   1 = bold (header/title text)
//   2 = currency  #,##0.00
//   3 = integer   #,##0
//   4 = percent   0.00%
//   5 = bold + currency
//   6 = bold + center (schedule header cells)

export function styles(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="3">
    <numFmt numFmtId="164" formatCode="#,##0.00"/>
    <numFmt numFmtId="165" formatCode="#,##0"/>
    <numFmt numFmtId="166" formatCode="0.00%"/>
  </numFmts>
  <fonts count="3">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0A192F"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF0F4F8"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFD1D5DB"/></left>
      <right style="thin"><color rgb="FFD1D5DB"/></right>
      <top style="thin"><color rgb="FFD1D5DB"/></top>
      <bottom style="thin"><color rgb="FFD1D5DB"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="7">
    <!-- 0: normal -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0">
      <alignment wrapText="0"/>
    </xf>
    <!-- 1: bold -->
    <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0">
      <alignment wrapText="0"/>
    </xf>
    <!-- 2: currency -->
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0">
      <alignment horizontal="right"/>
    </xf>
    <!-- 3: integer -->
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0">
      <alignment horizontal="right"/>
    </xf>
    <!-- 4: percent -->
    <xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0">
      <alignment horizontal="right"/>
    </xf>
    <!-- 5: bold + navy fill + white font (schedule header) -->
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0">
      <alignment horizontal="center" wrapText="1"/>
    </xf>
    <!-- 6: alt row fill -->
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0"/>
  </cellXfs>
</styleSheet>`;
}

// ── xl/sharedStrings.xml ──────────────────────────────────────────────────────

export function sharedStrings(strings: string[]): string {
  const items = strings.map(s => `<si><t xml:space="preserve">${xmlEsc(s)}</t></si>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">
${items}
</sst>`;
}

// ── xl/worksheets/sheetN.xml ─────────────────────────────────────────────────

export type CellValue = string | number | null;
export type CellStyle = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Cell {
  v: CellValue;
  s?: CellStyle; // style index
}

export interface ColWidth {
  col: number; // 1-based
  width: number;
}

export function worksheet(
  rows: Cell[][],
  colWidths: ColWidth[],
  rtl: boolean,
  sharedStrings: Map<string, number>,
): string {
  const colDefs = colWidths
    .map(c => `<col min="${c.col}" max="${c.col}" width="${c.width}" customWidth="1"/>`)
    .join('');

  const rowEls = rows.map((row, ri) => {
    const cellEls = row.map((cell, ci) => {
      const colLetter = colIndexToLetter(ci);
      const addr = `${colLetter}${ri + 1}`;
      const s = cell.s ?? 0;

      if (cell.v === null || cell.v === undefined || cell.v === '') {
        return `<c r="${addr}" s="${s}"/>`;
      }

      if (typeof cell.v === 'number') {
        return `<c r="${addr}" t="n" s="${s}"><v>${cell.v}</v></c>`;
      }

      // String — use shared strings table
      const idx = sharedStrings.get(cell.v as string) ?? 0;
      return `<c r="${addr}" t="s" s="${s}"><v>${idx}</v></c>`;
    }).join('');

    return `<row r="${ri + 1}">${cellEls}</row>`;
  }).join('');

  const sheetViewAttrs = rtl ? ' rightToLeft="1"' : '';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView workbookViewId="0"${sheetViewAttrs}>
      <selection activeCell="A1" sqref="A1"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>${colDefs}</cols>
  <sheetData>${rowEls}</sheetData>
</worksheet>`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function colIndexToLetter(index: number): string {
  let result = '';
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode((n % 26) + 65) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

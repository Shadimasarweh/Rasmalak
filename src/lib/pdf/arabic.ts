/**
 * Arabic text shaper.
 *
 * Converts Unicode Arabic characters into their correct presentation forms
 * (isolated / initial / medial / final) based on joining context, then
 * reverses the glyph sequence for RTL PDF rendering.
 *
 * No external dependencies. Implements the Unicode Arabic shaping algorithm
 * for the subset of characters used in financial reports.
 */

// ── Joining types ─────────────────────────────────────────────────────────────
// D = dual joining (joins on both sides)   e.g. ب ت ث ن
// R = right joining (joins only on right)  e.g. ا د ذ ر ز و
// T = transparent (marks, don't break joining context)
// U = non-joining

type JoinType = 'D' | 'R' | 'T' | 'U';

const JOIN_TYPE: Record<number, JoinType> = {
  // Right-joining (alef family, waw, reh, zain, etc.)
  0x0627: 'R', // ا ALEF
  0x0622: 'R', // آ ALEF WITH MADDA
  0x0623: 'R', // أ ALEF WITH HAMZA ABOVE
  0x0625: 'R', // إ ALEF WITH HAMZA BELOW
  0x0671: 'R', // ٱ ALEF WASLA
  0x0648: 'R', // و WAW
  0x0624: 'R', // ؤ WAW WITH HAMZA
  0x062f: 'R', // د DAL
  0x0630: 'R', // ذ THAL
  0x0631: 'R', // ر REH
  0x0632: 'R', // ز ZAIN
  0x0698: 'R', // ژ JEH
  0x0621: 'U', // ء HAMZA (standalone, no joining)
  0x0626: 'D', // ئ YEH WITH HAMZA
  0x0628: 'D', // ب BA
  0x062a: 'D', // ت TA
  0x062b: 'D', // ث THA
  0x062c: 'D', // ج JIM
  0x062d: 'D', // ح HA
  0x062e: 'D', // خ KHA
  0x0633: 'D', // س SIN
  0x0634: 'D', // ش SHIN
  0x0635: 'D', // ص SAD
  0x0636: 'D', // ض DAD
  0x0637: 'D', // ط TAH
  0x0638: 'D', // ظ ZAH
  0x0639: 'D', // ع AIN
  0x063a: 'D', // غ GHAIN
  0x0641: 'D', // ف FA
  0x0642: 'D', // ق QAF
  0x0643: 'D', // ك KAF
  0x0644: 'D', // ل LAM
  0x0645: 'D', // م MIM
  0x0646: 'D', // ن NUN
  0x0647: 'D', // ه HA
  0x0649: 'D', // ى ALEF MAQSURA
  0x064a: 'D', // ي YA
  0x0629: 'R', // ة TA MARBUTA (right-joining only)
  // Transparent marks
  0x064b: 'T', 0x064c: 'T', 0x064d: 'T', 0x064e: 'T',
  0x064f: 'T', 0x0650: 'T', 0x0651: 'T', 0x0652: 'T',
};

// ── Presentation form tables ──────────────────────────────────────────────────
// Each entry: [isolated, final, initial, medial]

const FORMS: Record<number, [number, number, number, number]> = {
  0x0627: [0xfe8d, 0xfe8e, 0xfe8d, 0xfe8e], // ا
  0x0622: [0xfe81, 0xfe82, 0xfe81, 0xfe82], // آ
  0x0623: [0xfe83, 0xfe84, 0xfe83, 0xfe84], // أ
  0x0625: [0xfe87, 0xfe88, 0xfe87, 0xfe88], // إ
  0x0671: [0xfb50, 0xfb51, 0xfb50, 0xfb51], // ٱ
  0x0648: [0xfeee, 0xfeed, 0xfeee, 0xfeed], // و
  0x0624: [0xfe85, 0xfe86, 0xfe85, 0xfe86], // ؤ
  0x062f: [0xfeaa, 0xfea9, 0xfeaa, 0xfea9], // د
  0x0630: [0xfeac, 0xfeab, 0xfeac, 0xfeab], // ذ
  0x0631: [0xfeae, 0xfead, 0xfeae, 0xfead], // ر
  0x0632: [0xfeb0, 0xfeaf, 0xfeb0, 0xfeaf], // ز
  0x0698: [0xfb8b, 0xfb8a, 0xfb8b, 0xfb8a], // ژ
  0x0626: [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c], // ئ
  0x0628: [0xfe8f, 0xfe90, 0xfe91, 0xfe92], // ب
  0x062a: [0xfe95, 0xfe96, 0xfe97, 0xfe98], // ت
  0x062b: [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c], // ث
  0x062c: [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0], // ج
  0x062d: [0xfea1, 0xfea2, 0xfea3, 0xfea4], // ح
  0x062e: [0xfea5, 0xfea6, 0xfea7, 0xfea8], // خ
  0x0633: [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4], // س
  0x0634: [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8], // ش
  0x0635: [0xfeb9, 0xfeba, 0xfebb, 0xfebc], // ص
  0x0636: [0xfebd, 0xfebe, 0xfebf, 0xfec0], // ض
  0x0637: [0xfec1, 0xfec2, 0xfec3, 0xfec4], // ط
  0x0638: [0xfec5, 0xfec6, 0xfec7, 0xfec8], // ظ
  0x0639: [0xfec9, 0xfeca, 0xfecb, 0xfecc], // ع
  0x063a: [0xfecd, 0xfece, 0xfecf, 0xfed0], // غ
  0x0641: [0xfed1, 0xfed2, 0xfed3, 0xfed4], // ف
  0x0642: [0xfed5, 0xfed6, 0xfed7, 0xfed8], // ق
  0x0643: [0xfed9, 0xfeda, 0xfedb, 0xfedc], // ك
  0x0644: [0xfedd, 0xfede, 0xfedf, 0xfee0], // ل
  0x0645: [0xfee1, 0xfee2, 0xfee3, 0xfee4], // م
  0x0646: [0xfee5, 0xfee6, 0xfee7, 0xfee8], // ن
  0x0647: [0xfee9, 0xfeea, 0xfeeb, 0xfeec], // ه
  0x0649: [0xfeef, 0xfef0, 0xfeef, 0xfef0], // ى
  0x064a: [0xfef1, 0xfef2, 0xfef3, 0xfef4], // ي
  0x0629: [0xfe93, 0xfe94, 0xfe93, 0xfe94], // ة
};

// LAM-ALEF ligatures: lam (0x0644) followed by various alef forms
const LAM_ALEF: Record<number, [number, number]> = {
  0x0622: [0xfef5, 0xfef6], // لآ isolated, final
  0x0623: [0xfef7, 0xfef8], // لأ
  0x0625: [0xfef9, 0xfefa], // لإ
  0x0627: [0xfefb, 0xfefc], // لا
};

// ── Shaper ────────────────────────────────────────────────────────────────────

interface Char {
  code: number;
  join: JoinType;
}

/**
 * Shape Arabic text and return an array of Unicode code points
 * in visual (RTL) order, ready for PDF rendering.
 */
export function shapeArabic(text: string): number[] {
  // Collect characters with their joining types
  const chars: Char[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.codePointAt(i)!;
    if (code > 0xffff) i++; // surrogate pair
    chars.push({ code, join: JOIN_TYPE[code] ?? 'U' });
  }

  const shaped: number[] = [];
  let i = 0;

  while (i < chars.length) {
    const cur = chars[i];
    const jt = cur.join;

    if (jt === 'T') {
      // Transparent: keep as-is, don't affect joining context
      shaped.push(cur.code);
      i++;
      continue;
    }

    if (jt === 'U' || !FORMS[cur.code]) {
      shaped.push(cur.code);
      i++;
      continue;
    }

    // Determine right context (previous in memory = character to our RIGHT visually in RTL)
    let prevJoin: JoinType = 'U';
    for (let p = i - 1; p >= 0; p--) {
      if (chars[p].join !== 'T') { prevJoin = chars[p].join; break; }
    }

    // Determine left context (next in memory = character to our LEFT visually in RTL)
    let nextJoin: JoinType = 'U';
    for (let n = i + 1; n < chars.length; n++) {
      if (chars[n].join !== 'T') { nextJoin = chars[n].join; break; }
    }

    // joinsLeft: character to our RIGHT (prev in memory) is D or R joining.
    // R-joining characters (ALEF, WAW, DAL, REH…) DO cause the character to
    // their left to take FINAL/MEDIAL form — the bug was excluding 'R' here.
    const joinsLeft = (prevJoin === 'D' || prevJoin === 'R');
    // joinsRight: character to our LEFT (next in memory) is D or R joining.
    const joinsRight = (nextJoin === 'D' || nextJoin === 'R');

    // Check LAM-ALEF ligature
    if (cur.code === 0x0644 && joinsRight) {
      // Look ahead for alef
      let nextIdx = i + 1;
      while (nextIdx < chars.length && chars[nextIdx].join === 'T') nextIdx++;
      if (nextIdx < chars.length && LAM_ALEF[chars[nextIdx].code]) {
        const lig = LAM_ALEF[chars[nextIdx].code];
        // Use isolated form if not joining left, final form if joining left
        shaped.push(joinsLeft ? lig[1] : lig[0]);
        i = nextIdx + 1;
        continue;
      }
    }

    const [iso, fin, ini, med] = FORMS[cur.code];

    let form: number;
    if (joinsLeft && joinsRight && jt === 'D') {
      form = med; // medial
    } else if (joinsLeft) {
      form = fin; // final
    } else if (joinsRight && jt === 'D') {
      form = ini; // initial
    } else {
      form = iso; // isolated
    }

    shaped.push(form);
    i++;
  }

  // Reverse for RTL visual order
  // Split into runs: Arabic glyphs reversed as a whole, LTR sequences kept in order
  return reverseForRTL(shaped);
}

/**
 * Returns true for codepoints that form LTR runs inside RTL text —
 * digits (ASCII and Arabic-Indic), Latin letters, and numeric punctuation.
 * These characters keep their internal left-to-right order when the
 * surrounding RTL sequence is reversed for PDF rendering.
 */
function isLTRCodepoint(cp: number): boolean {
  return (
    (cp >= 0x0030 && cp <= 0x0039) || // ASCII digits 0-9
    (cp >= 0x0041 && cp <= 0x005A) || // A-Z
    (cp >= 0x0061 && cp <= 0x007A) || // a-z
    (cp >= 0x0660 && cp <= 0x0669) || // Arabic-Indic digits ٠-٩
    cp === 0x002E || // decimal point .
    cp === 0x002C || // comma ,
    cp === 0x0025 || // percent %
    cp === 0x002D || // minus -
    cp === 0x002B    // plus +
  );
}

/**
 * Reverse Arabic glyph sequence for RTL PDF rendering.
 * Splits codepoints into LTR runs (digits, Latin) and RTL runs (Arabic glyphs, neutral).
 * Run order is reversed for RTL, but each LTR run's internal order is preserved so
 * numbers like ١٢٣ don't become ٣٢١.
 */
function reverseForRTL(codepoints: number[]): number[] {
  interface Run { ltr: boolean; chars: number[] }
  const runs: Run[] = [];

  for (const cp of codepoints) {
    const ltr = isLTRCodepoint(cp);
    const last = runs[runs.length - 1];
    if (!last || last.ltr !== ltr) {
      runs.push({ ltr, chars: [cp] });
    } else {
      last.chars.push(cp);
    }
  }

  runs.reverse();
  const result: number[] = [];
  for (const run of runs) {
    if (run.ltr) {
      result.push(...run.chars);           // LTR: keep internal left-to-right order
    } else {
      result.push(...run.chars.reverse()); // RTL: flip for visual left-to-right PDF placement
    }
  }
  return result;
}

// ── Numeral conversion ────────────────────────────────────────────────────────

const AR_DIGITS: Record<string, string> = {
  '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
  '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩',
};

export function toArabicNumerals(s: string): string {
  return s.replace(/[0-9]/g, d => AR_DIGITS[d]);
}

export function fmtNumber(value: number, decimals = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtNumberAr(value: number, decimals = 2): string {
  return toArabicNumerals(fmtNumber(value, decimals));
}

export function fmtDateAr(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  return toArabicNumerals(`${dd}/${mm}/${yyyy}`);
}

export function fmtDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Returns true if the string contains Arabic script letters.
 * Arabic-Indic digits (U+0660–U+0669) and punctuation are excluded —
 * those render correctly without shaping or reversal.
 */
function hasArabicLetters(text: string): boolean {
  return /[\u0600-\u065F\u066E-\u06D5\u06FA-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/**
 * Convert a string to an array of glyph IDs for PDF CIDFont hex encoding.
 *
 * Arabic text is shaped (presentation forms) and reversed for RTL rendering.
 * Latin text, numbers, and currency symbols must NOT be reversed even inside an
 * Arabic-locale document — only strings that actually contain Arabic letters go
 * through the shaper.
 */
export function toGlyphStream(
  text: string,
  isArabic: boolean,
  glyphMap: Map<number, number>,
): number[] {
  const codepoints: number[] = (isArabic && hasArabicLetters(text))
    ? shapeArabic(text)
    : Array.from(text, ch => ch.codePointAt(0) ?? 0);

  return codepoints.map(cp => glyphMap.get(cp) ?? 0);
}

/**
 * Arabic PDF Helper
 * 
 * Handles Arabic text reshaping, numeral conversion, and font loading
 * for proper Arabic rendering in jsPDF.
 * 
 * jsPDF does not natively support:
 * 1. Arabic glyphs (needs a custom Arabic font)
 * 2. Arabic text shaping (letters change form based on position)
 * 3. RTL text direction (text must be reversed for visual rendering)
 * 
 * This module provides all three capabilities.
 */

import jsPDF from 'jspdf';

// ===== ARABIC PRESENTATION FORMS =====
// Maps each Arabic letter (U+0621–U+064A) to its 4 contextual forms:
// [isolated, final, initial, medial]
const ARABIC_FORMS: Record<number, [number, number, number, number]> = {
  0x0621: [0xFE80, 0xFE80, 0xFE80, 0xFE80], // Hamza (ء)
  0x0622: [0xFE81, 0xFE82, 0xFE81, 0xFE82], // Alef Madda (آ)
  0x0623: [0xFE83, 0xFE84, 0xFE83, 0xFE84], // Alef Hamza Above (أ)
  0x0624: [0xFE85, 0xFE86, 0xFE85, 0xFE86], // Waw Hamza (ؤ)
  0x0625: [0xFE87, 0xFE88, 0xFE87, 0xFE88], // Alef Hamza Below (إ)
  0x0626: [0xFE89, 0xFE8A, 0xFE8B, 0xFE8C], // Yeh Hamza (ئ)
  0x0627: [0xFE8D, 0xFE8E, 0xFE8D, 0xFE8E], // Alef (ا)
  0x0628: [0xFE8F, 0xFE90, 0xFE91, 0xFE92], // Beh (ب)
  0x0629: [0xFE93, 0xFE94, 0xFE93, 0xFE94], // Teh Marbuta (ة)
  0x062A: [0xFE95, 0xFE96, 0xFE97, 0xFE98], // Teh (ت)
  0x062B: [0xFE99, 0xFE9A, 0xFE9B, 0xFE9C], // Theh (ث)
  0x062C: [0xFE9D, 0xFE9E, 0xFE9F, 0xFEA0], // Jeem (ج)
  0x062D: [0xFEA1, 0xFEA2, 0xFEA3, 0xFEA4], // Hah (ح)
  0x062E: [0xFEA5, 0xFEA6, 0xFEA7, 0xFEA8], // Khah (خ)
  0x062F: [0xFEA9, 0xFEAA, 0xFEA9, 0xFEAA], // Dal (د)
  0x0630: [0xFEAB, 0xFEAC, 0xFEAB, 0xFEAC], // Thal (ذ)
  0x0631: [0xFEAD, 0xFEAE, 0xFEAD, 0xFEAE], // Reh (ر)
  0x0632: [0xFEAF, 0xFEB0, 0xFEAF, 0xFEB0], // Zain (ز)
  0x0633: [0xFEB1, 0xFEB2, 0xFEB3, 0xFEB4], // Seen (س)
  0x0634: [0xFEB5, 0xFEB6, 0xFEB7, 0xFEB8], // Sheen (ش)
  0x0635: [0xFEB9, 0xFEBA, 0xFEBB, 0xFEBC], // Sad (ص)
  0x0636: [0xFEBD, 0xFEBE, 0xFEBF, 0xFEC0], // Dad (ض)
  0x0637: [0xFEC1, 0xFEC2, 0xFEC3, 0xFEC4], // Tah (ط)
  0x0638: [0xFEC5, 0xFEC6, 0xFEC7, 0xFEC8], // Zah (ظ)
  0x0639: [0xFEC9, 0xFECA, 0xFECB, 0xFECC], // Ain (ع)
  0x063A: [0xFECD, 0xFECE, 0xFECF, 0xFED0], // Ghain (غ)
  0x0640: [0x0640, 0x0640, 0x0640, 0x0640], // Tatweel (ـ)
  0x0641: [0xFED1, 0xFED2, 0xFED3, 0xFED4], // Feh (ف)
  0x0642: [0xFED5, 0xFED6, 0xFED7, 0xFED8], // Qaf (ق)
  0x0643: [0xFED9, 0xFEDA, 0xFEDB, 0xFEDC], // Kaf (ك)
  0x0644: [0xFEDD, 0xFEDE, 0xFEDF, 0xFEE0], // Lam (ل)
  0x0645: [0xFEE1, 0xFEE2, 0xFEE3, 0xFEE4], // Meem (م)
  0x0646: [0xFEE5, 0xFEE6, 0xFEE7, 0xFEE8], // Noon (ن)
  0x0647: [0xFEE9, 0xFEEA, 0xFEEB, 0xFEEC], // Heh (ه)
  0x0648: [0xFEED, 0xFEEE, 0xFEED, 0xFEEE], // Waw (و)
  0x0649: [0xFEEF, 0xFEF0, 0xFEEF, 0xFEF0], // Alef Maksura (ى)
  0x064A: [0xFEF1, 0xFEF2, 0xFEF3, 0xFEF4], // Yeh (ي)
};

// Letters that DON'T connect to the following letter
const NON_CONNECTING = new Set([
  0x0621, // Hamza
  0x0622, // Alef Madda
  0x0623, // Alef Hamza Above
  0x0624, // Waw Hamza
  0x0625, // Alef Hamza Below
  0x0627, // Alef
  0x0629, // Teh Marbuta
  0x062F, // Dal
  0x0630, // Thal
  0x0631, // Reh
  0x0632, // Zain
  0x0648, // Waw
  0x0649, // Alef Maksura
]);

// Arabic diacritical marks (tashkeel) - preserved but don't affect shaping
const DIACRITICS = new Set([
  0x064B, // Fathatan
  0x064C, // Dammatan
  0x064D, // Kasratan
  0x064E, // Fatha
  0x064F, // Damma
  0x0650, // Kasra
  0x0651, // Shadda
  0x0652, // Sukun
  0x0670, // Superscript Alef
]);

function isArabicLetter(code: number): boolean {
  return ARABIC_FORMS[code] !== undefined;
}

function isDiacritic(code: number): boolean {
  return DIACRITICS.has(code);
}

function canConnectNext(code: number): boolean {
  return isArabicLetter(code) && !NON_CONNECTING.has(code);
}

/**
 * Get the correct presentation form for an Arabic character based on context.
 * Form indices: 0=isolated, 1=final, 2=initial, 3=medial
 */
function getForm(code: number, prevConnects: boolean, nextIsArabic: boolean): number {
  const forms = ARABIC_FORMS[code];
  if (!forms) return code;

  const thisConnectsNext = canConnectNext(code) && nextIsArabic;

  if (prevConnects && thisConnectsNext) return forms[3]; // medial
  if (prevConnects) return forms[1]; // final
  if (thisConnectsNext) return forms[2]; // initial
  return forms[0]; // isolated
}

/**
 * Reshape Arabic text to use presentation forms.
 * This converts logical Arabic characters to their visually correct forms
 * based on their position in a word (isolated, initial, medial, final).
 */
function reshapeArabicText(text: string): string {
  const codes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.codePointAt(i)!;
    codes.push(code);
    // Skip surrogate pair second char
    if (code > 0xFFFF) i++;
  }

  const result: number[] = [];

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];

    // Pass through diacritics unchanged
    if (isDiacritic(code)) {
      result.push(code);
      continue;
    }

    // Non-Arabic characters pass through
    if (!isArabicLetter(code)) {
      result.push(code);
      continue;
    }

    // Find previous non-diacritic Arabic character
    let prevCode = -1;
    for (let j = i - 1; j >= 0; j--) {
      if (!isDiacritic(codes[j])) {
        prevCode = codes[j];
        break;
      }
    }

    // Find next non-diacritic character
    let nextCode = -1;
    for (let j = i + 1; j < codes.length; j++) {
      if (!isDiacritic(codes[j])) {
        nextCode = codes[j];
        break;
      }
    }

    // Handle Lam-Alef ligatures
    if (code === 0x0644 && nextCode !== -1) {
      const prevConnects = prevCode !== -1 && isArabicLetter(prevCode) && canConnectNext(prevCode);
      let ligature = -1;
      if (nextCode === 0x0622) ligature = prevConnects ? 0xFEF6 : 0xFEF5; // لآ
      else if (nextCode === 0x0623) ligature = prevConnects ? 0xFEF8 : 0xFEF7; // لأ
      else if (nextCode === 0x0625) ligature = prevConnects ? 0xFEFA : 0xFEF9; // لإ
      else if (nextCode === 0x0627) ligature = prevConnects ? 0xFEFC : 0xFEFB; // لا

      if (ligature !== -1) {
        result.push(ligature);
        // Skip the alef character (and any diacritics between lam and alef)
        let skip = i + 1;
        while (skip < codes.length && isDiacritic(codes[skip])) skip++;
        i = skip; // skip to the alef (loop increment will move past it)
        continue;
      }
    }

    const prevConnects = prevCode !== -1 && isArabicLetter(prevCode) && canConnectNext(prevCode);
    const nextIsArabic = nextCode !== -1 && isArabicLetter(nextCode);
    const form = getForm(code, prevConnects, nextIsArabic);
    result.push(form);
  }

  return String.fromCodePoint(...result);
}

/**
 * Process Arabic text for jsPDF rendering.
 * Steps:
 * 1. Reshape Arabic characters to presentation forms
 * 2. Handle bidirectional text (reverse for RTL display in LTR context)
 */
export function processArabicText(text: string): string {
  if (!text) return text;

  // Split into segments: Arabic vs non-Arabic
  const segments = splitBidiSegments(text);

  // Process each segment
  const processedSegments = segments.map(seg => {
    if (seg.isArabic) {
      return reshapeArabicText(seg.text);
    }
    return seg.text;
  });

  // Reverse the order of segments (RTL overall direction)
  // And reverse Arabic text segments character-by-character
  const reversed: string[] = [];
  for (let i = processedSegments.length - 1; i >= 0; i--) {
    if (segments[i].isArabic) {
      // Reverse Arabic segment characters for LTR rendering
      reversed.push(Array.from(processedSegments[i]).reverse().join(''));
    } else {
      // Keep non-Arabic segments (numbers, symbols) in original order
      reversed.push(processedSegments[i]);
    }
  }

  return reversed.join('');
}

/**
 * Split text into Arabic and non-Arabic segments for bidirectional handling.
 */
function splitBidiSegments(text: string): { text: string; isArabic: boolean }[] {
  const segments: { text: string; isArabic: boolean }[] = [];
  let current = '';
  let currentIsArabic: boolean | null = null;

  for (let i = 0; i < text.length; i++) {
    const code = text.codePointAt(i)!;
    if (code > 0xFFFF) i++; // Skip surrogate pair

    const isArabicChar = isArabicLetter(code) || isDiacritic(code) ||
      (code >= 0x0660 && code <= 0x0669) || // Arabic-Indic digits
      code === 0x060C || code === 0x061B || code === 0x061F; // Arabic punctuation

    // Space and common punctuation are neutral - attach to current segment
    const isNeutral = code === 0x20 || code === 0x2E || code === 0x2C ||
      code === 0x28 || code === 0x29 || code === 0x3A || code === 0x00A0;

    if (isNeutral) {
      current += String.fromCodePoint(code);
      continue;
    }

    if (currentIsArabic === null) {
      currentIsArabic = isArabicChar;
      current = String.fromCodePoint(code);
    } else if (isArabicChar === currentIsArabic) {
      current += String.fromCodePoint(code);
    } else {
      if (current) {
        segments.push({ text: current, isArabic: currentIsArabic });
      }
      current = String.fromCodePoint(code);
      currentIsArabic = isArabicChar;
    }
  }

  if (current) {
    segments.push({ text: current, isArabic: currentIsArabic ?? false });
  }

  return segments;
}

// ===== NUMERAL CONVERSION =====

const WESTERN_TO_ARABIC_DIGITS: Record<string, string> = {
  '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
  '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩',
};

/**
 * Convert Western numerals (0-9) to Arabic-Indic numerals (٠-٩).
 */
export function toArabicNumerals(str: string): string {
  return str.replace(/[0-9]/g, (d) => WESTERN_TO_ARABIC_DIGITS[d]);
}

/**
 * Format a number with Arabic-Indic numerals.
 * Uses Western punctuation (comma for thousands, period for decimal)
 * but Arabic-Indic digits.
 */
export function formatNumberArabic(value: number, decimals: number = 2): string {
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return toArabicNumerals(formatted);
}

/**
 * Format a date string with Arabic-Indic numerals (YYYY/MM/DD format).
 */
export function formatDateArabic(date: Date): string {
  const yyyy = date.getFullYear().toString();
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  return toArabicNumerals(`${yyyy}/${mm}/${dd}`);
}

// ===== FONT LOADING =====

let fontCache: { regular: string; bold: string } | null = null;

/**
 * Load Amiri Arabic font files and convert to base64 for jsPDF.
 * Caches the result for subsequent calls.
 */
async function loadArabicFonts(): Promise<{ regular: string; bold: string }> {
  if (fontCache) return fontCache;

  const [regularResponse, boldResponse] = await Promise.all([
    fetch('/fonts/Amiri-Regular.ttf'),
    fetch('/fonts/Amiri-Bold.ttf'),
  ]);

  if (!regularResponse.ok || !boldResponse.ok) {
    throw new Error('Failed to load Arabic fonts');
  }

  const [regularBuffer, boldBuffer] = await Promise.all([
    regularResponse.arrayBuffer(),
    boldResponse.arrayBuffer(),
  ]);

  const regularBase64 = arrayBufferToBase64(regularBuffer);
  const boldBase64 = arrayBufferToBase64(boldBuffer);

  fontCache = { regular: regularBase64, bold: boldBase64 };
  return fontCache;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Register the Amiri Arabic font with a jsPDF document.
 * Must be called before using the font.
 */
export async function registerArabicFont(doc: jsPDF): Promise<void> {
  const fonts = await loadArabicFonts();

  doc.addFileToVFS('Amiri-Regular.ttf', fonts.regular);
  doc.addFileToVFS('Amiri-Bold.ttf', fonts.bold);
  doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
  doc.addFont('Amiri-Bold.ttf', 'Amiri', 'bold');
}


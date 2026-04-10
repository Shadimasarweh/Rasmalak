/**
 * Arabic PDF Helper
 * 
 * Handles Arabic-Indic numeral conversion and font loading for pdfmake.
 * 
 * Note: pdfmake uses fontkit internally which processes OpenType GSUB tables,
 * so Arabic text shaping (letter joining) is handled automatically.
 * We only need to handle numeral conversion and font loading.
 */

// ===== RTL TEXT DIRECTION =====

// Unicode BiDi control characters
const RLE = '\u202B'; // RIGHT-TO-LEFT EMBEDDING
const PDF = '\u202C'; // POP DIRECTIONAL FORMATTING

/**
 * Wrap a string with RTL embedding markers so pdfmake renders it right-to-left.
 * This fixes word order and numeral direction for Arabic text in PDF.
 */
export function rtl(text: string): string {
  return `${RLE}${text}${PDF}`;
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
 * Format a number for display.
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a number with Arabic-Indic numerals (no RTL embedding — callers wrap).
 */
export function formatNumberArabic(value: number, decimals: number = 2): string {
  return toArabicNumerals(formatNumber(value, decimals));
}

/**
 * Format a date as DD/MM/YYYY.
 */
export function formatDate(date: Date): string {
  const yyyy = date.getFullYear().toString();
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Format a date with Arabic-Indic numerals (no RTL embedding — callers wrap).
 */
export function formatDateArabic(date: Date): string {
  return toArabicNumerals(formatDate(date));
}

// ===== FONT LOADING =====

let fontCache: { regular: string; bold: string } | null = null;

/**
 * Convert an ArrayBuffer to a base64 string.
 */
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
 * Load Amiri Arabic font files and convert to base64 for pdfmake VFS.
 * Caches the result after first load.
 */
export async function loadArabicFonts(): Promise<{ regular: string; bold: string }> {
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

  fontCache = {
    regular: arrayBufferToBase64(regularBuffer),
    bold: arrayBufferToBase64(boldBuffer),
  };
  return fontCache;
}

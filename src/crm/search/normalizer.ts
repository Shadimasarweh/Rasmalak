/**
 * Arabic Text Normalizer
 * ======================
 * Strips diacritics, normalizes alef variants, taa marbuta,
 * alef maqsura, and removes tatweel for consistent search matching.
 */

export function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '')  // strip tashkeel (diacritics)
    .replace(/[إأآٱ]/g, 'ا')                // normalize alef variants → bare alef
    .replace(/ة/g, 'ه')                      // taa marbuta → haa
    .replace(/ى/g, 'ي')                      // alef maqsura → yaa
    .replace(/ـ/g, '')                        // remove tatweel (kashida)
    .trim();
}

/**
 * Normalize for search: lowercase + Arabic normalize.
 * Works on both Arabic and Latin text.
 */
export function normalizeForSearch(text: string): string {
  return normalizeArabic(text.toLowerCase().trim());
}

/**
 * Check if text contains Arabic characters.
 */
export function isArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

/**
 * Convert Arabic-Indic numerals (٠-٩) to Western (0-9).
 */
export function arabicIndicToWestern(text: string): string {
  return text.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

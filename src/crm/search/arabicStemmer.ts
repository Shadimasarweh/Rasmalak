/**
 * Light Arabic Stemmer
 * ====================
 * Strips common prefixes and suffixes for search relevance.
 * NOT full morphological analysis — just prefix/suffix stripping
 * sufficient for CRM name/company search.
 */

// Common prefixes to strip
const PREFIXES = [
  'ال',   // definite article
  'وال',  // wa + definite article
  'بال',  // bi + definite article
  'كال',  // ka + definite article
  'فال',  // fa + definite article
  'لل',   // li + definite article
  'و',    // wa (and)
  'ب',    // bi (with/in)
  'ك',    // ka (like)
  'ف',    // fa (so/then)
  'ل',    // li (for)
];

// Common suffixes to strip
const SUFFIXES = [
  'ية',   // nisba (adjective suffix)
  'ات',   // feminine plural
  'ين',   // masculine plural oblique / dual oblique
  'ون',   // masculine plural nominative
  'ة',    // taa marbuta (feminine marker)
  'ه',    // haa (pronoun suffix or taa marbuta normalized)
  'ي',    // yaa (possessive)
  'ا',    // alef (dual/plural ending)
];

// Sort by length descending so longer affixes match first
const SORTED_PREFIXES = [...PREFIXES].sort((a, b) => b.length - a.length);
const SORTED_SUFFIXES = [...SUFFIXES].sort((a, b) => b.length - a.length);

/**
 * Light stem: strip one prefix and one suffix.
 * Preserves a minimum root length of 2 characters to avoid over-stemming.
 */
export function lightStem(word: string): string {
  let result = word.trim();
  const MIN_ROOT_LENGTH = 2;

  // Strip prefix
  for (const prefix of SORTED_PREFIXES) {
    if (result.startsWith(prefix) && result.length - prefix.length >= MIN_ROOT_LENGTH) {
      result = result.slice(prefix.length);
      break;
    }
  }

  // Strip suffix
  for (const suffix of SORTED_SUFFIXES) {
    if (result.endsWith(suffix) && result.length - suffix.length >= MIN_ROOT_LENGTH) {
      result = result.slice(0, result.length - suffix.length);
      break;
    }
  }

  return result;
}

/**
 * Stem all words in a text string.
 */
export function stemText(text: string): string {
  return text
    .split(/\s+/)
    .map(lightStem)
    .join(' ')
    .trim();
}

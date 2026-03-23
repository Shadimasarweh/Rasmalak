/**
 * Centralized currency metadata for multi-currency support.
 * 
 * This file is the SINGLE SOURCE OF TRUTH for currency display names.
 * 
 * IMPORTANT:
 * - ISO 4217 codes are stored in the database (e.g., "JOD", "AED")
 * - This file provides localized DISPLAY labels only
 * - Amount formatting uses Intl.NumberFormat, NOT this file
 * - Arabic names include both full name AND standard abbreviation
 *   to avoid ambiguity (e.g., "دينار أردني (د.ا)" not just "د.ا")
 */

export interface CurrencyMetadata {
  en: string;
  ar: string;
}

/**
 * Currency display names keyed by ISO 4217 code.
 * All Arab-region currencies plus USD/EUR.
 */
export const currencies: Record<string, CurrencyMetadata> = {
  JOD: {
    en: 'Jordanian Dinar (JOD)',
    ar: 'دينار أردني (د.ا)',
  },
  SAR: {
    en: 'Saudi Riyal (SAR)',
    ar: 'ريال سعودي (ر.س)',
  },
  AED: {
    en: 'UAE Dirham (AED)',
    ar: 'درهم إماراتي (د.إ)',
  },
  KWD: {
    en: 'Kuwaiti Dinar (KWD)',
    ar: 'دينار كويتي (د.ك)',
  },
  QAR: {
    en: 'Qatari Riyal (QAR)',
    ar: 'ريال قطري (ر.ق)',
  },
  BHD: {
    en: 'Bahraini Dinar (BHD)',
    ar: 'دينار بحريني (د.ب)',
  },
  OMR: {
    en: 'Omani Rial (OMR)',
    ar: 'ريال عماني (ر.ع)',
  },
  EGP: {
    en: 'Egyptian Pound (EGP)',
    ar: 'جنيه مصري (ج.م)',
  },
  MAD: {
    en: 'Moroccan Dirham (MAD)',
    ar: 'درهم مغربي (د.م)',
  },
  DZD: {
    en: 'Algerian Dinar (DZD)',
    ar: 'دينار جزائري (د.ج)',
  },
  TND: {
    en: 'Tunisian Dinar (TND)',
    ar: 'دينار تونسي (د.ت)',
  },
  IQD: {
    en: 'Iraqi Dinar (IQD)',
    ar: 'دينار عراقي (ع.د)',
  },
  LBP: {
    en: 'Lebanese Pound (LBP)',
    ar: 'ليرة لبنانية (ل.ل)',
  },
  SYP: {
    en: 'Syrian Pound (SYP)',
    ar: 'ليرة سورية (ل.س)',
  },
  LYD: {
    en: 'Libyan Dinar (LYD)',
    ar: 'دينار ليبي (ل.د)',
  },
  SDG: {
    en: 'Sudanese Pound (SDG)',
    ar: 'جنيه سوداني (ج.س)',
  },
  YER: {
    en: 'Yemeni Rial (YER)',
    ar: 'ريال يمني (ر.ي)',
  },
  USD: {
    en: 'US Dollar (USD)',
    ar: 'دولار أمريكي (د.أ)',
  },
  EUR: {
    en: 'Euro (EUR)',
    ar: 'يورو (€)',
  },
};

/**
 * Ordered list of supported currency codes.
 * This determines the display order in selectors.
 */
export const SUPPORTED_CURRENCY_CODES = [
  'JOD',
  'SAR',
  'AED',
  'KWD',
  'QAR',
  'BHD',
  'OMR',
  'EGP',
  'MAD',
  'DZD',
  'TND',
  'IQD',
  'LBP',
  'SYP',
  'LYD',
  'SDG',
  'YER',
  'USD',
  'EUR',
] as const;

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCY_CODES)[number];

/**
 * Get the localized display name for a currency.
 * @param code ISO 4217 currency code
 * @param language 'en' or 'ar'
 * @returns Localized currency name, or the code itself if not found
 */
export function getCurrencyDisplayName(
  code: string,
  language: 'en' | 'ar'
): string {
  const meta = currencies[code];
  if (!meta) {
    // Fallback to code if currency not in our list
    return code;
  }
  return meta[language];
}

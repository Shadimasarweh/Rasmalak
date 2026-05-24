/**
 * Country metadata for the multi-currency engine.
 *
 * Single source of truth for the country -> base_currency mapping
 * applied at onboarding. After onboarding the user can change their
 * base_currency directly in Settings (the country itself is treated
 * as immutable profile data).
 *
 * `centralBank` indicates which provider in `src/lib/fx/providers/`
 * is the canonical source for that base currency. Currencies whose
 * country has `centralBank: null` fall straight to the aggregator
 * fallback.
 */

export type CentralBankProvider = 'sama' | 'cbe' | 'cbj' | 'cbuae';

export interface CountryMetadata {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  nameAr: string;
  currency: string; // ISO 4217
  flag: string;
  centralBank: CentralBankProvider | null;
}

export const COUNTRIES: CountryMetadata[] = [
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'السعودية', currency: 'SAR', flag: '🇸🇦', centralBank: 'sama' },
  { code: 'AE', name: 'United Arab Emirates', nameAr: 'الإمارات', currency: 'AED', flag: '🇦🇪', centralBank: 'cbuae' },
  { code: 'EG', name: 'Egypt', nameAr: 'مصر', currency: 'EGP', flag: '🇪🇬', centralBank: 'cbe' },
  { code: 'JO', name: 'Jordan', nameAr: 'الأردن', currency: 'JOD', flag: '🇯🇴', centralBank: 'cbj' },
  { code: 'KW', name: 'Kuwait', nameAr: 'الكويت', currency: 'KWD', flag: '🇰🇼', centralBank: null },
  { code: 'QA', name: 'Qatar', nameAr: 'قطر', currency: 'QAR', flag: '🇶🇦', centralBank: null },
  { code: 'BH', name: 'Bahrain', nameAr: 'البحرين', currency: 'BHD', flag: '🇧🇭', centralBank: null },
  { code: 'OM', name: 'Oman', nameAr: 'عُمان', currency: 'OMR', flag: '🇴🇲', centralBank: null },
  { code: 'MA', name: 'Morocco', nameAr: 'المغرب', currency: 'MAD', flag: '🇲🇦', centralBank: null },
  { code: 'DZ', name: 'Algeria', nameAr: 'الجزائر', currency: 'DZD', flag: '🇩🇿', centralBank: null },
  { code: 'TN', name: 'Tunisia', nameAr: 'تونس', currency: 'TND', flag: '🇹🇳', centralBank: null },
  { code: 'IQ', name: 'Iraq', nameAr: 'العراق', currency: 'IQD', flag: '🇮🇶', centralBank: null },
  { code: 'LB', name: 'Lebanon', nameAr: 'لبنان', currency: 'LBP', flag: '🇱🇧', centralBank: null },
  { code: 'LY', name: 'Libya', nameAr: 'ليبيا', currency: 'LYD', flag: '🇱🇾', centralBank: null },
  { code: 'SD', name: 'Sudan', nameAr: 'السودان', currency: 'SDG', flag: '🇸🇩', centralBank: null },
  { code: 'YE', name: 'Yemen', nameAr: 'اليمن', currency: 'YER', flag: '🇾🇪', centralBank: null },
  { code: 'SY', name: 'Syria', nameAr: 'سوريا', currency: 'SYP', flag: '🇸🇾', centralBank: null },
  { code: 'OTHER', name: 'Other', nameAr: 'أخرى', currency: 'USD', flag: '🌍', centralBank: null },
];

const COUNTRY_BY_CODE: Record<string, CountryMetadata> = COUNTRIES.reduce(
  (acc, c) => {
    acc[c.code] = c;
    return acc;
  },
  {} as Record<string, CountryMetadata>,
);

/** Map a country code to the legal-tender currency. Falls back to USD. */
export function getCurrencyForCountry(countryCode: string | null | undefined): string {
  if (!countryCode) return 'USD';
  return COUNTRY_BY_CODE[countryCode]?.currency ?? 'USD';
}

/** Returns the central bank provider id for a country, or null if unsupported. */
export function getCentralBankForCountry(countryCode: string | null | undefined): CentralBankProvider | null {
  if (!countryCode) return null;
  return COUNTRY_BY_CODE[countryCode]?.centralBank ?? null;
}

/** Returns true if the given currency is the legal tender of any tracked country. */
export function isSupportedBaseCurrency(currency: string): boolean {
  return COUNTRIES.some((c) => c.currency === currency);
}

/** Localized display name for a country. */
export function getCountryDisplayName(
  countryCode: string,
  language: 'en' | 'ar',
): string {
  const country = COUNTRY_BY_CODE[countryCode];
  if (!country) return countryCode;
  return language === 'ar' ? country.nameAr : country.name;
}

/**
 * MENA Vendor Normalization Table
 * ================================
 * Maps common bill/receipt vendors across the MENA region to a canonical
 * name, a default expense category, and a recurring-bill hint.
 *
 * The table intentionally stays small. Anything not matched here falls
 * through to the raw vendor name and a generic category. We bias toward
 * utility, telecom, and well-known retail brands because those are the
 * documents users upload most often.
 *
 * Match rules:
 * - Both Arabic and English aliases are supported.
 * - Matching is case-insensitive substring against the raw vendor name.
 * - The first alias that matches wins (table order matters).
 */

export interface MenaVendor {
  canonical: string;
  category: string;            // Maps to category ids in src/messages/*/categories.ts
  isRecurring: boolean;        // True for utilities, telecom, subscriptions
  country?: string;            // Optional country hint (ISO 3166-1 alpha-2)
  aliases: string[];           // Substrings (lowercased) to match against raw vendor text
}

export const MENA_VENDORS: MenaVendor[] = [
  // ── UAE — Utilities ──────────────────────────────────────────────
  {
    canonical: 'DEWA',
    category: 'bills',
    isRecurring: true,
    country: 'AE',
    aliases: ['dewa', 'dubai electricity', 'هيئة كهرباء ومياه دبي', 'كهرباء دبي'],
  },
  {
    canonical: 'ADDC',
    category: 'bills',
    isRecurring: true,
    country: 'AE',
    aliases: ['addc', 'abu dhabi distribution', 'أبو ظبي للتوزيع'],
  },
  {
    canonical: 'SEWA',
    category: 'bills',
    isRecurring: true,
    country: 'AE',
    aliases: ['sewa', 'sharjah electricity', 'كهرباء الشارقة'],
  },
  {
    canonical: 'FEWA',
    category: 'bills',
    isRecurring: true,
    country: 'AE',
    aliases: ['fewa', 'federal electricity', 'الكهرباء والماء الاتحادية'],
  },

  // ── UAE — Telecom ────────────────────────────────────────────────
  {
    canonical: 'Etisalat',
    category: 'bills',
    isRecurring: true,
    country: 'AE',
    aliases: ['etisalat', 'اتصالات'],
  },
  {
    canonical: 'du',
    category: 'bills',
    isRecurring: true,
    country: 'AE',
    aliases: [' du ', 'du telecom', 'du.ae', 'دو'],
  },

  // ── Saudi Arabia — Utilities & Telecom ───────────────────────────
  {
    canonical: 'SEC',
    category: 'bills',
    isRecurring: true,
    country: 'SA',
    aliases: ['saudi electricity', 'الشركة السعودية للكهرباء', 'كهرباء السعودية'],
  },
  {
    canonical: 'STC',
    category: 'bills',
    isRecurring: true,
    country: 'SA',
    aliases: ['stc', 'saudi telecom', 'الاتصالات السعودية'],
  },
  {
    canonical: 'Mobily',
    category: 'bills',
    isRecurring: true,
    country: 'SA',
    aliases: ['mobily', 'موبايلي'],
  },
  {
    canonical: 'Zain SA',
    category: 'bills',
    isRecurring: true,
    country: 'SA',
    aliases: ['zain ksa', 'zain sa', 'زين السعودية'],
  },

  // ── Jordan — Utilities & Telecom ─────────────────────────────────
  {
    canonical: 'JEPCO',
    category: 'bills',
    isRecurring: true,
    country: 'JO',
    aliases: ['jepco', 'jordan electric', 'الكهرباء الأردنية', 'كهرباء الأردن'],
  },
  {
    canonical: 'Miyahuna',
    category: 'bills',
    isRecurring: true,
    country: 'JO',
    aliases: ['miyahuna', 'مياهنا'],
  },
  {
    canonical: 'Zain JO',
    category: 'bills',
    isRecurring: true,
    country: 'JO',
    aliases: ['zain jordan', 'zain jo', 'زين الأردن'],
  },
  {
    canonical: 'Orange JO',
    category: 'bills',
    isRecurring: true,
    country: 'JO',
    aliases: ['orange jordan', 'orange jo', 'أورنج الأردن'],
  },
  {
    canonical: 'Umniah',
    category: 'bills',
    isRecurring: true,
    country: 'JO',
    aliases: ['umniah', 'أمنية'],
  },

  // ── Egypt — Utilities & Telecom ──────────────────────────────────
  {
    canonical: 'Vodafone Egypt',
    category: 'bills',
    isRecurring: true,
    country: 'EG',
    aliases: ['vodafone', 'فودافون'],
  },
  {
    canonical: 'Orange Egypt',
    category: 'bills',
    isRecurring: true,
    country: 'EG',
    aliases: ['orange egypt', 'أورنج مصر'],
  },
  {
    canonical: 'WE',
    category: 'bills',
    isRecurring: true,
    country: 'EG',
    aliases: ['we telecom', 'المصرية للاتصالات'],
  },
  {
    canonical: 'Etisalat Egypt',
    category: 'bills',
    isRecurring: true,
    country: 'EG',
    aliases: ['etisalat misr', 'اتصالات مصر'],
  },

  // ── Logistics ────────────────────────────────────────────────────
  {
    canonical: 'Aramex',
    category: 'shopping',
    isRecurring: false,
    aliases: ['aramex', 'أرامكس'],
  },

  // ── Streaming / Subscriptions ────────────────────────────────────
  {
    canonical: 'Netflix',
    category: 'entertainment',
    isRecurring: true,
    aliases: ['netflix', 'نتفليكس'],
  },
  {
    canonical: 'Spotify',
    category: 'entertainment',
    isRecurring: true,
    aliases: ['spotify', 'سبوتيفاي'],
  },
  {
    canonical: 'Anghami',
    category: 'entertainment',
    isRecurring: true,
    aliases: ['anghami', 'أنغامي'],
  },
  {
    canonical: 'Shahid',
    category: 'entertainment',
    isRecurring: true,
    aliases: ['shahid', 'شاهد'],
  },
  {
    canonical: 'OSN',
    category: 'entertainment',
    isRecurring: true,
    aliases: ['osn'],
  },

  // ── Ride-hailing ─────────────────────────────────────────────────
  {
    canonical: 'Careem',
    category: 'transport',
    isRecurring: false,
    aliases: ['careem', 'كريم'],
  },
  {
    canonical: 'Uber',
    category: 'transport',
    isRecurring: false,
    aliases: ['uber', 'أوبر'],
  },

  // ── Food delivery ────────────────────────────────────────────────
  {
    canonical: 'Talabat',
    category: 'food',
    isRecurring: false,
    aliases: ['talabat', 'طلبات'],
  },
  {
    canonical: 'Jahez',
    category: 'food',
    isRecurring: false,
    aliases: ['jahez', 'جاهز'],
  },
  {
    canonical: 'HungerStation',
    category: 'food',
    isRecurring: false,
    aliases: ['hungerstation', 'هنقرستيشن'],
  },

  // ── Grocery & retail ─────────────────────────────────────────────
  {
    canonical: 'Carrefour',
    category: 'food',
    isRecurring: false,
    aliases: ['carrefour', 'كارفور'],
  },
  {
    canonical: 'Lulu Hypermarket',
    category: 'food',
    isRecurring: false,
    aliases: ['lulu', 'لولو'],
  },
  {
    canonical: 'Spinneys',
    category: 'food',
    isRecurring: false,
    aliases: ['spinneys', 'سبينس'],
  },
  {
    canonical: 'Panda',
    category: 'food',
    isRecurring: false,
    aliases: ['panda', 'بنده'],
  },
];

export interface VendorLookupResult {
  canonical: string;
  category: string;
  isRecurring: boolean;
  matched: boolean;
}

/**
 * Look up a vendor by raw text. Returns the canonical record if a known
 * MENA vendor is detected, otherwise echoes the raw input with a generic
 * "other" category.
 */
export function lookupVendor(rawVendor: string | null | undefined): VendorLookupResult {
  if (!rawVendor) {
    return { canonical: '', category: 'other', isRecurring: false, matched: false };
  }
  const needle = rawVendor.toLowerCase();
  for (const v of MENA_VENDORS) {
    for (const alias of v.aliases) {
      if (needle.includes(alias.toLowerCase())) {
        return {
          canonical: v.canonical,
          category: v.category,
          isRecurring: v.isRecurring,
          matched: true,
        };
      }
    }
  }
  return { canonical: rawVendor, category: 'other', isRecurring: false, matched: false };
}

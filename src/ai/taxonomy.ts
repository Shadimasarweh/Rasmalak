/**
 * Subcategory Taxonomy (V1)
 * =========================
 * Two-level expense classification on top of the existing 10 top-level
 * categories in `src/lib/constants.ts`. V1 ships subcategories for
 * `food` and `bills` only — that covers the highest-volume receipts
 * (groceries, restaurants, utilities, telecom, subscriptions) and is
 * what the Receipt Scanner needs to answer "where exactly is my
 * grocery money going?".
 *
 * Other top-level categories (shopping/health/transport/...) deliberately
 * stay single-level in V1. Adding them later is purely additive: extend
 * `SUBCATEGORIES_BY_PARENT` and the keyword tables; nothing else changes.
 *
 * Assignment is hybrid (mirrors the vendor pattern in menaVendors.ts):
 *   1. The LLM proposes a subcategory at extraction time.
 *   2. `classifySubcategory()` validates it against the canonical enum
 *      and, if missing or invalid, runs an EN+AR keyword classifier.
 *   3. Final fallback is a sensible default per parent (groceries_pantry
 *      for food, subscription for bills).
 */

// ── Canonical enum ──────────────────────────────────────────────────

export type FoodSubcategory =
  | 'groceries_produce'
  | 'groceries_dairy'
  | 'groceries_meat'
  | 'groceries_pantry'
  | 'groceries_snacks'
  | 'groceries_beverages'
  | 'groceries_bakery'
  | 'groceries_frozen'
  | 'dining_out'
  | 'coffee_tea'
  | 'fast_food'
  | 'delivery';

export type BillsSubcategory =
  | 'electricity'
  | 'water'
  | 'internet'
  | 'mobile'
  | 'tv_streaming'
  | 'gas'
  | 'subscription'
  | 'insurance';

export type Subcategory = FoodSubcategory | BillsSubcategory;

export const FOOD_SUBCATEGORIES: FoodSubcategory[] = [
  'groceries_produce',
  'groceries_dairy',
  'groceries_meat',
  'groceries_pantry',
  'groceries_snacks',
  'groceries_beverages',
  'groceries_bakery',
  'groceries_frozen',
  'dining_out',
  'coffee_tea',
  'fast_food',
  'delivery',
];

export const BILLS_SUBCATEGORIES: BillsSubcategory[] = [
  'electricity',
  'water',
  'internet',
  'mobile',
  'tv_streaming',
  'gas',
  'subscription',
  'insurance',
];

export const SUBCATEGORIES_BY_PARENT: Record<string, Subcategory[]> = {
  food: FOOD_SUBCATEGORIES,
  bills: BILLS_SUBCATEGORIES,
};

export const ALL_SUBCATEGORIES: Subcategory[] = [
  ...FOOD_SUBCATEGORIES,
  ...BILLS_SUBCATEGORIES,
];

const ALL_SUBCATEGORY_SET = new Set<string>(ALL_SUBCATEGORIES);

const FOOD_FALLBACK: FoodSubcategory = 'groceries_pantry';
const BILLS_FALLBACK: BillsSubcategory = 'subscription';

// ── Display labels ──────────────────────────────────────────────────
// Used by the scanner modal dropdowns and the breakdown widgets. We
// keep them next to the enum (not in i18n message files) because they
// must stay 1:1 with the enum — adding/removing a subcategory must be
// a single-file edit.

export const SUBCATEGORY_LABELS: Record<Subcategory, { en: string; ar: string }> = {
  // food
  groceries_produce: { en: 'Produce', ar: 'خضار وفواكه' },
  groceries_dairy: { en: 'Dairy & eggs', ar: 'ألبان وبيض' },
  groceries_meat: { en: 'Meat & seafood', ar: 'لحوم وأسماك' },
  groceries_pantry: { en: 'Pantry staples', ar: 'مونة وبقالة' },
  groceries_snacks: { en: 'Snacks & sweets', ar: 'سناكات وحلويات' },
  groceries_beverages: { en: 'Beverages', ar: 'مشروبات' },
  groceries_bakery: { en: 'Bread & bakery', ar: 'خبز ومخبوزات' },
  groceries_frozen: { en: 'Frozen foods', ar: 'مجمدات' },
  dining_out: { en: 'Dining out', ar: 'مطاعم' },
  coffee_tea: { en: 'Coffee & tea', ar: 'قهوة وشاي' },
  fast_food: { en: 'Fast food', ar: 'وجبات سريعة' },
  delivery: { en: 'Food delivery', ar: 'توصيل طعام' },
  // bills
  electricity: { en: 'Electricity', ar: 'كهرباء' },
  water: { en: 'Water', ar: 'مياه' },
  internet: { en: 'Internet', ar: 'إنترنت' },
  mobile: { en: 'Mobile', ar: 'جوال' },
  tv_streaming: { en: 'TV & streaming', ar: 'تلفزيون وبث' },
  gas: { en: 'Gas', ar: 'غاز' },
  subscription: { en: 'Subscription', ar: 'اشتراك' },
  insurance: { en: 'Insurance', ar: 'تأمين' },
};

export function getSubcategoryLabel(
  sub: Subcategory,
  language: 'ar' | 'en',
): string {
  const entry = SUBCATEGORY_LABELS[sub];
  if (!entry) return sub;
  return language === 'ar' ? entry.ar : entry.en;
}

// ── Keyword classifier ──────────────────────────────────────────────
// Each entry is a list of substring matches (lowercased) against the
// item description. First entry that matches wins — order matters.
// Both Arabic and English are supported in the same list.

interface KeywordRule {
  subcategory: Subcategory;
  needles: string[];
}

const FOOD_KEYWORDS: KeywordRule[] = [
  // Dairy first — milk/yogurt/cheese should not be confused with anything.
  {
    subcategory: 'groceries_dairy',
    needles: [
      'milk', 'yogurt', 'yoghurt', 'cheese', 'butter', 'labneh', 'labne',
      'cream', 'eggs', 'egg ',
      'حليب', 'لبن', 'لبنة', 'جبنة', 'جبن', 'زبدة', 'بيض', 'قشطة',
    ],
  },
  // Meat & seafood
  {
    subcategory: 'groceries_meat',
    needles: [
      'beef', 'chicken', 'lamb', 'mutton', 'turkey', 'fish', 'shrimp',
      'salmon', 'tuna', 'meat', 'kebab meat',
      'لحم', 'لحمة', 'دجاج', 'فراخ', 'سمك', 'سمكة', 'جمبري', 'تونة',
    ],
  },
  // Bakery
  {
    subcategory: 'groceries_bakery',
    needles: [
      'bread', 'baguette', 'croissant', 'pastry', 'pita', 'khobz', 'roll ',
      'bun', 'cake', 'manakish', 'manaqish',
      'خبز', 'صمون', 'كرواسون', 'مناقيش', 'كعك',
    ],
  },
  // Beverages
  {
    subcategory: 'groceries_beverages',
    needles: [
      'water bottle', 'mineral water', 'soda', 'cola', 'pepsi', 'coke',
      'sprite', 'fanta', 'juice', 'tea bag', 'instant coffee', 'iced tea',
      'lemonade',
      'مياه', 'ماء', 'عصير', 'مشروب', 'شاي',
    ],
  },
  // Snacks & sweets
  {
    subcategory: 'groceries_snacks',
    needles: [
      'chips', 'crisps', 'chocolate', 'candy', 'biscuit', 'cookie', 'wafer',
      'snack', 'pretzel', 'popcorn', 'gum', 'sweet',
      'شيبس', 'شوكولا', 'بسكويت', 'حلوى', 'علكة', 'سناك',
    ],
  },
  // Frozen
  {
    subcategory: 'groceries_frozen',
    needles: [
      'frozen', 'ice cream', 'gelato', 'sorbet',
      'مجمد', 'مثلج', 'بوظة', 'آيس كريم',
    ],
  },
  // Produce
  {
    subcategory: 'groceries_produce',
    needles: [
      'tomato', 'cucumber', 'apple', 'banana', 'orange', 'lemon', 'potato',
      'onion', 'lettuce', 'carrot', 'fruit', 'vegetable', 'salad',
      'طماطم', 'خيار', 'تفاح', 'موز', 'برتقال', 'ليمون', 'بطاطا',
      'بصل', 'خس', 'خضار', 'فواكه', 'فاكهة',
    ],
  },
  // Coffee & tea (shops, not pantry items)
  {
    subcategory: 'coffee_tea',
    needles: [
      'starbucks', 'costa coffee', 'caribou', 'tim hortons', 'dunkin',
      'cappuccino', 'latte', 'espresso', 'macchiato', 'americano',
      'كافيه', 'مقهى', 'ستاربكس', 'كوستا', 'كاريبو',
    ],
  },
  // Fast food (chains)
  {
    subcategory: 'fast_food',
    needles: [
      'mcdonald', 'kfc', 'burger king', 'subway', 'hardee', 'popeyes',
      'pizza hut', 'dominos', 'shawarma', 'falafel sandwich',
      'ماكدونالدز', 'برغر كنج', 'كنتاكي', 'بيتزا هت',
    ],
  },
  // Delivery (apps)
  {
    subcategory: 'delivery',
    needles: [
      'talabat', 'careem food', 'jahez', 'hungerstation', 'deliveroo',
      'uber eats', 'zomato',
      'طلبات', 'كريم فود', 'جاهز',
    ],
  },
  // Restaurants (catch-all dine-in)
  {
    subcategory: 'dining_out',
    needles: [
      'restaurant', 'bistro', 'eatery', 'grill', 'kitchen', 'house ',
      'مطعم',
    ],
  },
  // Pantry catch-all
  {
    subcategory: 'groceries_pantry',
    needles: [
      'rice', 'pasta', 'oil', 'sugar', 'flour', 'salt', 'lentil', 'bean',
      'chickpea', 'spice', 'sauce', 'ketchup', 'mayonnaise', 'tahina',
      'tahini', 'jam', 'honey', 'cereal', 'oats',
      'رز', 'أرز', 'مكرونة', 'زيت', 'سكر', 'طحين', 'ملح', 'عدس', 'فول',
      'بهار', 'صلصة', 'كاتشب', 'مايونيز', 'طحينة', 'مربى', 'عسل',
    ],
  },
];

const BILLS_KEYWORDS: KeywordRule[] = [
  {
    subcategory: 'electricity',
    needles: [
      'electric', 'electricity', 'power bill', 'kwh',
      'كهرباء', 'الطاقة',
      // MENA utility brands
      'dewa', 'addc', 'sewa', 'fewa', 'jepco', 'edl', 'edco', 'idecoMM',
    ],
  },
  {
    subcategory: 'water',
    needles: [
      'water bill', 'water utility', 'sewerage',
      'مياه', 'صرف صحي',
    ],
  },
  {
    subcategory: 'internet',
    needles: [
      'internet', 'broadband', 'fibre', 'fiber', 'wifi', 'home plan',
      'إنترنت', 'فايبر', 'باقة منزل',
    ],
  },
  {
    subcategory: 'mobile',
    needles: [
      'mobile', 'cellular', 'sim ', 'prepaid', 'postpaid',
      'موبايل', 'جوال', 'خلوي', 'شريحة',
      'orange', 'zain', 'umniah', 'stc', 'mobily', 'etisalat', 'du',
    ],
  },
  {
    subcategory: 'tv_streaming',
    needles: [
      'osn', 'starzplay', 'shahid vip', 'beIN', 'cable tv',
      'شاهد', 'تلفزيون',
    ],
  },
  {
    subcategory: 'gas',
    needles: [
      'cooking gas', 'lpg', 'propane', 'natural gas',
      'غاز الطبخ', 'غاز منزلي',
    ],
  },
  {
    subcategory: 'subscription',
    needles: [
      'netflix', 'spotify', 'apple music', 'amazon prime', 'youtube premium',
      'icloud', 'google one', 'disney+', 'subscription',
      'اشتراك',
    ],
  },
  {
    subcategory: 'insurance',
    needles: [
      'insurance', 'premium', 'policy',
      'تأمين',
    ],
  },
];

function matchByKeywords(
  description: string,
  rules: KeywordRule[],
): Subcategory | null {
  const haystack = description.toLowerCase();
  for (const rule of rules) {
    for (const needle of rule.needles) {
      if (haystack.includes(needle.toLowerCase())) return rule.subcategory;
    }
  }
  return null;
}

/**
 * Classify a single line-item description into a canonical subcategory.
 * `proposed` is what the LLM said (or `null` if it didn't say anything).
 *
 * Returns `null` when the parent category isn't part of V1's taxonomy,
 * so callers can leave subcategory blank instead of inventing one.
 */
export function classifySubcategory(
  description: string,
  parentCategory: string,
  proposed?: string | null,
): Subcategory | null {
  const allowed = SUBCATEGORIES_BY_PARENT[parentCategory];
  if (!allowed || allowed.length === 0) return null;

  // 1. Trust the LLM if it returned a value that's in the canonical enum
  //    AND belongs to this parent (no cross-parent leakage).
  if (proposed && ALL_SUBCATEGORY_SET.has(proposed)) {
    if ((allowed as string[]).includes(proposed)) {
      return proposed as Subcategory;
    }
  }

  // 2. Keyword match against the parent's keyword table.
  const rules = parentCategory === 'food' ? FOOD_KEYWORDS : BILLS_KEYWORDS;
  const matched = matchByKeywords(description ?? '', rules);
  if (matched && (allowed as string[]).includes(matched)) {
    return matched;
  }

  // 3. Sensible default per parent so we never lose the row.
  if (parentCategory === 'food') return FOOD_FALLBACK;
  if (parentCategory === 'bills') return BILLS_FALLBACK;
  return null;
}

/**
 * Convenience: does this top-level category have any subcategories
 * defined in V1? Used by the scanner modal to decide whether to render
 * the per-item dropdown column.
 */
export function hasSubcategories(parentCategory: string): boolean {
  const list = SUBCATEGORIES_BY_PARENT[parentCategory];
  return !!list && list.length > 0;
}

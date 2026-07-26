import type { LucideIcon } from 'lucide-react';
import {
  Briefcase,
  Coins,
  CreditCard,
  FileText,
  MoonStar,
  PiggyBank,
  Shield,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';

/*
 * Subject category visual identity for the education screens.
 *
 * Colors follow the Learn v2 mocks with three substitutions mandated by the
 * design system rules (no purple/violet/indigo; gold is reserved for
 * achievements): taxes was #6366F1, planning was #8B5CF6, business was
 * #D97706 in the mock map.
 *
 * The seven remaining hues already occupy green/emerald/teal/cyan/slate-blue
 * plus brick red and olive, so the substitutes are drawn from the only lanes
 * left that stay off the banned palette: deep rose, burnt orange and moss.
 *
 * `color` is the solid chip/hero hue (constant across themes).
 * `heroDark` is the darker end of the article hero gradient.
 * `labelVar` is a theme-aware CSS variable for colored text labels — the
 * dark theme swaps in a lightened tint (see globals.css "Learn v2").
 */
export interface SubjectCategory {
  slug: string;
  color: string;
  heroDark: string;
  labelVar: string;
  icon: LucideIcon;
  labelEn: string;
  labelAr: string;
}

const CATEGORY_LIST: SubjectCategory[] = [
  { slug: 'foundations_of_money', color: '#2D6A4F', heroDark: '#1B4332', labelVar: 'var(--cat-foundations)', icon: Coins, labelEn: 'Foundations', labelAr: 'الأساسيات' },
  { slug: 'budgeting_money_management', color: '#3B5C7A', heroDark: '#2E4A63', labelVar: 'var(--cat-budgeting)', icon: Wallet, labelEn: 'Budgeting', labelAr: 'الميزانية' },
  { slug: 'saving_emergency_planning', color: '#0D9488', heroDark: '#0F766E', labelVar: 'var(--cat-saving)', icon: PiggyBank, labelEn: 'Saving', labelAr: 'الادخار' },
  { slug: 'debt_and_credit', color: '#B54747', heroDark: '#8F3A3A', labelVar: 'var(--cat-debt)', icon: CreditCard, labelEn: 'Debt & Credit', labelAr: 'الديون والائتمان' },
  { slug: 'investment_fundamentals', color: '#059669', heroDark: '#047857', labelVar: 'var(--cat-investing)', icon: TrendingUp, labelEn: 'Investing', labelAr: 'الاستثمار' },
  { slug: 'insurance_literacy', color: '#0E7490', heroDark: '#155E75', labelVar: 'var(--cat-insurance)', icon: Shield, labelEn: 'Insurance', labelAr: 'التأمين' },
  { slug: 'taxes_and_legal', color: '#9D174D', heroDark: '#7A0F3C', labelVar: 'var(--cat-taxes)', icon: FileText, labelEn: 'Taxes & Legal', labelAr: 'الضرائب والقانون' },
  { slug: 'sme_financial_management', color: '#C2410C', heroDark: '#9A3412', labelVar: 'var(--cat-business)', icon: Briefcase, labelEn: 'Business', labelAr: 'الأعمال' },
  { slug: 'islamic_finance_basics', color: '#7C6F1B', heroDark: '#5D5414', labelVar: 'var(--cat-islamic)', icon: MoonStar, labelEn: 'Islamic Finance', labelAr: 'التمويل الإسلامي' },
  { slug: 'life_stage_financial_planning', color: '#4D7C0F', heroDark: '#3F6212', labelVar: 'var(--cat-planning)', icon: Target, labelEn: 'Planning', labelAr: 'التخطيط' },
];

const CATEGORY_MAP = new Map(CATEGORY_LIST.map((c) => [c.slug, c]));

const FALLBACK_CATEGORY = CATEGORY_LIST[0];

export function getSubjectSlug(courseId: string): string {
  return courseId
    .replace(/_(?:en|ar)$/, '')
    .replace(/_(?:beginner|intermediate|advanced)$/, '');
}

export function getCategory(courseId: string): SubjectCategory {
  return CATEGORY_MAP.get(getSubjectSlug(courseId)) ?? FALLBACK_CATEGORY;
}

/*
 * Articles carry free-text tags rather than subject slugs; match them by
 * keyword so article heroes inherit the same category palette. Budgeting's
 * slate blue is the neutral fallback per the article mock.
 */
const ARTICLE_TAG_RULES: { pattern: RegExp; slug: string }[] = [
  { pattern: /loan|debt|credit|قرض|قروض|دين|ديون|ائتمان/i, slug: 'debt_and_credit' },
  { pattern: /invest|استثمار/i, slug: 'investment_fundamentals' },
  { pattern: /sav|ادخار|طوارئ/i, slug: 'saving_emergency_planning' },
  { pattern: /insurance|تأمين/i, slug: 'insurance_literacy' },
  { pattern: /tax|ضريب/i, slug: 'taxes_and_legal' },
  { pattern: /islamic|إسلامي/i, slug: 'islamic_finance_basics' },
  { pattern: /business|sme|أعمال/i, slug: 'sme_financial_management' },
  { pattern: /plan|تخطيط/i, slug: 'life_stage_financial_planning' },
  { pattern: /budget|expense|spending|behavior|ميزانية|مصاريف|إنفاق|سلوك/i, slug: 'budgeting_money_management' },
];

export function getArticleCategory(tagEn: string, tagAr: string): SubjectCategory {
  const haystack = `${tagEn} ${tagAr}`;
  for (const rule of ARTICLE_TAG_RULES) {
    if (rule.pattern.test(haystack)) {
      const match = CATEGORY_MAP.get(rule.slug);
      if (match) return match;
    }
  }
  return CATEGORY_MAP.get('budgeting_money_management') ?? FALLBACK_CATEGORY;
}

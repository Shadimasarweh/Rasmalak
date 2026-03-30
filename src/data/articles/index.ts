import type { ArticleData } from '@/types/article';

import personalLoan2026En from './personal_loan_2026_en.json';
import personalLoan2026Ar from './personal_loan_2026_ar.json';
import financiallyStuckEn from './financially_stuck_en.json';
import financiallyStuckAr from './financially_stuck_ar.json';
import ahmed1000JodEn from './ahmed_1000_jod_en.json';
import ahmed1000JodAr from './ahmed_1000_jod_ar.json';

const ALL_ARTICLES: ArticleData[] = [
  personalLoan2026En as ArticleData,
  personalLoan2026Ar as ArticleData,
  financiallyStuckEn as ArticleData,
  financiallyStuckAr as ArticleData,
  ahmed1000JodEn as ArticleData,
  ahmed1000JodAr as ArticleData,
];

const articleMap = new Map<string, ArticleData>(
  ALL_ARTICLES.map((a) => [a.articleId, a])
);

export function getArticle(articleId: string): ArticleData | undefined {
  return articleMap.get(articleId);
}

export function getAllArticles(locale: string): ArticleData[] {
  return ALL_ARTICLES.filter((a) => a.locale === locale);
}

export function getArticleIdForLocale(baseArticleId: string, locale: string): string {
  const withoutLocale = baseArticleId.replace(/_(?:en|ar)$/, '');
  return `${withoutLocale}_${locale}`;
}

import type { Block } from './course';

export interface ArticleSection {
  id: string;
  title: string;
  blocks: Block[];
}

export interface ArticleData {
  articleId: string;
  locale: 'en' | 'ar';
  title: string;
  description: string;
  tagEn: string;
  tagAr: string;
  readMin: number;
  sections: ArticleSection[];
}

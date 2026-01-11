'use client';

import { useStore } from '@/store/useStore';
import { translations, Language } from '@/lib/translations';

export function useTranslation() {
  const language = useStore((state) => state.language);
  const t = translations[language];

  return {
    t,
    language,
    isRTL: language === 'ar',
  };
}

export type Translations = typeof translations.ar;

'use client';

import { IntlProvider } from 'react-intl';
import { useStore } from '@/store/useStore';
import messages from '@/messages';

interface IntlProviderWrapperProps {
  children: React.ReactNode;
}

export function IntlProviderWrapper({ children }: IntlProviderWrapperProps) {
  // Derive locale from the existing Zustand language state
  const language = useStore((state) => state.language);

  // Use ar-JO for Arabic (Jordan uses dot as decimal separator + Arabic-Indic numerals)
  // Use en for English (standard Western numerals)
  const locale = language === 'ar' ? 'ar-JO-u-nu-arab' : 'en';

  return (
    <IntlProvider
      locale={locale}
      defaultLocale="ar-JO-u-nu-arab"
      messages={messages[language]}
      onError={(err) => {
        // Suppress missing translation warnings in development
        if (err.code === 'MISSING_TRANSLATION') {
          return;
        }
        console.error(err);
      }}
    >
      {children}
    </IntlProvider>
  );
}

'use client';

import { Moon, Sun, Globe } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/hooks/useTranslation';
import { LANGUAGES, Language } from '@/lib/translations';
import { useState } from 'react';

export default function ThemeLanguageSwitcher() {
  const { theme, toggleTheme, language, setLanguage } = useStore();
  const { t, isRTL } = useTranslation();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setShowLanguageMenu(false);
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-bg-card)] rounded-full shadow-lg border border-[var(--color-border)]">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-secondary)] transition-colors"
        aria-label={theme === 'dark' ? t.settings.darkMode + ' ' + t.settings.off : t.settings.darkMode + ' ' + t.settings.on}
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 text-[var(--color-text-primary)]" />
        ) : (
          <Moon className="w-5 h-5 text-[var(--color-text-primary)]" />
        )}
      </button>

      {/* Language Switcher */}
      <div className="relative">
        <button
          onClick={() => setShowLanguageMenu(!showLanguageMenu)}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-secondary)] transition-colors"
          aria-label={t.settings.language}
        >
          <Globe className="w-5 h-5 text-[var(--color-text-primary)]" />
        </button>

        {showLanguageMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowLanguageMenu(false)}
            />
            
            {/* Language Menu */}
            <div
              className={`absolute bottom-12 ${isRTL ? 'right-0' : 'left-0'} z-20 w-40 bg-[var(--color-bg-card)] rounded-lg shadow-lg border border-[var(--color-border)] overflow-hidden`}
            >
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} hover:bg-[var(--color-bg-secondary)] transition-colors ${
                    language === lang.code
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-text-primary)]'
                  }`}
                >
                  <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between`}>
                    <span className="font-medium">{lang.name}</span>
                    {language === lang.code && (
                      <span className="text-sm">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}


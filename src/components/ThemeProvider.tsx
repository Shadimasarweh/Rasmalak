'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { ACCENT_COLOR_OPTIONS, DEFAULT_ACCENT_COLOR } from '@/lib/constants';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, language, accentColor } = useStore();

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    
    // Also add/remove class for additional CSS targeting
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#0B0E14';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#F9FAFB';
    }

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#0B0E14' : '#F9FAFB');
    }
  }, [theme]);

  useEffect(() => {
    // Apply accent color CSS variables
    const option = ACCENT_COLOR_OPTIONS.find((c) => c.value === accentColor)
      || ACCENT_COLOR_OPTIONS.find((c) => c.value === DEFAULT_ACCENT_COLOR)!;

    const root = document.documentElement;
    root.style.setProperty('--accent-color', option.value);
    root.style.setProperty('--accent-color-hover', option.hover);
    root.style.setProperty('--accent-color-dark', option.dark);
    root.style.setProperty('--accent-color-rgb', option.rgb);
  }, [accentColor]);

  useEffect(() => {
    // Apply language direction
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
  }, [language]);

  return <>{children}</>;
}

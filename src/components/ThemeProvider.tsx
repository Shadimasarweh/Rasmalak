'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, language } = useStore();

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
    // Apply language direction
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
  }, [language]);

  return <>{children}</>;
}

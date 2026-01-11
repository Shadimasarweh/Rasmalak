'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowLeft,
  User,
  Globe,
  Coins,
  Bell,
  Shield,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Smartphone,
  Check,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { BottomNav } from '@/components';
import { useStore, useLogout } from '@/store/useStore';
import { useTranslation } from '@/hooks/useTranslation';
import { CURRENCIES } from '@/lib/constants';
import { LANGUAGES, Language } from '@/lib/translations';

export default function SettingsPage() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const {
    userName, setUserName,
    currency, setCurrency,
    language, setLanguage,
    theme, toggleTheme,
  } = useStore();
  const logout = useLogout();

  const [showNameModal, setShowNameModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [tempName, setTempName] = useState(userName);

  const handleSaveName = () => {
    setUserName(tempName);
    setShowNameModal(false);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  interface SettingItem {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    onClick: () => void;
    isDanger?: boolean;
    isToggle?: boolean;
  }

  interface SettingSection {
    title: string;
    items: SettingItem[];
  }

  const settingsSections: SettingSection[] = [
    {
      title: t.settings.account,
      items: [
        {
          icon: User,
          label: t.settings.name,
          value: userName || t.settings.notSet,
          onClick: () => {
            setTempName(userName);
            setShowNameModal(true);
          },
        },
        {
          icon: Coins,
          label: t.settings.currency,
          value: CURRENCIES.find((c) => c.code === currency)?.name || currency,
          onClick: () => setShowCurrencyModal(true),
        },
        {
          icon: Globe,
          label: t.settings.language,
          value: LANGUAGES.find((l) => l.code === language)?.name || language,
          onClick: () => setShowLanguageModal(true),
        },
      ],
    },
    {
      title: t.settings.app,
      items: [
        {
          icon: Bell,
          label: t.settings.notifications,
          value: t.settings.enabled,
          onClick: () => {},
        },
        {
          icon: theme === 'dark' ? Sun : Moon,
          label: t.settings.darkMode,
          value: theme === 'dark' ? t.settings.on : t.settings.off,
          onClick: toggleTheme,
          isToggle: true,
        },
        {
          icon: Smartphone,
          label: t.settings.installApp,
          value: '',
          onClick: () => {},
        },
      ],
    },
    {
      title: t.settings.support,
      items: [
        {
          icon: HelpCircle,
          label: t.settings.help,
          value: '',
          onClick: () => {},
        },
        {
          icon: Shield,
          label: t.settings.privacy,
          value: '',
          onClick: () => {},
        },
      ],
    },
    {
      title: '',
      items: [
        {
          icon: LogOut,
          label: t.auth.logout,
          value: '',
          onClick: handleLogout,
          isDanger: true,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen pb-24 bg-[var(--color-bg-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-40 header-glass">
        <div className="flex items-center gap-3 px-4 py-4">
          <Link
            href="/"
            className="w-11 h-11 rounded-2xl bg-[var(--color-bg-card)] flex items-center justify-center shadow-sm border border-[var(--color-border-light)] transition-all hover:shadow-md"
          >
            <BackArrow className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </Link>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{t.settings.title}</h1>
        </div>
      </header>

      <main className="px-4 space-y-5 animate-fadeInUp">
        {/* Profile Card */}
        <div className="card-gradient p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />

          <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <User className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold">{userName || t.dashboard.guestUser}</h2>
                <Sparkles className="w-4 h-4 text-[var(--color-gold)]" />
              </div>
              <p className="text-sm opacity-80">{t.settings.freeAccount}</p>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <div key={section.title || sectionIndex} className="animate-fadeInUp" style={{ animationDelay: `${sectionIndex * 100}ms` }}>
            {section.title && (
              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2 px-1">
                {section.title}
              </h3>
            )}
            <div className="card">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className={`w-full flex items-center justify-between py-3.5 ${
                      itemIndex !== section.items.length - 1 ? 'border-b border-[var(--color-border-light)]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        item.isDanger
                          ? 'bg-[var(--color-danger)]/10'
                          : 'bg-[var(--color-bg-secondary)]'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          item.isDanger
                            ? 'text-[var(--color-danger)]'
                            : 'text-[var(--color-text-secondary)]'
                        }`} />
                      </div>
                      <span className={`font-medium ${
                        item.isDanger
                          ? 'text-[var(--color-danger)]'
                          : 'text-[var(--color-text-primary)]'
                      }`}>{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.value && (
                        <span className="text-sm text-[var(--color-text-muted)]">
                          {item.value}
                        </span>
                      )}
                      {!item.isDanger && <ChevronIcon className="w-5 h-5 text-[var(--color-text-muted)]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Version */}
        <p className="text-center text-sm text-[var(--color-text-muted)] pt-4">
          {t.settings.version} 1.0.0
        </p>
      </main>

      {/* Name Modal */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-overlay)]" onClick={() => setShowNameModal(false)}>
          <div
            className="w-full max-w-lg bg-[var(--color-bg-card)] rounded-t-3xl p-6 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-6" />
            <h2 className="text-xl font-bold mb-4 text-[var(--color-text-primary)]">{t.settings.changeName}</h2>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder={t.settings.enterName}
              className="input mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowNameModal(false)}
                className="flex-1 btn btn-secondary"
              >
                {t.settings.cancel}
              </button>
              <button onClick={handleSaveName} className="flex-1 btn btn-primary">
                {t.settings.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Currency Modal */}
      {showCurrencyModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-overlay)]" onClick={() => setShowCurrencyModal(false)}>
          <div
            className="w-full max-w-lg bg-[var(--color-bg-card)] rounded-t-3xl p-6 animate-slideUp max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-6" />
            <h2 className="text-xl font-bold mb-4 text-[var(--color-text-primary)]">{t.settings.selectCurrency}</h2>
            <div className="space-y-2">
              {CURRENCIES.map((curr) => (
                <button
                  key={curr.code}
                  onClick={() => {
                    setCurrency(curr.code);
                    setShowCurrencyModal(false);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                    currency === curr.code
                      ? 'bg-[var(--color-primary)] text-white shadow-lg'
                      : 'bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]'
                  }`}
                >
                  <span className="font-medium">{curr.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${currency === curr.code ? 'opacity-80' : 'text-[var(--color-text-muted)]'}`}>{curr.symbol}</span>
                    {currency === curr.code && <Check className="w-5 h-5" />}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCurrencyModal(false)}
              className="w-full btn btn-secondary mt-4"
            >
              {t.settings.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Language Modal */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-overlay)]" onClick={() => setShowLanguageModal(false)}>
          <div
            className="w-full max-w-lg bg-[var(--color-bg-card)] rounded-t-3xl p-6 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-6" />
            <h2 className="text-xl font-bold mb-4 text-[var(--color-text-primary)]">{t.settings.selectLanguage}</h2>
            <div className="space-y-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code as Language);
                    setShowLanguageModal(false);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                    language === lang.code
                      ? 'bg-[var(--color-primary)] text-white shadow-lg'
                      : 'bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]'
                  }`}
                >
                  <div>
                    <span className="font-medium block">{lang.name}</span>
                    <span className={`text-sm ${language === lang.code ? 'opacity-80' : 'text-[var(--color-text-muted)]'}`}>{lang.nameEn}</span>
                  </div>
                  {language === lang.code && <Check className="w-5 h-5" />}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowLanguageModal(false)}
              className="w-full btn btn-secondary mt-4"
            >
              {t.settings.cancel}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

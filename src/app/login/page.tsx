'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { useLogin, useIsAuthenticated } from '@/store/useStore';
import { useTranslation } from '@/hooks/useTranslation';
import { ThemeLanguageSwitcher } from '@/components';

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const isAuthenticated = useIsAuthenticated();
  const { t, language, isRTL } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError(t.auth.emailRequired);
      return;
    }

    setIsLoading(true);
    const result = await login({ email, password });
    setIsLoading(false);

    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || t.auth.loginError);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--color-bg-primary)] py-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[var(--color-primary)]/5 -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[var(--color-gold)]/5 translate-y-1/2 -translate-x-1/2 blur-3xl" />

      {/* Theme and Language Switcher */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <ThemeLanguageSwitcher />
      </div>

      <div className="w-full max-w-md relative animate-fadeInUp">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center mx-auto mb-6 shadow-xl animate-float">
              <span className="text-white font-bold text-4xl">{isRTL ? 'ر' : 'R'}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--color-gold)] border-4 border-[var(--color-bg-primary)] flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-3">
            {t.auth.welcomeBack}
          </h1>
          <p className="text-base text-[var(--color-text-secondary)]">{t.appTagline}</p>
        </div>

        {/* Login Form */}
        <div className="card card-elevated">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-[var(--color-danger)] text-sm animate-fadeIn">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                {t.auth.email}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.auth.email}
                  className="input"
                  required
                  autoComplete="email"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Mail className="w-5 h-5 text-[var(--color-text-muted)]" />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                {t.auth.password}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.auth.password}
                  className="input pl-12"
                  required
                  autoComplete="current-password"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Lock className="w-5 h-5 text-[var(--color-text-muted)]" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-[var(--color-text-muted)]" />
                  ) : (
                    <Eye className="w-5 h-5 text-[var(--color-text-muted)]" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full btn btn-primary py-4 text-base ${isLoading ? 'opacity-70' : ''}`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="spinner" />
                  {t.common.loading}
                </span>
              ) : (
                <>
                  {t.auth.login}
                  <ArrowIcon className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 pt-6 border-t border-[var(--color-border)] text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {t.auth.noAccount}{' '}
              <Link
                href="/signup"
                className="text-[var(--color-primary)] font-semibold hover:underline"
              >
                {t.auth.signUpHere}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      {/* DEBUG LABEL */}
      <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center text-xs py-1 z-[100] font-mono">
        DEBUG: AUTH UI UPDATED
      </div>

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
                {/* Leading icon - positioned at start */}
                <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none">
                  <Mail className="w-5 h-5 text-[var(--color-text-muted)]" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.auth.email}
                  className="input w-full ps-12 pe-4"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                {t.auth.password}
              </label>
              <div className="relative">
                {/* Leading icon - positioned at start */}
                <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none">
                  <Lock className="w-5 h-5 text-[var(--color-text-muted)]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.auth.password}
                  className="input w-full ps-12 pe-14"
                  required
                  autoComplete="current-password"
                />
                {/* Trailing toggle - positioned at end */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 end-0 flex items-center pe-4"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors" />
                  ) : (
                    <Eye className="w-5 h-5 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors" />
                  )}
                </button>
              </div>
              {/* Forgot Password Link */}
              <div className="mt-2 text-end">
                <Link
                  href="/forgot-password"
                  className="text-sm text-[var(--color-primary)] hover:underline"
                >
                  {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                </Link>
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

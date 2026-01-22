'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, ArrowLeft, Sparkles, KeyRound } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { ThemeLanguageSwitcher } from '@/components';

export default function ForgotPasswordPage() {
  const { t, isRTL } = useTranslation();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) return;

    setIsLoading(true);
    // Simulate a small delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsLoading(false);
    setIsSubmitted(true);
  };

  // Translations
  const heading = isRTL ? 'استعادة كلمة المرور' : 'Reset your password';
  const helper = isRTL
    ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.'
    : "Enter your email and we'll send you a reset link.";
  const emailLabel = t.auth.email;
  const submitText = isRTL ? 'إرسال رابط التعيين' : 'Send reset link';
  const backToLogin = isRTL ? 'العودة لتسجيل الدخول' : 'Back to login';
  const comingSoonMessage = isRTL
    ? '🚧 هذه الميزة قادمة قريباً'
    : '🚧 Coming soon';

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
            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center mx-auto mb-6 shadow-xl animate-float">
              <KeyRound className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--color-gold)] border-4 border-[var(--color-bg-primary)] flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-3">
            {heading}
          </h1>
          <p className="text-base text-[var(--color-text-secondary)]">{helper}</p>
        </div>

        {/* Forgot Password Form */}
        <div className="card card-elevated">
          {isSubmitted ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-[var(--color-warning)]/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🚧</span>
              </div>
              <p className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                {comingSoonMessage}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                {isRTL
                  ? 'سيتم تفعيل إعادة تعيين كلمة المرور قريباً.'
                  : 'Password reset will be enabled soon.'}
              </p>
              <Link
                href="/login"
                className="text-[var(--color-primary)] font-semibold hover:underline inline-flex items-center gap-2"
              >
                {isRTL && <ArrowIcon className="w-4 h-4" />}
                {backToLogin}
                {!isRTL && <ArrowIcon className="w-4 h-4" />}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {emailLabel}
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
                    placeholder={emailLabel}
                    className="input w-full ps-12 pe-4"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !email}
                className={`w-full btn btn-primary py-4 text-base ${isLoading || !email ? 'opacity-70' : ''}`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="spinner" />
                    {t.common.loading}
                  </span>
                ) : (
                  <>
                    {submitText}
                    <ArrowIcon className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Back to Login Link */}
          {!isSubmitted && (
            <div className="mt-8 pt-6 border-t border-[var(--color-border)] text-center">
              <Link
                href="/login"
                className="text-sm text-[var(--color-primary)] font-semibold hover:underline inline-flex items-center gap-2"
              >
                {isRTL && <ArrowIcon className="w-4 h-4" />}
                {backToLogin}
                {!isRTL && <ArrowIcon className="w-4 h-4" />}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



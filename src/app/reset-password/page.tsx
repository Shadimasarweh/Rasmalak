'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowRight, ArrowLeft, Sparkles, ShieldCheck, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { ThemeLanguageSwitcher } from '@/components';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError(t.auth.passwordTooShort || 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError(t.auth.passwordsDontMatch || 'Passwords do not match');
      return;
    }

    setIsLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setIsLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setIsSuccess(true);
    setTimeout(() => router.push('/login'), 3000);
  };

  const heading = t.auth.setNewPassword || 'Set New Password';
  const helperText = t.auth.setNewPasswordHelper || 'Enter your new password below.';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--color-bg-primary)] py-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" style={{ backgroundColor: 'var(--color-accent-growth)', opacity: 0.05 }} />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" style={{ backgroundColor: 'var(--color-accent-growth)', opacity: 0.05 }} />

      {/* Theme and Language Switcher */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <ThemeLanguageSwitcher />
      </div>

      <div className="w-full max-w-md relative animate-fadeInUp">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-lg flex items-center justify-center mx-auto mb-6 shadow-xl animate-float" style={{ background: 'linear-gradient(to bottom right, var(--color-accent-growth), var(--color-accent-growth-hover))' }}>
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent-growth)', borderColor: 'var(--color-bg-primary)' }}>
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-3">
            {heading}
          </h1>
          <p className="text-base text-[var(--color-text-secondary)]">{helperText}</p>
        </div>

        {/* Form Card */}
        <div className="card card-elevated">
          {isSuccess ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--color-accent-growth-subtle)' }}>
                <CheckCircle className="w-8 h-8" style={{ color: 'var(--color-accent-growth)' }} />
              </div>
              <p className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                {t.auth.passwordResetSuccess || 'Password updated!'}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                {t.auth.passwordResetSuccessDesc || 'Your password has been updated. Redirecting to login...'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error */}
              {error && (
                <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)' }}>
                  {error}
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {t.auth.newPassword || 'New Password'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none">
                    <Lock className="w-5 h-5 text-[var(--color-text-muted)]" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input w-full ps-12 pe-12"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute inset-y-0 end-0 flex items-center pe-4"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {t.auth.confirmPassword || 'Confirm Password'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none">
                    <Lock className="w-5 h-5 text-[var(--color-text-muted)]" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input w-full ps-12 pe-4"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !password || !confirmPassword}
                className={`w-full ds-btn ds-btn-primary py-4 text-base ${isLoading || !password || !confirmPassword ? 'opacity-70' : ''}`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="spinner" />
                    {t.common.loading}
                  </span>
                ) : (
                  <>
                    {t.auth.updatePassword || 'Update Password'}
                    <ArrowIcon className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Back to Login */}
          {!isSuccess && (
            <div className="mt-8 pt-6 border-t border-[var(--color-border)] text-center">
              <Link
                href="/login"
                className="text-sm font-semibold hover:underline inline-flex items-center gap-2" style={{ color: 'var(--color-accent-growth)' }}
              >
                {isRTL && <ArrowIcon className="w-4 h-4" />}
                {t.auth.backToLogin}
                {!isRTL && <ArrowIcon className="w-4 h-4" />}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLogin, useIsAuthenticated } from '@/store/useStore';
import { useIntl } from 'react-intl';
import { Button, Input } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const isAuthenticated = useIsAuthenticated();
  const intl = useIntl();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError(intl.formatMessage({ id: 'auth.email_required', defaultMessage: 'Email and password are required' }));
      return;
    }

    setIsLoading(true);
    const result = await login({ email, password });
    setIsLoading(false);

    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || intl.formatMessage({ id: 'auth.login_error', defaultMessage: 'Login failed' }));
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Visual Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10 bg-brand-navy relative overflow-hidden">
        {/* Logo */}
        <div className="flex items-center gap-2 relative z-10">
          <div className="w-8 h-8 rounded-[var(--radius-input)] bg-brand-emerald flex items-center justify-center">
            <svg className="w-5 h-5 text-[#FFFFFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="text-[#FFFFFF] font-semibold text-lg">Rasmalak AI</span>
        </div>

        {/* 3D Visual Placeholder - Abstract shapes */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-80 h-80">
            {/* Abstract cubes representation */}
            <div className="absolute top-0 left-1/4 w-32 h-32 bg-brand-navy-light rounded-[var(--radius-card)] transform rotate-12 opacity-80" />
            <div className="absolute top-1/4 right-1/4 w-24 h-24 bg-[#8B7355] rounded-[var(--radius-card)] transform -rotate-6" />
            <div className="absolute bottom-1/4 left-1/3 w-40 h-40 bg-brand-navy-light rounded-[var(--radius-card)] transform rotate-3" />
            <div className="absolute bottom-0 right-1/3 w-28 h-28 bg-brand-navy-light rounded-[var(--radius-card)] transform -rotate-12 opacity-60" />
            {/* Small accent sphere */}
            <div className="absolute top-1/3 right-1/4 w-4 h-4 bg-[#D4A574] rounded-[var(--radius-pill)]" />
          </div>
        </div>

        {/* Hero Text */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-[#FFFFFF] leading-tight mb-4">
            {intl.formatMessage({ id: 'auth.hero_title', defaultMessage: 'Master your wealth with Intelligent Insights' }).split('Intelligent').map((part, i) => 
              i === 0 ? part : <span key={i}><span className="text-brand-emerald">Intelligent<br />Insights</span></span>
            )}
          </h1>
          <p className="text-[#FFFFFF]/60 text-base max-w-sm">
            {intl.formatMessage({ id: 'auth.hero_subtitle', defaultMessage: 'Join over 50,000 users in the MENA region using AI to optimize their budgeting and investments.' })}
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#FFFFFF]">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="text-center mb-8 lg:hidden">
            <div className="w-12 h-12 rounded-[var(--radius-input)] bg-brand-emerald flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#FFFFFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-brand-navy font-semibold text-lg">Rasmalak AI</span>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-brand-navy mb-2">
              {intl.formatMessage({ id: 'auth.welcome_back', defaultMessage: 'Welcome Back' })}
            </h2>
            <p className="text-brand-navy/60 text-sm">
              {intl.formatMessage({ id: 'auth.welcome_back_subtitle', defaultMessage: 'Please enter your details to sign in.' })}
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-[var(--radius-input)] bg-danger/10 border border-danger/20 text-danger text-sm">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-brand-navy mb-2">
                {intl.formatMessage({ id: 'auth.email_address', defaultMessage: 'Email Address' })}
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={intl.formatMessage({ id: 'auth.email_placeholder', defaultMessage: 'name@example.com' })}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-brand-navy mb-2">
                {intl.formatMessage({ id: 'auth.password', defaultMessage: 'Password' })}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'auth.password_placeholder', defaultMessage: 'Enter your password' })}
                  required
                  trailingIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-brand-navy/40 hover:text-brand-navy"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  }
                />
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-brand-navy/20 text-brand-emerald focus:ring-brand-emerald"
                />
                <span className="text-sm text-brand-navy/70">{intl.formatMessage({ id: 'auth.remember_for_days', defaultMessage: 'Remember for 30 days' })}</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-brand-emerald font-medium hover:underline"
              >
                {intl.formatMessage({ id: 'auth.forgot_password', defaultMessage: 'Forgot password?' })}
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              disabled={isLoading}
              className="w-full"
            >
              {intl.formatMessage({ id: 'auth.log_in', defaultMessage: 'Log In' })}
              <svg className="w-5 h-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-brand-navy/10" />
            <span className="text-sm text-brand-navy/40">{intl.formatMessage({ id: 'auth.or_continue_with', defaultMessage: 'Or continue with' })}</span>
            <div className="flex-1 h-px bg-brand-navy/10" />
          </div>

          {/* Social Login Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="flex items-center justify-center gap-2 px-4 py-3 border border-brand-navy/10 rounded-[var(--radius-input)] text-sm font-medium text-brand-navy hover:bg-brand-bg transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 px-4 py-3 border border-brand-navy/10 rounded-[var(--radius-input)] text-sm font-medium text-brand-navy hover:bg-brand-bg transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Apple
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-brand-navy/60">
              {intl.formatMessage({ id: 'auth.no_account', defaultMessage: "Don't have an account?" })}{' '}
              <Link
                href="/signup"
                className="text-brand-emerald font-semibold hover:underline"
              >
                {intl.formatMessage({ id: 'auth.sign_up', defaultMessage: 'Sign up' })}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

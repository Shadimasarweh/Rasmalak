'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSignup, useIsAuthenticated, useHasCompletedOnboarding } from '@/store/useStore';
import { useIntl } from 'react-intl';
import { Button, Input } from '@/components/ui';

export default function SignupPage() {
  const router = useRouter();
  const signup = useSignup();
  const isAuthenticated = useIsAuthenticated();
  const hasCompletedOnboarding = useHasCompletedOnboarding();
  const intl = useIntl();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push(hasCompletedOnboarding ? '/' : '/onboarding');
    }
  }, [isAuthenticated, hasCompletedOnboarding, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name) {
      setError(intl.formatMessage({ id: 'auth.name_required', defaultMessage: 'Name is required' }));
      return;
    }

    if (!email) {
      setError(intl.formatMessage({ id: 'auth.email_required', defaultMessage: 'Email is required' }));
      return;
    }

    if (password.length < 6) {
      setError(intl.formatMessage({ id: 'auth.password_too_short', defaultMessage: 'Password must be at least 6 characters' }));
      return;
    }

    if (!agreedToTerms) {
      setError(intl.formatMessage({ id: 'auth.agree_terms_required', defaultMessage: 'Please agree to the Terms of Service and Privacy Policy' }));
      return;
    }

    setIsLoading(true);
    const result = await signup({ name, email, password });
    setIsLoading(false);

    if (result.success) {
      router.push('/onboarding');
    } else {
      setError(result.error || intl.formatMessage({ id: 'auth.signup_error', defaultMessage: 'Signup failed' }));
    }
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 1;
    if (password.length < 10) return 2;
    return 3;
  };

  const strengthColors = ['', 'bg-danger', 'bg-warning', 'bg-success'];
  const strengthLabels = [
    '', 
    intl.formatMessage({ id: 'auth.fair_password', defaultMessage: 'Fair password strength' }), 
    intl.formatMessage({ id: 'auth.good_password', defaultMessage: 'Good password strength' }), 
    intl.formatMessage({ id: 'auth.strong_password', defaultMessage: 'Strong password strength' })
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Visual Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10 relative overflow-hidden" style={{ backgroundColor: 'var(--color-sidebar-bg)' }}>
        {/* Logo */}
        <div className="flex items-center gap-2 relative z-10">
          <div className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent-growth)' }}>
            <svg className="w-5 h-5 text-[#FFFFFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="text-[#FFFFFF] font-semibold text-lg">Rasmalak AI</span>
        </div>

        {/* Abstract Growth Chart Visual */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-96 h-64">
            {/* Abstract upward trending line */}
            <svg className="w-full h-full" viewBox="0 0 400 200" fill="none">
              <path
                d="M0 180 Q100 160 150 140 T250 80 T350 30 L400 10"
                stroke="url(#gradient)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--color-accent-growth)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--color-accent-growth)" stopOpacity="1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Hero Text */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-[#FFFFFF] leading-tight mb-4">
            Master your money<br />
            with <span style={{ color: 'var(--color-accent-growth)' }}>Rasmalak AI</span>
          </h1>
          <p className="text-[#FFFFFF]/60 text-base max-w-md mb-8">
            Join thousands of users in the MENA region taking control of their financial future. Track expenses, set budgets, and grow your wealth.
          </p>

          {/* Social Proof */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-[var(--radius-pill)] border-2 flex items-center justify-center text-[#FFFFFF]/70 text-xs" style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-growth) 20%, transparent)', borderColor: 'var(--color-sidebar-bg)' }}>
                A
              </div>
              <div className="w-8 h-8 rounded-[var(--radius-pill)] border-2 flex items-center justify-center text-[#FFFFFF]/70 text-xs" style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-growth) 30%, transparent)', borderColor: 'var(--color-sidebar-bg)' }}>
                M
              </div>
              <div className="w-8 h-8 rounded-[var(--radius-pill)] border-2 flex items-center justify-center text-[#FFFFFF]/70 text-xs" style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-growth) 40%, transparent)', borderColor: 'var(--color-sidebar-bg)' }}>
                S
              </div>
              <div className="w-8 h-8 rounded-[var(--radius-pill)] border-2 flex items-center justify-center text-[#FFFFFF] text-xs font-medium" style={{ backgroundColor: 'var(--color-accent-growth)', borderColor: 'var(--color-sidebar-bg)' }}>
                +2k
              </div>
            </div>
            <span className="text-[#FFFFFF]/50 text-sm">{intl.formatMessage({ id: 'auth.trusted_by', defaultMessage: 'Trusted by early adopters' })}</span>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12" style={{ backgroundColor: 'var(--color-bg-surface-1)' }}>
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="text-center mb-8 lg:hidden">
            <div className="w-12 h-12 rounded-[var(--radius-md)] flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--color-accent-growth)' }}>
              <svg className="w-6 h-6 text-[#FFFFFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>Rasmalak AI</span>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {intl.formatMessage({ id: 'auth.get_started_title', defaultMessage: 'Get Started' })}
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {intl.formatMessage({ id: 'auth.get_started_subtitle', defaultMessage: 'Create your account to start budgeting smarter.' })}
            </p>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-[var(--radius-md)] bg-danger/10 border border-danger/20 text-danger text-sm">
                {error}
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {intl.formatMessage({ id: 'auth.full_name', defaultMessage: 'Full Name' })}
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={intl.formatMessage({ id: 'auth.full_name_placeholder', defaultMessage: 'e.g. Amir Al-Masri' })}
                required
                trailingIcon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--color-text-muted)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {intl.formatMessage({ id: 'auth.email_address', defaultMessage: 'Email Address' })}
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={intl.formatMessage({ id: 'auth.email_placeholder', defaultMessage: 'name@example.com' })}
                required
                trailingIcon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--color-text-muted)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {intl.formatMessage({ id: 'auth.create_password', defaultMessage: 'Create Password' })}
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                trailingIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="transition-colors hover:[color:var(--color-text-primary)]"
                    style={{ color: 'var(--color-text-muted)' }}
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
              
              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-[var(--radius-pill)] ${
                          getPasswordStrength() >= level
                            ? strengthColors[getPasswordStrength()]
                            : ''
                        }`}
                        style={getPasswordStrength() < level ? { backgroundColor: 'var(--color-border)' } : undefined}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${
                    getPasswordStrength() === 1 ? 'text-danger' : 
                    getPasswordStrength() === 2 ? 'text-warning' : 
                    'text-success'
                  }`}>
                    {strengthLabels[getPasswordStrength()]}
                  </p>
                </div>
              )}
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border"
                style={{ borderColor: 'var(--color-border)', accentColor: 'var(--color-accent-growth)' }}
              />
              <label htmlFor="terms" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {intl.formatMessage({ id: 'auth.agree_terms', defaultMessage: 'I agree to the Terms of Service and Privacy Policy.' })}
              </label>
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
              {intl.formatMessage({ id: 'auth.create_account_btn', defaultMessage: 'Create My Account' })}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{intl.formatMessage({ id: 'auth.or_continue_with', defaultMessage: 'Or continue with' })}</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
          </div>

          {/* Social Login Button */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border rounded-[var(--radius-md)] text-sm font-medium transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {intl.formatMessage({ id: 'auth.signup_with_google', defaultMessage: 'Sign up with Google' })}
          </button>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {intl.formatMessage({ id: 'auth.already_have_account', defaultMessage: 'Already have an account?' })}{' '}
              <Link
                href="/login"
                className="font-semibold hover:underline"
                style={{ color: 'var(--color-accent-growth)' }}
              >
                {intl.formatMessage({ id: 'auth.login', defaultMessage: 'Login' })}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

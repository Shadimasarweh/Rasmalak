'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useSignup, useIsAuthenticated, useHasCompletedOnboarding } from '@/store/useStore';
import { useTranslation } from '@/hooks/useTranslation';
import { ThemeLanguageSwitcher } from '@/components';

export default function SignupPage() {
  const router = useRouter();
  const signup = useSignup();
  const isAuthenticated = useIsAuthenticated();
  const hasCompletedOnboarding = useHasCompletedOnboarding();
  const { t, language, isRTL } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  useEffect(() => {
    if (isAuthenticated) {
      // If user already completed onboarding, go to dashboard; otherwise go to onboarding
      router.push(hasCompletedOnboarding ? '/' : '/onboarding');
    }
  }, [isAuthenticated, hasCompletedOnboarding, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name) {
      setError(t.auth.nameRequired);
      return;
    }

    if (!email) {
      setError(t.auth.emailRequired);
      return;
    }

    if (password.length < 6) {
      setError(t.auth.passwordTooShort);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.auth.passwordsDontMatch);
      return;
    }

    setIsLoading(true);
    const result = await signup({ name, email, password });
    setIsLoading(false);

    if (result.success) {
      // New signups always go to onboarding
      router.push('/onboarding');
    } else {
      setError(result.error || t.auth.signupError);
    }
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 1;
    if (password.length < 10) return 2;
    return 3;
  };

  const strengthColors = ['', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500'];
  const strengthLabels: Record<string, string[]> = {
    ar: ['', 'ضعيفة', 'متوسطة', 'قوية'],
    en: ['', 'Weak', 'Medium', 'Strong'],
  };

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full border border-white/20" />
          <div className="absolute bottom-40 right-20 w-96 h-96 rounded-full border border-white/20" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full border border-white/20" />
        </div>
        
        {/* Logo */}
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-white font-bold text-xl">ر</span>
            </div>
            <div>
              <span className="text-white font-semibold text-xl">Rasmalak</span>
              <span className="text-emerald-400 font-semibold text-xl"> AI</span>
            </div>
          </div>
        </div>
        
        {/* Hero Text */}
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            {language === 'ar' 
              ? 'ابدأ رحلتك نحو\nالاستقلال المالي'
              : 'Start Your Journey\nto Financial\nIndependence'
            }
          </h2>
          <p className="text-slate-400 text-lg max-w-md">
            {language === 'ar'
              ? 'انضم لآلاف المستخدمين الذين يتعلمون إدارة أموالهم بذكاء'
              : 'Join thousands of users learning to manage their finances smartly'
            }
          </p>
          
          {/* Benefits List */}
          <div className="mt-8 space-y-3">
            {[
              language === 'ar' ? 'مسارات تعلم مخصصة' : 'Personalized learning paths',
              language === 'ar' ? 'أدوات مالية احترافية' : 'Professional financial tools',
              language === 'ar' ? 'محتوى عربي أصيل' : 'Native Arabic content',
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-emerald-400" />
                </div>
                <span className="text-slate-300">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-slate-500 text-sm">
          © 2026 Rasmalak AI. All rights reserved.
        </div>
      </div>
      
      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-8 bg-[var(--color-bg-primary)] relative overflow-y-auto">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-emerald-500/5 -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-amber-500/5 translate-y-1/2 -translate-x-1/2 blur-3xl" />

        {/* Theme and Language Switcher */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:bottom-8 lg:right-8 lg:left-auto lg:translate-x-0">
          <ThemeLanguageSwitcher />
        </div>

        <div className="w-full max-w-md relative animate-fadeInUp py-4">
          {/* Mobile Logo */}
          <div className="text-center mb-6 lg:hidden">
            <div className="relative inline-block">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-xl">
                <span className="text-white font-bold text-3xl">{isRTL ? 'ر' : 'R'}</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Rasmalak <span className="text-emerald-500">AI</span>
            </h1>
          </div>

          {/* Welcome Text */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              {t.auth.createAccount}
            </h2>
            <p className="text-[var(--color-text-secondary)]">
              {t.auth.getStarted}
            </p>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm animate-fadeIn">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="label">{t.auth.name}</label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none">
                  <User className="w-5 h-5 text-[var(--color-text-muted)]" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={language === 'ar' ? 'أدخل اسمك' : 'Enter your name'}
                  className="input w-full ps-12 pe-4"
                  required
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="label">{t.auth.email}</label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none">
                  <Mail className="w-5 h-5 text-[var(--color-text-muted)]" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={language === 'ar' ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                  className="input w-full ps-12 pe-4"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">{t.auth.password}</label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none">
                  <Lock className="w-5 h-5 text-[var(--color-text-muted)]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={language === 'ar' ? 'أدخل كلمة المرور' : 'Enter your password'}
                  className="input w-full ps-12 pe-14"
                  required
                  autoComplete="new-password"
                />
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
              {/* Password strength */}
              {password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          getPasswordStrength() >= level
                            ? strengthColors[getPasswordStrength()]
                            : 'bg-[var(--color-border)]'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {strengthLabels[language][getPasswordStrength()]}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="label">{t.auth.confirmPassword}</label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none">
                  {confirmPassword && password === confirmPassword ? (
                    <Check className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Lock className="w-5 h-5 text-[var(--color-text-muted)]" />
                  )}
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={language === 'ar' ? 'أعد إدخال كلمة المرور' : 'Confirm your password'}
                  className="input w-full ps-12 pe-4"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary py-3.5 text-base mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner" />
                  {t.common.loading}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {t.auth.signup}
                  <ArrowIcon className="w-5 h-5" />
                </span>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {t.auth.haveAccount}{' '}
              <Link
                href="/login"
                className="text-[var(--color-primary)] font-semibold hover:underline"
              >
                {t.auth.loginHere}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

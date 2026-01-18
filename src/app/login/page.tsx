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
              ? 'ثقافة مالية ذكية\nللعالم العربي'
              : 'Smart Financial\nLiteracy for\nthe Arab World'
            }
          </h2>
          <p className="text-slate-400 text-lg max-w-md">
            {language === 'ar'
              ? 'منصة ذكية للتثقيف المالي وإدارة الميزانية مصممة خصيصاً للمنطقة العربية'
              : 'AI-powered financial education and budgeting platform designed for the MENA region'
            }
          </p>
          
          {/* Feature Pills */}
          <div className="flex flex-wrap gap-2 mt-8">
            <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium border border-emerald-500/20">
              {language === 'ar' ? 'تعلم تفاعلي' : 'Interactive Learning'}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-sm font-medium border border-amber-500/20">
              {language === 'ar' ? 'متوافق مع الشريعة' : 'Sharia Compliant'}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium border border-blue-500/20">
              {language === 'ar' ? 'مستشار ذكي' : 'AI Advisor'}
            </span>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-slate-500 text-sm">
          © 2026 Rasmalak AI. All rights reserved.
        </div>
      </div>
      
      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[var(--color-bg-primary)] relative">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-emerald-500/5 -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-amber-500/5 translate-y-1/2 -translate-x-1/2 blur-3xl" />

        {/* Theme and Language Switcher */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:bottom-8 lg:right-8 lg:left-auto lg:translate-x-0">
          <ThemeLanguageSwitcher />
        </div>

        <div className="w-full max-w-md relative animate-fadeInUp">
          {/* Mobile Logo */}
          <div className="text-center mb-8 lg:hidden">
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
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              {t.auth.welcomeBack}
            </h2>
            <p className="text-[var(--color-text-secondary)]">
              {language === 'ar' 
                ? 'سجل دخولك للوصول إلى حسابك'
                : 'Sign in to access your account'
              }
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm animate-fadeIn">
                {error}
              </div>
            )}

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
                  autoComplete="current-password"
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
              className="w-full btn btn-primary py-3.5 text-base"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner" />
                  {t.common.loading}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {t.auth.login}
                  <ArrowIcon className="w-5 h-5" />
                </span>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
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

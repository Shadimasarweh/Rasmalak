'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIntl } from 'react-intl';
import { Kanban, Users, MessageCircle, BarChart3, Upload, Bot } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { CURRENCIES } from '@/lib/constants';

const INDUSTRIES = [
  'technology', 'real_estate', 'healthcare', 'retail', 'construction',
  'education', 'professional_services', 'manufacturing', 'hospitality', 'other',
] as const;

const COUNTRIES = [
  'jordan', 'uae', 'ksa', 'egypt', 'iraq',
  'kuwait', 'qatar', 'bahrain', 'oman', 'other',
] as const;

const FEATURES = [
  { icon: Kanban, keyEn: 'Pipeline Management', keyAr: 'إدارة مسار المبيعات' },
  { icon: Users, keyEn: 'Contact & Deal Tracking', keyAr: 'تتبع جهات الاتصال والصفقات' },
  { icon: Bot, keyEn: 'AI Sales Advisor', keyAr: 'مستشار مبيعات ذكي' },
  { icon: MessageCircle, keyEn: 'WhatsApp Integration', keyAr: 'تكامل واتساب' },
  { icon: BarChart3, keyEn: 'Reports & Analytics', keyAr: 'التقارير والتحليلات' },
  { icon: Upload, keyEn: 'Data Migration', keyAr: 'نقل البيانات' },
];

/**
 * Public CRM signup page. No AuthGuard — accessible to anyone.
 * Arabic-first. English toggle available.
 */
export default function CrmSignupPage() {
  const intl = useIntl();
  const router = useRouter();
  const isAr = intl.locale.startsWith('ar');

  const [form, setForm] = useState({
    fullName: '', email: '', password: '',
    orgName: '', country: '', industry: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.fullName || !form.email || !form.password || !form.orgName) {
      setError(isAr ? 'جميع الحقول المطلوبة يجب ملؤها' : 'All required fields must be filled');
      return;
    }
    if (form.password.length < 6) {
      setError(isAr ? 'كلمة المرور يجب أن تكون ٦ أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // 1. Create Supabase auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { name: form.fullName } },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError(isAr ? 'فشل إنشاء الحساب' : 'Account creation failed');
        setLoading(false);
        return;
      }

      // 2. Create organization (triggers auto-create owner + pipeline + roles)
      const { error: orgError } = await supabase.from('organizations').insert({
        name: form.orgName,
        country: form.country || null,
        industry: form.industry || null,
        created_by: authData.user.id,
      });

      if (orgError) {
        setError(orgError.message);
        setLoading(false);
        return;
      }

      // 3. Create trial subscription via API
      // (Stripe customer creation will happen when they upgrade)
      router.push('/crm');
    } catch (err) {
      setError(isAr ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ds-bg-page)' }}>
      {/* Hero — dark glass card (4b) */}
      <div style={{
        background: '#0F1914',
        borderBlockEnd: '1px solid rgba(255,255,255,0.08)',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        boxShadow: 'inset 0 0 60px rgba(34,197,94,0.04)',
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#F0FDF4', lineHeight: 1.3, maxWidth: '600px', margin: '0 auto 8px' }}>
          {isAr ? 'أول نظام إدارة عملاء مبني للعالم العربي' : 'The First CRM Built for the Arabic-Speaking World'}
        </h1>
        <p style={{ fontSize: '15px', color: '#9CA3AF', maxWidth: '500px', margin: '0 auto 24px', lineHeight: 1.6 }}>
          {isAr
            ? 'إدارة العملاء بالعربية أولاً. مستشار ذكي مدمج. تكامل واتساب. مسار مبيعات مرئي.'
            : 'Arabic-first CRM. Built-in AI advisor. WhatsApp integration. Visual sales pipeline.'}
        </p>
        <a href="#signup" style={{ display: 'inline-block', background: 'var(--ds-accent-primary)', color: '#FFFFFF', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 600, textDecoration: 'none' }}>
          {isAr ? 'ابدأ تجربتك المجانية' : 'Start Your Free Trial'}
        </a>
      </div>

      {/* Features grid — standard cards (4a) */}
      <div style={{ padding: '3rem 1.5rem', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px', marginBottom: '3rem' }}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <Icon size={24} style={{ color: 'var(--ds-accent-primary)', marginBottom: '10px' }} />
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>{isAr ? f.keyAr : f.keyEn}</div>
              </div>
            );
          })}
        </div>

        {/* Signup form — standard card (4a) */}
        <div id="signup" style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '2rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ds-text-heading)', textAlign: 'center', marginBottom: '4px' }}>
              {isAr ? 'أنشئ حسابك' : 'Create Your Account'}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', textAlign: 'center', marginBottom: '1.5rem' }}>
              {isAr ? '١٤ يوم تجربة مجانية — بدون بطاقة ائتمان' : '14-day free trial — no credit card required'}
            </p>

            {error && (
              <div style={{ background: 'rgba(181,71,71,0.1)', color: 'var(--color-danger, #B54747)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" value={form.fullName} onChange={e => setField('fullName', e.target.value)} placeholder={isAr ? 'الاسم الكامل *' : 'Full Name *'} required style={inputStyle} />
              <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder={isAr ? 'البريد الإلكتروني *' : 'Email *'} required style={inputStyle} />
              <input type="password" value={form.password} onChange={e => setField('password', e.target.value)} placeholder={isAr ? 'كلمة المرور *' : 'Password *'} required style={inputStyle} />
              <input type="text" value={form.orgName} onChange={e => setField('orgName', e.target.value)} placeholder={isAr ? 'اسم المنظمة *' : 'Organization Name *'} required style={inputStyle} />
              <select value={form.country} onChange={e => setField('country', e.target.value)} style={inputStyle}>
                <option value="">{isAr ? 'الدولة' : 'Country'}</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={form.industry} onChange={e => setField('industry', e.target.value)} style={inputStyle}>
                <option value="">{isAr ? 'القطاع' : 'Industry'}</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>

              <button type="submit" disabled={loading} style={{
                background: loading ? 'var(--ds-text-muted)' : 'var(--ds-accent-primary)',
                color: '#FFFFFF', border: 'none', borderRadius: '8px',
                padding: '12px', fontSize: '14px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px',
              }}>
                {loading ? (isAr ? 'جارٍ الإنشاء...' : 'Creating...') : (isAr ? 'ابدأ التجربة المجانية' : 'Start Free Trial')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', fontSize: '14px',
  color: 'var(--ds-text-body)', background: 'var(--ds-bg-card)',
  border: '1px solid var(--ds-border)', borderRadius: '8px',
  outline: 'none', boxSizing: 'border-box',
};

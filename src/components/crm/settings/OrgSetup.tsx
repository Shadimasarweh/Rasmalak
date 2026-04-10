'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIntl } from 'react-intl';
import { useOrg } from '@/store/orgStore';
import { CURRENCIES } from '@/lib/constants';
import type { CreateOrgInput } from '@/types/crm';

const INDUSTRIES = [
  'technology', 'real_estate', 'healthcare', 'retail', 'construction',
  'education', 'professional_services', 'manufacturing', 'hospitality', 'other',
] as const;

const COUNTRIES = [
  'jordan', 'uae', 'ksa', 'egypt', 'iraq',
  'kuwait', 'qatar', 'bahrain', 'oman', 'other',
] as const;

export function OrgSetup() {
  const intl = useIntl();
  const router = useRouter();
  const { createOrg } = useOrg();

  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(t('org.setup.nameRequired', 'Organization name is required'));
      return;
    }

    setIsSubmitting(true);

    const data: CreateOrgInput = {
      name: name.trim(),
      nameAr: nameAr.trim() || undefined,
      industry: industry || undefined,
      country: country || undefined,
      currency: currency || 'SAR',
    };

    const org = await createOrg(data);

    if (org) {
      router.replace('/crm');
    } else {
      setError(t('org.setup.error', 'Failed to create organization'));
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--ds-bg-page)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'var(--ds-bg-card)',
          border: '0.5px solid var(--ds-border)',
          borderRadius: '16px',
          padding: '2rem 1.5rem',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--ds-text-heading)',
              fontFeatureSettings: '"kern" 1',
            }}
          >
            Rasmalak
          </div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 400,
              color: 'var(--ds-text-muted)',
              marginTop: '0.25rem',
            }}
          >
            رَسمالَك
          </div>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: 'var(--ds-text-heading)',
            lineHeight: 1.3,
            fontFeatureSettings: '"kern" 1',
            textAlign: 'center',
            marginBottom: '0.25rem',
          }}
        >
          {t('org.setup.title', 'Create Your Organization')}
        </h1>
        <p
          style={{
            fontSize: '13px',
            fontWeight: 400,
            color: 'var(--ds-text-muted)',
            textAlign: 'center',
            marginBottom: '1.5rem',
          }}
        >
          {t('org.setup.subtitle', 'Set up your CRM workspace')}
        </p>

        {/* Error */}
        {error && (
          <div
            style={{
              background: 'var(--color-danger-bg, #FEF2F2)',
              color: 'var(--color-danger, #B54747)',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Organization Name (required) */}
          <div>
            <label style={labelStyle}>
              {t('org.setup.name', 'Organization Name')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('org.setup.namePlaceholder', 'Enter organization name')}
              required
              style={inputStyle}
            />
          </div>

          {/* Organization Name Arabic */}
          <div>
            <label style={labelStyle}>
              {t('org.setup.nameAr', 'Organization Name (Arabic)')}
            </label>
            <input
              type="text"
              value={nameAr}
              onChange={e => setNameAr(e.target.value)}
              placeholder={t('org.setup.nameArPlaceholder', 'أدخل اسم المنظمة')}
              dir="rtl"
              style={inputStyle}
            />
          </div>

          {/* Industry */}
          <div>
            <label style={labelStyle}>
              {t('org.setup.industry', 'Industry')}
            </label>
            <select
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              style={inputStyle}
            >
              <option value="">{t('org.setup.industryPlaceholder', 'Select industry')}</option>
              {INDUSTRIES.map(ind => (
                <option key={ind} value={ind}>
                  {t(`org.industry.${ind}`, ind)}
                </option>
              ))}
            </select>
          </div>

          {/* Country */}
          <div>
            <label style={labelStyle}>
              {t('org.setup.country', 'Country')}
            </label>
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              style={inputStyle}
            >
              <option value="">{t('org.setup.countryPlaceholder', 'Select country')}</option>
              {COUNTRIES.map(c => (
                <option key={c} value={c}>
                  {t(`org.country.${c}`, c)}
                </option>
              ))}
            </select>
          </div>

          {/* Currency */}
          <div>
            <label style={labelStyle}>
              {t('org.setup.currency', 'Default Currency')}
            </label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              style={inputStyle}
            >
              {CURRENCIES.map(cur => (
                <option key={cur.code} value={cur.code}>
                  {cur.code} — {cur.name} ({cur.nameAr})
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              background: isSubmitting ? 'var(--ds-text-muted)' : 'var(--ds-accent-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'background 150ms ease',
              marginTop: '0.5rem',
            }}
          >
            {isSubmitting
              ? t('org.setup.creating', 'Creating...')
              : t('org.setup.submit', 'Create Organization')}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ===== SHARED STYLES ===== */
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--ds-text-muted)',
  marginBottom: '0.25rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  fontSize: '14px',
  fontWeight: 400,
  color: 'var(--ds-text-body)',
  background: 'var(--ds-bg-card)',
  border: '1px solid var(--ds-border)',
  borderRadius: '8px',
  outline: 'none',
  boxSizing: 'border-box',
};

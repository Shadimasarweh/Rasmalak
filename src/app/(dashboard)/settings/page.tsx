'use client';

import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useStore, useUser, useUserName } from '@/store/useStore';
import { SUPPORTED_CURRENCY_CODES, getCurrencyDisplayName } from '@/lib/currencies';

/* ============================================
   SETTINGS PAGE
   Structure-Locked: Visual only, minimal logic
   ============================================ */

/* ===== ICONS ===== */
const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const SlidersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const DollarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const SmartphoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const KeyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const MonitorIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const CameraIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z" />
    <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/* ===== TYPES ===== */
type TabId = 'profile' | 'security' | 'preferences';

/* ===== TOGGLE SWITCH ===== */
function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle?: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        background: enabled ? 'var(--color-brand-emerald)' : 'rgba(10, 25, 47, 0.15)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s',
      }}
    >
      <div
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: '#FFFFFF',
          position: 'absolute',
          top: '2px',
          left: enabled ? '22px' : '2px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.2s',
        }}
      />
    </div>
  );
}

/* ===== NAV TAB ===== */
function NavTab({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: 'var(--radius-sm)',
        background: active ? 'var(--theme-bg-card)' : 'transparent',
        border: active ? '1px solid var(--theme-border)' : '1px solid transparent',
        cursor: 'pointer',
        color: active ? 'var(--color-brand-emerald)' : 'var(--theme-text-secondary)',
        transition: 'all 0.15s ease',
      }}
    >
      {icon}
      <span
        style={{
          fontSize: '0.875rem',
          fontWeight: active ? 600 : 500,
          color: active ? 'var(--theme-text-primary)' : 'var(--theme-text-secondary)',
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ===== INPUT FIELD ===== */
function InputField({
  label,
  value,
  icon,
  type = 'text',
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  type?: string;
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '0.8125rem',
          fontWeight: 500,
          color: 'var(--theme-text-primary)',
          marginBottom: '6px',
        }}
      >
        {label}
      </label>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 14px',
          background: 'var(--theme-bg-input)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--theme-border)',
        }}
      >
        {icon && <span style={{ color: 'var(--theme-text-muted)' }}>{icon}</span>}
        <input
          type={type}
          value={value}
          disabled
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '0.875rem',
            color: 'var(--theme-text-primary)',
            cursor: 'not-allowed',
          }}
        />
      </div>
    </div>
  );
}

/* ===== LANGUAGE OPTION ===== */
function LanguageOption({
  code,
  name,
  nativeName,
  selected,
  onClick,
}: {
  code: string;
  name: string;
  nativeName: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        background: selected ? 'rgba(16, 185, 129, 0.08)' : 'var(--theme-bg-input)',
        border: selected ? '2px solid var(--color-brand-emerald)' : '1px solid var(--theme-border)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <div>
        <p
          style={{
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'var(--theme-text-primary)',
          }}
        >
          {name}
        </p>
        <p style={{ fontSize: '0.8125rem', color: 'var(--theme-text-muted)' }}>{nativeName}</p>
      </div>
      {selected && (
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'var(--color-brand-emerald)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
          }}
        >
          <CheckIcon />
        </div>
      )}
    </div>
  );
}

/* ===== SETTING ROW ===== */
function SettingRow({
  icon,
  iconBg,
  iconColor,
  label,
  description,
  action,
  isLast = false,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  description?: string;
  action?: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--spacing-2)',
        borderBottom: isLast ? 'none' : '1px solid var(--theme-divider)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: iconColor,
          }}
        >
          {icon}
        </div>
        <div>
          <p
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--theme-text-primary)',
            }}
          >
            {label}
          </p>
          {description && (
            <p style={{ fontSize: '0.75rem', color: 'var(--theme-text-muted)' }}>{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ===== PROFILE TAB CONTENT ===== */
function ProfileContent({ intl, userData }: { intl: ReturnType<typeof useIntl>; userData: { name: string; email: string } }) {
  // Split name into first and last
  const nameParts = userData.name.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  // Get initials for avatar
  const initials = (firstName[0] || '') + (lastName[0] || '');
  
  return (
    <>
      {/* Profile Information Card */}
      <div className="card-standard">
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--color-brand-navy)',
            marginBottom: 'var(--spacing-2)',
          }}
        >
          {intl.formatMessage({ id: 'settings.profile_information', defaultMessage: 'Profile Information' })}
        </h3>

        <div
          style={{
            display: 'grid',
            gap: 'var(--spacing-3)',
          }}
          className="grid-cols-1 sm:grid-cols-[180px_1fr]"
        >
          {/* Avatar Section */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #F5D08C 0%, #E8C078 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #F5D08C 0%, #E8C078 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {initials ? (
                  <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#D4A853' }}>
                    {initials.toUpperCase()}
                  </span>
                ) : (
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                    <ellipse cx="40" cy="70" rx="25" ry="15" fill="#D4A853" />
                    <circle cx="40" cy="32" r="20" fill="#D4A853" />
                  </svg>
                )}
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '4px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--color-brand-emerald)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  border: '3px solid #FFFFFF',
                  cursor: 'pointer',
                }}
              >
                <CameraIcon />
              </div>
            </div>
            <p style={{ fontSize: '0.6875rem', color: 'rgba(10, 25, 47, 0.5)', textAlign: 'center' }}>
              {intl.formatMessage({ id: 'settings.allowed_formats', defaultMessage: 'Allowed *.jpeg, *.jpg, *.png, *.gif' })}
            </p>
            <p style={{ fontSize: '0.6875rem', color: 'rgba(10, 25, 47, 0.5)', textAlign: 'center' }}>
              {intl.formatMessage({ id: 'settings.max_size', defaultMessage: 'Max size of 3.1 MB' })}
            </p>
          </div>

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-2)' }}>
              <InputField label={intl.formatMessage({ id: 'settings.first_name', defaultMessage: 'First Name' })} value={firstName || intl.formatMessage({ id: 'settings.not_set', defaultMessage: 'Not set' })} />
              <InputField label={intl.formatMessage({ id: 'settings.last_name', defaultMessage: 'Last Name' })} value={lastName || intl.formatMessage({ id: 'settings.not_set', defaultMessage: 'Not set' })} />
            </div>
            <InputField label={intl.formatMessage({ id: 'settings.email_address', defaultMessage: 'Email Address' })} value={userData.email || intl.formatMessage({ id: 'settings.not_set', defaultMessage: 'Not set' })} icon={<MailIcon />} />
            <InputField label={intl.formatMessage({ id: 'settings.phone_number', defaultMessage: 'Phone Number' })} value={intl.formatMessage({ id: 'settings.not_set', defaultMessage: 'Not set' })} icon={<SmartphoneIcon />} />
          </div>
        </div>
      </div>
    </>
  );
}

/* ===== SECURITY TAB CONTENT ===== */
function SecurityContent({ intl }: { intl: ReturnType<typeof useIntl> }) {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  return (
    <>
      {/* Security Card */}
      <div className="card-standard">
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--color-brand-navy)',
            marginBottom: 'var(--spacing-2)',
          }}
        >
          {intl.formatMessage({ id: 'settings.security_settings', defaultMessage: 'Security Settings' })}
        </h3>

        {/* Two-Factor Authentication */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 'var(--spacing-2)',
            borderBottom: '1px solid rgba(10, 25, 47, 0.05)',
            marginBottom: 'var(--spacing-2)',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: 'var(--color-brand-navy)',
                marginBottom: '4px',
              }}
            >
              {intl.formatMessage({ id: 'settings.two_factor_auth', defaultMessage: 'Two-Factor Authentication' })}
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(10, 25, 47, 0.5)' }}>
              {intl.formatMessage({ id: 'settings.two_factor_auth_description', defaultMessage: 'Add an extra layer of security to your account.' })}
            </p>
          </div>
          <ToggleSwitch enabled={twoFactorEnabled} onToggle={() => setTwoFactorEnabled(!twoFactorEnabled)} />
        </div>

        {/* Change Password */}
        <div style={{ marginBottom: 'var(--spacing-2)' }}>
          <p
            style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--color-brand-navy)',
              marginBottom: 'var(--spacing-1)',
            }}
          >
            {intl.formatMessage({ id: 'settings.change_password', defaultMessage: 'Change Password' })}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-2)' }}>
            <InputField label={intl.formatMessage({ id: 'settings.current_password', defaultMessage: 'Current Password' })} value="••••••••••••" type="password" />
            <InputField label={intl.formatMessage({ id: 'settings.new_password', defaultMessage: 'New Password' })} value="" type="password" />
          </div>
          <div style={{ textAlign: 'right', marginTop: '8px' }}>
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'var(--color-brand-emerald)',
                cursor: 'pointer',
              }}
            >
              {intl.formatMessage({ id: 'settings.forgot_password', defaultMessage: 'Forgot Password?' })}
            </span>
          </div>
        </div>
      </div>

      {/* Active Sessions Card */}
      <div className="card-standard">
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--color-brand-navy)',
            marginBottom: 'var(--spacing-2)',
          }}
        >
          {intl.formatMessage({ id: 'settings.active_sessions', defaultMessage: 'Active Sessions' })}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { device: 'MacBook Pro - Chrome', location: 'Riyadh, Saudi Arabia', current: true },
            { device: 'iPhone 14 Pro - Safari', location: 'Riyadh, Saudi Arabia', current: false },
          ].map((session, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'var(--color-brand-bg)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(99, 102, 241, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-info)',
                  }}
                >
                  <MonitorIcon />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'var(--color-brand-navy)',
                    }}
                  >
                    {session.device}
                    {session.current && (
                      <span
                        style={{
                          marginLeft: '8px',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          color: 'var(--color-brand-emerald)',
                          background: 'rgba(16, 185, 129, 0.1)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-pill)',
                        }}
                      >
                        {intl.formatMessage({ id: 'settings.current', defaultMessage: 'Current' })}
                      </span>
                    )}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(10, 25, 47, 0.5)' }}>{session.location}</p>
                </div>
              </div>
              {!session.current && (
                <button
                  type="button"
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    color: 'var(--color-error)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    border: '1px solid var(--color-error)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                >
                  {intl.formatMessage({ id: 'settings.sign_out', defaultMessage: 'Sign Out' })}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div
        className="card-standard"
        style={{ border: '1px solid rgba(239, 68, 68, 0.3)' }}
      >
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--color-error)',
            marginBottom: 'var(--spacing-1)',
          }}
        >
          {intl.formatMessage({ id: 'settings.danger_zone', defaultMessage: 'Danger Zone' })}
        </h3>
        <p style={{ fontSize: '0.8125rem', color: 'rgba(10, 25, 47, 0.5)', marginBottom: 'var(--spacing-2)' }}>
          {intl.formatMessage({ id: 'settings.danger_zone_description', defaultMessage: 'Once you delete your account, there is no going back. Please be certain.' })}
        </p>
        <button
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'var(--color-error)',
            color: '#FFFFFF',
            fontSize: '0.875rem',
            fontWeight: 600,
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
        >
          <TrashIcon />
          {intl.formatMessage({ id: 'settings.delete_account', defaultMessage: 'Delete Account' })}
        </button>
      </div>
    </>
  );
}

/* ===== CURRENCY OPTION ===== */
function CurrencyOption({
  code,
  name,
  selected,
  onClick,
}: {
  code: string;
  name: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px',
        background: selected ? 'rgba(16, 185, 129, 0.08)' : 'var(--theme-bg-input)',
        border: selected ? '2px solid var(--color-brand-emerald)' : '1px solid var(--theme-border)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <div>
        <p
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--theme-text-primary)',
          }}
        >
          {name}
        </p>
      </div>
      {selected && (
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'var(--color-brand-emerald)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
          }}
        >
          <CheckIcon />
        </div>
      )}
    </div>
  );
}

/* ===== PREFERENCES TAB CONTENT ===== */
function PreferencesContent({ 
  intl,
  selectedLanguage,
  onLanguageChange,
  selectedCurrency,
  onCurrencyChange,
  selectedTheme,
  onThemeChange,
}: { 
  intl: ReturnType<typeof useIntl>;
  selectedLanguage: 'en' | 'ar';
  onLanguageChange: (lang: 'en' | 'ar') => void;
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
  selectedTheme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
}) {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);

  return (
    <>
      {/* Language Card */}
      <div className="card-standard">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-2)' }}>
          <span style={{ color: 'var(--color-info)' }}>
            <GlobeIcon />
          </span>
          <h3
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: 'var(--theme-text-primary)',
            }}
          >
            {intl.formatMessage({ id: 'settings.language', defaultMessage: 'Language' })}
          </h3>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--theme-text-muted)', marginBottom: 'var(--spacing-2)' }}>
          {intl.formatMessage({ id: 'settings.language_description', defaultMessage: 'Select your preferred language for the interface.' })}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-1)' }}>
          <LanguageOption
            code="en"
            name={intl.formatMessage({ id: 'settings.english', defaultMessage: 'English' })}
            nativeName="English"
            selected={selectedLanguage === 'en'}
            onClick={() => onLanguageChange('en')}
          />
          <LanguageOption
            code="ar"
            name={intl.formatMessage({ id: 'settings.arabic', defaultMessage: 'Arabic' })}
            nativeName="العربية"
            selected={selectedLanguage === 'ar'}
            onClick={() => onLanguageChange('ar')}
          />
        </div>
      </div>

      {/* Currency Card */}
      <div className="card-standard">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-2)' }}>
          <span style={{ color: 'var(--color-brand-emerald)' }}>
            <DollarIcon />
          </span>
          <h3
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: 'var(--theme-text-primary)',
            }}
          >
            {intl.formatMessage({ id: 'settings.currency', defaultMessage: 'Currency' })}
          </h3>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--theme-text-muted)', marginBottom: 'var(--spacing-2)' }}>
          {intl.formatMessage({ id: 'settings.currency_description', defaultMessage: 'Default currency for displaying amounts.' })}
        </p>

        {/* Currency Dropdown */}
        <div style={{ position: 'relative' }}>
          <select
            value={selectedCurrency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px',
              paddingRight: '40px',
              fontSize: '0.9375rem',
              fontWeight: 500,
              color: 'var(--theme-text-primary)',
              background: 'var(--theme-bg-input)',
              border: '2px solid var(--color-brand-emerald)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
            }}
          >
            {SUPPORTED_CURRENCY_CODES.map((code) => (
              <option key={code} value={code}>
                {getCurrencyDisplayName(code, selectedLanguage)}
              </option>
            ))}
          </select>
          {/* Dropdown Arrow */}
          <div
            style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: 'var(--color-brand-emerald)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>

      {/* Appearance Card */}
      <div className="card-standard">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-2)' }}>
          <span style={{ color: 'var(--color-warning)' }}>
            <SunIcon />
          </span>
          <h3
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: 'var(--theme-text-primary)',
            }}
          >
            {intl.formatMessage({ id: 'settings.appearance', defaultMessage: 'Appearance' })}
          </h3>
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-1)' }}>
          <div
            onClick={() => onThemeChange('light')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              background: selectedTheme === 'light' ? 'rgba(16, 185, 129, 0.08)' : 'var(--theme-bg-input)',
              border: selectedTheme === 'light' ? '2px solid var(--color-brand-emerald)' : '1px solid var(--theme-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            <SunIcon />
            <span
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--theme-text-primary)',
              }}
            >
              {intl.formatMessage({ id: 'settings.light', defaultMessage: 'Light' })}
            </span>
          </div>
          <div
            onClick={() => onThemeChange('dark')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              background: selectedTheme === 'dark' ? 'rgba(16, 185, 129, 0.08)' : 'var(--theme-bg-input)',
              border: selectedTheme === 'dark' ? '2px solid var(--color-brand-emerald)' : '1px solid var(--theme-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            <MoonIcon />
            <span
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--theme-text-primary)',
              }}
            >
              {intl.formatMessage({ id: 'settings.dark', defaultMessage: 'Dark' })}
            </span>
          </div>
        </div>
      </div>

      {/* Notifications Card */}
      <div className="card-standard">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-2)' }}>
          <span style={{ color: 'var(--color-error)' }}>
            <BellIcon />
          </span>
          <h3
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: 'var(--theme-text-primary)',
            }}
          >
            {intl.formatMessage({ id: 'settings.notifications', defaultMessage: 'Notifications' })}
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <SettingRow
            icon={<MailIcon />}
            iconBg="rgba(99, 102, 241, 0.1)"
            iconColor="var(--color-info)"
            label={intl.formatMessage({ id: 'settings.email_notifications', defaultMessage: 'Email Notifications' })}
            description={intl.formatMessage({ id: 'settings.email_notifications_description', defaultMessage: 'Receive updates via email' })}
            action={<ToggleSwitch enabled={emailNotifications} onToggle={() => setEmailNotifications(!emailNotifications)} />}
          />
          <SettingRow
            icon={<SmartphoneIcon />}
            iconBg="rgba(16, 185, 129, 0.1)"
            iconColor="var(--color-brand-emerald)"
            label={intl.formatMessage({ id: 'settings.push_notifications', defaultMessage: 'Push Notifications' })}
            description={intl.formatMessage({ id: 'settings.push_notifications_description', defaultMessage: 'Receive push notifications on your device' })}
            action={<ToggleSwitch enabled={pushNotifications} onToggle={() => setPushNotifications(!pushNotifications)} />}
          />
          <SettingRow
            icon={<MailIcon />}
            iconBg="rgba(245, 158, 11, 0.1)"
            iconColor="var(--color-warning)"
            label={intl.formatMessage({ id: 'settings.weekly_summary', defaultMessage: 'Weekly Summary' })}
            description={intl.formatMessage({ id: 'settings.weekly_summary_description', defaultMessage: 'Get a weekly summary of your finances' })}
            action={<ToggleSwitch enabled={weeklySummary} onToggle={() => setWeeklySummary(!weeklySummary)} />}
            isLast
          />
        </div>
      </div>
    </>
  );
}

/* ===== MAIN PAGE ===== */
export default function SettingsPage() {
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  
  // Get user data from store
  const user = useUser();
  const userName = useUserName();
  
  // Compute display values
  const displayName = user?.name || userName || intl.formatMessage({ id: 'settings.guest_user', defaultMessage: 'Guest User' });
  const displayEmail = user?.email || intl.formatMessage({ id: 'settings.no_email', defaultMessage: 'No email set' });
  
  // Get initials for avatar
  const nameParts = displayName.trim().split(' ');
  const initials = (nameParts[0]?.[0] || '') + (nameParts[1]?.[0] || '');
  
  // Get global language from store
  const globalLanguage = useStore((state) => state.language);
  const setGlobalLanguage = useStore((state) => state.setLanguage);
  
  // Get global currency from store
  const globalCurrency = useStore((state) => state.currency);
  const setGlobalCurrency = useStore((state) => state.setCurrency);
  
  // Get global theme from store
  const globalTheme = useStore((state) => state.theme);
  const setGlobalTheme = useStore((state) => state.setTheme);
  
  // Local state for pending changes (before save)
  const [pendingLanguage, setPendingLanguage] = useState<'en' | 'ar'>(globalLanguage);
  const [pendingCurrency, setPendingCurrency] = useState<string>(globalCurrency);
  
  // Theme is applied immediately for instant preview
  const handleThemeChange = (theme: 'light' | 'dark') => {
    setGlobalTheme(theme);
  };
  
  // Handle save - apply pending changes to global store
  const handleSaveChanges = () => {
    setGlobalLanguage(pendingLanguage);
    setGlobalCurrency(pendingCurrency);
    // Theme is already saved immediately
  };
  
  // Handle cancel - reset pending to current global
  const handleCancel = () => {
    setPendingLanguage(globalLanguage);
    setPendingCurrency(globalCurrency);
    // Theme changes are instant, no need to revert
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 80px)',
        padding: 'var(--spacing-3)',
      }}
    >
      {/* Page Header */}
      <div style={{ marginBottom: 'var(--spacing-3)' }}>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--theme-text-primary)',
            marginBottom: '8px',
          }}
        >
          {intl.formatMessage({ id: 'settings.account_settings', defaultMessage: 'Account Settings' })}
        </h1>
        <p
          style={{
            fontSize: '0.9375rem',
            color: 'var(--theme-text-secondary)',
            lineHeight: 1.6,
          }}
        >
          {intl.formatMessage({ id: 'settings.account_settings_subtitle', defaultMessage: 'Manage your profile details, security preferences, and connected accounts.' })}
        </p>
      </div>

      {/* Main Content */}
      <div
        className="settings-layout"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-3)',
          flex: 1,
        }}
      >
        {/* Left Navigation */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '4px', overflowX: 'auto', flexWrap: 'nowrap' }} className="lg:!flex-col">
          <NavTab
            icon={<UserIcon />}
            label={intl.formatMessage({ id: 'settings.profile_information', defaultMessage: 'Profile Information' })}
            active={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
          />
          <NavTab
            icon={<LockIcon />}
            label={intl.formatMessage({ id: 'settings.security', defaultMessage: 'Security' })}
            active={activeTab === 'security'}
            onClick={() => setActiveTab('security')}
          />
          <NavTab
            icon={<SlidersIcon />}
            label={intl.formatMessage({ id: 'settings.preferences', defaultMessage: 'Preferences' })}
            active={activeTab === 'preferences'}
            onClick={() => setActiveTab('preferences')}
          />
        </div>

        {/* Right Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
          {activeTab === 'profile' && <ProfileContent intl={intl} userData={{ name: displayName, email: displayEmail }} />}
          {activeTab === 'security' && <SecurityContent intl={intl} />}
          {activeTab === 'preferences' && (
            <PreferencesContent 
              intl={intl} 
              selectedLanguage={pendingLanguage}
              onLanguageChange={setPendingLanguage}
              selectedCurrency={pendingCurrency}
              onCurrencyChange={setPendingCurrency}
              selectedTheme={globalTheme}
              onThemeChange={handleThemeChange}
            />
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 'var(--spacing-2)',
          borderTop: '1px solid var(--theme-border)',
          marginTop: 'var(--spacing-2)',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* User Info */}
        <div className="hidden sm:flex" style={{ alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #F5D08C 0%, #E8C078 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {initials ? (
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#D4A853' }}>
                {initials.toUpperCase()}
              </span>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <ellipse cx="12" cy="18" rx="6" ry="4" fill="#D4A853" />
                <circle cx="12" cy="8" r="5" fill="#D4A853" />
              </svg>
            )}
          </div>
          <div>
            <p
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--theme-text-primary)',
              }}
            >
              {displayName}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--theme-text-muted)' }}>
              {displayEmail}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              padding: '10px 24px',
              background: 'transparent',
              color: 'var(--theme-text-primary)',
              fontSize: '0.875rem',
              fontWeight: 500,
              border: '1px solid var(--theme-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            {intl.formatMessage({ id: 'settings.cancel', defaultMessage: 'Cancel' })}
          </button>
          <button
            type="button"
            onClick={handleSaveChanges}
            style={{
              padding: '10px 24px',
              background: 'var(--color-brand-emerald)',
              color: '#FFFFFF',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            {intl.formatMessage({ id: 'settings.save_changes', defaultMessage: 'Save Changes' })}
          </button>
        </div>
      </div>
    </div>
  );
}

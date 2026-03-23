'use client';

import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useStore, useUser, useUserName, useUpdateUserProfile } from '@/store/useStore';
import { SUPPORTED_CURRENCY_CODES, getCurrencyDisplayName } from '@/lib/currencies';
import { ACCENT_COLOR_OPTIONS } from '@/lib/constants';
import { supabase } from '@/lib/supabaseClient';

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

const AlertTriangleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const MapPinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const QRCodeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="3" height="3" />
    <rect x="18" y="14" width="3" height="3" />
    <rect x="14" y="18" width="3" height="3" />
    <rect x="18" y="18" width="3" height="3" />
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
        background: enabled ? 'var(--ds-primary)' : 'var(--ds-border)',
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
          insetInlineStart: enabled ? '22px' : '2px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'inset-inline-start 0.2s',
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
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '8px',
        background: active ? 'var(--ds-bg-card)' : (hovered ? 'var(--ds-bg-tinted)' : 'transparent'),
        border: active ? '0.5px solid var(--ds-border)' : '0.5px solid transparent',
        cursor: 'pointer',
        color: active ? 'var(--ds-primary)' : 'var(--ds-text-muted)',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {icon}
      <span
        style={{
          fontSize: '13px',
          fontWeight: 500,
          color: active ? 'var(--ds-text-heading)' : 'var(--ds-text-body)',
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
  disabled = false,
  readOnly = false,
  placeholder,
  hint,
  onChange,
  error,
  name,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  type?: string;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  hint?: string;
  onChange?: (value: string) => void;
  error?: string;
  name?: string;
}) {
  const isEditable = !disabled && !readOnly && onChange;
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--ds-text-heading)',
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
          padding: '10px 14px',
          background: readOnly ? 'var(--ds-bg-tinted)' : 'var(--ds-bg-input)',
          borderRadius: '8px',
          border: error ? '0.5px solid var(--ds-error)' : '0.5px solid var(--ds-border)',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {icon && <span style={{ color: 'var(--ds-text-muted)' }}>{icon}</span>}
        <input
          type={type}
          name={name}
          value={value}
          disabled={disabled}
          readOnly={readOnly}
          placeholder={placeholder}
          autoComplete="off"
          data-form-type="other"
          onChange={isEditable ? (e) => onChange(e.target.value) : undefined}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '14px',
            color: 'var(--ds-text-heading)',
            cursor: disabled || readOnly ? 'not-allowed' : 'text',
          }}
        />
      </div>
      {hint && !error && (
        <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', marginTop: '4px' }}>
          {hint}
        </p>
      )}
      {error && (
        <p style={{ fontSize: '12px', color: 'var(--ds-error)', marginTop: '4px' }}>
          {error}
        </p>
      )}
    </div>
  );
}

/* ===== LANGUAGE OPTION ===== */
function LanguageOption({
  code,
  name,
  secondaryLabel,
  selected,
  onClick,
}: {
  code: string;
  name: string;
  secondaryLabel: string;
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
        background: selected ? 'var(--ds-bg-tinted)' : 'var(--ds-bg-input)',
        border: selected ? '0.5px solid var(--ds-primary)' : '0.5px solid var(--ds-border)',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <div>
        <p
          style={{
            fontSize: '15px',
            fontWeight: 500,
            color: 'var(--ds-text-heading)',
          }}
        >
          {name}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>{secondaryLabel}</p>
      </div>
      {selected && (
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'var(--ds-primary)',
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
        padding: '12px',
        borderBottom: isLast ? 'none' : '0.5px solid var(--ds-border)',
        flexWrap: 'wrap',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            flexShrink: 0,
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
              fontSize: '15px',
              fontWeight: 500,
              color: 'var(--ds-text-heading)',
            }}
          >
            {label}
          </p>
          {description && (
            <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)' }}>{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ===== PROFILE TAB CONTENT ===== */
function ProfileContent({
  intl,
  userData,
  onProfileUpdate,
}: {
  intl: ReturnType<typeof useIntl>;
  userData: { name: string; email: string; phone?: string };
  onProfileUpdate: (data: { firstName: string; lastName: string; phone: string }) => void;
}) {
  // Split name into first and last
  const nameParts = userData.name.trim().split(' ');
  const initialFirstName = nameParts[0] || '';
  const initialLastName = nameParts.slice(1).join(' ') || '';

  // Local state for editable fields
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [phone, setPhone] = useState(userData.phone || '');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Update local state when userData changes
  useEffect(() => {
    const parts = userData.name.trim().split(' ');
    setFirstName(parts[0] || '');
    setLastName(parts.slice(1).join(' ') || '');
    setPhone(userData.phone || '');
  }, [userData.name, userData.phone]);

  // Track changes
  useEffect(() => {
    const currentFullName = `${firstName} ${lastName}`.trim();
    const originalFullName = userData.name.trim();
    const originalPhone = userData.phone || '';
    setHasChanges(currentFullName !== originalFullName || phone !== originalPhone);
  }, [firstName, lastName, phone, userData.name, userData.phone]);

  // Get initials for avatar
  const initials = (firstName[0] || '') + (lastName[0] || '');

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await onProfileUpdate({ firstName, lastName, phone });
      setSaveMessage({
        type: 'success',
        text: intl.formatMessage({ id: 'settings.profile_updated', defaultMessage: 'Profile updated successfully' })
      });
      setHasChanges(false);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage({
        type: 'error',
        text: intl.formatMessage({ id: 'settings.profile_update_failed', defaultMessage: 'Failed to update profile' })
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Profile Information Card */}
      <div
        style={{
          background: 'var(--ds-bg-card)',
          border: '0.5px solid var(--ds-border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--ds-shadow-card)',
          transition: 'box-shadow 200ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--ds-text-heading)',
              fontFeatureSettings: '"kern" 1',
            }}
          >
            {intl.formatMessage({ id: 'settings.profile_information', defaultMessage: 'Profile Information' })}
          </h3>
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                background: 'var(--ds-primary)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 500,
                border: 'none',
                borderRadius: '8px',
                cursor: isSaving ? 'wait' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
                transition: 'transform 100ms ease',
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {isSaving
                ? intl.formatMessage({ id: 'settings.saving', defaultMessage: 'Saving...' })
                : intl.formatMessage({ id: 'settings.save_changes', defaultMessage: 'Save Changes' })
              }
            </button>
          )}
        </div>

        {/* Save message */}
        {saveMessage && (
          <div
            style={{
              padding: '10px 14px',
              marginBottom: '16px',
              borderRadius: '8px',
              background: saveMessage.type === 'success' ? 'rgba(45, 106, 79, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: saveMessage.type === 'success' ? 'var(--ds-primary)' : 'var(--ds-error)',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            {saveMessage.text}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gap: '24px',
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
                  background: 'var(--ds-primary)',
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
            <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', textAlign: 'center' }}>
              {intl.formatMessage({ id: 'settings.allowed_formats', defaultMessage: 'Allowed *.jpeg, *.jpg, *.png, *.gif' })}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', textAlign: 'center' }}>
              {intl.formatMessage({ id: 'settings.max_size', defaultMessage: 'Max size of 3.1 MB' })}
            </p>
          </div>

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <InputField
                label={intl.formatMessage({ id: 'settings.first_name', defaultMessage: 'First Name' })}
                value={firstName}
                placeholder={intl.formatMessage({ id: 'settings.not_set', defaultMessage: 'Not set' })}
                onChange={setFirstName}
              />
              <InputField
                label={intl.formatMessage({ id: 'settings.last_name', defaultMessage: 'Last Name' })}
                value={lastName}
                placeholder={intl.formatMessage({ id: 'settings.not_set', defaultMessage: 'Not set' })}
                onChange={setLastName}
              />
            </div>
            <InputField
              label={intl.formatMessage({ id: 'settings.email_address', defaultMessage: 'Email Address' })}
              value={userData.email || intl.formatMessage({ id: 'settings.not_set', defaultMessage: 'Not set' })}
              icon={<MailIcon />}
              type="email"
              name="display-email"
              readOnly
              hint={intl.formatMessage({ id: 'settings.email_readonly_hint', defaultMessage: 'Email cannot be changed for security reasons' })}
            />
            <InputField
              label={intl.formatMessage({ id: 'settings.phone_number', defaultMessage: 'Phone Number' })}
              value={phone}
              placeholder={intl.formatMessage({ id: 'settings.phone_placeholder', defaultMessage: '+962 7XX XXX XXX' })}
              icon={<SmartphoneIcon />}
              onChange={setPhone}
            />
          </div>
        </div>
      </div>
    </>
  );
}

/* ===== 2FA SETUP MODAL ===== */
function TwoFactorSetupModal({
  intl,
  isOpen,
  onClose,
  onSuccess,
}: {
  intl: ReturnType<typeof useIntl>;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCodes] = useState<string[]>([
    'XXXXX-XXXXX', 'XXXXX-XXXXX', 'XXXXX-XXXXX', 'XXXXX-XXXXX',
    'XXXXX-XXXXX', 'XXXXX-XXXXX', 'XXXXX-XXXXX', 'XXXXX-XXXXX',
  ]);
  const [codesSaved, setCodesSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Enroll when modal opens
  useEffect(() => {
    if (isOpen && step === 1 && !qrCodeUrl) {
      enrollTOTP();
    }
  }, [isOpen, step]);

  const enrollTOTP = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Rasmalak Authenticator',
      });

      if (error) throw error;
      if (data) {
        setQrCodeUrl(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set up 2FA';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError(intl.formatMessage({ id: 'settings.two_factor_invalid_code', defaultMessage: 'Invalid verification code' }));
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verificationCode,
      });

      if (verifyError) throw verifyError;

      setStep(3);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    onSuccess();
    onClose();
    setStep(1);
    setQrCodeUrl('');
    setVerificationCode('');
    setCodesSaved(false);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--ds-bg-card)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', fontFeatureSettings: '"kern" 1' }}>
            {intl.formatMessage({ id: 'settings.two_factor_setup_title', defaultMessage: 'Set Up Two-Factor Authentication' })}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-muted)' }}>
            <XIcon />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: s <= step ? 'var(--ds-primary)' : 'var(--ds-border)',
              }}
            />
          ))}
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            marginBottom: '16px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--ds-error)',
            fontSize: '13px',
          }}>
            {error}
          </div>
        )}

        {/* Step 1: QR Code */}
        {step === 1 && (
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ds-text-heading)', marginBottom: '8px' }}>
              {intl.formatMessage({ id: 'settings.two_factor_step1_title', defaultMessage: 'Step 1: Scan QR Code' })}
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginBottom: '16px' }}>
              {intl.formatMessage({ id: 'settings.two_factor_step1_desc', defaultMessage: 'Scan this QR code with your authenticator app' })}
            </p>

            {isLoading ? (
              <div style={{ padding: '40px', color: 'var(--ds-text-muted)' }}>{intl.formatMessage({ id: 'common.loading', defaultMessage: 'Loading...' })}</div>
            ) : qrCodeUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <img src={qrCodeUrl} alt="QR Code" style={{ width: '200px', height: '200px', borderRadius: '8px' }} />
                <div style={{ fontSize: '12px', color: 'var(--ds-text-muted)', wordBreak: 'break-all', maxWidth: '300px' }}>
                  Manual entry: <code style={{ background: 'var(--ds-bg-tinted)', padding: '2px 6px', borderRadius: '4px' }}>{secret}</code>
                </div>
              </div>
            ) : (
              <div style={{ padding: '40px' }}>
                <QRCodeIcon />
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={!qrCodeUrl}
              style={{
                marginTop: '16px',
                padding: '9px 18px',
                background: 'var(--ds-primary)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 500,
                border: 'none',
                borderRadius: '8px',
                cursor: qrCodeUrl ? 'pointer' : 'not-allowed',
                opacity: qrCodeUrl ? 1 : 0.5,
              }}
            >
              {intl.formatMessage({ id: 'settings.continue_btn', defaultMessage: 'Continue' })}
            </button>
          </div>
        )}

        {/* Step 2: Verification */}
        {step === 2 && (
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ds-text-heading)', marginBottom: '8px' }}>
              {intl.formatMessage({ id: 'settings.two_factor_step2_title', defaultMessage: 'Step 2: Enter Verification Code' })}
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginBottom: '16px' }}>
              {intl.formatMessage({ id: 'settings.two_factor_step2_desc', defaultMessage: 'Enter the 6-digit code from your authenticator app' })}
            </p>

            <input
              type="text"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              style={{
                width: '180px',
                padding: '16px',
                fontSize: '1.5rem',
                fontFamily: 'monospace',
                textAlign: 'center',
                letterSpacing: '0.5em',
                background: 'var(--ds-bg-input)',
                border: '0.5px solid var(--ds-border)',
                borderRadius: '8px',
                color: 'var(--ds-text-heading)',
              }}
            />

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  color: 'var(--ds-text-heading)',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: '0.5px solid var(--ds-border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                {intl.formatMessage({ id: 'settings.back_btn', defaultMessage: 'Back' })}
              </button>
              <button
                onClick={verifyCode}
                disabled={verificationCode.length !== 6 || isLoading}
                style={{
                  padding: '9px 18px',
                  background: 'var(--ds-primary)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: verificationCode.length === 6 && !isLoading ? 'pointer' : 'not-allowed',
                  opacity: verificationCode.length === 6 && !isLoading ? 1 : 0.5,
                }}
              >
                {isLoading ? intl.formatMessage({ id: 'settings.verifying', defaultMessage: 'Verifying...' }) : intl.formatMessage({ id: 'settings.two_factor_verify', defaultMessage: 'Verify & Enable' })}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Recovery Codes */}
        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ds-text-heading)', marginBottom: '8px' }}>
              {intl.formatMessage({ id: 'settings.two_factor_step3_title', defaultMessage: 'Step 3: Save Recovery Codes' })}
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginBottom: '16px' }}>
              {intl.formatMessage({ id: 'settings.two_factor_step3_desc', defaultMessage: 'Save these recovery codes in a safe place' })}
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              padding: '16px',
              background: 'var(--ds-bg-tinted)',
              borderRadius: '8px',
              marginBottom: '16px',
            }}>
              {recoveryCodes.map((code, i) => (
                <code key={i} style={{ fontSize: '14px', fontFamily: 'monospace', color: 'var(--ds-text-heading)' }}>
                  {code}
                </code>
              ))}
            </div>

            <p style={{ fontSize: '12px', color: 'var(--ds-accent-gold)', marginBottom: '16px' }}>
              {intl.formatMessage({ id: 'settings.two_factor_recovery_warning', defaultMessage: 'Each code can only be used once. Store them securely.' })}
            </p>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', marginBottom: '16px' }}>
              <input
                type="checkbox"
                checked={codesSaved}
                onChange={(e) => setCodesSaved(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--ds-primary)' }}
              />
              <span style={{ fontSize: '14px', color: 'var(--ds-text-heading)' }}>
                {intl.formatMessage({ id: 'settings.two_factor_codes_saved', defaultMessage: 'I have saved my recovery codes' })}
              </span>
            </label>

            <button
              onClick={handleComplete}
              disabled={!codesSaved}
              style={{
                padding: '9px 18px',
                background: 'var(--ds-primary)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 500,
                border: 'none',
                borderRadius: '8px',
                cursor: codesSaved ? 'pointer' : 'not-allowed',
                opacity: codesSaved ? 1 : 0.5,
              }}
            >
              {intl.formatMessage({ id: 'settings.complete_setup', defaultMessage: 'Complete Setup' })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== DELETE ACCOUNT MODAL ===== */
function DeleteAccountModal({
  intl,
  isOpen,
  onClose,
  onConfirm,
}: {
  intl: ReturnType<typeof useIntl>;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isModalRtl = intl.locale.startsWith('ar');
  const confirmWord = isModalRtl ? 'حذف' : 'DELETE';

  const handleDelete = async () => {
    if (confirmText !== confirmWord) return;

    setIsDeleting(true);
    setError(null);
    try {
      // Re-authenticate would go here in production
      onConfirm();
    } catch {
      setError(intl.formatMessage({ id: 'settings.delete_account_failed', defaultMessage: 'Failed to delete account' }));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--ds-bg-card)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '440px',
          padding: '24px',
          border: '2px solid var(--ds-error)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ds-error)',
            flexShrink: 0,
          }}>
            <AlertTriangleIcon />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-error)', marginBottom: '4px', fontFeatureSettings: '"kern" 1' }}>
              {intl.formatMessage({ id: 'settings.delete_account_confirm_title', defaultMessage: 'Delete Your Account?' })}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)' }}>
              {intl.formatMessage({ id: 'settings.delete_account_confirm_desc', defaultMessage: 'This will permanently delete your account and all associated data.' })}
            </p>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            marginBottom: '16px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--ds-error)',
            fontSize: '13px',
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '6px' }}>
            {intl.formatMessage({ id: 'settings.delete_account_type_confirm', defaultMessage: 'Type DELETE to confirm' })}
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(isModalRtl ? e.target.value : e.target.value.toUpperCase())}
            placeholder={confirmWord}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '14px',
              background: 'var(--ds-bg-input)',
              border: '0.5px solid var(--ds-border)',
              borderRadius: '8px',
              color: 'var(--ds-text-heading)',
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '6px' }}>
            {intl.formatMessage({ id: 'settings.delete_account_reauth', defaultMessage: 'Enter your password to confirm' })}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '14px',
              background: 'var(--ds-bg-input)',
              border: '0.5px solid var(--ds-border)',
              borderRadius: '8px',
              color: 'var(--ds-text-heading)',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '9px 18px',
              background: 'transparent',
              color: 'var(--ds-text-heading)',
              fontSize: '13px',
              fontWeight: 500,
              border: '0.5px solid var(--ds-border)',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            {intl.formatMessage({ id: 'settings.cancel', defaultMessage: 'Cancel' })}
          </button>
          <button
            onClick={handleDelete}
            disabled={confirmText !== confirmWord || !password || isDeleting}
            style={{
              flex: 1,
              padding: '9px 18px',
              background: 'var(--ds-error)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 500,
              border: 'none',
              borderRadius: '8px',
              cursor: confirmText === confirmWord && password && !isDeleting ? 'pointer' : 'not-allowed',
              opacity: confirmText === confirmWord && password && !isDeleting ? 1 : 0.5,
            }}
          >
            {isDeleting ? intl.formatMessage({ id: 'settings.deleting', defaultMessage: 'Deleting...' }) : intl.formatMessage({ id: 'settings.delete_account', defaultMessage: 'Delete Account' })}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== SECURITY TAB CONTENT ===== */
function SecurityContent({ intl }: { intl: ReturnType<typeof useIntl> }) {
  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLastUsed, setTwoFactorLastUsed] = useState<string | null>(null);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Sessions state
  const [sessions] = useState([
    {
      device: 'Windows PC - Chrome',
      location: 'Amman, Jordan',
      ip: '178.xx.xx.xx',
      lastActive: new Date().toISOString(),
      current: true
    },
    {
      device: 'iPhone 14 Pro - Safari',
      location: 'Amman, Jordan',
      ip: '178.xx.xx.xx',
      lastActive: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      current: false
    },
  ]);

  // Check 2FA status on mount
  useEffect(() => {
    checkTwoFactorStatus();
  }, []);

  const checkTwoFactorStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!error && data) {
        setTwoFactorEnabled(data.currentLevel === 'aal2' || data.nextLevel === 'aal2');
        // In real app, we'd track last verification time
        if (data.currentLevel === 'aal2') {
          setTwoFactorLastUsed(new Date().toISOString());
        }
      }
    } catch {
      // Silently fail - user just won't see 2FA as enabled
    }
  };

  const handleTwoFactorSuccess = () => {
    setTwoFactorEnabled(true);
    setTwoFactorLastUsed(new Date().toISOString());
  };

  const handleDisableTwoFactor = async () => {
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors && factors.totp.length > 0) {
        await supabase.auth.mfa.unenroll({ factorId: factors.totp[0].id });
        setTwoFactorEnabled(false);
        setTwoFactorLastUsed(null);
      }
    } catch {
      // Handle error
    }
  };

  // Password validation
  const validatePassword = (password: string): boolean => {
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return hasMinLength && hasUppercase && hasLowercase && hasNumber;
  };

  const handleUpdatePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!validatePassword(newPassword)) {
      setPasswordError(intl.formatMessage({ id: 'settings.password_requirements', defaultMessage: 'Password must be at least 8 characters with uppercase, lowercase, and a number' }));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(intl.formatMessage({ id: 'settings.password_mismatch', defaultMessage: 'Passwords do not match' }));
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch {
      setPasswordError(intl.formatMessage({ id: 'settings.password_update_failed', defaultMessage: 'Failed to update password' }));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSignOutSession = (index: number) => {
    // In production, this would call an API to invalidate the session
    console.log('Sign out session:', index);
  };

  const handleSignOutAllSessions = () => {
    // In production, this would call an API to invalidate all other sessions
    console.log('Sign out all other sessions');
  };

  return (
    <>
      {/* Two-Factor Authentication Card */}
      <div
        style={{
          background: 'var(--ds-bg-card)',
          border: '0.5px solid var(--ds-border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--ds-shadow-card)',
          transition: 'box-shadow 200ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ color: 'var(--ds-primary)' }}>
            <ShieldIcon />
          </span>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', fontFeatureSettings: '"kern" 1' }}>
            {intl.formatMessage({ id: 'settings.two_factor_auth', defaultMessage: 'Two-Factor Authentication' })}
          </h3>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginBottom: '16px' }}>
          {intl.formatMessage({ id: 'settings.two_factor_auth_description', defaultMessage: 'Add an extra layer of security to your account using an authenticator app.' })}
        </p>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          background: twoFactorEnabled ? 'var(--ds-bg-tinted)' : 'var(--ds-bg-input)',
          borderRadius: '8px',
          border: twoFactorEnabled ? '0.5px solid var(--ds-primary)' : '0.5px solid var(--ds-border)',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ds-text-heading)' }}>
                {intl.formatMessage({ id: 'settings.two_factor_status', defaultMessage: 'Status' })}:
              </span>
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                color: twoFactorEnabled ? 'var(--ds-primary)' : 'var(--ds-text-muted)',
                background: twoFactorEnabled ? 'rgba(45, 106, 79, 0.15)' : 'var(--ds-border)',
                padding: '2px 10px',
                borderRadius: '9999px',
              }}>
                {twoFactorEnabled
                  ? intl.formatMessage({ id: 'settings.enabled', defaultMessage: 'Enabled' })
                  : intl.formatMessage({ id: 'settings.not_enabled', defaultMessage: 'Not enabled' })
                }
              </span>
            </div>
            {twoFactorEnabled && (
              <>
                <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>
                  {intl.formatMessage({ id: 'settings.two_factor_method', defaultMessage: 'Method: Authenticator App' })}
                </p>
                {twoFactorLastUsed && (
                  <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ClockIcon />
                    {intl.formatMessage({ id: 'settings.two_factor_last_used', defaultMessage: 'Last verified' })}: {intl.formatDate(new Date(twoFactorLastUsed), { dateStyle: 'medium' })}
                  </p>
                )}
              </>
            )}
          </div>

          {twoFactorEnabled ? (
            <button
              onClick={handleDisableTwoFactor}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                color: 'var(--ds-error)',
                fontSize: '13px',
                fontWeight: 500,
                border: '0.5px solid var(--ds-error)',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              {intl.formatMessage({ id: 'settings.two_factor_disable', defaultMessage: 'Disable 2FA' })}
            </button>
          ) : (
            <button
              onClick={() => setShowTwoFactorModal(true)}
              style={{
                padding: '9px 18px',
                background: 'var(--ds-primary)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 500,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'transform 100ms ease',
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {intl.formatMessage({ id: 'settings.two_factor_setup', defaultMessage: 'Set up 2FA' })}
            </button>
          )}
        </div>
      </div>

      {/* Change Password Card */}
      <div
        style={{
          background: 'var(--ds-bg-card)',
          border: '0.5px solid var(--ds-border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--ds-shadow-card)',
          transition: 'box-shadow 200ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ color: 'var(--ds-primary)' }}>
            <KeyIcon />
          </span>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', fontFeatureSettings: '"kern" 1' }}>
            {intl.formatMessage({ id: 'settings.change_password', defaultMessage: 'Change Password' })}
          </h3>
        </div>

        {passwordSuccess && (
          <div style={{
            padding: '10px 14px',
            marginBottom: '16px',
            borderRadius: '8px',
            background: 'rgba(45, 106, 79, 0.1)',
            color: 'var(--ds-primary)',
            fontSize: '13px',
          }}>
            {intl.formatMessage({ id: 'settings.password_updated', defaultMessage: 'Password updated successfully' })}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <InputField
            label={intl.formatMessage({ id: 'settings.current_password', defaultMessage: 'Current Password' })}
            value={currentPassword}
            onChange={setCurrentPassword}
            type="password"
            placeholder="••••••••"
          />

          <div>
            <InputField
              label={intl.formatMessage({ id: 'settings.new_password', defaultMessage: 'New Password' })}
              value={newPassword}
              onChange={setNewPassword}
              type="password"
              placeholder="••••••••"
              error={passwordError || undefined}
            />
            <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', marginTop: '4px' }}>
              {intl.formatMessage({ id: 'settings.password_requirements', defaultMessage: 'Password must be at least 8 characters with uppercase, lowercase, and a number' })}
            </p>
          </div>

          <InputField
            label={intl.formatMessage({ id: 'settings.confirm_password', defaultMessage: 'Confirm New Password' })}
            value={confirmPassword}
            onChange={setConfirmPassword}
            type="password"
            placeholder="••••••••"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>
            <a href="/auth/forgot-password" style={{ color: 'var(--ds-primary)', textDecoration: 'none' }}>
              {intl.formatMessage({ id: 'settings.forgot_password', defaultMessage: 'Forgot Password?' })}
            </a>
            {' '}- {intl.formatMessage({ id: 'settings.forgot_password_hint', defaultMessage: 'Reset via email' })}
          </p>

          <button
            onClick={handleUpdatePassword}
            disabled={!currentPassword || !newPassword || !confirmPassword || isUpdatingPassword}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: 'var(--ds-primary)',
              fontSize: '13px',
              fontWeight: 500,
              border: '1.5px solid var(--ds-btn-secondary-border)',
              borderRadius: '8px',
              cursor: currentPassword && newPassword && confirmPassword && !isUpdatingPassword ? 'pointer' : 'not-allowed',
              opacity: currentPassword && newPassword && confirmPassword && !isUpdatingPassword ? 1 : 0.5,
            }}
          >
            {isUpdatingPassword
              ? intl.formatMessage({ id: 'settings.saving', defaultMessage: 'Saving...' })
              : intl.formatMessage({ id: 'settings.update_password', defaultMessage: 'Update Password' })
            }
          </button>
        </div>
      </div>

      {/* Active Sessions Card */}
      <div
        style={{
          background: 'var(--ds-bg-card)',
          border: '0.5px solid var(--ds-border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--ds-shadow-card)',
          transition: 'box-shadow 200ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', fontFeatureSettings: '"kern" 1' }}>
            {intl.formatMessage({ id: 'settings.active_sessions', defaultMessage: 'Active Sessions' })}
          </h3>

          {sessions.filter(s => !s.current).length > 0 && (
            <button
              onClick={handleSignOutAllSessions}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                color: 'var(--ds-error)',
                fontSize: '12px',
                fontWeight: 500,
                border: '0.5px solid var(--ds-error)',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              {intl.formatMessage({ id: 'settings.sign_out_all', defaultMessage: 'Sign out of all other sessions' })}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sessions.map((session, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: session.current ? 'var(--ds-bg-tinted)' : 'var(--ds-bg-input)',
                borderRadius: '8px',
                border: '0.5px solid var(--ds-border)',
                opacity: session.current ? 1 : 0.85,
                transition: 'box-shadow 200ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: session.current ? 'rgba(45, 106, 79, 0.1)' : 'rgba(45, 106, 79, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--ds-primary)',
                    flexShrink: 0,
                  }}
                >
                  <MonitorIcon />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
                      {session.device}
                    </p>
                    {session.current && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--ds-primary)',
                          background: 'rgba(45, 106, 79, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                        }}
                      >
                        {intl.formatMessage({ id: 'settings.current_session', defaultMessage: 'This device' })}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPinIcon /> {session.location} ({session.ip})
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ClockIcon /> {intl.formatMessage({ id: 'settings.last_active', defaultMessage: 'Last active' })}: {intl.formatRelativeTime(
                        Math.round((new Date(session.lastActive).getTime() - Date.now()) / 60000),
                        'minute'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleSignOutSession(index)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  color: session.current ? 'var(--ds-text-muted)' : 'var(--ds-primary)',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: session.current ? '0.5px solid var(--ds-border)' : '1.5px solid var(--ds-btn-secondary-border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {intl.formatMessage({ id: 'settings.sign_out', defaultMessage: 'Sign Out' })}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div
        style={{
          background: 'var(--ds-bg-card)',
          border: '2px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--ds-shadow-card)',
          marginTop: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ds-error)',
            flexShrink: 0,
          }}>
            <AlertTriangleIcon />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-error)', marginBottom: '4px', fontFeatureSettings: '"kern" 1' }}>
              {intl.formatMessage({ id: 'settings.danger_zone', defaultMessage: 'Danger Zone' })}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginBottom: '8px' }}>
              {intl.formatMessage({ id: 'settings.danger_zone_description', defaultMessage: 'Deleting your account permanently removes all financial data and cannot be undone.' })}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--ds-error)', marginBottom: '16px' }}>
              {intl.formatMessage({ id: 'settings.danger_zone_warning', defaultMessage: 'This action is irreversible. All your transactions, budgets, goals, and settings will be permanently deleted.' })}
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                background: 'var(--ds-error)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 500,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'transform 100ms ease',
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <TrashIcon />
              {intl.formatMessage({ id: 'settings.delete_account', defaultMessage: 'Delete Account' })}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TwoFactorSetupModal
        intl={intl}
        isOpen={showTwoFactorModal}
        onClose={() => setShowTwoFactorModal(false)}
        onSuccess={handleTwoFactorSuccess}
      />

      <DeleteAccountModal
        intl={intl}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          // Handle delete
          setShowDeleteModal(false);
        }}
      />
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
        background: selected ? 'var(--ds-bg-tinted)' : 'var(--ds-bg-input)',
        border: selected ? '0.5px solid var(--ds-primary)' : '0.5px solid var(--ds-border)',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <div>
        <p
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--ds-text-heading)',
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
            background: 'var(--ds-primary)',
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

/* ===== PALETTE ICON ===== */
const PaletteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r="2.5" />
    <circle cx="17.5" cy="10.5" r="2.5" />
    <circle cx="8.5" cy="7.5" r="2.5" />
    <circle cx="6.5" cy="12.5" r="2.5" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
);

/* ===== ACCENT COLOR PICKER MODAL ===== */
function AccentColorPickerModal({
  intl,
  isOpen,
  onClose,
  selectedColor,
  onColorChange,
  language,
}: {
  intl: ReturnType<typeof useIntl>;
  isOpen: boolean;
  onClose: () => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
  language: 'en' | 'ar';
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--ds-bg-card)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '400px',
          maxHeight: '85vh',
          overflow: 'auto',
          padding: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--ds-primary)' }}><PaletteIcon /></span>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', fontFeatureSettings: '"kern" 1' }}>
              {intl.formatMessage({ id: 'settings.accent_color', defaultMessage: 'Accent Color' })}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-muted)' }}>
            <XIcon />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginBottom: '24px' }}>
          {intl.formatMessage({ id: 'settings.accent_color_description', defaultMessage: 'Choose a color that personalizes buttons, links, and highlights across the app.' })}
        </p>

        {/* Color grid */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {ACCENT_COLOR_OPTIONS.map((option) => {
            const isSelected = selectedColor === option.value;
            return (
              <button
                key={option.value}
                onClick={() => onColorChange(option.value)}
                title={language === 'ar' ? option.labelAr : option.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: option.value,
                    border: isSelected ? '2px solid var(--ds-text-heading)' : '2px solid transparent',
                    outline: isSelected ? '2px solid var(--ds-text-heading)' : 'none',
                    outlineOffset: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.15s ease, outline 0.15s ease',
                    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  {isSelected && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? 'var(--ds-text-heading)' : 'var(--ds-text-muted)',
                    maxWidth: '48px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {language === 'ar' ? option.labelAr : option.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '0.5px solid var(--ds-border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px',
              background: 'var(--ds-primary)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 500,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            {intl.formatMessage({ id: 'settings.done', defaultMessage: 'Done' })}
          </button>
        </div>
      </div>
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
  selectedAccentColor,
  onAccentColorChange,
}: {
  intl: ReturnType<typeof useIntl>;
  selectedLanguage: 'en' | 'ar';
  onLanguageChange: (lang: 'en' | 'ar') => void;
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
  selectedTheme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  selectedAccentColor: string;
  onAccentColorChange: (color: string) => void;
}) {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [languageChangeNotice, setLanguageChangeNotice] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleLanguageChange = (lang: 'en' | 'ar') => {
    onLanguageChange(lang);
    setLanguageChangeNotice(true);
    setTimeout(() => setLanguageChangeNotice(false), 4000);
  };

  return (
    <>
      {/* Language Card */}
      <div
        style={{
          background: 'var(--ds-bg-card)',
          border: '0.5px solid var(--ds-border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--ds-shadow-card)',
          transition: 'box-shadow 200ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ color: 'var(--ds-primary)' }}>
            <GlobeIcon />
          </span>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--ds-text-heading)',
              fontFeatureSettings: '"kern" 1',
            }}
          >
            {intl.formatMessage({ id: 'settings.language', defaultMessage: 'Language' })}
          </h3>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginBottom: '4px' }}>
          {intl.formatMessage({ id: 'settings.language_description', defaultMessage: 'Select your preferred language for the interface.' })}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--ds-primary)', marginBottom: '16px' }}>
          {intl.formatMessage({ id: 'settings.language_applies_immediately', defaultMessage: 'Applies immediately across the interface.' })}
        </p>

        {languageChangeNotice && (
          <div style={{
            padding: '10px 14px',
            marginBottom: '16px',
            borderRadius: '8px',
            background: 'rgba(45, 106, 79, 0.1)',
            color: 'var(--ds-primary)',
            fontSize: '13px',
          }}>
            {intl.formatMessage({ id: 'settings.language_change_notice', defaultMessage: 'Interface language changed. Some elements may require a page refresh.' })}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <LanguageOption
            code="en"
            name="English"
            secondaryLabel={intl.formatMessage({ id: 'settings.interface_language', defaultMessage: 'Interface language' })}
            selected={selectedLanguage === 'en'}
            onClick={() => handleLanguageChange('en')}
          />
          <LanguageOption
            code="ar"
            name="العربية"
            secondaryLabel="لغة الواجهة"
            selected={selectedLanguage === 'ar'}
            onClick={() => handleLanguageChange('ar')}
          />
        </div>
      </div>

      {/* Currency Card */}
      <div
        style={{
          background: 'var(--ds-bg-card)',
          border: '0.5px solid var(--ds-border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--ds-shadow-card)',
          transition: 'box-shadow 200ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ color: 'var(--ds-primary)' }}>
            <DollarIcon />
          </span>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--ds-text-heading)',
              fontFeatureSettings: '"kern" 1',
            }}
          >
            {intl.formatMessage({ id: 'settings.currency', defaultMessage: 'Currency' })}
          </h3>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginBottom: '4px' }}>
          {intl.formatMessage({ id: 'settings.currency_description', defaultMessage: 'Used for display only. Transactions keep their original currency.' })}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)', marginBottom: '16px' }}>
          {intl.formatMessage({ id: 'settings.currency_no_conversion', defaultMessage: 'No automatic conversion is applied to existing records.' })}
        </p>

        {/* Currency Dropdown */}
        <div style={{ position: 'relative' }}>
          <select
            value={selectedCurrency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              paddingRight: '40px',
              fontSize: '15px',
              fontWeight: 500,
              color: 'var(--ds-text-heading)',
              background: 'var(--ds-bg-input)',
              border: '0.5px solid var(--ds-border)',
              borderRadius: '8px',
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
              color: 'var(--ds-primary)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>

      {/* Appearance Card */}
      <div
        style={{
          background: 'var(--ds-bg-card)',
          border: '0.5px solid var(--ds-border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--ds-shadow-card)',
          transition: 'box-shadow 200ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ color: 'var(--ds-accent-gold)' }}>
            <SunIcon />
          </span>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--ds-text-heading)',
              fontFeatureSettings: '"kern" 1',
            }}
          >
            {intl.formatMessage({ id: 'settings.appearance', defaultMessage: 'Appearance' })}
          </h3>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <div
            onClick={() => onThemeChange('light')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              background: selectedTheme === 'light' ? 'var(--ds-bg-tinted)' : 'var(--ds-bg-input)',
              border: selectedTheme === 'light' ? '0.5px solid var(--ds-primary)' : '0.5px solid var(--ds-border)',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <SunIcon />
            <span
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--ds-text-heading)',
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
              background: selectedTheme === 'dark' ? 'var(--ds-bg-tinted)' : 'var(--ds-bg-input)',
              border: selectedTheme === 'dark' ? '0.5px solid var(--ds-primary)' : '0.5px solid var(--ds-border)',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <MoonIcon />
            <span
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--ds-text-heading)',
              }}
            >
              {intl.formatMessage({ id: 'settings.dark', defaultMessage: 'Dark' })}
            </span>
          </div>
        </div>
      </div>

      {/* Accent Color Card */}
      <div
        style={{
          background: 'var(--ds-bg-card)',
          border: '0.5px solid var(--ds-border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--ds-shadow-card)',
          transition: 'box-shadow 200ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ color: 'var(--ds-primary)' }}>
            <PaletteIcon />
          </span>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--ds-text-heading)',
              fontFeatureSettings: '"kern" 1',
            }}
          >
            {intl.formatMessage({ id: 'settings.accent_color', defaultMessage: 'Accent Color' })}
          </h3>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginBottom: '16px' }}>
          {intl.formatMessage({ id: 'settings.accent_color_description', defaultMessage: 'Choose a color that personalizes buttons, links, and highlights across the app.' })}
        </p>

        {/* Current color preview + change button */}
        {(() => {
          const current = ACCENT_COLOR_OPTIONS.find((c) => c.value === selectedAccentColor) || ACCENT_COLOR_OPTIONS.find((c) => c.value === '#1F7A5A')!;
          return (
            <div
              onClick={() => setShowColorPicker(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: 'var(--ds-bg-tinted)',
                border: '0.5px solid var(--ds-primary)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: current.value,
                    border: '2px solid #FFFFFF',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    flexShrink: 0,
                  }}
                />
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ds-text-heading)' }}>
                    {selectedLanguage === 'ar' ? current.labelAr : current.label}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>
                    {intl.formatMessage({ id: 'settings.tap_to_change', defaultMessage: 'Tap to change' })}
                  </p>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ds-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          );
        })()}
      </div>

      {/* Accent Color Picker Modal */}
      <AccentColorPickerModal
        intl={intl}
        isOpen={showColorPicker}
        onClose={() => setShowColorPicker(false)}
        selectedColor={selectedAccentColor}
        onColorChange={onAccentColorChange}
        language={selectedLanguage}
      />

      {/* Notifications Card */}
      <div
        style={{
          background: 'var(--ds-bg-card)',
          border: '0.5px solid var(--ds-border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--ds-shadow-card)',
          transition: 'box-shadow 200ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ color: 'var(--ds-error)' }}>
            <BellIcon />
          </span>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--ds-text-heading)',
              fontFeatureSettings: '"kern" 1',
            }}
          >
            {intl.formatMessage({ id: 'settings.notifications', defaultMessage: 'Notifications' })}
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <SettingRow
            icon={<MailIcon />}
            iconBg="rgba(45, 106, 79, 0.1)"
            iconColor="var(--ds-primary)"
            label={intl.formatMessage({ id: 'settings.email_notifications', defaultMessage: 'Email Notifications' })}
            description={intl.formatMessage({ id: 'settings.email_notifications_description', defaultMessage: 'Receive updates via email' })}
            action={<ToggleSwitch enabled={emailNotifications} onToggle={() => setEmailNotifications(!emailNotifications)} />}
          />
          <SettingRow
            icon={<SmartphoneIcon />}
            iconBg="rgba(45, 106, 79, 0.1)"
            iconColor="var(--ds-primary)"
            label={intl.formatMessage({ id: 'settings.push_notifications', defaultMessage: 'Push Notifications' })}
            description={intl.formatMessage({ id: 'settings.push_notifications_description', defaultMessage: 'Receive push notifications on your device' })}
            action={<ToggleSwitch enabled={pushNotifications} onToggle={() => setPushNotifications(!pushNotifications)} />}
          />
          <SettingRow
            icon={<MailIcon />}
            iconBg="rgba(245, 158, 11, 0.1)"
            iconColor="var(--ds-accent-gold)"
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
  const updateUserProfile = useUpdateUserProfile();

  // Compute display values
  const displayName = user?.name || userName || intl.formatMessage({ id: 'settings.guest_user', defaultMessage: 'Guest User' });
  const displayEmail = user?.email || intl.formatMessage({ id: 'settings.no_email', defaultMessage: 'No email set' });
  const displayPhone = user?.phone || '';

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

  // Get global accent color from store
  const globalAccentColor = useStore((state) => state.accentColor);
  const setGlobalAccentColor = useStore((state) => state.setAccentColor);

  // Local state for pending changes (before save)
  const [pendingLanguage, setPendingLanguage] = useState<'en' | 'ar'>(globalLanguage);
  const [pendingCurrency, setPendingCurrency] = useState<string>(globalCurrency);

  // RTL support
  const language = globalLanguage;
  const isRtl = language === 'ar';

  // Theme is applied immediately for instant preview
  const handleThemeChange = (theme: 'light' | 'dark') => {
    setGlobalTheme(theme);
  };

  // Accent color is applied immediately for instant preview
  const handleAccentColorChange = (color: string) => {
    setGlobalAccentColor(color);
  };

  // Handle profile update
  const handleProfileUpdate = async (data: { firstName: string; lastName: string; phone: string }) => {
    const fullName = `${data.firstName} ${data.lastName}`.trim();
    await updateUserProfile({ name: fullName, phone: data.phone });
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
        padding: '24px',
        direction: isRtl ? 'rtl' : 'ltr',
      }}
    >
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: 'var(--ds-text-heading)',
            marginBottom: '8px',
            fontFeatureSettings: '"kern" 1',
          }}
        >
          {intl.formatMessage({ id: 'settings.account_settings', defaultMessage: 'Account Settings' })}
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--ds-text-muted)',
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
          gap: '24px',
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
        <div key={activeTab} style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 200ms ease-out' }}>
          {activeTab === 'profile' && <ProfileContent intl={intl} userData={{ name: displayName, email: displayEmail, phone: displayPhone }} onProfileUpdate={handleProfileUpdate} />}
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
              selectedAccentColor={globalAccentColor}
              onAccentColorChange={handleAccentColorChange}
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
          paddingTop: '16px',
          borderTop: '0.5px solid var(--ds-border)',
          marginTop: '16px',
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
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#D4A853' }}>
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
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--ds-text-heading)',
              }}
            >
              {displayName}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>
              {displayEmail}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: 'var(--ds-primary)',
              fontSize: '13px',
              fontWeight: 500,
              border: '1.5px solid var(--ds-btn-secondary-border)',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            {intl.formatMessage({ id: 'settings.cancel', defaultMessage: 'Cancel' })}
          </button>
          <button
            type="button"
            onClick={handleSaveChanges}
            style={{
              padding: '9px 18px',
              background: 'var(--ds-primary)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 500,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'transform 100ms ease',
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {intl.formatMessage({ id: 'settings.save_changes', defaultMessage: 'Save Changes' })}
          </button>
        </div>
      </div>
    </div>
  );
}

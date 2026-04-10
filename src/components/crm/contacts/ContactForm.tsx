'use client';

import { useState } from 'react';
import { useIntl } from 'react-intl';
import { X } from 'lucide-react';
import { useCrmContacts } from '@/store/crmStore';
import type { CrmContact, CreateContactInput, ContactSource } from '@/types/crm';

interface ContactFormProps {
  contact?: CrmContact;
  onClose: () => void;
  onSuccess?: (contact: CrmContact) => void;
}

const SOURCES: ContactSource[] = ['manual', 'import', 'referral', 'website', 'whatsapp'];

export function ContactForm({ contact, onClose, onSuccess }: ContactFormProps) {
  const intl = useIntl();
  const { addContact, updateContact } = useCrmContacts();
  const isEditing = !!contact;

  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  const [form, setForm] = useState({
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    firstNameAr: contact?.firstNameAr || '',
    lastNameAr: contact?.lastNameAr || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    phoneSecondary: contact?.phoneSecondary || '',
    whatsappNumber: contact?.whatsappNumber || '',
    jobTitle: contact?.jobTitle || '',
    jobTitleAr: contact?.jobTitleAr || '',
    department: contact?.department || '',
    source: contact?.source || 'manual',
    notes: contact?.notes || '',
    tags: contact?.tags || [] as string[],
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) {
      errs.firstName = t('crm.contact.firstNameRequired', 'First name is required');
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = t('crm.contact.invalidEmail', 'Invalid email address');
    }
    if (form.phone && !/^[+\d\s\-()]+$/.test(form.phone)) {
      errs.phone = t('crm.contact.invalidPhone', 'Invalid phone number');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim();
      if (!form.tags.includes(tag)) {
        setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (isEditing && contact) {
        await updateContact(contact.id, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim() || null,
          firstNameAr: form.firstNameAr.trim() || null,
          lastNameAr: form.lastNameAr.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          phoneSecondary: form.phoneSecondary.trim() || null,
          whatsappNumber: form.whatsappNumber.trim() || null,
          jobTitle: form.jobTitle.trim() || null,
          jobTitleAr: form.jobTitleAr.trim() || null,
          department: form.department.trim() || null,
          source: form.source as ContactSource,
          notes: form.notes.trim() || null,
          tags: form.tags,
        });
        onSuccess?.({ ...contact, ...form } as CrmContact);
      } else {
        const result = await addContact({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim() || undefined,
          firstNameAr: form.firstNameAr.trim() || undefined,
          lastNameAr: form.lastNameAr.trim() || undefined,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          phoneSecondary: form.phoneSecondary.trim() || undefined,
          whatsappNumber: form.whatsappNumber.trim() || undefined,
          jobTitle: form.jobTitle.trim() || undefined,
          jobTitleAr: form.jobTitleAr.trim() || undefined,
          department: form.department.trim() || undefined,
          source: (form.source as ContactSource) || undefined,
          notes: form.notes.trim() || undefined,
          tags: form.tags.length > 0 ? form.tags : undefined,
        } as CreateContactInput);
        if (result) onSuccess?.(result);
      }
      onClose();
    } catch {
      setErrors({ _form: t('crm.error.saveFailed', 'Failed to save changes.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />

      {/* Modal */}
      <div
        className="crm-modal"
        style={{
          position: 'relative',
          zIndex: 101,
          background: 'var(--ds-bg-card)',
          borderRadius: '16px',
          maxWidth: '560px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          padding: '1.5rem',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)' }}>
            {isEditing ? t('crm.contact.editContact', 'Edit Contact') : t('crm.contact.addContact', 'Add Contact')}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-muted)', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form error */}
        {errors._form && (
          <div style={{ background: 'rgba(181,71,71,0.1)', color: 'var(--color-danger, #B54747)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '1rem' }}>
            {errors._form}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Two-column grid on desktop */}
          <div className="crm-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label={t('crm.contact.firstName', 'First Name') + ' *'} error={errors.firstName}>
              <input type="text" value={form.firstName} onChange={e => setField('firstName', e.target.value)} style={inputStyle} />
            </Field>
            <Field label={t('crm.contact.lastName', 'Last Name')}>
              <input type="text" value={form.lastName} onChange={e => setField('lastName', e.target.value)} style={inputStyle} />
            </Field>
            <Field label={t('crm.contact.firstNameAr', 'First Name (Arabic)')}>
              <input type="text" value={form.firstNameAr} onChange={e => setField('firstNameAr', e.target.value)} dir="rtl" style={inputStyle} />
            </Field>
            <Field label={t('crm.contact.lastNameAr', 'Last Name (Arabic)')}>
              <input type="text" value={form.lastNameAr} onChange={e => setField('lastNameAr', e.target.value)} dir="rtl" style={inputStyle} />
            </Field>
            <Field label={t('crm.contact.email', 'Email')} error={errors.email}>
              <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} style={inputStyle} />
            </Field>
            <Field label={t('crm.contact.phone', 'Phone')} error={errors.phone}>
              <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)} style={inputStyle} />
            </Field>
            <Field label={t('crm.contact.phoneSecondary', 'Secondary Phone')}>
              <input type="tel" value={form.phoneSecondary} onChange={e => setField('phoneSecondary', e.target.value)} style={inputStyle} />
            </Field>
            <Field label={t('crm.contact.whatsappNumber', 'WhatsApp Number')}>
              <input type="tel" value={form.whatsappNumber} onChange={e => setField('whatsappNumber', e.target.value)} style={inputStyle} />
            </Field>
            <Field label={t('crm.contact.jobTitle', 'Job Title')}>
              <input type="text" value={form.jobTitle} onChange={e => setField('jobTitle', e.target.value)} style={inputStyle} />
            </Field>
            <Field label={t('crm.contact.jobTitleAr', 'Job Title (Arabic)')}>
              <input type="text" value={form.jobTitleAr} onChange={e => setField('jobTitleAr', e.target.value)} dir="rtl" style={inputStyle} />
            </Field>
            <Field label={t('crm.contact.department', 'Department')}>
              <input type="text" value={form.department} onChange={e => setField('department', e.target.value)} style={inputStyle} />
            </Field>
            <Field label={t('crm.contact.source', 'Source')}>
              <select value={form.source} onChange={e => setField('source', e.target.value)} style={inputStyle}>
                {SOURCES.map(s => (
                  <option key={s} value={s}>{t(`crm.contact.source.${s}`, s)}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Tags — full width */}
          <div style={{ marginTop: '12px' }}>
            <label style={labelStyle}>{t('crm.contact.tags', 'Tags')}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
              {form.tags.map(tag => (
                <span
                  key={tag}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--ds-bg-tinted)', color: 'var(--ds-accent-primary)', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 500 }}
                >
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, fontSize: '14px', lineHeight: 1 }}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder={intl.locale.startsWith('ar') ? 'اكتب واضغط Enter لإضافة علامة' : 'Type and press Enter to add tag'}
              style={inputStyle}
            />
          </div>

          {/* Notes — full width */}
          <div style={{ marginTop: '12px' }}>
            <label style={labelStyle}>{t('crm.contact.notes', 'Notes')}</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1.25rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1.5px solid #86EFAC',
                borderRadius: '8px',
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--ds-accent-primary)',
                cursor: 'pointer',
              }}
            >
              {t('crm.action.cancel', 'Cancel')}
            </button>
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
              }}
            >
              {isSubmitting ? t('crm.misc.loading', 'Loading...') : t('crm.action.save', 'Save')}
            </button>
          </div>
        </form>
      </div>

      {/* Mobile: full-screen bottom sheet */}
      <style>{`
        @media (max-width: 767px) {
          .crm-modal {
            position: fixed !important;
            inset-block-end: 0 !important;
            inset-inline: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            max-height: 90vh !important;
            border-radius: 16px 16px 0 0 !important;
          }
          .crm-form-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ===== FIELD WRAPPER ===== */
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
      {error && <span style={{ fontSize: '11px', color: 'var(--color-danger, #B54747)', marginTop: '2px', display: 'block' }}>{error}</span>}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--ds-text-muted)',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '14px',
  color: 'var(--ds-text-body)',
  background: 'var(--ds-bg-card)',
  border: '1px solid var(--ds-border)',
  borderRadius: '8px',
  outline: 'none',
  boxSizing: 'border-box',
};

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useIntl } from 'react-intl';
import { ArrowLeft, Edit, Trash2, Mail, Phone, MessageCircle, Briefcase } from 'lucide-react';
import { useCrm } from '@/store/crmStore';
import { useOrgPermission } from '@/store/orgStore';
import { Skeleton } from '@/components/ui/Skeleton';
import { ContactTimeline } from './ContactTimeline';
import type { CrmContact } from '@/types/crm';

interface ContactDetailProps {
  contactId: string;
}

export function ContactDetail({ contactId }: ContactDetailProps) {
  const intl = useIntl();
  const router = useRouter();
  const { contacts, deals, tasks, communications, isLoading, deleteContact } = useCrm();
  const canWrite = useOrgPermission('contacts.write');
  const canDelete = useOrgPermission('contacts.delete');
  const [activeTab, setActiveTab] = useState('details');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  const contact = contacts.find(c => c.id === contactId);
  const contactDeals = useMemo(() => deals.filter(d => d.contactId === contactId), [deals, contactId]);
  const contactTasks = useMemo(() => tasks.filter(t => t.contactId === contactId), [tasks, contactId]);
  const contactComms = useMemo(() => communications.filter(c => c.contactId === contactId), [communications, contactId]);

  const handleDelete = async () => {
    const success = await deleteContact(contactId);
    if (success) {
      router.push('/crm/contacts');
    }
    // On failure, crmStore already logs the error; user stays on page
    setConfirmDelete(false);
  };

  if (isLoading.contacts) {
    return (
      <div>
        <Skeleton width="100%" height="160px" borderRadius="16px" />
        <div style={{ marginTop: '1rem' }}><Skeleton width="100%" height="300px" borderRadius="16px" /></div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ fontSize: '15px', color: 'var(--ds-text-heading)' }}>
          {t('crm.error.notFound', 'Resource not found.')}
        </p>
      </div>
    );
  }

  const tabs = [
    { key: 'details', label: t('crm.tabs.details', 'Details') },
    { key: 'timeline', label: t('crm.tabs.timeline', 'Timeline') },
    { key: 'deals', label: `${t('crm.tabs.deals', 'Deals')} (${contactDeals.length})` },
    { key: 'tasks', label: `${t('crm.tabs.tasks', 'Tasks')} (${contactTasks.length})` },
  ];

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => router.push('/crm/contacts')}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-muted)', fontSize: '13px', marginBottom: '1rem', padding: 0 }}
      >
        <ArrowLeft size={16} />
        {t('crm.contact.allContacts', 'All Contacts')}
      </button>

      {/* Dark glass card header (4b) */}
      <div
        style={{
          background: '#0F1914',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'inset 0 0 40px rgba(34,197,94,0.04)',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#F0FDF4', lineHeight: 1.3 }}>
            {contact.firstName} {contact.lastName || ''}
          </h1>
          {(contact.firstNameAr || contact.lastNameAr) && (
            <p style={{ fontSize: '15px', fontWeight: 400, color: '#6B7280', marginTop: '2px' }}>
              {contact.firstNameAr} {contact.lastNameAr || ''}
            </p>
          )}
          {contact.jobTitle && (
            <p style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '6px' }}>
              {contact.jobTitle}
              {contact.jobTitleAr && <span style={{ marginInlineStart: '8px', color: '#6B7280' }}>{contact.jobTitleAr}</span>}
            </p>
          )}
          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
              {contact.tags.map(tag => (
                <span key={tag} style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 500 }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {canWrite && (
            <button
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'transparent', border: '1.5px solid #86EFAC',
                borderRadius: '8px', padding: '8px 14px', fontSize: '13px',
                fontWeight: 500, color: '#86EFAC', cursor: 'pointer',
              }}
            >
              <Edit size={14} />
              {t('crm.action.edit', 'Edit')}
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'transparent', border: '1.5px solid rgba(239,68,68,0.5)',
                borderRadius: '8px', padding: '8px 14px', fontSize: '13px',
                fontWeight: 500, color: '#EF4444', cursor: 'pointer',
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === tab.key ? 'var(--ds-accent-primary)' : 'var(--ds-bg-card)',
              color: activeTab === tab.key ? '#FFFFFF' : 'var(--ds-text-body)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 150ms ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content — standard card (4a) */}
      <div
        style={{
          background: 'var(--ds-bg-card)',
          border: '0.5px solid var(--ds-border)',
          borderRadius: '16px',
          padding: '20px 24px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        {activeTab === 'details' && <DetailsTab contact={contact} />}
        {activeTab === 'timeline' && <ContactTimeline communications={contactComms} />}
        {activeTab === 'deals' && <DealsTab deals={contactDeals} />}
        {activeTab === 'tasks' && <TasksTab tasks={contactTasks} />}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setConfirmDelete(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'relative', zIndex: 101, background: 'var(--ds-bg-card)', borderRadius: '16px', padding: '1.5rem', maxWidth: '400px', width: '90%' }}>
            <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '0.5rem' }}>
              {t('crm.contact.deleteContact', 'Delete Contact')}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', lineHeight: 1.6 }}>
              {t('crm.confirm.deleteContact', 'Are you sure you want to delete this contact? This action cannot be undone.')}
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(false)} style={{ background: 'transparent', border: '1.5px solid var(--ds-border)', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', color: 'var(--ds-text-body)' }}>
                {t('crm.action.cancel', 'Cancel')}
              </button>
              <button onClick={handleDelete} style={{ background: 'var(--color-danger, #B54747)', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>
                {t('crm.action.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== SUB-COMPONENTS ===== */

function DetailsTab({ contact }: { contact: CrmContact }) {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  const fields = [
    { key: 'email', icon: Mail, label: t('crm.contact.email', 'Email'), value: contact.email },
    { key: 'phone', icon: Phone, label: t('crm.contact.phone', 'Phone'), value: contact.phone },
    { key: 'phoneSecondary', icon: Phone, label: t('crm.contact.phoneSecondary', 'Secondary Phone'), value: contact.phoneSecondary },
    { key: 'whatsapp', icon: MessageCircle, label: t('crm.contact.whatsappNumber', 'WhatsApp'), value: contact.whatsappNumber },
    { key: 'jobTitle', icon: Briefcase, label: t('crm.contact.jobTitle', 'Job Title'), value: contact.jobTitle },
    { key: 'department', icon: Briefcase, label: t('crm.contact.department', 'Department'), value: contact.department },
    { key: 'source', icon: Briefcase, label: t('crm.contact.source', 'Source'), value: contact.source },
  ].filter(f => f.value);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
      {fields.map(f => (
        <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <f.icon size={16} style={{ color: 'var(--ds-text-muted)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)' }}>{f.label}</div>
            <div style={{ fontSize: '14px', color: 'var(--ds-text-body)' }}>{f.value}</div>
          </div>
        </div>
      ))}
      {contact.notes && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)', marginBottom: '4px' }}>
            {t('crm.contact.notes', 'Notes')}
          </div>
          <p style={{ fontSize: '14px', color: 'var(--ds-text-body)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {contact.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function DealsTab({ deals }: { deals: { id: string; title: string; titleAr?: string | null; value?: number | null; currency: string }[] }) {
  const intl = useIntl();
  const router = useRouter();
  if (deals.length === 0) {
    return <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', textAlign: 'center', padding: '1rem' }}>
      {intl.formatMessage({ id: 'crm.deal.noDeals', defaultMessage: 'No deals yet' })}
    </p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {deals.map(deal => (
        <div
          key={deal.id}
          onClick={() => router.push(`/crm/deals/${deal.id}`)}
          style={{ padding: '12px 16px', background: 'var(--ds-bg-tinted)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>{deal.title}</div>
            {deal.titleAr && <div style={{ fontSize: '13px', color: 'var(--ds-text-muted)' }}>{deal.titleAr}</div>}
          </div>
          {deal.value != null && (
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-accent-primary)' }}>
              {new Intl.NumberFormat(intl.locale, { style: 'currency', currency: deal.currency }).format(deal.value)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function TasksTab({ tasks }: { tasks: { id: string; title: string; status: string; priority: string; dueDate: string | null }[] }) {
  const intl = useIntl();
  if (tasks.length === 0) {
    return <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', textAlign: 'center', padding: '1rem' }}>
      {intl.formatMessage({ id: 'crm.task.noTasks', defaultMessage: 'No tasks yet' })}
    </p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {tasks.map(task => (
        <div key={task.id} style={{ padding: '12px 16px', background: 'var(--ds-bg-tinted)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', color: task.status === 'completed' ? 'var(--ds-text-muted)' : 'var(--ds-text-heading)', textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
            {task.title}
          </div>
          <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '9999px', background: task.priority === 'urgent' ? 'rgba(239,68,68,0.1)' : 'var(--ds-bg-card)', color: task.priority === 'urgent' ? '#EF4444' : 'var(--ds-text-muted)' }}>
            {intl.formatMessage({ id: `crm.task.priority.${task.priority}`, defaultMessage: task.priority })}
          </span>
        </div>
      ))}
    </div>
  );
}

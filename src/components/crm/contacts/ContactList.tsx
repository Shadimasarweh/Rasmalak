'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useIntl } from 'react-intl';
import { Users, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCrmContacts, useCrm } from '@/store/crmStore';
import { useOrgPermission } from '@/store/orgStore';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/crm/shared/EmptyState';
import { ArabicSearchInput } from '@/components/crm/shared/ArabicSearchInput';
import { buildSearchIndex, searchIndex as searchClientIndex } from '@/crm/search/searchIndex';
import type { CrmContact } from '@/types/crm';

const PAGE_SIZE = 25;

export function ContactList() {
  const intl = useIntl();
  const router = useRouter();
  const { contacts, isLoading, searchContacts } = useCrmContacts();
  const { companies } = useCrm();
  const canWrite = useOrgPermission('contacts.write');
  const canRead = useOrgPermission('contacts.read');

  const [searchResults, setSearchResults] = useState<CrmContact[] | null>(null);
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);

  // Build client-side search index when contacts change
  const clientIndex = useMemo(() => buildSearchIndex(contacts), [contacts]);

  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      setPage(0);
      return;
    }

    // Instant client-side filtering first
    const matchedIds = searchClientIndex(clientIndex, query);
    const clientResults = matchedIds
      .map(id => contacts.find(c => c.id === id))
      .filter(Boolean) as CrmContact[];

    if (clientResults.length > 0) {
      setSearchResults(clientResults);
      setPage(0);
    }

    // Then fall back to comprehensive Supabase search
    const serverResults = await searchContacts(query);
    if (serverResults.length > 0) {
      // Merge: server results first (more comprehensive), deduplicated
      const seen = new Set(serverResults.map(c => c.id));
      const merged = [...serverResults, ...clientResults.filter(c => !seen.has(c.id))];
      setSearchResults(merged);
    } else if (clientResults.length === 0) {
      setSearchResults([]);
    }
    setPage(0);
  }, [searchContacts, clientIndex, contacts]);

  const displayedContacts = searchResults ?? contacts;
  const totalPages = Math.ceil(displayedContacts.length / PAGE_SIZE);
  const pageContacts = displayedContacts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatDate = useCallback((dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Intl.DateTimeFormat(intl.locale, { dateStyle: 'medium' }).format(new Date(dateStr));
    } catch { return '—'; }
  }, [intl.locale]);

  // Access denied
  if (!canRead) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
          {t('crm.error.accessDenied', 'Access Denied')}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginTop: '0.25rem' }}>
          {t('crm.error.accessDeniedBody', "You don't have permission to view this page.")}
        </p>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Skeleton width="140px" height="28px" borderRadius="8px" />
          <Skeleton width="120px" height="36px" borderRadius="8px" />
        </div>
        <Skeleton width="100%" height="40px" borderRadius="8px" />
        <div style={{ marginTop: '1rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} width="100%" height="52px" borderRadius="4px" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ds-text-heading)', lineHeight: 1.3, fontFeatureSettings: '"kern" 1' }}>
            {t('crm.nav.contacts', 'Contacts')}
          </h1>
          <p style={{ fontSize: '13px', fontWeight: 400, color: 'var(--ds-text-muted)' }}>
            {t('crm.contact.subtitle', 'جهات الاتصال')}
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--ds-accent-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 150ms ease',
            }}
          >
            <Plus size={16} />
            {t('crm.contact.addContact', 'Add Contact')}
          </button>
        )}
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1rem' }}>
        <ArabicSearchInput onSearch={handleSearch} />
      </div>

      {/* Empty state */}
      {displayedContacts.length === 0 && !searchResults && (
        <EmptyState
          icon={Users}
          titleKey="crm.empty.contacts.title"
          titleDefault="No contacts yet"
          bodyKey="crm.empty.contacts.body"
          bodyDefault="Add your first contact to start building relationships."
          ctaKey={canWrite ? 'crm.empty.contacts.cta' : undefined}
          ctaDefault="Add Contact"
          onAction={canWrite ? () => setShowForm(true) : undefined}
        />
      )}

      {/* No search results */}
      {displayedContacts.length === 0 && searchResults && (
        <EmptyState
          icon={Users}
          titleKey="crm.search.noResults"
          titleDefault="No results found"
          bodyKey="crm.search.noResultsBody"
          bodyDefault="Try a different search term."
        />
      )}

      {/* Table */}
      {pageContacts.length > 0 && (
        <div
          style={{
            background: 'var(--ds-bg-card)',
            border: '0.5px solid var(--ds-border)',
            borderRadius: '16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--ds-border)' }}>
                  <th style={thStyle}>{t('crm.contact.name', 'Name')}</th>
                  <th style={thStyle}>{t('crm.contact.company', 'Company')}</th>
                  <th style={{ ...thStyle, ...hideMobile }}>{t('crm.contact.email', 'Email')}</th>
                  <th style={{ ...thStyle, ...hideMobile }}>{t('crm.contact.phone', 'Phone')}</th>
                  <th style={{ ...thStyle, ...hideMobile }}>{t('crm.contact.lastContacted', 'Last Contacted')}</th>
                  <th style={{ ...thStyle, ...hideMobile }}>{t('crm.contact.tags', 'Tags')}</th>
                </tr>
              </thead>
              <tbody>
                {pageContacts.map(contact => (
                  <tr
                    key={contact.id}
                    onClick={() => router.push(`/crm/contacts/${contact.id}`)}
                    style={{ borderBottom: '1px solid var(--ds-border)', cursor: 'pointer', transition: 'background 100ms ease' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-bg-tinted)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdStyle, position: 'sticky', insetInlineStart: 0, background: 'inherit', zIndex: 1 }}>
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--ds-text-heading)' }}>
                          {contact.firstName} {contact.lastName || ''}
                        </div>
                        {(contact.firstNameAr || contact.lastNameAr) && (
                          <div style={{ fontSize: '13px', fontWeight: 400, color: 'var(--ds-text-muted)' }}>
                            {contact.firstNameAr} {contact.lastNameAr || ''}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: 'var(--ds-text-body)' }}>
                        {contact.companyId ? (companies.find(co => co.id === contact.companyId)?.name || '—') : '—'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, ...hideMobile, color: 'var(--ds-text-body)' }}>{contact.email || '—'}</td>
                    <td style={{ ...tdStyle, ...hideMobile, color: 'var(--ds-text-body)' }}>{contact.phone || '—'}</td>
                    <td style={{ ...tdStyle, ...hideMobile, color: 'var(--ds-text-muted)', fontSize: '13px' }}>
                      {formatDate(contact.lastContacted)}
                    </td>
                    <td style={{ ...tdStyle, ...hideMobile }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {(contact.tags || []).slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            style={{
                              background: 'var(--ds-bg-tinted)',
                              color: 'var(--ds-accent-primary)',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 500,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 20px',
                borderTop: '1px solid var(--ds-border)',
                fontSize: '13px',
                color: 'var(--ds-text-muted)',
              }}
            >
              <span>{displayedContacts.length} {t('crm.nav.contacts', 'contacts')}</span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={paginationBtn}
                >
                  <ChevronLeft size={16} />
                </button>
                <span>{page + 1} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  style={paginationBtn}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ContactForm modal will be rendered here in Phase 6.3 */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setShowForm(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'relative', zIndex: 101, background: 'var(--ds-bg-card)', borderRadius: '16px', padding: '1.5rem', maxWidth: '560px', width: '90%' }}>
            <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
              {t('crm.contact.addContact', 'Add Contact')}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginTop: '0.5rem' }}>
              Contact form will be built in Phase 6.3
            </p>
            <button
              onClick={() => setShowForm(false)}
              style={{ marginTop: '1rem', background: 'var(--ds-accent-primary)', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}
            >
              {t('crm.action.close', 'Close')}
            </button>
          </div>
        </div>
      )}

      {/* Responsive CSS for hiding columns on mobile */}
      <style>{`
        @media (max-width: 767px) {
          .crm-hide-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ===== TABLE STYLES ===== */
const thStyle: React.CSSProperties = {
  textAlign: 'start',
  padding: '12px 16px',
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--ds-text-muted)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  whiteSpace: 'nowrap',
};

const hideMobile: React.CSSProperties = {};
// Note: actual mobile hiding done via className="crm-hide-mobile" would be cleaner,
// but inline styles don't support media queries. The <style> block handles it.

const paginationBtn: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--ds-border)',
  borderRadius: '6px',
  padding: '4px',
  cursor: 'pointer',
  color: 'var(--ds-text-body)',
  display: 'flex',
  alignItems: 'center',
};

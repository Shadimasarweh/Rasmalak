'use client';

import { useEffect } from 'react';
import { useIntl } from 'react-intl';
import { Download } from 'lucide-react';
import { useBilling } from '@/store/billingStore';

export function InvoiceList() {
  const intl = useIntl();
  const { invoices, fetchInvoices } = useBilling();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try { return new Intl.DateTimeFormat(intl.locale, { dateStyle: 'medium' }).format(new Date(d)); }
    catch { return '—'; }
  };

  const formatAmount = (amount: number, currency: string) => {
    try { return new Intl.NumberFormat(intl.locale, { style: 'currency', currency }).format(amount); }
    catch { return `${amount} ${currency}`; }
  };

  const statusColors: Record<string, string> = {
    paid: 'var(--ds-accent-primary)', open: '#3B82F6', draft: 'var(--ds-text-muted)',
    void: 'var(--ds-text-muted)', uncollectible: '#EF4444',
  };

  if (invoices.length === 0) {
    return (
      <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '2rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)' }}>{t('billing.invoice.noInvoices', 'No invoices yet')}</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBlockEnd: '1px solid var(--ds-border)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>{t('billing.invoice.title', 'Invoices')}</h3>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBlockEnd: '1px solid var(--ds-border)' }}>
            <th style={thStyle}>{t('billing.invoice.date', 'Date')}</th>
            <th style={thStyle}>{t('billing.invoice.amount', 'Amount')}</th>
            <th style={thStyle}>{t('billing.invoice.status', 'Status')}</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {invoices.map(inv => (
            <tr key={inv.id} style={{ borderBlockEnd: '1px solid var(--ds-border)' }}>
              <td style={tdStyle}>{formatDate(inv.createdAt)}</td>
              <td style={{ ...tdStyle, fontWeight: 500 }}>{formatAmount(inv.amount, inv.currency)}</td>
              <td style={tdStyle}>
                <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 500, background: `${statusColors[inv.status] || 'var(--ds-text-muted)'}15`, color: statusColors[inv.status] || 'var(--ds-text-muted)' }}>
                  {t(`billing.invoice.status.${inv.status}`, inv.status)}
                </span>
              </td>
              <td style={{ ...tdStyle, textAlign: 'end' }}>
                {inv.pdfUrl && (
                  <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ds-accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                    <Download size={12} /> PDF
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = { textAlign: 'start', padding: '10px 16px', fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)' };
const tdStyle: React.CSSProperties = { padding: '12px 16px', color: 'var(--ds-text-body)' };

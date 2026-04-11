'use client';

import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Plus, X, FileText } from 'lucide-react';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

interface QuoteBuilderProps {
  currency?: string;
  onGenerate?: (data: { items: LineItem[]; subtotal: number; tax: number; total: number }) => void;
}

export function QuoteBuilder({ currency = 'USD', onGenerate }: QuoteBuilderProps) {
  const intl = useIntl();
  const isAr = intl.locale.startsWith('ar');
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  const [items, setItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPrice: 0, taxRate: 0 },
  ]);

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, taxRate: 0 }]);
  };

  const updateItem = (index: number, updates: Partial<LineItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...updates };
    setItems(next);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((s, item) => s + item.quantity * item.unitPrice, 0);
  const tax = items.reduce((s, item) => s + item.quantity * item.unitPrice * (item.taxRate / 100), 0);
  const total = subtotal + tax;

  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat(intl.locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
    } catch { return `${value} ${currency}`; }
  };

  const inputStyle = {
    padding: '8px 10px', fontSize: '13px', borderRadius: '6px',
    border: '0.5px solid var(--ds-border)', background: 'var(--ds-bg-page)', color: 'var(--ds-text-body)',
  };

  return (
    <div style={{
      background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
      padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FileText size={18} />
        {t('documents.quote.title', 'Quote Builder')}
      </div>

      {/* Header row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 120px 80px 32px', gap: '8px', marginBottom: '8px', fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)' }}>
        <span>{t('documents.quote.description', 'Description')}</span>
        <span>{t('documents.quote.qty', 'Qty')}</span>
        <span>{t('documents.quote.unitPrice', 'Unit Price')}</span>
        <span>{t('documents.quote.tax', 'Tax %')}</span>
        <span />
      </div>

      {/* Line items */}
      {items.map((item, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 120px 80px 32px', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
          <input style={{ ...inputStyle, width: '100%' }} value={item.description} onChange={e => updateItem(i, { description: e.target.value })} placeholder={isAr ? 'الوصف' : 'Item description'} />
          <input style={{ ...inputStyle, width: '100%' }} type="number" min="1" value={item.quantity} onChange={e => updateItem(i, { quantity: Number(e.target.value) })} />
          <input style={{ ...inputStyle, width: '100%' }} type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateItem(i, { unitPrice: Number(e.target.value) })} />
          <input style={{ ...inputStyle, width: '100%' }} type="number" min="0" max="100" value={item.taxRate} onChange={e => updateItem(i, { taxRate: Number(e.target.value) })} />
          <button onClick={() => removeItem(i)} disabled={items.length === 1} style={{ background: 'none', border: 'none', cursor: items.length > 1 ? 'pointer' : 'default', color: 'var(--ds-text-muted)', padding: '4px', opacity: items.length > 1 ? 1 : 0.3 }}>
            <X size={14} />
          </button>
        </div>
      ))}

      <button onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--ds-accent-primary)', fontWeight: 500, padding: '4px 0', marginBottom: '16px' }}>
        <Plus size={12} />
        {t('documents.quote.addItem', 'Add Item')}
      </button>

      {/* Totals */}
      <div style={{ borderTop: '0.5px solid var(--ds-border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '220px', fontSize: '13px' }}>
          <span style={{ color: 'var(--ds-text-muted)' }}>{t('documents.quote.subtotal', 'Subtotal')}</span>
          <span style={{ color: 'var(--ds-text-body)' }}>{formatCurrency(subtotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '220px', fontSize: '13px' }}>
          <span style={{ color: 'var(--ds-text-muted)' }}>{t('documents.quote.taxTotal', 'Tax')}</span>
          <span style={{ color: 'var(--ds-text-body)' }}>{formatCurrency(tax)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '220px', fontSize: '15px', fontWeight: 600, paddingTop: '4px', borderTop: '1px solid var(--ds-border)' }}>
          <span style={{ color: 'var(--ds-text-heading)' }}>{t('documents.quote.total', 'Total')}</span>
          <span style={{ color: 'var(--ds-accent-primary)' }}>{formatCurrency(total)}</span>
        </div>
      </div>

      {onGenerate && (
        <button
          onClick={() => onGenerate({ items, subtotal, tax, total })}
          disabled={items.every(i => !i.description || i.unitPrice === 0)}
          style={{
            marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--ds-accent-primary)', color: '#FFFFFF', border: 'none',
            borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
          }}
        >
          <FileText size={14} />
          {t('documents.quote.generate', 'Generate PDF')}
        </button>
      )}
    </div>
  );
}
